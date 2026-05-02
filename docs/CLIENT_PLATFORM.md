# GNet Client Platform — Full Technical Reference

> **Scope:** Everything in the `apps/web` and `apps/server` that a client (job submitter) touches.  
> **Honest status:** What is fully working, what is stubbed for dev, and what is scaffolded but not yet wired.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Full Client Workflow](#2-full-client-workflow)
3. [Job Status Lifecycle](#3-job-status-lifecycle)
4. [File-by-File Reference](#4-file-by-file-reference)
   - [Auth — Register](#41-appwebapiauthrregisterroutets)
   - [Auth — Login Page](#42-appwebapploginpagetsx)
   - [Auth — Register Page](#43-appwebappregisterpagetsx)
   - [Shared — Navbar](#44-appwebcomponentssharednavbartsx)
   - [Shared — Logo](#45-appwebcomponentssharedlogotsx)
   - [Shared — Auth Provider](#46-appwebcomponentssharedauth-providertsx)
   - [API — Jobs List/Create](#47-appwebappapiJobsroutets)
   - [API — Job Detail/Cancel](#48-appwebappapiJobsidroute-ts)
   - [Dashboard — Client Home](#49-appwebappdashboardclientpagetsx)
   - [Dashboard — Submit Job](#410-appwebappdashboardclientsubmitpagetsx)
   - [Dashboard — Job Detail](#411-appwebappdashboardclientjobsidpagetsx)
   - [Server — Job Controller](#412-appsserversrccontrollersjobcontrollerts)
   - [Server — Job Routes](#413-appsserversrcroutesjobRoutests)
   - [Server — Matchmaker Worker](#414-appsserversrcworkersmatchmakerworkerts)
   - [Server — Job Queue](#415-appsserversrcqueuesjobqueuets)
   - [DB Schema — Relevant Models](#416-packagesdbprismaschema)
5. [What Is Actually Happening (Honest Status)](#5-what-is-actually-happening-honest-status)
6. [What Is Stubbed / Dev-Only](#6-what-is-stubbed--dev-only)
7. [What Is In Schema But Not Yet Implemented](#7-what-is-in-schema-but-not-yet-implemented)
8. [Supported Job Types](#8-supported-job-types)
9. [Escrow State Machine](#9-escrow-state-machine)
10. [Known Design Decisions & Notes](#10-known-design-decisions--notes)
11. [Database + Redis: How They Work Together](#11-database--redis-how-they-work-together)

---

## 1. Architecture Overview

```
Browser (Next.js App Router)
│
├── /login              — Email+Password / Google OAuth via NextAuth
├── /register           — Creates user with CLIENT or PROVIDER role
│
├── /client             — Client dashboard (auth-gated)
│   ├── /client/submit  — 3-step job submission form
│   └── /client/jobs/:id — Job detail + live-polling timeline
│
└── /api (Next.js Route Handlers)
    ├── /api/auth/*     — NextAuth + custom register
    ├── /api/jobs       — GET (list) / POST (create)
    └── /api/jobs/:id   — GET (detail) / PATCH (cancel)

Express Server (apps/server, port 3001)
│
├── POST /auth/login    — JWT auth for non-NextAuth clients (agents)
├── GET  /jobs          — List client jobs (JWT)
├── POST /jobs          — Submit job (JWT) — same logic as Next.js route
├── GET  /jobs/:id      — Job detail (JWT)
├── PATCH /jobs/:id/cancel — Cancel job (JWT)
└── GET  /health/queue  — Redis/BullMQ health

BullMQ + Redis (Cloud Redis, ap-northeast-2)
│
└── Queue: "job-matching"
    └── Worker: matchmaker.worker.ts
        ├── Reads FUNDED jobs from queue
        ├── Filters providers by VRAM / GPU tier requirements
        └── Atomically assigns job + sets provider BUSY

PostgreSQL (Prisma)
    ├── User      — auth, roles
    ├── Provider  — GPU nodes
    ├── Job       — workloads
    ├── Escrow    — payment tracking
    └── JobEvent  — immutable audit log
```

---

## 2. Full Client Workflow

```
1. Register (/register)
   → POST /api/auth/register
   → User created in DB with role=CLIENT, password bcrypt-hashed
   → Auto sign-in with credentials, redirect → /client

2. Login (/login)
   → NextAuth signIn("credentials") or signIn("google")
   → Session cookie set (JWT strategy)
   → Redirect to /client (CLIENT role) or /provider (PROVIDER role)

3. Dashboard (/client)
   → Fetches GET /api/jobs?limit=10
   → Shows: Active Deployments count, Total Jobs count, Escrow Locked (SOL)
   → Job list with status badge, progress bar, and GPU model

4. Submit Job (/client/submit)
   Step 1 — Pick workload class (8 types, 3 categories)
   Step 2 — Fill job details (title, framework, input URI, notes)
   Step 3 — Set requirements (budget, duration, min VRAM, GPU tier, priority)
   → POST /api/jobs with full payload
   → Redirect → /client/jobs/:id

5. Job Detail (/client/jobs/:id)
   → GET /api/jobs/:id (includes events + provider)
   → Auto-polls every 5s while job is non-terminal
   → Shows: status badge, provider GPU info, I/O URIs, event timeline
   → Cancel button (visible when CREATED or FUNDED)
   → PATCH /api/jobs/:id on cancel
```

---

## 3. Job Status Lifecycle

```
CREATED ─────────────────────────────────────┐
    │                                         │ (client cancels)
    ▼                                         ▼
FUNDED ──── (matchmaker, VRAM/tier match) ─► ASSIGNED ──► RUNNING
    │                                             │           │
    │ (client cancels)                            │           ├──► COMPLETED ──► PAID
    ▼                                             │           │
FAILED ◄──────────────────────────────────────────          ├──► FAILED ──► REFUNDED
    │ (escrow REFUNDED)                                      │
    └── Note: CANCELLED maps to FAILED status               └──► DISPUTED ──► PAID | REFUNDED
                                                                  (admin resolves)
```

**Status meanings:**
| Status | Meaning | Escrow State |
|--------|---------|-------------|
| `CREATED` | Job created, no payment yet | — |
| `FUNDED` | Escrow locked, waiting in Redis queue | `LOCKED` |
| `ASSIGNED` | Matchmaker found provider, DB assigned | `LOCKED` |
| `RUNNING` | Provider agent executing | `LOCKED` |
| `COMPLETED` | Provider finished, output URI set | `LOCKED` → `RELEASED` |
| `PAID` | On-chain payment confirmed | `RELEASED` |
| `FAILED` | Execution failed OR client cancelled | `REFUNDED` (provider fail) / `RELEASED` (current cancel impl) |
| `DISPUTED` | Client raised dispute | `DISPUTED` |
| `REFUNDED` | Funds returned to client | `REFUNDED` |

> **Note on `FAILED` dual-meaning:** There's no dedicated `CANCELLED` enum. Both provider-failed and client-cancelled jobs end up as `FAILED`. The distinction is in the `JobEvent` — cancelled jobs have a `CANCELLED` event with `metadata.cancelledBy`.

---

## 4. File-by-File Reference

### 4.1 `apps/web/app/api/auth/register/route.ts`

**Purpose:** REST endpoint that creates a new User in the database.

**What it does:**
- `POST /api/auth/register`
- Accepts `{ name, email, password, role }` JSON body
- Validates email uniqueness
- Hashes password with `bcryptjs` (10 rounds)
- Creates `User` with `role = "CLIENT" | "PROVIDER"` (defaults CLIENT if invalid)
- Returns `{ message, userId, role }` with 201

**What it does NOT do:**
- Does not issue a JWT or session — that happens via NextAuth `signIn()` called immediately after on the client
- Does not send a welcome email
- Does not verify email

---

### 4.2 `apps/web/app/login/page.tsx`

**Purpose:** Email+Password login with Google OAuth fallback.

**What it does:**
- `signIn("credentials", { email, password, redirect: false })` via NextAuth
- On success: calls `getSession()` to read the role, then redirects:
  - `PROVIDER` → `/provider`
  - `CLIENT` (or any other) → `/client`
- Google button: `signIn("google", { callbackUrl: "/client" })` — redirects directly (no role-based split for Google users)
- Shows inline error for invalid credentials

**What is NOT wired:**
- No "forgot password" flow
- Google OAuth requires `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` env vars; if not set the button silently fails

---

### 4.3 `apps/web/app/register/page.tsx`

**Purpose:** Account creation with role selection (CLIENT or PROVIDER).

**What it does:**
- Two-button role toggle (CLIENT / PROVIDER), defaults to CLIENT
- Submits `POST /api/auth/register` then immediately calls `signIn("credentials")` to auto-login
- On success redirects to `/client` or `/provider` based on selected role
- Min password length: 6 characters (HTML validation)

---

### 4.4 `apps/web/components/shared/navbar.tsx`

**Purpose:** Fixed top navigation bar across all pages.

**What it does:**
- Landing page anchor links (Problem, Solution, Process, Scale, Security)
- "Earn with GPU" link → `/provider`
- Auth state aware:
  - **Logged out:** "Launch App" button → `/login`
  - **Logged in:** Avatar dropdown with first name, links to `/client` Dashboard, and Sign Out button
- Sign Out calls `signOut()` from NextAuth (clears session cookie)
- Animated hover indicator on nav links (framer-motion `layoutId`)

---

### 4.5 `apps/web/components/shared/logo.tsx`

**Purpose:** Brand logo as a clickable `<Link>` to `/`.

**What it does:** Renders the "Zan Network" wordmark (or logo image) wrapped in a Next.js `Link`. Used in Navbar and Footer.

---

### 4.6 `apps/web/components/shared/auth-provider.tsx`

**Purpose:** Wraps the app in NextAuth's `SessionProvider` so all client components can call `useSession()`.

**What it does:** Thin wrapper — `<SessionProvider session={session}>{children}</SessionProvider>`. Placed in the root layout so session is available everywhere without re-fetching.

---

### 4.7 `apps/web/app/api/jobs/route.ts`

**Purpose:** Next.js Route Handler for listing and creating jobs. The web app's own API layer — separate from the Express server.

#### `GET /api/jobs`

**What it does:**
- Requires NextAuth session (returns 401 if missing)
- Reads `page` and `limit` query params (defaults: page=1, limit=20, max limit=50)
- Returns paginated jobs for the authenticated client:
  ```json
  { "jobs": [...], "total": 42, "page": 1, "limit": 20 }
  ```
- Each job includes: `id, title, type, status, budget, createdAt, provider { gpuModel, location }, escrow { status, amount }`

#### `POST /api/jobs`

**What it does:**
- Requires NextAuth session
- Validates required fields: `title, type, inputUri, budget, escrowTxSig`
- Validates `type` is one of 8 allowed values
- Validates `budget` is a positive number
- Creates in a single Prisma transaction:
  1. `Job` record (status = `FUNDED`, stores `requiredVramGB` and `requiredGpuTier`)
  2. `Escrow` record (status = `LOCKED`, `depositTxSig` = the provided sig)
  3. `JobEvent` with type `CREATED`
- Returns `{ success: true, jobId }` with 201

**Validation table:**
| Field | Required | Validation |
|-------|----------|-----------|
| `title` | Yes | Non-empty string |
| `type` | Yes | One of 8 allowed types |
| `inputUri` | Yes | Non-empty string |
| `budget` | Yes | Positive number |
| `escrowTxSig` | Yes | Non-empty string (any value, no on-chain verification) |
| `requiredVramGB` | No | Positive integer if provided |
| `requiredGpuTier` | No | 0, 1, or 2 — defaults to 0 |
| `metadata` | No | Stored informally (not in DB, not persisted — currently unused) |

> **Note:** The `metadata` field (framework, duration, priority, notes) sent by the submit form is accepted in the request body but is **not stored anywhere** in the current schema. These fields are UI-only display values and would need a `metadata Json?` column on Job or a separate table to persist.

---

### 4.8 `apps/web/app/api/jobs/[id]/route.ts`

**Purpose:** Single job detail fetch and cancellation.

#### `GET /api/jobs/:id`

- Returns the full job with nested `events` (ordered by `createdAt asc`), `escrow`, and `provider { gpuModel, vramGB, location, tier }`
- 403 if the job belongs to a different client

#### `PATCH /api/jobs/:id`

**Purpose:** Cancel a job.

- Only works if `job.status` is `CREATED` or `FUNDED` — returns 409 otherwise
- Transaction:
  1. Sets `job.status = "FAILED"` (no CANCELLED status in enum)
  2. Sets `escrow.status = "RELEASED"` ← see note below
  3. Creates `JobEvent` with type `CANCELLED`, `metadata.by = clientId`

> **Design note / known issue:** For client cancellations, `escrow.status` should be `REFUNDED` (funds returning to client) not `RELEASED` (which semantically means payment to provider). The Escrow model has separate `refundTxSig` / `releaseTxSig` fields for this purpose. The current code uses `RELEASED` as a placeholder because there is no actual on-chain refund transaction yet.

---

### 4.9 `apps/web/app/(dashboard)/client/page.tsx`

**Purpose:** Client home dashboard — live job overview.

**What it does:**
- `useSession({ required: true })` — redirects to login if no session
- Fetches `GET /api/jobs?limit=10` on mount
- Displays 3 metric cards:
  - **Active Deployments** — jobs in `FUNDED | ASSIGNED | RUNNING`
  - **Total Jobs** — total count from API response
  - **Escrow Locked** — sum of `escrow.amount` where `escrow.status === "LOCKED"`, in SOL
- Job table: each row shows ID prefix, type, GPU model, title, budget, status badge, animated progress bar
- Clicking a row navigates to `/client/jobs/:id`
- Empty state with CTA to submit first job
- Error state if fetch fails

**Progress bar values by status:**
```
CREATED=5%, FUNDED=20%, ASSIGNED=40%, RUNNING=65%, COMPLETED/PAID=100%, FAILED/DISPUTED=100%
```

---

### 4.10 `apps/web/app/(dashboard)/client/submit/page.tsx`

**Purpose:** 3-step job submission form — the primary client interaction surface.

#### Step 1 — Workload Class

8 job types grouped into 3 categories:

| Category | Type | VRAM Default | SOL/hr Rate |
|----------|------|-------------|------------|
| AI & Machine Learning | `inference` — LLM Inference | 16 GB | 0.004 |
| AI & Machine Learning | `training` — Model Training | 40 GB | 0.020 |
| AI & Machine Learning | `fine-tune` — Fine-tuning | 24 GB | 0.12 |
| AI & Machine Learning | `embedding` — Embeddings | 8 GB | 0.002 |
| Creative & Media | `render` — 3D Rendering | 16 GB | 0.008 |
| Creative & Media | `image-gen` — Image Generation | 12 GB | 0.006 |
| Creative & Media | `video-gen` — Video & Upscaling | 24 GB | 0.015 |
| Scientific & Data | `pipeline` — Data Pipeline | 8 GB | 0.004 |

Selecting a type:
- Resets framework selection
- Auto-sets `requiredVram` to that type's VRAM default

#### Step 2 — Job Details

- **Title** (required, max 100 chars) — auto-filled if framework chip clicked with empty title
- **Framework / Model** — chip selector, per-type options. Clicking auto-fills title. `Custom` shows free-text input
- **Input URI** (required) — S3, IPFS, or HTTPS URI pointing to the job's input data. "Use test URI" button generates a fake `ipfs://Qm...` for development
- **Run Notes** (optional) — free text for container image, hyperparameters, verifier instructions

#### Step 3 — Requirements

- **Budget** (required) — SOL amount. Shows estimated runtime: `budget / ratePerHour` hours
- **Estimated Duration** — dropdown: `< 1hr | 1–4hr | 4–12hr | 12–48hr | 48+hr` (metadata only, not stored in DB yet)
- **Minimum VRAM** — pre-filled from type default, editable
- **Priority** — `Standard | Rush` toggle (metadata only, not implemented in matchmaker yet)
- **GPU Trust Tier** — `Any (0) | Trusted (1) | Verified (2)` — stored as `requiredGpuTier`, matchmaker filters by this

#### Sidebar — Deployment Quote

Live summary of: budget, estimated runtime, duration, VRAM, trust tier, priority, framework.

"Dev Escrow" amber notice box explains that funds are simulated.

#### Submission

On submit:
1. Generates a fake `escrowTxSig = "dev_" + crypto.randomUUID()`
2. `POST /api/jobs` with all fields
3. On success: navigates to `/client/jobs/:jobId`
4. Inline error display on validation/server failures

---

### 4.11 `apps/web/app/(dashboard)/client/jobs/[id]/page.tsx`

**Purpose:** Individual job detail view with live timeline polling.

**What it does:**
- Fetches `GET /api/jobs/:id` on mount
- **Auto-polls every 5 seconds** while job is non-terminal (`COMPLETED | FAILED | PAID` are terminal — polling stops)
- Shows:
  - Status badge with color coding (blue=FUNDED, purple=ASSIGNED, cyan=RUNNING, green=COMPLETED/PAID, red=FAILED, orange=DISPUTED)
  - Metrics strip: type, budget (SOL), submitted timestamp
  - **Assigned Node** card: GPU model, VRAM GB, tier, location (appears once `providerId` is set)
  - **Input URI** and **Output URI** (clickable external link when present)
  - **Event Timeline** — chronological list of all `JobEvent` records with timestamps and dot connector
  - Latest event has glowing cyan dot, earlier events have muted dots
- **Refresh button** — manual re-fetch (only shown while non-terminal)
- **Cancel Job button** — only shown when status is `CREATED` or `FUNDED`; calls `PATCH /api/jobs/:id`; on success re-fetches

---

### 4.12 `apps/server/src/controllers/job.controller.ts`

**Purpose:** Express controller for the server-side job API (used by the agent and external JWT clients).

#### `submitJob` — POST `/jobs`

Mirrors `apps/web/app/api/jobs/route.ts POST` with identical validation. Reads `clientId` from `req.user.id` (JWT middleware). Creates Job + Escrow + JobEvent in one transaction, then calls `enqueueJob(job.id)` to push to Redis.

**Differences from Next.js route:**
- Uses JWT auth (not NextAuth session)
- Calls `enqueueJob()` directly — the Next.js route does NOT call `enqueueJob()` currently (queue push is only done server-side via this controller or would need to be added)

> **Important gap:** The Next.js `POST /api/jobs` route does **not** call `enqueueJob()`. Jobs created through the web UI are stored in DB with `status = FUNDED` but are never pushed to the Redis queue. The matchmaker will not pick them up automatically. This needs to be wired: after the transaction in the Next.js route, `enqueueJob(job.id)` must be called. For now only jobs submitted through the Express server (port 3001) are actually queued.

#### `listClientJobs` — GET `/jobs`

Paginated list (page/limit) of the authenticated client's jobs. Same select shape as the Next.js GET route.

#### `getJob` — GET `/jobs/:id`

Full job detail including nested `events`, `escrow`, and `provider`. Enforces ownership (403 if not client's job).

#### `cancelJob` — PATCH `/jobs/:id/cancel`

Only cancels `CREATED` or `FUNDED` jobs (409 otherwise). Same transaction pattern as the Next.js PATCH route.

#### `getJobEvents` — GET `/jobs/:id/events`

Returns the raw `JobEvent` array for a job (audit trail). Enforces ownership.

---

### 4.13 `apps/server/src/routes/job.routes.ts`

**Purpose:** Express router binding job controller methods to HTTP verbs.

```
POST   /jobs              → submitJob
GET    /jobs              → listClientJobs
GET    /jobs/:id          → getJob
PATCH  /jobs/:id/cancel   → cancelJob
GET    /jobs/:id/events   → getJobEvents
```

All routes are behind `verifyJWT` middleware — requires `Authorization: Bearer <token>` header.

---

### 4.14 `apps/server/src/workers/matchmaker.worker.ts`

**Purpose:** BullMQ worker that processes the `job-matching` queue and assigns GPU providers to funded jobs.

**What it does (current implementation):**

```
For each BullMQ job in the queue:

1. Fetch the Job from DB (id, status, title, type, inputUri, budget,
   requiredVramGB, requiredGpuTier)

2. Guard checks:
   - If Job not found → discard (no retry)
   - If Job.status !== "FUNDED" → skip silently (already assigned or cancelled)

3. Find best matching Provider:
   WHERE status = "ACTIVE"
     AND vramGB >= requiredVramGB   (only if requiredVramGB is set)
     AND tier >= requiredGpuTier    (only if requiredGpuTier > 0)
   ORDER BY tier DESC, lastHeartbeat DESC
   (prefer higher-tier, most recently active)

4. If no provider found:
   → throw "NO_PROVIDER_AVAILABLE"
   → BullMQ retries up to 15 times with exponential backoff (10s base)
   → Job stays FUNDED

5. If provider found:
   Prisma $transaction:
   ├── job.update: status = "ASSIGNED", providerId = provider.id
   ├── provider.update: status = "BUSY"
   └── jobEvent.create: type = "ASSIGNED", metadata = { providerId, gpuModel, tier }

6. sendJobToProvider(provider.id, jobPayload) via WebSocket
   - If provider is connected: job sent immediately
   - If provider is offline: assignment is in DB, provider gets it when it reconnects
```

**What it does NOT do:**
- Does not handle RUNNING, COMPLETED, FAILED, PAID transitions — those come from the provider agent
- Does not implement tier-based shadow verification (schema has it, worker doesn't)
- Does not set a `verificationProviderId` — verification routing is not implemented yet

---

### 4.15 `apps/server/src/queues/jobQueue.ts`

**Purpose:** BullMQ Queue definition and `enqueueJob` helper.

**Configuration:**
```typescript
Queue name:    "job-matching"
Prefix:        "gnet"           // Redis keys live under gnet:bull:job-matching:*
Attempts:      15
Backoff:       exponential, 10 000ms base
RemoveOnComplete: { age: 3600 } // keep completed jobs for 1 hour (observability)
RemoveOnFail:  { count: 200 }   // keep last 200 failed jobs for debugging
```

**Key namespacing:** The `prefix: "gnet"` option scopes all BullMQ Redis keys under `gnet:bull:job-matching:*`. Without it, keys would land under `bull:job-matching:*` and collide with any other BullMQ instance sharing the same Redis. All three queue clients (server `jobQueue.ts`, server `matchmaker.worker.ts`, web `lib/jobQueue.ts`) must use the same prefix — a mismatch silently creates two separate queues.

**Deduplication:** BullMQ uses `jobId` as both the payload field and the BullMQ job ID (`{ jobId: id }` in the add options). Adding the same `jobId` twice returns the same BullMQ job — prevents double-queueing if the HTTP handler is called more than once.

---

### 4.16 `packages/db/prisma/schema` — Relevant Models

#### `User`
```
id            cuid
email         unique
password      bcrypt hash (nullable, absent for OAuth users)
walletAddress unique (nullable) — Solana wallet, not yet set during registration
role          CLIENT | PROVIDER | ADMIN
```

#### `Job`
```
id                 cuid
clientId           → User
providerId         → Provider (set by matchmaker)
verificationProviderId → Provider (tier-0 shadow verify, not yet used)
title, type        string
inputUri           input data pointer
outputUri          set by provider agent after completion
requiredVramGB     Int? — matchmaker filter
requiredGpuTier    Int default 0 — matchmaker filter
budget             Decimal (SOL)
finalCost          Decimal? — set by provider on completion
status             JobStatus enum
verificationStatus VerificationStatus — default PENDING (not yet driven)
executionMetadata  Json? — set by provider: executionTimeMs, vramUsedMb, exitCode, etc.
startedAt/completedAt DateTime? — set by provider agent
```

#### `Escrow`
```
jobId         unique → Job
amount        Decimal (SOL)
token         "SOL" (fixed)
status        LOCKED | RELEASED | REFUNDED | DISPUTED
depositTxSig  string — the Solana tx that locked funds (dev: fake UUID)
releaseTxSig  string? — Solana tx releasing to provider
refundTxSig   string? — Solana tx returning to client
```

#### `JobEvent` (audit log)
```
jobId     → Job
type      string — "CREATED" | "ASSIGNED" | "RUNNING" | "COMPLETED" | "FAILED" |
                   "CANCELLED" | "PAID" | "REFUNDED" | "DISPUTED" | ...
metadata  Json? — arbitrary data per event type
```

---

## 5. What Is Actually Happening (Honest Status)

### Auth ✅ Working
- Email+password registration and login works end-to-end
- Password hashed with bcrypt
- NextAuth session cookie set correctly
- Role-based redirect after login (CLIENT → /client, PROVIDER → /provider)
- Google OAuth configured but requires real `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

### Job Submission ✅ Working (with dev escrow)
- Form validates all fields client-side before submit
- `POST /api/jobs` creates Job + Escrow + JobEvent atomically in Postgres
- Job lands in DB with `status = FUNDED`, `escrow.status = LOCKED`
- User is redirected to the job detail page immediately
- All 8 job types, VRAM requirements, and GPU tier requirements are persisted correctly

### Job Listing & Detail ✅ Working
- Dashboard fetches and displays last 10 jobs with real DB data
- Status badges, progress bars, and metric counts are all driven by real job records
- Job detail page polls every 5s and stops on terminal status
- Event timeline shows real `JobEvent` records in chronological order
- Cancel button visible only for CREATED/FUNDED and calls the PATCH endpoint

### Matchmaker Worker ✅ Working (with important caveat below)
- Worker reads from Redis queue, filters providers by VRAM and tier
- FUNDED → ASSIGNED transition is atomically committed in Postgres
- Provider status set to BUSY
- ASSIGNED JobEvent created with providerId in metadata
- Exponential backoff retry (up to 15 attempts) when no provider available
- Gracefully handles ghost jobIds and already-cancelled jobs

### Queue Push ✅ Working
- **Express server route (`POST /jobs`)**: calls `enqueueJob()` after transaction ✅
- **Next.js web route (`POST /api/jobs`)**: calls `enqueueJob()` after transaction ✅

Both routes now push to the same Redis queue. Jobs submitted through the web UI reach the matchmaker worker correctly.

### Provider Execution ⚠️ Not Yet Implemented
- After ASSIGNED, the provider agent (desktop app) receives the job via WebSocket
- The agent transitions: RUNNING, COMPLETED/FAILED, sets `outputUri`, `executionMetadata`, `finalCost`
- These transitions are not in the web/server code — they come from the provider-side agent
- Currently the job stays at ASSIGNED indefinitely after the matchmaker assigns it

### Payment Settlement ⚠️ Not Yet Implemented
- No actual Solana transactions occur
- `escrowTxSig` is a fake `dev_<uuid>` generated in the browser
- `releaseTxSig` / `refundTxSig` are never populated — no on-chain release/refund happens
- The `Escrow.status` field tracks the intended state, but no SOL actually moves

---

## 6. What Is Stubbed / Dev-Only

| Feature | What the UI Shows | What Actually Happens |
|---------|-------------------|-----------------------|
| Escrow / Wallet | "Dev Escrow" notice in form sidebar | `escrowTxSig = "dev_" + randomUUID()`, no Solana tx |
| Solana balance | Not shown in UI | No wallet connected, no balance check |
| Payment release | Not shown in UI | `releaseTxSig` never set |
| Priority (Rush) | Toggle in form | Stored in metadata (not in DB), matchmaker ignores it |
| Duration field | Dropdown in form | Not persisted to DB, UI display only |
| Run Notes | Textarea in form | Sent in metadata JSON in request body, not stored in DB |
| Framework selection | Chip selector | Sent in metadata JSON in request body, not stored in DB |
| Verification | Schema has full model | Matchmaker doesn't route to verification providers yet |

---

## 7. What Is In Schema But Not Yet Implemented

### `QUEUED` JobStatus
The schema has `QUEUED` as a status. In the intended design this would be an intermediate state between `CREATED` (form submitted, payment not confirmed) and `FUNDED` (escrow locked on-chain). Currently the code jumps directly to `FUNDED` because the Solana payment step is mocked.

### Provider Verification Tiers
The schema has:
- `tier 0` → every job shadow-verified by a second provider
- `tier 1` → 1 in 5 jobs verified
- `tier 2` → random spot checks only

The matchmaker currently picks any ACTIVE provider that meets VRAM/tier requirements. It does not:
- Select a separate `verificationProviderId`
- Set `verificationStatus`
- Handle `verificationOutputUri` comparison

### Staking
`Provider.stakedAmount`, `StakeTransaction`, stake requirements per tier — in schema but no stake management API exists yet.

### ProviderMetric
`totalJobs`, `successfulJobs`, `avgExecutionTimeMs`, `performanceScore` etc. — in schema but never updated by server code.

### `finalCost` vs `budget`
`finalCost` (what was actually charged based on execution time) is set by the provider agent on completion. Until then only `budget` (max the client is willing to pay) is present.

### Dispute Resolution
`DISPUTED` status and `escrow.status = DISPUTED` are in the schema and test suite. There is no admin dispute resolution endpoint yet.

### `walletAddress` on User
`User.walletAddress` is in the schema with a unique constraint. The registration form doesn't collect it. Wallet linking (Phantom/Backpack) is a future step.

---

## 8. Supported Job Types

| Type | Label | VRAM Default | Rate (SOL/hr) | Typical Frameworks |
|------|-------|-------------|-------------|-------------------|
| `inference` | LLM Inference | 16 GB | 0.004 | LLaMA-3 70B, Mistral 7B, Qwen 2.5 |
| `training` | Model Training | 40 GB | 0.020 | LLaMA-3, Stable Diffusion XL, BERT |
| `fine-tune` | Fine-tuning | 24 GB | 0.12 | LLaMA-3-8B, Mistral 7B, Phi-3 |
| `embedding` | Embeddings | 8 GB | 0.002 | BGE-M3, E5-mistral, CLIP |
| `render` | 3D Rendering | 16 GB | 0.008 | Blender, Cinema 4D, Unreal, V-Ray |
| `image-gen` | Image Generation | 12 GB | 0.006 | SDXL, FLUX.1-dev, ControlNet |
| `video-gen` | Video & Upscaling | 24 GB | 0.015 | AnimateDiff, RIFE, Real-ESRGAN |
| `pipeline` | Data Pipeline | 8 GB | 0.004 | RAPIDS cuDF, CuPy, Dask-CUDA |

Validation for `type` is enforced in both the Next.js route and the Express controller. Any value outside this list returns 400.

---

## 9. Escrow State Machine

```
                        ┌─────────┐
       Job submitted    │  LOCKED │  (funds held)
       ─────────────►  └────┬────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       Job completed   Client cancel   Dispute raised
       (provider paid)  (refund)       (frozen)
              │              │              │
              ▼              ▼              ▼
          RELEASED        REFUNDED      DISPUTED
        (→ provider)    (→ client)    (awaiting admin)
                                           │
                                    ┌──────┴──────┐
                               Admin rules      Admin rules
                               for provider      for client
                                    │              │
                                    ▼              ▼
                                RELEASED        REFUNDED
```

**DB fields by transition:**

| Transition | status | Solana tx field set |
|-----------|--------|---------------------|
| Completed → provider paid | `RELEASED` | `releaseTxSig` + `releasedAt` |
| Cancelled / failed → client refund | `REFUNDED` | `refundTxSig` + `refundedAt` |
| Dispute raised | `DISPUTED` | — |
| Dispute resolved for provider | `RELEASED` | `releaseTxSig` |
| Dispute resolved for client | `REFUNDED` | `refundTxSig` |

> Current cancel code uses `RELEASED` not `REFUNDED` — this is a known placeholder that needs fixing when real Solana integration is added.

---

## 10. Known Design Decisions & Notes

### Why cancelled jobs show `status = FAILED`
There is no `CANCELLED` value in the `JobStatus` enum. The decision was to reuse `FAILED` for both provider failures and client cancellations. Distinguishing between the two is done by checking for a `CANCELLED` type in `JobEvent`. This avoids an extra enum variant for now but can be confusing — consider adding `CANCELLED` to the enum in a future migration.

### How `enqueueJob` is called from the Next.js route
`apps/web/lib/jobQueue.ts` is a minimal BullMQ queue client that creates a connection to the same Redis instance using `REDIS_URL` from the web app's `.env`. It uses the identical queue name (`"job-matching"`), prefix (`"gnet"`), job options, and `jobId`-as-dedup-key as the server — so the matchmaker worker sees jobs from both routes without any code duplication.

### Redis failure is isolated from DB
The `enqueueJob()` call in the Next.js POST route is wrapped in its own `try/catch`, separate from the Prisma transaction. If Redis is temporarily unreachable, the job is already committed in Postgres as `FUNDED` — the user gets a 201 success response, and the job can be re-enqueued by a recovery scanner later. The client is never shown a failure for a Redis outage that didn't affect their data.

### Graceful shutdown on SIGTERM/SIGINT
`apps/server/src/index.ts` catches `SIGTERM` and `SIGINT` and calls `matchmakerWorker.close()` before exiting. BullMQ's `worker.close()` waits for any in-flight job to finish its `processJob()` function (including the Prisma transaction) before the process exits. Without this, a job being matched at deployment time would be abandoned mid-transaction. A 10-second force-exit timeout prevents the process from hanging forever if a job stalls.

### Why `metadata` (framework, duration, notes, priority) is not persisted
The `Job` model has no `metadata Json?` column. These fields are design-time placeholders included in the form for UX completeness. To persist them, add `metadata Json?` to the Job model in the Prisma schema and pass them through both API routes.

### `QUEUED` status is in schema but never used
Current flow: `CREATED` is the DB default, but the submit code immediately sets `status = "FUNDED"`. The intended use of `QUEUED` was for the window between form submission and on-chain escrow confirmation. Since escrow is currently mocked, this state is bypassed entirely.

### Matchmaker prefers higher-tier providers
`ORDER BY tier DESC, lastHeartbeat DESC` — a tier-2 verified provider will always be preferred over tier-0. This ensures clients who request `requiredGpuTier = 0` (any) still get the best available provider, not just any random ACTIVE one.

### `budget` vs `finalCost`
`budget` is the maximum the client agrees to pay. `finalCost` is what the provider actually charges (based on execution time × `provider.pricePerHour`). If execution is shorter than budgeted, the client gets a partial refund of `budget - finalCost`. This refund logic is not yet implemented — it requires the provider agent to report actual execution time, compute `finalCost`, and trigger a partial escrow release.

---

## 11. Database + Redis: How They Work Together

### The Core Mental Model

**Postgres is the source of truth. Redis is the dispatch channel.**

Postgres holds every fact about a job that must survive forever: who submitted it, what it costs, what happened to it, what the output was. Redis holds only one thing per job: a lightweight `{ jobId }` message saying "this job is ready to be matched." The message is ephemeral — once the matchmaker processes it, it's gone from Redis.

```
Postgres (permanent)        Redis / BullMQ (ephemeral)
─────────────────────       ──────────────────────────────
Job record (FUNDED)    ──►  gnet:bull:job-matching:wait
Escrow record (LOCKED)      [ { jobId: "cm..." } ]
JobEvent (CREATED)
                            ↓ matchmaker worker pops it
Job record (ASSIGNED)  ◄──  BullMQ job removed from queue
JobEvent (ASSIGNED)
```

### Step-by-Step: What Happens When a Client Submits a Job

```
1. Browser → POST /api/jobs (Next.js, port 3000)

2. Prisma $transaction (all-or-nothing):
   ├── INSERT INTO "Job"    { status: "FUNDED", budget: 1.5, ... }
   ├── INSERT INTO "Escrow" { status: "LOCKED", depositTxSig: "dev_uuid" }
   └── INSERT INTO "JobEvent" { type: "CREATED" }
   → If any of these fail, the whole transaction rolls back — no partial state

3. await enqueueJob(job.id)
   → Queue.add("match", { jobId: "cm..." }, { jobId: "cm..." })
   → ioredis writes to cloud Redis:
        LPUSH gnet:bull:job-matching:wait "cm..."
        HSET  gnet:bull:job-matching:cm... data='{"jobId":"cm..."}' timestamp=...
   → If Redis fails here: job stays FUNDED in DB, error is caught and logged,
     client still gets { success: true } — job is recoverable

4. Response → { success: true, jobId: "cm..." }
   → Browser navigates to /client/jobs/cm...
   → Page polls GET /api/jobs/cm... every 5s
```

### Step-by-Step: What the Matchmaker Does

```
Separately, on the Express server (port 3001):

5. BullMQ Worker watches Redis via BLMOVE (blocking pop):
   BLMOVE gnet:bull:job-matching:wait → gnet:bull:job-matching:active

6. Worker calls processJob({ data: { jobId: "cm..." } })

7. SELECT * FROM "Job" WHERE id = "cm..."
   → Check status === "FUNDED" (guard against double-processing)

8. SELECT * FROM "Provider"
   WHERE status = "ACTIVE"
     AND "vramGB" >= requiredVramGB    (if set)
     AND tier >= requiredGpuTier        (if > 0)
   ORDER BY tier DESC, "lastHeartbeat" DESC
   LIMIT 1

9a. No provider found:
    → throw "NO_PROVIDER_AVAILABLE"
    → BullMQ moves job to gnet:bull:job-matching:delayed (retry after backoff)
    → After 15 retries: moved to gnet:bull:job-matching:failed
    → Job stays FUNDED in Postgres indefinitely

9b. Provider found:
    → Prisma $transaction:
       UPDATE "Job" SET status="ASSIGNED", "providerId"=...
       UPDATE "Provider" SET status="BUSY"
       INSERT INTO "JobEvent" { type: "ASSIGNED", metadata: { providerId, gpuModel } }
    → BullMQ marks job completed:
       DEL gnet:bull:job-matching:cm... (but kept in completed set for 1 hour)
    → sendJobToProvider(provider.id, payload) via WebSocket
```

### Why DB is Written Before Redis (and why that ordering matters)

The Prisma transaction commits to Postgres **before** `enqueueJob` is called. This is intentional:

| Scenario | What happens |
|----------|-------------|
| Postgres write succeeds, Redis enqueue fails | Job is FUNDED in DB, recoverable by re-enqueuing |
| Redis enqueue succeeds, Postgres write fails | Impossible — Postgres is written first |
| Both succeed | Normal flow |
| Process crashes between DB write and Redis enqueue | Job is FUNDED in DB, never in queue — needs recovery scanner |

If Redis were written first and Postgres failed, you'd have a queue entry pointing to a job that doesn't exist in the DB — the matchmaker would fetch it, find nothing, and silently discard it. Funds would appear to be "swallowed."

### What Each System Owns

| Data | Where | Why |
|------|-------|-----|
| Job record (status, budget, URIs) | Postgres | Must survive Redis restart/flush |
| Escrow record (amounts, tx sigs) | Postgres | Financial data — never ephemeral |
| JobEvent audit trail | Postgres | Immutable history |
| Provider list (VRAM, tier, status) | Postgres | Source of truth for matching |
| "This job needs matching" signal | Redis | Ephemeral dispatch — OK to lose (recoverable) |
| Retry count / backoff state | Redis (BullMQ) | Managed by BullMQ automatically |
| Completed job record (1 hour) | Redis (BullMQ) | Short-term observability only |
| Failed job record (last 200) | Redis (BullMQ) | Debugging — not a permanent store |

### Redis Key Layout (after `prefix: "gnet"`)

```
gnet:bull:job-matching:id              — auto-incrementing BullMQ job ID counter
gnet:bull:job-matching:wait            — sorted set of waiting job IDs
gnet:bull:job-matching:active          — sorted set of jobs being processed now
gnet:bull:job-matching:delayed         — sorted set of jobs waiting for retry backoff
gnet:bull:job-matching:failed          — sorted set of permanently failed jobs (last 200)
gnet:bull:job-matching:completed       — sorted set of completed jobs (1 hour TTL)
gnet:bull:job-matching:<bullmq-id>     — hash with full job payload + metadata per job
```

All three queue clients — `apps/server/src/queues/jobQueue.ts` (Express), `apps/server/src/workers/matchmaker.worker.ts` (Worker), and `apps/web/lib/jobQueue.ts` (Next.js) — use `prefix: "gnet"` and `QUEUE_NAME: "job-matching"`, so they all read and write the exact same set of Redis keys.

### The "Two Writes" Problem and Why It Doesn't Matter Here

Every job submission does two separate writes: one to Postgres, one to Redis. These are not wrapped in a distributed transaction (there is no such thing that spans Postgres + Redis cleanly). The system handles this with:

1. **DB first** — if Redis fails, the job is not lost, just delayed
2. **Idempotent enqueue** — `jobId` as the BullMQ dedup key means re-enqueuing the same job is always safe
3. **Status guard in the worker** — `if (job.status !== "FUNDED") return` prevents a re-enqueued job from being double-assigned if the original enqueue did succeed
4. **(Future) recovery scanner** — a cron that scans for `status = FUNDED` jobs older than 2 minutes and re-enqueues them handles the crash-between-writes case
