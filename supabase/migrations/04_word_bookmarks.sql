-- Migration: 04_word_bookmarks.sql
-- Adds a word bookmarks table so students can save vocabulary words while reading.

create table public.word_bookmarks (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  record_id   uuid not null references public.assignment_records(id) on delete cascade,
  word        text not null,
  definition  text not null,
  explanation text not null,
  created_at  timestamptz not null default now(),
  unique (student_id, record_id, word)
);

create index idx_bookmarks_student_record on public.word_bookmarks(student_id, record_id);

-- Row-Level Security: students can only access their own bookmarks
alter table public.word_bookmarks enable row level security;

create policy "Students can manage own bookmarks"
  on public.word_bookmarks
  for all
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
