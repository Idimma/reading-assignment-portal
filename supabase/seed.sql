-- Idempotent demo seed.
--
-- Auth notes (why this file looks the way it does):
--   * GoTrue rejects hand-rolled auth.users rows whose string token columns are
--     NULL ("Database error querying schema" -> HTTP 500 on login), so every
--     token column is seeded as ''.
--   * Passwords are hashed at seed time with pgcrypto's crypt()/gen_salt('bf')
--     instead of a pasted literal, so the hash always matches 'Demo1234!'.
--   * GoTrue also expects a matching auth.identities row per email user.
--
-- Demo password for every account: Demo1234!

create extension if not exists pgcrypto with schema extensions;

-- 1. Idempotent cleanup (children first; deleting auth.users cascades profiles + identities)
truncate table public.reading_sessions cascade;
truncate table public.assignment_records cascade;
truncate table public.assignments cascade;
truncate table public.enrollments cascade;
truncate table public.books cascade;
truncate table public.classrooms cascade;
delete from auth.users where email like '%@demo.com';

-- 2. Auth users (GoTrue-compliant: real bcrypt hash, '' token columns, email metadata)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new,
  email_change_token_current, reauthentication_token, is_sso_user
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('Demo1234!', extensions.gen_salt('bf', 10)), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', '', '', '', false
from (values
  ('d1a23456-7890-4112-a314-141516171819'::uuid, 'teacher1@demo.com'),
  ('d2a23456-7890-4112-a314-141516171819'::uuid, 'teacher2@demo.com'),
  ('e1b23456-7890-4112-a314-141516171819'::uuid, 'student1@demo.com'),
  ('e2b23456-7890-4112-a314-141516171819'::uuid, 'student2@demo.com'),
  ('e3b23456-7890-4112-a314-141516171819'::uuid, 'student3@demo.com'),
  ('e4b23456-7890-4112-a314-141516171819'::uuid, 'student4@demo.com'),
  ('e5b23456-7890-4112-a314-141516171819'::uuid, 'student5@demo.com'),
  ('e6b23456-7890-4112-a314-141516171819'::uuid, 'student6@demo.com')
) as u(id, email);

-- 2b. Matching email identities (required by GoTrue for email/password users)
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
  'email', now(), now(), now()
from auth.users u
where u.email like '%@demo.com';

-- 3. Profiles
insert into public.profiles (id, role, full_name) values
  ('d1a23456-7890-4112-a314-141516171819', 'teacher', 'Mr. Emmanuel Idowu'),
  ('d2a23456-7890-4112-a314-141516171819', 'teacher', 'Mrs. Jane Doe'),
  ('e1b23456-7890-4112-a314-141516171819', 'student', 'Alex Johnson'),
  ('e2b23456-7890-4112-a314-141516171819', 'student', 'Ben Davis'),
  ('e3b23456-7890-4112-a314-141516171819', 'student', 'Charlie Smith'),
  ('e4b23456-7890-4112-a314-141516171819', 'student', 'Danielle White'),
  ('e5b23456-7890-4112-a314-141516171819', 'student', 'Ethan Green'),
  ('e6b23456-7890-4112-a314-141516171819', 'student', 'Fiona Brown');

-- 4. Classrooms
insert into public.classrooms (id, name, teacher_id) values
  ('c1c23456-7890-4112-a314-141516171819', 'English Lit Homeroom (Grade 4)', 'd1a23456-7890-4112-a314-141516171819'),
  ('c2c23456-7890-4112-a314-141516171819', 'Creative Reading (Grade 5)', 'd2a23456-7890-4112-a314-141516171819');

-- 5. Enrollments: teacher1 has students 1-4; teacher2 has 4-6 (student 4 overlaps)
insert into public.enrollments (class_id, student_id) values
  ('c1c23456-7890-4112-a314-141516171819', 'e1b23456-7890-4112-a314-141516171819'),
  ('c1c23456-7890-4112-a314-141516171819', 'e2b23456-7890-4112-a314-141516171819'),
  ('c1c23456-7890-4112-a314-141516171819', 'e3b23456-7890-4112-a314-141516171819'),
  ('c1c23456-7890-4112-a314-141516171819', 'e4b23456-7890-4112-a314-141516171819'),
  ('c2c23456-7890-4112-a314-141516171819', 'e4b23456-7890-4112-a314-141516171819'),
  ('c2c23456-7890-4112-a314-141516171819', 'e5b23456-7890-4112-a314-141516171819'),
  ('c2c23456-7890-4112-a314-141516171819', 'e6b23456-7890-4112-a314-141516171819');

-- 6. Books: 10 public-domain classics with opening excerpts
insert into public.books (id, title, author, reading_level, content_text) values
  ('b1b23456-7890-4112-a314-141516171819', 'Alice in Wonderland', 'Lewis Carroll', 'Lexile 700L (Grades 3-5)',
   'CHAPTER I. Down the Rabbit-Hole. Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?" So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.'),

  ('b2b23456-7890-4112-a314-141516171819', 'The Secret Garden', 'Frances Hodgson Burnett', 'Lexile 970L (Grades 4-6)',
   'When Mary Lennox was sent to Misselthwaite Manor to live with her uncle everybody said she was the most disagreeable-looking child ever seen. It was true, too. She had a little thin face and a little thin body, thin light hair and a sour expression. Her hair was yellow, and her face was yellow because she had been born in India and had always been ill in one way or another. Her father had held a position under the English Government and had always been busy and ill himself, and her mother had been a great beauty who cared only to go to parties and amuse herself with gay people.'),

  ('b3b23456-7890-4112-a314-141516171819', 'Peter Pan', 'J. M. Barrie', 'Lexile 910L (Grades 3-5)',
   'All children, except one, grow up. They soon know that they will grow up, and the way Wendy knew was this. One day when she was two years old she was playing in a garden, and she plucked another flower and ran with it to her mother. I suppose she must have looked rather delightful, for Mrs. Darling put her hand to her heart and cried, "Oh, why can''t you remain like this for ever!" This was all that passed between them on the subject, but thenceforth Wendy knew that she must grow up. You always know after you are two. Two is the beginning of the end.'),

  ('b4b23456-7890-4112-a314-141516171819', 'The Wonderful Wizard of Oz', 'L. Frank Baum', 'Lexile 600L (Grades 3-5)',
   'Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer''s wife. Their house was small, for the lumber to build it had to be carried by wagon many miles. There were four walls, a floor and a roof, which made one room; and this room contained a rusty looking cookstove, a cupboard for the dishes, a table, three or four chairs, and the beds. Uncle Henry and Aunt Em had a big bed in one corner, and Dorothy a little bed in another corner. There was no garret-hole at all, and no cellar-except a small hole dug in the ground, called a cyclone cellar.'),

  ('b5b23456-7890-4112-a314-141516171819', 'Treasure Island', 'Robert Louis Stevenson', 'Lexile 1070L (Grades 5-7)',
   'Squire Trelawney, Dr. Livesey, and the rest of these gentlemen having asked me to write down the whole particulars about Treasure Island, from the beginning to the end, keeping nothing back but the bearings of the island, and that only because there is still treasure not yet lifted, I take up my pen in the year of grace 17--, and go back to the time when my father kept the Admiral Benbow inn, and the brown old seaman with the sabre cut first took up his lodging under our roof.'),

  ('b6b23456-7890-4112-a314-141516171819', 'Black Beauty', 'Anna Sewell', 'Lexile 1010L (Grades 4-6)',
   'The first place that I can well remember was a large pleasant meadow with a pond of clear water in it. Some shady trees leaned over it, and rushes and water-lilies grew at the deep end. Over the hedge on one side we looked into a plowed field, and on the other we looked over a gate at our master''s house, which stood by the roadside. While I was young I lived upon my mother''s milk, as I could not eat grass. In the daytime I ran by her side, and at night I lay down close by her.'),

  ('b7b23456-7890-4112-a314-141516171819', 'Anne of Green Gables', 'L. M. Montgomery', 'Lexile 990L (Grades 4-6)',
   'Mrs. Rachel Lynde lived just where the Avonlea main road dipped down into a little hollow, fringed with alders and ladies'' eardrops and traversed by a brook that had its source away back in the woods of the old Cuthbert place. It was reputed to be an intricate, headlong brook in its earlier course through those woods, with dark secrets of pool and cascade; but by the time it reached Lynde''s Hollow it was a quiet, well-conducted little stream.'),

  ('b8b23456-7890-4112-a314-141516171819', 'The Jungle Book', 'Rudyard Kipling', 'Lexile 1020L (Grades 4-6)',
   'It was seven o''clock of a very warm evening in the Seeonee hills when Father Wolf woke up from his day''s rest, scratched himself, yawned, and spread out his paws one after the other to get rid of the sleepy feeling in their tips. Mother Wolf lay with her big gray nose dropped across her four tumbling, squealing cubs, and the moon shone into the mouth of the cave where they all lived.'),

  ('b9b23456-7890-4112-a314-141516171819', 'The Adventures of Tom Sawyer', 'Mark Twain', 'Lexile 950L (Grades 4-6)',
   '"Tom!" No answer. "TOM!" No answer. "What''s gone with that boy, I wonder? You TOM!" No answer. The old lady pulled her spectacles down and looked over them about the room; then she put them up and looked out under them. She seldom or never looked through them for so small a thing as a boy; they were her state pair, the pride of her heart, and were built for style, not service.'),

  ('b0b23456-7890-4112-a314-141516171819', 'The Wind in the Willows', 'Kenneth Grahame', 'Lexile 1140L (Grades 4-6)',
   'The Mole had been working very hard all the morning, spring-cleaning his little home. First with brooms, then with dusters; then on ladders and steps and chairs, with a brush and a pail of whitewash; till he had dust in his throat and eyes, and splashes of whitewash all over his black fur, and an aching back and weary arms. Spring was moving in the air above and in the earth below and around him, penetrating even his dark and lowly little house with its spirit of divine discontent and longing.');

-- 7. Assignments
-- a1: teacher1/class1, Alice in Wonderland, due in 7 days (active)
-- a2: teacher1/class1, Peter Pan, due 5 days ago (overdue demo)
-- a3: teacher2/class2, The Secret Garden, due in 10 days (proves teacher scoping + student4 multi-class view)
insert into public.assignments (id, class_id, book_id, due_date) values
  ('a1a23456-7890-4112-a314-141516171819', 'c1c23456-7890-4112-a314-141516171819', 'b1b23456-7890-4112-a314-141516171819', current_date + 7),
  ('a2a23456-7890-4112-a314-141516171819', 'c1c23456-7890-4112-a314-141516171819', 'b3b23456-7890-4112-a314-141516171819', current_date - 5),
  ('a3a23456-7890-4112-a314-141516171819', 'c2c23456-7890-4112-a314-141516171819', 'b2b23456-7890-4112-a314-141516171819', current_date + 10);

-- 8. Per-student progress records
insert into public.assignment_records (id, assignment_id, student_id, status) values
  -- a1 (active): all four class-1 students
  ('f1f23456-7890-4112-a314-141516171819', 'a1a23456-7890-4112-a314-141516171819', 'e1b23456-7890-4112-a314-141516171819', 'completed'),
  ('f2f23456-7890-4112-a314-141516171819', 'a1a23456-7890-4112-a314-141516171819', 'e2b23456-7890-4112-a314-141516171819', 'in_progress'),
  ('f3f23456-7890-4112-a314-141516171819', 'a1a23456-7890-4112-a314-141516171819', 'e3b23456-7890-4112-a314-141516171819', 'not_started'),
  ('f4f23456-7890-4112-a314-141516171819', 'a1a23456-7890-4112-a314-141516171819', 'e4b23456-7890-4112-a314-141516171819', 'not_started'),
  -- a2 (overdue): three class-1 students
  ('f5f23456-7890-4112-a314-141516171819', 'a2a23456-7890-4112-a314-141516171819', 'e1b23456-7890-4112-a314-141516171819', 'in_progress'),
  ('f6f23456-7890-4112-a314-141516171819', 'a2a23456-7890-4112-a314-141516171819', 'e2b23456-7890-4112-a314-141516171819', 'completed'),
  ('f7f23456-7890-4112-a314-141516171819', 'a2a23456-7890-4112-a314-141516171819', 'e3b23456-7890-4112-a314-141516171819', 'not_started'),
  -- a3 (teacher2): three class-2 students
  ('f8f23456-7890-4112-a314-141516171819', 'a3a23456-7890-4112-a314-141516171819', 'e4b23456-7890-4112-a314-141516171819', 'in_progress'),
  ('f9f23456-7890-4112-a314-141516171819', 'a3a23456-7890-4112-a314-141516171819', 'e5b23456-7890-4112-a314-141516171819', 'not_started'),
  ('f0f23456-7890-4112-a314-141516171819', 'a3a23456-7890-4112-a314-141516171819', 'e6b23456-7890-4112-a314-141516171819', 'completed');

-- 9. Reading sessions (append-only; logged_at drives the derived "logged late" indicator)
insert into public.reading_sessions (record_id, seconds_read, logged_at) values
  -- a1 (due +7): everything below is on time
  ('f1f23456-7890-4112-a314-141516171819', 900,  now() - interval '2 days'),
  ('f1f23456-7890-4112-a314-141516171819', 600,  now() - interval '1 day'),
  ('f2f23456-7890-4112-a314-141516171819', 720,  now()),
  -- a2 (due -5): f5 logged today -> LATE; f6 has one on-time log and one late log
  ('f5f23456-7890-4112-a314-141516171819', 480,  now()),
  ('f6f23456-7890-4112-a314-141516171819', 1200, now() - interval '6 days'),
  ('f6f23456-7890-4112-a314-141516171819', 300,  now() - interval '1 day'),
  -- a3 (due +10): on time
  ('f8f23456-7890-4112-a314-141516171819', 600,  now() - interval '3 hours'),
  ('f0f23456-7890-4112-a314-141516171819', 900,  now() - interval '2 days'),
  ('f0f23456-7890-4112-a314-141516171819', 300,  now() - interval '1 day');
