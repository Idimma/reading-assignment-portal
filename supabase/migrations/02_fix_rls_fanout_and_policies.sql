-- Migration 02: Fix RLS mutual recursion, add atomic assignment fan-out, tighten profiles.
--
-- Why this migration exists:
--   1. The classrooms SELECT policy subqueried enrollments, whose policy subqueried
--      classrooms -> Postgres error 42P17 "infinite recursion detected in policy".
--      Fixed with SECURITY DEFINER helper functions that read the roster tables
--      with RLS bypassed, breaking the cycle.
--   2. assignment_records had no INSERT path for teachers, so creating an assignment
--      could never fan out progress rows. Fixed with an atomic, roster-checked
--      create_assignment() SECURITY DEFINER function (one round trip, one transaction).
--   3. profiles was readable by any authenticated user. Now: self + teachers can read
--      profiles of students enrolled in their classrooms.
--   4. Students no longer see soft-deleted (archived) assignments.
--   5. The status-transition trigger now stamps status_updated_at on every change.

-- A. Security definer helpers (break the classrooms <-> enrollments policy cycle)
create or replace function public.is_teacher_of_class(p_class_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = p_class_id and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.is_enrolled_in_class(p_class_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments e
    where e.class_id = p_class_id and e.student_id = auth.uid()
  );
$$;

-- B. Recreate the cross-referencing policies on top of the helpers (acyclic now)

drop policy if exists "Students can view enrolled classrooms" on public.classrooms;
create policy "Students can view enrolled classrooms"
  on public.classrooms for select
  to authenticated
  using (public.is_enrolled_in_class(id));

drop policy if exists "Teachers can manage enrollments for their classrooms" on public.enrollments;
create policy "Teachers can manage enrollments for their classrooms"
  on public.enrollments for all
  to authenticated
  using (public.is_teacher_of_class(class_id))
  with check (public.is_teacher_of_class(class_id));

drop policy if exists "Teachers can manage assignments" on public.assignments;
create policy "Teachers can manage assignments"
  on public.assignments for all
  to authenticated
  using (public.is_teacher_of_class(class_id))
  with check (public.is_teacher_of_class(class_id));

-- Students only ever see live (non-archived) assignments.
drop policy if exists "Students can view assignments for their classrooms" on public.assignments;
drop policy if exists "Students can view active assignments for their classrooms" on public.assignments;
create policy "Students can view active assignments for their classrooms"
  on public.assignments for select
  to authenticated
  using (public.is_enrolled_in_class(class_id) and deleted_at is null);

drop policy if exists "Teachers can view records for their assignments" on public.assignment_records;
create policy "Teachers can view records for their assignments"
  on public.assignment_records for select
  to authenticated
  using (
    exists (
      select 1 from public.assignments a
      where a.id = assignment_records.assignment_id
        and public.is_teacher_of_class(a.class_id)
    )
  );

drop policy if exists "Teachers can view reading sessions of their students" on public.reading_sessions;
create policy "Teachers can view reading sessions of their students"
  on public.reading_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.assignment_records r
      join public.assignments a on a.id = r.assignment_id
      where r.id = reading_sessions.record_id
        and public.is_teacher_of_class(a.class_id)
    )
  );

-- C. Tighten profiles: self + teachers reading their enrolled students.
--    (Previously: any authenticated user could read every profile.)
drop policy if exists "Users can read profiles if authenticated" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Teachers can read profiles of enrolled students" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Teachers can read profiles of enrolled students"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1 from public.enrollments e
      where e.student_id = profiles.id
        and public.is_teacher_of_class(e.class_id)
    )
  );

-- D. Atomic assignment creation with per-student fan-out.
--    SECURITY DEFINER because the fan-out inserts rows *about students* that the
--    teacher's own RLS could never insert (records policy checks student_id = auth.uid()).
--    The function re-implements the authorization check explicitly: caller must teach
--    the classroom. Everything happens in one transaction -> no orphaned assignments.
create or replace function public.create_assignment(
  p_book_id uuid,
  p_class_id uuid,
  p_due_date date
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.classrooms c
    where c.id = p_class_id and c.teacher_id = auth.uid()
  ) then
    raise exception 'You can only create assignments for classrooms you teach';
  end if;

  if not exists (select 1 from public.books b where b.id = p_book_id) then
    raise exception 'Book not found';
  end if;

  if p_due_date < current_date then
    raise exception 'Due date cannot be in the past';
  end if;

  insert into public.assignments (class_id, book_id, due_date)
  values (p_class_id, p_book_id, p_due_date)
  returning id into v_assignment_id;

  insert into public.assignment_records (assignment_id, student_id)
  select v_assignment_id, e.student_id
  from public.enrollments e
  where e.class_id = p_class_id;

  return v_assignment_id;
end;
$$;

-- E. Status transition trigger: also stamp status_updated_at on every real change,
--    so the timestamp cannot be forgotten (or spoofed) by callers.
create or replace function public.fn_validate_status_transition()
returns trigger as $$
begin
  if old.status in ('in_progress', 'completed') and new.status = 'not_started' then
    raise exception 'Illegal status transition: progress cannot revert to not_started';
  end if;
  if new.status is distinct from old.status then
    new.status_updated_at = now();
  end if;
  return new;
end;
$$ language plpgsql;
