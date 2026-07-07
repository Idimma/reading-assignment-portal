# Teacher Reading Assignment Portal

A lightweight, end-to-end reading assignment portal built for classroom use. Teachers create and assign reading material to entire class rosters and monitor each student's progress in real time. Students receive a focused reading experience: they open assigned books, track their active reading time, update their assignment status, and use a vocabulary assistant that explains unfamiliar words while they read.

The portal supports:

- **Teacher assignment creation** — select a book, a classroom roster, and a due date; one click fans out individual progress records for every enrolled student
- **Student reading progress tracking** — a per-session timer runs while the student reads and pauses automatically when the tab is backgrounded
- **Assignment status updates** — students move work through `Not Started → In Progress → Completed`; a status-transition guard prevents illegal reversions
- **Teacher progress visibility** — the teacher dashboard shows per-assignment breakdowns: minutes read, completion counts, late-log flags, and individual student status
- **AI-assisted vocabulary lookup** — students highlight any single word while reading; the vocabulary assistant returns a plain-English definition and a grade-appropriate example sentence

---

## Live Demo

| Resource | URL |
|---|---|
| Frontend | [`Frontend`](https://reading-assignment-portal-lime.vercel.app/login) |
| GitHub Repository | https://github.com/Idimma/reading-assignment-portal |

> The application is a full-stack Next.js project with no separate backend service. Both the UI and all server actions are deployed as a single Vercel deployment connected to a hosted Supabase project.

---

## Demo Access

This project uses seeded demo users and Supabase email/password authentication. A `seed.sql` file creates all demo accounts with a deterministic bcrypt hash. Every account shares the same password.

**Demo password for all accounts: `Demo1234!`**

### Teacher accounts

| Name | Email |
|---|---|
| Mr. Emmanuel Idowu | `teacher1@demo.com` |
| Mrs. Jane Doe | `teacher2@demo.com` |

### Student accounts

| Name | Email | Classroom |
|---|---|---|
| Alex Johnson | `student1@demo.com` | English Lit Homeroom (Grade 4) |
| Ben Davis | `student2@demo.com` | English Lit Homeroom (Grade 4) |
| Charlie Smith | `student3@demo.com` | English Lit Homeroom (Grade 4) |
| Danielle White | `student4@demo.com` | English Lit Homeroom (Grade 4) + Creative Reading (Grade 5) |
| Ethan Green | `student5@demo.com` | Creative Reading (Grade 5) |
| Fiona Brown | `student6@demo.com` | Creative Reading (Grade 5) |

After login, middleware reads the authenticated user's `role` from the `profiles` table and redirects them to either `/teacher` or `/student`. There is no role switcher; the role is determined at account creation time and enforced at the database layer via RLS.

---

## Tech Stack

### Frontend / Full-Stack Framework

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.x | Full-stack framework; App Router + Server Actions |
| React | 19.x | UI rendering |
| TypeScript | 5.x | End-to-end type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Zod | 4.x | Schema validation at every service boundary |
| `@supabase/ssr` | 0.12.x | Auth session management for Next.js middleware and Server Components |

### Backend / Persistence

| Technology | Purpose |
|---|---|
| Supabase (hosted PostgreSQL) | Relational database with built-in auth (GoTrue) |
| Row-Level Security (RLS) | Database-enforced access control — no application-level permission middleware needed |
| SECURITY DEFINER functions | Break RLS policy cycles; provide an atomic, transactional assignment fan-out |
| Next.js Server Actions | Replaces a dedicated REST API; server-side data access runs co-located with the UI |

### AI

The vocabulary assistant (`POST /api/v1/explain`) is a Next.js API Route that returns structured `{ definition, explanation }` responses. In the current implementation responses are served from a curated in-process dictionary covering key vocabulary across all seeded books. The route is a clean service boundary: replacing the dictionary lookup with an OpenAI or Anthropic call requires changing only the route handler — zero client changes required.

### Deployment

- **Frontend + Server Actions**: Vercel (Next.js native target)
- **Database + Auth**: Supabase hosted project

---

## Features Implemented

### Challenge Requirements Mapping

| Challenge requirement | Implemented evidence |
|---|---|
| Teachers can assign reading material | `/teacher/assignments/new` lets a teacher choose a book, classroom roster, and due date |
| Assignments fan out to students | `public.create_assignment()` creates one `assignment_record` per enrolled student in a single transaction |
| Students can view assigned reading | `/student` lists active assignments scoped to the signed-in student |
| Students can read assigned books | `/student/read/[recordId]` renders the assigned book text and reader controls |
| Reading progress is tracked | `reading_sessions` stores append-only session logs; dashboards aggregate minutes from those rows |
| Assignment status is tracked | `assignment_records.status` supports `not_started`, `in_progress`, and `completed`, with DB transition guards |
| Teachers can monitor progress | `/teacher` shows assignment-level counts, total minutes, late-log flags, and per-student detail rows |
| Role-based access is enforced | Supabase RLS policies scope teachers to their classrooms and students to their own records |
| AI is product-relevant | `/api/v1/explain` provides bounded vocabulary support inside the reading workflow |
| Reviewer can test quickly | Seeded demo users, deterministic password, migrations, seed SQL, and npm scripts are documented below |

### Teacher

- View all classrooms with enrolled student counts
- Browse all available books (title, author, Lexile reading level)
- Create an assignment by selecting a book, a classroom roster, and a due date
- Assignment creation fans out one `assignment_record` per enrolled student atomically via a Postgres `SECURITY DEFINER` function
- View all active assignments on a dashboard with expandable per-student progress rows
- Per-assignment aggregate stats: total students, completion/in-progress/not-started counts, total minutes read, late-log flag
- Per-student view: status badge, minutes read, whether any sessions were logged after the due date
- Soft-delete (archive) an assignment; student reading data is preserved

### Student

- View all assigned reading with status badges, due dates, overdue indicators, and minutes read
- Toggle status between `In Progress` and `Completed` directly from the dashboard
- Open the full book reader for any assignment
- Active reading timer: counts seconds while the tab is visible; pauses automatically via the Page Visibility API
- Log a reading session to the database (appended as an immutable row; total minutes are aggregated from all sessions at read time)
- Vocabulary assistant: highlight any single word in the text to fetch its definition and a grade-level example sentence

### AI Feature — Vocabulary Assistant

Students highlight a word in the reader. The client POSTs it to `/api/v1/explain`, which returns `{ definition, explanation }`. The result renders in the sidebar panel without interrupting reading. Lookups are limited to single words (≤ 30 characters, no spaces) to keep the feature focused.

Students can also **bookmark** looked-up words. Bookmarks are saved to the `word_bookmarks` table scoped to the student and the specific assignment record. A second sidebar tab lists all saved words with their definitions and allows removal. Bookmarks persist across devices.

---

## Architecture

### High-Level Architecture

```
Browser (React / Next.js App Router)
         │
         │  RSC / Server Components (data pre-fetched before render)
         │  Server Actions (mutations with Zod validation)
         ▼
Next.js Server (Vercel)
         │
         │  @supabase/ssr — createClient() per request
         ▼
Service Layer  (src/lib/services/)
  assignments.ts  ·  session.ts  ·  auth.ts  ·  bookmarks.ts
         │
         │  Supabase JS client (typed against database.types.ts)
         ▼
Supabase PostgreSQL
  ┌─────────────────────────────────────────┐
  │  Tables: profiles, classrooms,          │
  │  enrollments, books, assignments,       │
  │  assignment_records, reading_sessions,  │
  │  word_bookmarks                         │
  ├─────────────────────────────────────────┤
  │  RLS policies (per-role row access)     │
  │  SECURITY DEFINER functions:            │
  │    create_assignment()  — fan-out       │
  │    is_teacher_of_class()                │
  │    is_enrolled_in_class()               │
  │  DB trigger: status_updated_at stamp    │
  └─────────────────────────────────────────┘

Vocabulary Assistant
Browser highlight event
         │
         ▼
POST /api/v1/explain  (Next.js API Route)
         │
         ▼
Dictionary / LLM service boundary
(current: curated in-process dictionary;
 swap for OpenAI/Anthropic with no client changes)
```

### Why This Architecture Was Chosen

**Next.js App Router + Server Actions instead of a separate REST API**
The product is a teacher/student CRUD portal with no public API consumers. Running server-side data access inside the same deployment eliminates a separate service, a second deployment target, and an entire CORS surface. Server Actions provide CSRF protection by default and keep validation, authorization, and data access co-located in a single typed function.

**Supabase instead of a self-hosted or embedded database**
Supabase provides GoTrue-compatible email/password auth, hosted PostgreSQL, and a JS client that works in both Node.js and edge runtimes — all without standing up a separate backend service. The hosted project also enables a live demo without requiring a reviewer to run any local infrastructure.

**Row-Level Security as the primary authorization layer**
Permissions are expressed once as Postgres RLS policies rather than duplicated in application code. A teacher cannot query another teacher's classroom data regardless of which code path runs the query. This is a production-grade pattern that is harder to accidentally bypass than application-level filtering.

**Atomic assignment fan-out via a SECURITY DEFINER function**
Assigning a book to a class must create all student progress records or none. A single `create_assignment()` Postgres function wraps the entire operation in one transaction, keeping the application layer thin and preventing partial states.

**Append-only reading sessions**
`reading_sessions` rows are never updated. Each log action appends a new row. Totals are aggregated at query time. This makes session history auditable, enables late-log detection by comparing `logged_at` to `due_date`, and avoids update conflicts.

**Bounded AI feature**
The vocabulary assistant is a focused student workflow feature, not a generic chatbot. It sits behind a clean HTTP boundary (`/api/v1/explain`) and handles one clear job. This keeps the product workflow legible and makes the underlying implementation trivially swappable.

---

## Frontend Design

### Pages / Routes

| Route | Audience | Purpose |
|---|---|---|
| `/login` | All | Email + password sign-in |
| `/teacher` | Teacher | Assignment overview dashboard |
| `/teacher/assignments/new` | Teacher | Book + classroom + due-date assignment form |
| `/student` | Student | Assigned reading dashboard with status controls |
| `/student/read/[recordId]` | Student | Full book reader with timer, session log, vocabulary assistant |

### Data Loading Pattern

Pages are React Server Components that call Server Actions directly — no `fetch()` to an internal API. Data is loaded before the page renders and passed to Client Components as props. Client Components own local interaction state. Mutations call Server Actions and then call `router.refresh()` to revalidate the RSC tree.

### State Management

No external state library. Each Client Component owns its local state with `useState`. This is intentionally simple; a production system with concurrent mutations across many users would benefit from a query cache (TanStack Query) on top of this same Server Action pattern.

---

## Data Model / Schema

### profiles

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | FK → `auth.users.id` |
| `role` | enum (`teacher`, `student`) | Determines routing and RLS row visibility |
| `full_name` | text | |
| `created_at` | timestamptz | |

There is no separate `Teacher` and `Student` table. Role is a column on a unified `profiles` table.

### classrooms

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | text | |
| `teacher_id` | uuid | FK → `profiles.id` |
| `created_at` | timestamptz | |

### enrollments

Composite PK `(class_id, student_id)`. A student can be enrolled in multiple classrooms.

### books

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `title` | text | |
| `author` | text | |
| `cover_url` | text (nullable) | |
| `content_text` | text | Full public-domain excerpt stored in the database |
| `reading_level` | text (nullable) | Lexile string, e.g. `Lexile 700L (Grades 3-5)` |
| `created_at` | timestamptz | |

### assignments

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `class_id` | uuid | FK → `classrooms.id` |
| `book_id` | uuid | FK → `books.id` |
| `due_date` | date | |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz (nullable) | Soft-delete; NULL = active |

One `assignments` row represents the entire class. Individual student progress lives in `assignment_records`.

### assignment_records

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `assignment_id` | uuid | FK → `assignments.id` |
| `student_id` | uuid | FK → `profiles.id` |
| `status` | enum (`not_started`, `in_progress`, `completed`) | |
| `status_updated_at` | timestamptz | Stamped by DB trigger on every status change |

Unique constraint on `(assignment_id, student_id)`. Assigning one book to a class creates one record per enrolled student — each student has an independent status and reading history.

### reading_sessions

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `record_id` | uuid | FK → `assignment_records.id` |
| `seconds_read` | integer | Must be 1–28800 (max 8 h per log) |
| `logged_at` | timestamptz | Used to detect sessions logged after the due date |

Append-only. Totals are aggregated at read time.

### word_bookmarks

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `student_id` | uuid | FK → `profiles.id` |
| `record_id` | uuid | FK → `assignment_records.id` |
| `word` | text | |
| `definition` | text | |
| `explanation` | text | Grade-level example sentence |
| `created_at` | timestamptz | |

Unique constraint on `(student_id, record_id, word)`. Upsert semantics prevent duplicate saves.

### Assignment Status Transitions

```
not_started  ──→  in_progress  ──→  completed
                      ↑_________________↓   (reopen allowed)

Cannot revert to not_started once started — enforced by DB trigger.
```

---

## API Overview

All data mutations use Next.js Server Actions. The single HTTP endpoint is:

### `POST /api/v1/explain` — Vocabulary Assistant

**Request:**
```json
{ "word": "cyclone" }
```

**Response (200):**
```json
{
  "definition": "A violent tropical storm with heavy winds rotating around a center point.",
  "explanation": "The cyclone carried Dorothy's house high up into the clouds."
}
```

Words not found in the dictionary receive a graceful fallback response rather than a 404. Input is validated server-side; a missing `word` field returns `400`.

---

## Running Locally

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project for local development. The deployed demo URL can be used without local Supabase setup once the `Live Demo` TODO above is replaced.

### Setup

```bash
git clone https://github.com/Idimma/reading-assignment-portal.git
cd reading-assignment-portal
npm ci
```

### Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

For a fresh local clone, copy `.env.example` first:

```bash
cp .env.example .env.local
```

Then replace the placeholder values with your Supabase project URL and anon key. Demo user emails and passwords are seeded by `supabase/seed.sql`; Supabase project credentials are intentionally not committed.

### Database Setup (new Supabase project only)

Apply migrations in order from the Supabase SQL Editor or via the CLI:

```
supabase/migrations/01_schema.sql
supabase/migrations/02_fix_rls_fanout_and_policies.sql
supabase/migrations/03_edge_cases_and_fixes.sql
supabase/migrations/04_word_bookmarks.sql
```

Then run the seed file:

```
supabase/seed.sql
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

---

## Deployment Notes

The application is a standard Next.js project. The recommended deployment target is **Vercel**.

Required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

No CORS configuration is needed — all server-side operations run within the same Next.js deployment. The Supabase project's `Site URL` and `Redirect URLs` should include the production Vercel domain.

---

## Key Architectural Decisions

### 1. Server Actions over a Separate REST Backend

All data mutations use Next.js Server Actions. This co-locates Zod validation, Supabase session checks, and data access in a single typed function without a separate service, deployment, or API versioning surface. For a product whose only consumer is its own UI, a dedicated REST layer would be pure overhead under any timebox.

### 2. RLS as the Authorization Layer

Permissions are expressed once as Postgres RLS policies. A teacher can only query records belonging to their own classrooms regardless of which code path runs the query. This is a production-grade pattern that is harder to accidentally bypass than application-level filtering and requires no changes as the codebase grows.

### 3. Atomic Assignment Fan-Out via Postgres Function

The `create_assignment()` SECURITY DEFINER function wraps the `assignments` insert and the per-student `assignment_records` fan-out in a single transaction. This prevents partial states and keeps the application code thin. Race conditions between concurrent assignment creates for the same class are handled at the DB level.

### 4. One Assignment Record Per Student

A single teacher action creates one `assignment_record` per enrolled student. Each record is independent — two students reading the same book never share a status or reading time counter. This is the correct model for individual progress tracking and simplifies every query and display.

### 5. Append-Only Reading Sessions

`reading_sessions` rows are never updated in place. Each "Log Session" action appends a new row. This makes session history auditable, enables late-log detection by comparing `logged_at` to `due_date`, and avoids update conflicts when a student logs multiple sessions.

### 6. Bounded AI Feature Behind a Service Boundary

The vocabulary assistant is scoped to one clear job: look up a word and return `{ definition, explanation }`. It sits behind `/api/v1/explain`. The current implementation uses an in-process dictionary. Upgrading to an LLM requires changing only the route handler — no client changes, no service-layer changes, no schema changes.

### 7. Seeded Demo Identity over Full Auth Implementation

Supabase GoTrue provides real email/password authentication. Rather than building sign-up, email verification, and password reset in the timebox, eight pre-configured accounts are seeded. The auth boundary is real (JWT-based session, middleware-enforced role routing, RLS-enforced data isolation) — only the user registration UI is out of scope.

---

## Tradeoffs and Decision Mechanism

Under the timebox, decisions were evaluated against three criteria:

1. Does this demonstrate the core product workflow end to end?
2. Does this make the project easy for a reviewer to run and understand?
3. Does this create a clean extension point for production hardening?

| Decision | Chosen Approach | Alternative | Why |
|---|---|---|---|
| Backend | Next.js Server Actions | Separate Spring Boot / Express API | Single deployment; the product has no non-UI API consumers |
| Auth | Seeded demo users + Supabase GoTrue | Full sign-up / OAuth flow | Auth boundary is real; only registration UI is skipped |
| Database | Hosted Supabase PostgreSQL | Local H2 / SQLite | Enables live demo; no local DB setup for reviewers |
| Authorization | Postgres RLS | Application-layer filtering | Single source of truth; cannot be accidentally bypassed |
| AI | In-process dictionary behind API boundary | Direct LLM integration | Zero-latency, zero-cost, trivially upgradeable without client changes |
| API style | Server Actions | REST / GraphQL | Single UI consumer; REST layer would be pure overhead |
| Testing | Unit tests on domain logic + schema validation | Full integration + E2E | Working vertical slice first; highest-risk pure-logic modules covered |
| State management | `useState` + `router.refresh()` | TanStack Query / Zustand | Sufficient for this interaction model |

---

## Assumptions

- A teacher assigns a book to an entire classroom roster, not to individual students.
- Each enrolled student receives exactly one `assignment_record` per assignment. Students who join a classroom after an assignment is created do not automatically receive a record.
- Reading time is self-reported via the in-app timer. The Page Visibility API pause is a mitigation against idle tabs, not a guarantee of active reading.
- Assignment status cannot revert to `not_started` once a student has started. This is enforced at the database layer.
- Book content is stored as plain text in the database. Images, chapter navigation, and rich formatting are out of scope.
- AI output (vocabulary definitions) is advisory and does not modify any student record.
- The `word_bookmarks` feature requires the `04_word_bookmarks.sql` migration to be applied.

---

## Testing

Run the full test suite:

```bash
npm test
```

Run type-checking:

```bash
npx tsc --noEmit
```

Run lint:

```bash
npm run lint
```

Run accessibility smoke tests against a running app:

```bash
E2E_BASE_URL=http://localhost:3002 npm run test:e2e:a11y
```

### What is covered

**`src/lib/services/__tests__/progress.test.ts`**
- All 9 status-transition combinations verified against the state machine
- `aggregateReadingSessions` correctly totals seconds, rounds to minutes, and flags sessions logged after the due date

**`src/lib/services/__tests__/validation.test.ts`**
- `logSessionSchema` accepts valid sessions; rejects zero, negative, non-integer, and over-limit values
- `updateStatusSchema` accepts the three legal status strings; rejects arbitrary values
- `createAssignmentSchema` validates UUID format; rejects past due dates

Both test files run in a pure Node.js environment (no DOM, no Supabase connection) via Vitest.

**`tests/accessibility.spec.ts`**
- Login form controls are labelled and checked with axe for critical violations
- Teacher book cards can be selected by keyboard and expose `aria-pressed`
- Runs through Playwright; start the app first with `npm run build && PORT=3002 npm run start`

### What I would expand next

- Integration tests against a local Supabase instance: verify `create_assignment()` fan-out row counts; verify RLS prevents cross-user data access
- Broader Playwright E2E: teacher login → create assignment → student login → log session → verify teacher dashboard reflects updated minutes
- Authorization boundary tests: verify a student cannot read another student's `assignment_records` via the Supabase client

---

## What I Would Improve With More Time

### Authentication and Authorization

- Student self-registration with classroom join codes
- Teacher-initiated student invitations
- OAuth providers (Google Classroom integration)
- Session expiry and refresh token hardening

### AI

- Connect `/api/v1/explain` to an LLM (OpenAI GPT-4o or Anthropic Claude) for full vocabulary coverage
- Teacher-facing progress insight: summarize struggling students, flag overdue readers, suggest follow-up actions
- Comprehension question generation per chapter
- Prompt versioning and evaluation pipeline

### Product

- Assignment filters and search on the teacher dashboard
- Due date warning badges and overdue email notifications
- Bulk assignment creation
- Student reading progress charts (minutes over time)
- Classroom management UI (add/remove students)

### Persistence

- Flyway/Liquibase migration tracking
- Query performance review for the teacher dashboard aggregation
- Soft-delete restoration UI

### Testing

- Integration tests with a local Supabase instance
- Playwright E2E for teacher and student flows
- RLS policy regression tests in CI

### Operations

- Structured logging with request correlation IDs
- Error tracking (Sentry)
- CI pipeline: lint → typecheck → test → deploy preview
- Metrics and distributed tracing

---

## Timebox Note

This submission was completed under a strict implementation window. I focused on delivering a complete, understandable vertical slice — real auth, real RLS, real relational data model, working teacher and student flows — rather than a broader but unfinished system. The architecture choices (Server Actions, RLS, append-only sessions, bounded AI boundary) are the same choices I would make on a production system, not shortcuts taken to save time.
