# AI Optimization & Engineering Judgment Report

## 1. Tools & Prompting
- **Primary AI Engineer**: Google Deepmind's Antigravity (Agentic AI)
- **Frameworks Scaffolded**: Next.js (App Router), TailwindCSS, Supabase (PostgreSQL), Vitest
- **Prompting Strategy**: Used iterative prompting to generate the database schema, construct complex React components (like the `VerificationTerminalModal`), and orchestrate a full integration test suite. Specific prompts were used to enforce domain logic and refine UI aesthetics.

## 2. Flawed / Broken AI Code
Throughout the development cycle, the AI generated several flawed or sub-optimal patterns that required architectural scrutiny:

1. **Brittle API Authentication (Cookie-only Bias)**: The AI initially scaffolded API routes (`/api/orders/[id]/verify` and `/api/sewing/queue`) using a standard Supabase SSR client that relied entirely on Next.js cookies. When we attempted to run our integration test suite using standard `Authorization: Bearer <token>` headers to simulate different roles, the API silently failed to extract the user, blocking our automated testing and presenting an architectural limitation for future mobile/external clients.
2. **Deficient UI Input Guards & Contrast Vulnerabilities**: For critical forms (like `CreateOrderModal` and `VerificationTerminalModal`), the AI generated standard `<input type="number">` fields. It failed to implement strict keystroke blocking for invalid characters (e.g., `-`, `e`, `.`) and silently fell back to browser defaults. Additionally, the AI did not explicitly assign text colors (`text-gray-900`) and background colors (`bg-white`), creating a severe risk of "white-on-white" text rendering under certain OS-level dark mode overrides.
3. **Missing Foreign/Primary Keys in Complex Joins**: In the `sewing/queue` API route, the AI generated a complex Supabase query to fetch nested relations but forgot to select the `id` column for `verification_items`. This resulted in `undefined` React keys, causing rendering warnings and potential state-sync bugs during re-renders.
4. **Hardcoded Secrets & Unclean Test Teardowns**: The AI initially placed hardcoded Supabase passwords and service role keys inside test setup files. Furthermore, it did not provide cleanup mechanisms (`afterAll` hooks) for integration tests, allowing test dummy data to permanently persist and pollute the database.
5. **Disorganized Architecture & Type Errors**: The AI initially dumped tests in an unstructured format and placed TypeScript assertions (`as any`) inside plain `.js` files, causing runtime parse errors.

## 3. Human Refactoring
To rectify these AI-generated flaws, significant engineering judgment and manual refactoring were applied:

- **Hardened API Authentication**: I rewrote the authentication logic within the API routes to proactively intercept and parse the `Authorization` header. If present, the route dynamically constructs a Supabase client configured to use that specific header, ensuring secure, RLS-compliant execution for both Web and Test/External clients.
- **Defensive UI & Accessibility**: I re-engineered the inputs to enforce strict UX guidelines. I implemented `onKeyDown` handlers to physically block non-numeric/invalid keystrokes. I also enforced explicit high-contrast Tailwind classes (`bg-white text-gray-900 placeholder-gray-400`) and added dynamic conditional classes that render an immediate red border and inline error message when payloads are empty or invalid.
- **Secret Management & Test Environment Integrity**: I ripped out all hardcoded passwords, securely migrating them to `.env.local`. I also fixed AI hallucinations regarding schema column names (`qty_per_garment` vs `pieces_per_garment`) and implemented a robust `afterAll` hook to safely cascade-delete generated test data.
- **Test Suite Refactoring & Auth Synchronization**: Restructured the tests into `src/tests/unit` and `src/tests/integration` folders. I also wrote a custom Node.js script (`scripts/sync-users.mjs`) to manually synchronize Supabase Auth UUIDs with our custom `users` table to ensure Role-Based Access Control (RBAC) functioned flawlessly during tests.

## 4. Defensive Architecture
To ensure the system remains resilient against malicious actors or UI state bypasses, we implemented a highly defensive architecture:

- **Server-Side State Machine**: State transitions (e.g., `PENDING` -> `VERIFIED`) are strictly computed on the server. The client cannot arbitrarily submit `status: 'VERIFIED'`. The backend evaluates the component array, calculates if the actual count matches the expected count, and transitions the state autonomously.
- **Zero-Trust API Guards (RBAC)**: All API mutations execute a mandatory role check against the `users` table *before* executing business logic. If a user bypasses the UI and sends a cURL request to verify an order, the API verifies if `user.role === 'cutting_verifier'` and responds with `403 Forbidden` if not.
- **"Supreme Security" (Read-Only Database via PostgREST)**: While Supabase PostgREST allows direct table mutations secured by RLS, we opted for an enterprise-grade "Supreme Security" pattern. We completely **dropped all `INSERT`, `UPDATE`, and `DELETE` RLS policies** for `authenticated` users. The database is strictly **READ-ONLY** for external clients (browsers, Postman, automated scripts). All mutations are forced through our Next.js API Routes, which utilize an internal `adminClient` (Service Role Key) to securely process and commit the transaction *after* validating all business and role logic. This eliminates any possibility of a malicious authenticated user finding a loophole in column-level privileges.
- **Proactive Performance Indexing**: To prevent UI sluggishness during high-volume production, we injected composite and scalar indexes (`idx_cutting_orders_status`, `idx_verification_logs_verifier_timestamp`, etc.) directly into the PostgreSQL instance, ensuring instantaneous data retrieval for dashboard aggregations and the Verifier's personal "Verified History" tab.
