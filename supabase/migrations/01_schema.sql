-- Database Schema Migration: 01_schema.sql
-- Enables role-based access control, roster maps, text contents, append-only logs, and triggers.

-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- Enums
create type user_role as enum ('teacher', 'student');
create type assignment_status as enum ('not_started', 'in_progress', 'completed');

-- 1. Profiles Table (Holds identity information linked to Supabase auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null,
  full_name   text not null,
  created_at  timestamptz not null default now()
);

-- 2. Classrooms Table
create table public.classrooms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- 3. Enrollments (Many-to-many roster link classroom students)
create table public.enrollments (
  class_id    uuid not null references public.classrooms(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (class_id, student_id)
);

-- 4. Books Table (Natively storing content text, Lexile reading levels)
create table public.books (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  author        text not null,
  cover_url     text,
  content_text  text not null,
  reading_level text, -- Scholastic Lexile / Grade details
  created_at    timestamptz not null default now()
);

-- 5. Assignments (Teachers assign to a class)
create table public.assignments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classrooms(id) on delete cascade,
  book_id     uuid not null references public.books(id) on delete restrict,
  due_date    date not null,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz -- Soft-delete support
);

-- 6. Assignment Progress Records (One-per-student linked progress state)
create table public.assignment_records (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null references public.assignments(id) on delete cascade,
  student_id        uuid not null references public.profiles(id) on delete cascade,
  status            assignment_status not null default 'not_started',
  status_updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

-- 7. Reading Sessions (Append-only reading log)
create table public.reading_sessions (
  id             uuid primary key default gen_random_uuid(),
  record_id      uuid not null references public.assignment_records(id) on delete cascade,
  seconds_read   integer not null check (seconds_read > 0 and seconds_read <= 28800), -- limit 8 hours per log
  logged_at      timestamptz not null default now()
);

-- Indexes for performance queries
create index idx_records_student on public.assignment_records(student_id);
create index idx_records_assignment on public.assignment_records(assignment_id);
create index idx_sessions_record on public.reading_sessions(record_id);
create index idx_classrooms_teacher on public.classrooms(teacher_id);
create index idx_enrollments_student on public.enrollments(student_id);
create index idx_assignments_class on public.assignments(class_id) where deleted_at is null;

-- Database Level Triggers & Automation

-- Trigger A: Auto-promote status from 'not_started' to 'in_progress' upon logging reading time
create or replace function public.fn_auto_promote_status()
returns trigger as $$
begin
  update public.assignment_records
  set status = 'in_progress', status_updated_at = now()
  where id = new.record_id and status = 'not_started';
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_log_session_auto_promote
after insert on public.reading_sessions
for each row execute function public.fn_auto_promote_status();

-- Trigger B: Restrict illegal status state machine backward transitions
create or replace function public.fn_validate_status_transition()
returns trigger as $$
begin
  if old.status in ('in_progress', 'completed') and new.status = 'not_started' then
    raise exception 'State constraint error: Cannot revert assignment progress back to Not Started';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_validate_status_transition
before update on public.assignment_records
for each row execute function public.fn_validate_status_transition();


-- Row Level Security (RLS) Configuration
alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.enrollments enable row level security;
alter table public.books enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_records enable row level security;
alter table public.reading_sessions enable row level security;

-- RLS Policies

-- Profiles Policies
create policy "Users can read profiles if authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Classrooms Policies
create policy "Teachers can manage their classrooms"
  on public.classrooms for all
  to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "Students can view enrolled classrooms"
  on public.classrooms for select
  to authenticated
  using (
    exists (
      select 1 from public.enrollments
      where enrollments.class_id = classrooms.id and enrollments.student_id = auth.uid()
    )
  );

-- Enrollments Policies
create policy "Teachers can manage enrollments for their classrooms"
  on public.enrollments for all
  to authenticated
  using (
    exists (
      select 1 from public.classrooms
      where classrooms.id = enrollments.class_id and classrooms.teacher_id = auth.uid()
    )
  );

create policy "Students can view own enrollments"
  on public.enrollments for select
  to authenticated
  using (student_id = auth.uid());

-- Books Policies
create policy "Anyone authenticated can view books"
  on public.books for select
  to authenticated
  using (true);

-- Assignments Policies
create policy "Teachers can manage assignments"
  on public.assignments for all
  to authenticated
  using (
    exists (
      select 1 from public.classrooms
      where classrooms.id = assignments.class_id and classrooms.teacher_id = auth.uid()
    )
  );

create policy "Students can view assignments for their classrooms"
  on public.assignments for select
  to authenticated
  using (
    exists (
      select 1 from public.enrollments
      where enrollments.class_id = assignments.class_id and enrollments.student_id = auth.uid()
    )
  );

-- Assignment Records Policies
create policy "Teachers can view records for their assignments"
  on public.assignment_records for select
  to authenticated
  using (
    exists (
      select 1 from public.assignments
      join public.classrooms on classrooms.id = assignments.class_id
      where assignments.id = assignment_records.assignment_id and classrooms.teacher_id = auth.uid()
    )
  );

create policy "Students can view/update own assignment records"
  on public.assignment_records for all
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Reading Sessions Policies
create policy "Teachers can view reading sessions of their students"
  on public.reading_sessions for select
  to authenticated
  using (
    exists (
      select 1 from public.assignment_records
      join public.assignments on assignments.id = assignment_records.assignment_id
      join public.classrooms on classrooms.id = assignments.class_id
      where assignment_records.id = reading_sessions.record_id and classrooms.teacher_id = auth.uid()
    )
  );

create policy "Students can manage own reading sessions"
  on public.reading_sessions for all
  to authenticated
  using (
    exists (
      select 1 from public.assignment_records
      where assignment_records.id = reading_sessions.record_id and assignment_records.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.assignment_records
      where assignment_records.id = reading_sessions.record_id and assignment_records.student_id = auth.uid()
    )
  );
