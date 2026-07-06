-- Database Idempotent Seed File: seed.sql
-- Pre-populates teachers, students, classrooms, books, assignments, and sessions.

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
-- Password hash for 'Demo1234!' (bcrypt encrypted)
-- hash: '$2a$10$w850r/H08k6p3tM/4vR8t.vY4L9cR7nC89xO/5E/1P6X72F6M9F9.'
-- We seed auth.users records using standard UUIDs:

insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at) values
  ('d1a12345-6789-1011-1213-141516171819', '00000000-0000-0000-0000-000000000000', 'teacher1@demo.com', '$2a$10$w850r/H08k6p3tM/4vR8t.vY4L9cR7nC89xO/5E/1P6X72F6M9F9.', now(), 'authenticated', 'authenticated', now(), now()),
  ('d2a12345-6789-1011-1213-141516171819', '00000000-0000-0000-0000-000000000000', 'teacher2@demo.com', '$2a$10$w850r/H08k6p3tM/4vR8t.vY4L9cR7nC89xO/5E/1P6X72F6M9F9.', now(), 'authenticated', 'authenticated', now(), now()),
  ('s1b12345-6789-1011-1213-141516171819', '00000000-0000-0000-0000-000000000000', 'student1@demo.com', '$2a$10$w850r/H08k6p3tM/4vR8t.vY4L9cR7nC89xO/5E/1P6X72F6M9F9.', now(), 'authenticated', 'authenticated', now(), now()),
  ('s2b12345-6789-1011-1213-141516171819', '00000000-0000-0000-0000-000000000000', 'student2@demo.com', '$2a$10$w850r/H08k6p3tM/4vR8t.vY4L9cR7nC89xO/5E/1P6X72F6M9F9.', now(), 'authenticated', 'authenticated', now(), now()),
  ('s3b12345-6789-1011-1213-141516171819', '00000000-0000-0000-0000-000000000000', 'student3@demo.com', '$2a$10$w850r/H08k6p3tM/4vR8t.vY4L9cR7nC89xO/5E/1P6X72F6M9F9.', now(), 'authenticated', 'authenticated', now(), now()),
  ('s4b12345-6789-1011-1213-141516171819', '00000000-0000-0000-0000-000000000000', 'student4@demo.com', '$2a$10$w850r/H08k6p3tM/4vR8t.vY4L9cR7nC89xO/5E/1P6X72F6M9F9.', now(), 'authenticated', 'authenticated', now(), now()),
  ('s5b12345-6789-1011-1213-141516171819', '00000000-0000-0000-0000-000000000000', 'student5@demo.com', '$2a$10$w850r/H08k6p3tM/4vR8t.vY4L9cR7nC89xO/5E/1P6X72F6M9F9.', now(), 'authenticated', 'authenticated', now(), now()),
  ('s6b12345-6789-1011-1213-141516171819', '00000000-0000-0000-0000-000000000000', 'student6@demo.com', '$2a$10$w850r/H08k6p3tM/4vR8t.vY4L9cR7nC89xO/5E/1P6X72F6M9F9.', now(), 'authenticated', 'authenticated', now(), now());

-- 2. Seed Public Profiles
insert into public.profiles (id, role, full_name) values
  ('d1a12345-6789-1011-1213-141516171819', 'teacher', 'Mr. Emmanuel Idowu'),
  ('d2a12345-6789-1011-1213-141516171819', 'teacher', 'Mrs. Jane Doe'),
  ('s1b12345-6789-1011-1213-141516171819', 'student', 'Alex Johnson'),
  ('s2b12345-6789-1011-1213-141516171819', 'student', 'Ben Davis'),
  ('s3b12345-6789-1011-1213-141516171819', 'student', 'Charlie Smith'),
  ('s4b12345-6789-1011-1213-141516171819', 'student', 'Danielle White'),
  ('s5b12345-6789-1011-1213-141516171819', 'student', 'Ethan Green'),
  ('s6b12345-6789-1011-1213-141516171819', 'student', 'Fiona Brown');

-- 3. Seed Classrooms
insert into public.classrooms (id, name, teacher_id) values
  ('c1c12345-6789-1011-1213-141516171819', 'English Lit Homeroom (Grade 4)', 'd1a12345-6789-1011-1213-141516171819'),
  ('c2c12345-6789-1011-1213-141516171819', 'Creative Reading (Grade 5)', 'd2a12345-6789-1011-1213-141516171819');

-- 4. Enroll Students (Rosters)
-- Teacher 1 has students 1-4.
-- Teacher 2 has students 4-6 (Student 4 overlaps classrooms).
insert into public.enrollments (class_id, student_id) values
  ('c1c12345-6789-1011-1213-141516171819', 's1b12345-6789-1011-1213-141516171819'),
  ('c1c12345-6789-1011-1213-141516171819', 's2b12345-6789-1011-1213-141516171819'),
  ('c1c12345-6789-1011-1213-141516171819', 's3b12345-6789-1011-1213-141516171819'),
  ('c1c12345-6789-1011-1213-141516171819', 's4b12345-6789-1011-1213-141516171819'),
  ('c2c12345-6789-1011-1213-141516171819', 's4b12345-6789-1011-1213-141516171819'),
  ('c2c12345-6789-1011-1213-141516171819', 's5b12345-6789-1011-1213-141516171819'),
  ('c2c12345-6789-1011-1213-141516171819', 's6b12345-6789-1011-1213-141516171819');

-- 5. Seed Books (10 Public Domain classics with Native Content Text)
insert into public.books (id, title, author, reading_level, content_text) values
  ('b1b12345-6789-1011-1213-141516171819', 'Alice in Wonderland', 'Lewis Carroll', 'Lexile 700L (Grades 3-5)', 
   'CHAPTER I. Down the Rabbit-Hole. Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, “and what is the use of a book,” thought Alice “without pictures or conversations?” So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.'),
   
  ('b2b12345-6789-1011-1213-141516171819', 'The Secret Garden', 'Frances Hodgson Burnett', 'Lexile 970L (Grades 4-6)',
   'When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen. It was true, too. She had a little thin face and a little thin body, thin light hair and a sour expression. Her hair was yellow, and her face was yellow because she had been born in India and had always been ill in one way or another. Her father had held a position under the English Government and had always been busy and ill himself, and her mother had been a great beauty who cared only to go to parties and amuse herself with gay people.'),

  ('b3b12345-6789-1011-1213-141516171819', 'Peter Pan', 'J. M. Barrie', 'Lexile 910L (Grades 3-5)',
   'All children, except one, grow up. They soon know that they will grow up, and the way Wendy knew was this. One day when she was two years old she was playing in a garden, and she plucked another flower and ran with it to her mother. I suppose she must have looked rather delightful, for Mrs. Darling put her hand to her heart and cried, “Oh, why can’t you remain like this for ever!” This was all that passed between them on the subject, but thenceforth Wendy knew that she must grow up. You always know after you are two. Two is the beginning of the end.'),

  ('b4b12345-6789-1011-1213-141516171819', 'The Wonderful Wizard of Oz', 'L. Frank Baum', 'Lexile 600L (Grades 3-5)',
   'Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer’s wife. Their house was small, for the lumber to build it had to be carried by wagon many miles. There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds. Uncle Henry and Aunt Em had a big bed in one corner, and Dorothy a little bed in another corner. There was no garret-hole at all, and no cellar-except a small hole dug in the ground, called a cyclone cellar.');

-- 6. Seed Assignments
-- Assignment 1: Assigned to Class 1, Book: Alice in Wonderland, Due: In 7 Days (Active)
insert into public.assignments (id, class_id, book_id, due_date) values
  ('a1a12345-6789-1011-1213-141516171819', 'c1c12345-6789-1011-1213-141516171819', 'b1b12345-6789-1011-1213-141516171819', current_date + interval '7 days');

-- Assignment 2: Assigned to Class 1, Book: Peter Pan, Due: 5 Days ago (Overdue test)
insert into public.assignments (id, class_id, book_id, due_date) values
  ('a2a12345-6789-1011-1213-141516171819', 'c1c12345-6789-1011-1213-141516171819', 'b3b12345-6789-1011-1213-141516171819', current_date - interval '5 days');

-- 7. Seed Student Progress Records
-- For Assignment 1 (Active)
insert into public.assignment_records (id, assignment_id, student_id, status) values
  ('r1r12345-6789-1011-1213-141516171819', 'a1a12345-6789-1011-1213-141516171819', 's1b12345-6789-1011-1213-141516171819', 'completed'),
  ('r2r12345-6789-1011-1213-141516171819', 'a1a12345-6789-1011-1213-141516171819', 's2b12345-6789-1011-1213-141516171819', 'in_progress'),
  ('r3r12345-6789-1011-1213-141516171819', 'a1a12345-6789-1011-1213-141516171819', 's3b12345-6789-1011-1213-141516171819', 'not_started'),
  ('r4r12345-6789-1011-1213-141516171819', 'a1a12345-6789-1011-1213-141516171819', 's4b12345-6789-1011-1213-141516171819', 'not_started');

-- For Assignment 2 (Overdue)
insert into public.assignment_records (id, assignment_id, student_id, status) values
  ('r5r12345-6789-1011-1213-141516171819', 'a2a12345-6789-1011-1213-141516171819', 's1b12345-6789-1011-1213-141516171819', 'in_progress'), -- Overdue & In Progress
  ('r6r12345-6789-1011-1213-141516171819', 'a2a12345-6789-1011-1213-141516171819', 's2b12345-6789-1011-1213-141516171819', 'completed'),   -- Overdue & Completed (fine)
  ('r7r12345-6789-1011-1213-141516171819', 'a2a12345-6789-1011-1213-141516171819', 's3b12345-6789-1011-1213-141516171819', 'not_started'); -- Overdue & Not Started

-- 8. Seed Reading Sessions (Append-only logs)
-- Student 1 read 15 mins then 10 mins (Completed)
insert into public.reading_sessions (record_id, seconds_read) values
  ('r1r12345-6789-1011-1213-141516171819', 900),
  ('r1r12345-6789-1011-1213-141516171819', 600);

-- Student 2 read 12 mins (In Progress)
insert into public.reading_sessions (record_id, seconds_read) values
  ('r2r12345-6789-1011-1213-141516171819', 720);

-- Overdue student 1 read 8 mins (Overdue in progress)
insert into public.reading_sessions (record_id, seconds_read) values
  ('r5r12345-6789-1011-1213-141516171819', 480);

-- Overdue student 2 read 20 mins (Overdue completed)
insert into public.reading_sessions (record_id, seconds_read) values
  ('r6r12345-6789-1011-1213-141516171819', 1200);
