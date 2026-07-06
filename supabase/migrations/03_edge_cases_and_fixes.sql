-- Migration 03: Edge Cases & Fixes
--
-- Why this migration exists:
--   1. Recreates create_assignment() function to:
--      - Fail if the classroom has zero students enrolled (empty selection).
--      - Check for duplicate active assignments for any student in the roster and throw a friendly error.
--   2. Recreates fn_validate_status_transition() to prevent reverting from completed back to in_progress.

-- A. Update the atomic create_assignment function
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
  v_student_name text;
begin
  -- 1. Authentication check
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- 2. Teacher classroom check
  if not exists (
    select 1 from public.classrooms c
    where c.id = p_class_id and c.teacher_id = auth.uid()
  ) then
    raise exception 'You can only create assignments for classrooms you teach';
  end if;

  -- 3. Empty roster check
  if not exists (
    select 1 from public.enrollments e
    where e.class_id = p_class_id
  ) then
    raise exception 'Cannot create assignment: Classroom roster is empty';
  end if;

  -- 4. Book exists check
  if not exists (select 1 from public.books b where b.id = p_book_id) then
    raise exception 'Book not found';
  end if;

  -- 5. Past due date check
  if p_due_date < current_date then
    raise exception 'Due date cannot be in the past';
  end if;

  -- 6. Duplicate active assignment check
  select p.full_name into v_student_name
  from public.enrollments e
  join public.assignment_records r on r.student_id = e.student_id
  join public.assignments a on a.id = r.assignment_id
  join public.profiles p on p.id = e.student_id
  where e.class_id = p_class_id
    and a.book_id = p_book_id
    and a.deleted_at is null
    and r.status != 'completed'
  limit 1;

  if v_student_name is not null then
    raise exception '% already has this book assigned and active', v_student_name;
  end if;

  -- 7. Insert the assignment
  insert into public.assignments (class_id, book_id, due_date)
  values (p_class_id, p_book_id, p_due_date)
  returning id into v_assignment_id;

  -- 8. Fan out assignment records to all enrolled students
  insert into public.assignment_records (assignment_id, student_id)
  select v_assignment_id, e.student_id
  from public.enrollments e
  where e.class_id = p_class_id;

  return v_assignment_id;
end;
$$;

-- B. Update status transition trigger validation
create or replace function public.fn_validate_status_transition()
returns trigger as $$
begin
  -- Block reverting from in_progress/completed to not_started
  if old.status in ('in_progress', 'completed') and new.status = 'not_started' then
    raise exception 'Illegal status transition: progress cannot revert to not_started';
  end if;

  -- Stamp the status update timestamp on changes
  if new.status is distinct from old.status then
    new.status_updated_at = now();
  end if;

  return new;
end;
$$ language plpgsql;
