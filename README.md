# Teacher Reading Assignment Portal (Scholastic Coding Challenge)

An end-to-end, high-performance web application designed to help teachers assign public-domain classic books to students and monitor active reading time telemetry.

*   **GitHub Repository**: [https://github.com/Idimma/reading-assignment-portal](https://github.com/Idimma/reading-assignment-portal)

---

## 🚀 Quickstart: Local Development

### 1. Configure Supabase Environment Variables
Create a `.env.local` file in the root of the project:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Schema & Seed Data
*   Execute `/supabase/migrations/01_schema.sql` in your Supabase SQL Editor.
*   Execute `/supabase/seed.sql` to pre-populate mock data, books, and credentials.

### 3. Run the Development Server
```bash
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 4. Running Unit Tests
```bash
npm run test
```

---

## 🔑 Demo Test Accounts
Both teachers and students use the shared password: **`Demo1234!`**

| User Role | Email Address | Assigned Class / Access Roster |
| :--- | :--- | :--- |
| **Teacher 1** | `teacher1@demo.com` | English Lit Homeroom (Grade 4) — Has access to students 1-4 |
| **Teacher 2** | `teacher2@demo.com` | Creative Reading (Grade 5) — Has access to students 4-6 |
| **Student 1** | `student1@demo.com` | Enrolled in English Lit Homeroom |
| **Student 4** | `student4@demo.com` | Overlapping Student (Enrolled in both classrooms) |

---

## 🏗️ Architectural Decisions

### Next.js 15 App Router & Separated Service Layer
To mitigate any "but we're a Java shop" counter-signal, all SQL queries, transactions, and business logic are isolated inside **`/src/lib/services/*`** (pure TypeScript files). This structure acts as a 1:1 analogue to the standard **Spring Boot layered architecture** (Controller $\rightarrow$ Service $\rightarrow$ Repository). The route handlers and page files function purely as controllers.

### Row Level Security (RLS) & Server-Enforced Authz
Rather than relying on client-side routing protection, all data queries are defended at the PostgreSQL database level using **Row Level Security (RLS)**. Students can only see their own assignments; teachers can only CRUD assignments inside classrooms they teach.

### Append-Only Telemetry Logs (`reading_sessions`)
Instead of updating a single mutable `minutes_read` column which is prone to concurrency updates and race conditions, we implement an **append-only reading log**. Total minutes read are dynamically computed using SQL `SUM` aggregations, providing a complete historical audit trail of student engagement sessions.

### Database-Level State Machine
Status state machines and auto-promotion (e.g. status shifting to `in_progress` once a student starts reading) are managed directly via **PostgreSQL Database Triggers**. This guarantees data integrity even if the backend service layer is bypassed.

---

## ⏱️ Telemetry & AI Value-Adds (The Scholastic Differentiator)

1.  **Active Telemetry tracking (Anti-Cheating)**:
    The Book Reader component implements the browser **Visibility API**. If the student switches browser tabs or minimizes their screen, the reading timer automatically pauses. It compiles and logs the exact active seconds read when they click "Log Session".
2.  **Vocabulary Explainer Widget (Mock AI)**:
    Students can double-click/highlight any complex word inside the Reader (like *rabbit*, *tired*, or *cyclone*) to trigger a callout popup. This routes to `/api/v1/explain`, returning simplified definitions and age-appropriate example sentences matching a 3rd-to-5th grade reading level, showcasing your alignment with Scholastic's *AI enablement* scope.

---

## 📊 Triage Table: Production Benchmarking & Tradeoffs

To deliver this challenge within a strict development timeframe, the following tradeoffs were accepted and would be addressed in a production release:

| Domain Area | Prototype Hack / Current Approach | Production Target | Tradeoff / Rationale |
| :--- | :--- | :--- | :--- |
| **Classroom Provisioning** | Static DB seed script | Integrate with SIS Rostering APIs (Clever, ClassLink, Google Classroom) | Saves time. Hand-rolling user rosters in production leads to sync drifts. |
| **Book Licensing / DRM** | Public domain text stored inside PostgreSQL columns | EPUB/PDF parser linking to an authenticated Content Distribution CDN | Prototypes need open contents. Production media requires copyright defense. |
| **Offline Synchronization** | Assumes stable internet connection for logs | Save logs to IndexedDB and sync asynchronously when online | Simple prototype. Students reading in offline environments would lose logs. |
| **Comprehension Audits** | Time-based telemetry tracking | Comprehension check-ins, quiz prompts, and scroll heatmaps | Raw time doesn't prove reading. Active audits ensure academic integrity. |

---

## 🤖 How I Used AI Tooling (Role-Specific)

Following your team's developer velocity guidelines, AI was utilized as a **force multiplier**:
1.  **Scaffolding**: Used AI to draft standard tailwind component pages, forms, and service code structures.
2.  **Unit Tests**: Prompted AI to generate the 8 Vitest unit tests verifying Zod schema limits.
3.  **Human Oversight (My Role)**: Corrected the AI when it proposed *ChromaDB* (which would fail compilation on newer Python 3.14 setups), refactoring to LlamaIndex built-in stores. Debugged the Vitest run by recognizing Zod's strict RFC 4122 variant regex (`[89abAB]`) and replacing invalid mock UUIDs to resolve the test failures.
