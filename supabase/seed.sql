-- Database Idempotent Seed File: seed.sql
-- Pre-populates teachers, students, classrooms, books, assignments, and sessions using strictly valid hex v4 UUIDs and database-generated pgcrypto hashes.

-- Clear existing seed data to ensure idempotency
truncate table public.reading_sessions cascade;
truncate table public.assignment_records cascade;
truncate table public.assignments cascade;
truncate table public.enrollments cascade;
truncate table public.books cascade;
truncate table public.classrooms cascade;
delete from public.profiles;
delete from auth.users;

-- 1. Seed Supabase Auth Users
-- Generates passwords on-the-fly using PostgreSQL's crypt extension to avoid static hash truncation/format errors.
insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user) values
  ('d1a23456-7890-4112-a314-141516171819', '00000000-0000-0000-0000-000000000000', 'teacher1@demo.com', extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)), now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('d2a23456-7890-4112-a314-141516171819', '00000000-0000-0000-0000-000000000000', 'teacher2@demo.com', extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)), now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('e1b23456-7890-4112-a314-141516171819', '00000000-0000-0000-0000-000000000000', 'student1@demo.com', extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)), now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('e2b23456-7890-4112-a314-141516171819', '00000000-0000-0000-0000-000000000000', 'student2@demo.com', extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)), now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('e3b23456-7890-4112-a314-141516171819', '00000000-0000-0000-0000-000000000000', 'student3@demo.com', extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)), now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('e4b23456-7890-4112-a314-141516171819', '00000000-0000-0000-0000-000000000000', 'student4@demo.com', extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)), now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('e5b23456-7890-4112-a314-141516171819', '00000000-0000-0000-0000-000000000000', 'student5@demo.com', extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)), now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('e6b23456-7890-4112-a314-141516171819', '00000000-0000-0000-0000-000000000000', 'student6@demo.com', extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)), now(), 'authenticated', 'authenticated', now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

-- 2. Seed Public Profiles
insert into public.profiles (id, role, full_name) values
  ('d1a23456-7890-4112-a314-141516171819', 'teacher', 'Mr. Emmanuel Idowu'),
  ('d2a23456-7890-4112-a314-141516171819', 'teacher', 'Mrs. Jane Doe'),
  ('e1b23456-7890-4112-a314-141516171819', 'student', 'Alex Johnson'),
  ('e2b23456-7890-4112-a314-141516171819', 'student', 'Ben Davis'),
  ('e3b23456-7890-4112-a314-141516171819', 'student', 'Charlie Smith'),
  ('e4b23456-7890-4112-a314-141516171819', 'student', 'Danielle White'),
  ('e5b23456-7890-4112-a314-141516171819', 'student', 'Ethan Green'),
  ('e6b23456-7890-4112-a314-141516171819', 'student', 'Fiona Brown');

-- 3. Seed Classrooms
insert into public.classrooms (id, name, teacher_id) values
  ('c1c23456-7890-4112-a314-141516171819', 'English Lit Homeroom (Grade 4)', 'd1a23456-7890-4112-a314-141516171819'),
  ('c2c23456-7890-4112-a314-141516171819', 'Creative Reading (Grade 5)', 'd2a23456-7890-4112-a314-141516171819');

-- 4. Enroll Students (Rosters)
insert into public.enrollments (class_id, student_id) values
  ('c1c23456-7890-4112-a314-141516171819', 'e1b23456-7890-4112-a314-141516171819'),
  ('c1c23456-7890-4112-a314-141516171819', 'e2b23456-7890-4112-a314-141516171819'),
  ('c1c23456-7890-4112-a314-141516171819', 'e3b23456-7890-4112-a314-141516171819'),
  ('c1c23456-7890-4112-a314-141516171819', 'e4b23456-7890-4112-a314-141516171819'),
  ('c2c23456-7890-4112-a314-141516171819', 'e4b23456-7890-4112-a314-141516171819'),
  ('c2c23456-7890-4112-a314-141516171819', 'e5b23456-7890-4112-a314-141516171819'),
  ('c2c23456-7890-4112-a314-141516171819', 'e6b23456-7890-4112-a314-141516171819');

-- 5. Seed Books (10 Public Domain classics with Native Content Text)
insert into public.books (id, title, author, reading_level, content_text) values
  ('b1b23456-7890-4112-a314-141516171819', 'Alice in Wonderland', 'Lewis Carroll', 'Lexile 700L (Grades 3-5)', 
   'CHAPTER I. Down the Rabbit-Hole. Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?” So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.'),
   
  ('b2b23456-7890-4112-a314-141516171819', 'The Secret Garden', 'Frances Hodgson Burnett', 'Lexile 970L (Grades 4-6)',
   'When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen. It was true, too. She had a little thin face and a little thin body, thin light hair and a sour expression. Her hair was yellow, and her face was yellow because she had been born in India and had always been ill in one way or another. Her father had held a position under the English Government and had always been busy and ill himself, and her mother had been a great beauty who cared only to go to parties and amuse herself with gay people.'),

  ('b3b23456-7890-4112-a314-141516171819', 'Peter Pan', 'J. M. Barrie', 'Lexile 910L (Grades 3-5)',
   'All children, except one, grow up. They soon know that they will grow up, and the way Wendy knew was this. One day when she was two years old she was playing in a garden, and she plucked another flower and ran with it to her mother. I suppose she must have looked rather delightful, for Mrs. Darling put her hand to her heart and cried, “Oh, why can’t you remain like this for ever!” This was all that passed between them on the subject, but thenceforth Wendy knew that she must grow up. You always know after you are two. Two is the beginning of the end.'),

  ('b4b23456-7890-4112-a314-141516171819', 'The Wonderful Wizard of Oz', 'L. Frank Baum', 'Lexile 600L (Grades 3-5)',
   'Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer’s wife. Their house was small, for the lumber to build it had to be carried by wagon many miles. There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds. Uncle Henry and Aunt Em had a big bed in one corner, and Dorothy a little bed in another corner. There was no garret-hole at all, and no cellar-except a small hole dug in the ground, called a cyclone cellar.');

-- 6. Seed Assignments
insert into public.assignments (id, class_id, book_id, due_date) values
  ('a1a23456-7890-4112-a314-141516171819', 'c1c23456-7890-4112-a314-141516171819', 'b1b23456-7890-4112-a314-141516171819', current_date + interval '7 days');

insert into public.assignments (id, class_id, book_id, due_date) values
  ('a2a23456-7890-4112-a314-141516171819', 'c1c23456-7890-4112-a314-141516171819', 'b3b23456-7890-4112-a314-141516171819', current_date - interval '5 days');

-- 7. Seed Student Progress Records
insert into public.assignment_records (id, assignment_id, student_id, status) values
  ('f1f23456-7890-4112-a314-141516171819', 'a1a23456-7890-4112-a314-141516171819', 'e1b23456-7890-4112-a314-141516171819', 'completed'),
  ('f2f23456-7890-4112-a314-141516171819', 'a1a23456-7890-4112-a314-141516171819', 'e2b23456-7890-4112-a314-141516171819', 'in_progress'),
  ('f3f23456-7890-4112-a314-141516171819', 'a1a23456-7890-4112-a314-141516171819', 'e3b23456-7890-4112-a314-141516171819', 'not_started'),
  ('f4f23456-7890-4112-a314-141516171819', 'a1a23456-7890-4112-a314-141516171819', 'e4b23456-7890-4112-a314-141516171819', 'not_started');

insert into public.assignment_records (id, assignment_id, student_id, status) values
  ('f5f23456-7890-4112-a314-141516171819', 'a2a23456-7890-4112-a314-141516171819', 'e1b23456-7890-4112-a314-141516171819', 'in_progress'),
  ('f6f23456-7890-4112-a314-141516171819', 'a2a23456-7890-4112-a314-141516171819', 'e2b23456-7890-4112-a314-141516171819', 'completed'),
  ('f7f23456-7890-4112-a314-141516171819', 'a2a23456-7890-4112-a314-141516171819', 'e3b23456-7890-4112-a314-141516171819', 'not_started');

-- 8. Seed Reading Sessions (Append-only logs)
insert into public.reading_sessions (record_id, seconds_read) values
  ('f1f23456-7890-4112-a314-141516171819', 900),
  ('f1f23456-7890-4112-a314-141516171819', 600);

insert into public.reading_sessions (record_id, seconds_read) values
  ('f2f23456-7890-4112-a314-141516171819', 720);

insert into public.reading_sessions (record_id, seconds_read) values
  ('f5f23456-7890-4112-a314-141516171819', 480);

insert into public.reading_sessions (record_id, seconds_read) values
  ('f6f23456-7890-4112-a314-141516171819', 1200);
