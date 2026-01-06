## ClubSync – Club Management & Fund Analytics Platform

ClubSync is a full‑stack club management system built with **Next.js 16 (App Router)**, **TypeScript**, **Supabase**, and **Tailwind CSS**.  
It centralizes how college clubs manage:

- **Members & roles**
- **Inventory & borrowing requests (with department approval flow)**
- **Club funds, income & expenditure**
- **Public club profiles and analytics**

This document explains the key features, roles, data model, and how to run and extend the project.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, custom design tokens
- **UI Library**: shadcn-style components (`card`, `dialog`, `table`, `badge`, etc.)
- **Icons**: `lucide-react`
- **Backend / DB**: Supabase (Postgres + Auth + RLS)
- **Data Fetching / State**: `@supabase/supabase-js`, `@tanstack/react-query`
- **Charts**: `recharts`
- **Notifications**: `sonner`

---

## Roles & Permissions

The system is role-based via the `auth` table:

- **Student**
  - Can browse public inventory
  - Can create borrowing requests (depending on club membership)
  - Can view their own club memberships (via club UIs)

- **Club**
  - Can access `/club` management page for their club
  - Manage members (add, remove, change roles)
  - Manage inventory (CRUD, visibility, quantity)
  - Manage and act on borrowing requests
  - Manage **funds** (income, expenditure) and view analytics

- **Admin**
  - Can act as a global viewer/controller
  - Switch between clubs on `/club` and manage their data

- **Faculty / Department**
  - Can access department-level request flows (via `/department`)
  - Approve/reject department-routed inventory requests

Authentication and role mapping is handled via Supabase (`auth` table linking to `students`, `faculty`, `clubs`).

---

## High‑Level Features

### 1. Landing & Navigation

- **Root page**: `src/app/page.tsx`
  - Public marketing/overview page for ClubSync (hero, features, CTAs).
- **Header (`src/components/Header.tsx`)**
  - Navigation to core areas: clubs, inventory, departments, support, auth.
  - User dropdown (avatar) with role, name, email, and logout.
- **Footer (`src/components/Footer.tsx`)**
  - Basic branding and links.

### 2. Authentication & User Info

- Login / Signup pages under `src/app/login` and `src/app/signup`.
- `src/hooks/useUserInfo.ts`
  - Fetches current user and role via Supabase.
  - Shared by pages like `/club`, `/department`, `/inventory` to gate access.

---

## Core Pages & Flows

### `/club` – Club Management Console

File: `src/app/club/page.tsx`

This is the primary internal UI for club leaders and admins. It has **tabs**:

1. **Members**
   - View all club members (USN, name, email, role).
   - Add member (via USN lookup in `students`).
   - Update member roles (e.g. *team lead*, *co lead*, *core member*, *member*, *new member*).
   - Bulk remove members (with confirmations).
   - Search and sort:
     - Search by USN, name, email.
     - Sort by name or role hierarchy.

2. **Inventory**
   - View inventory records (name, description, quantity, cost, visibility, image).
   - Add / edit inventory items:
     - Fields: name, image URL, description, quantity, cost, `is_public`.
     - Live image preview with fallback placeholder.
   - Delete items with confirmation dialogs.
   - Visibility:
     - `Public`: visible in global inventory browsing.
     - `Private`: visible only to club context.

3. **Requests**
   - Shows borrowing **transactions** where the inventory belongs to this club.
   - Shows:
     - Borrower (student or club)
     - Item name
     - Quantity
     - Request date, due date
     - Message
     - Status (with colored badges)
   - Filtering & sorting:
     - Filter by transaction status (Processing, Department Pending, Approved, Rejected, Collected, Overdue, Returned, etc.).
     - Search by borrower or item name.
     - Sort by status or latest.
   - Status updates:
     - Club can progress statuses forward only (no backwards transitions).
     - Valid status progression is enforced by a **state machine** (`src/lib/transactionStatus.ts`) matching the rules defined in `instructions.txt`.
   - Transaction details dialog:
     - Complete transaction metadata (ID, timestamps, status).
     - Inline status update selector, with validation against allowed transitions.
     - Editable message with save.
     - Student info panel (USN, name, email, semester, department).
     - Borrower club info for club-to-club loans (club ID, name, email).

4. **Funds**

**Management View (Table)**

- CRUD operations for fund entries:
  - Add / edit / soft-delete funds (mark `is_trashed`).
  - Link each fund entry to a club member via USN lookup (validated membership).
  - Fields:
    - `name`
    - `amount`
    - `bill_date`
    - `type` (fund type code)
    - `description`
    - `is_credit` (income / expenditure)
    - `submitted_by` membership reference
- Filters:
  - Search by name, description, submitted-by, or fund type label.
  - Filter by **fund type**:
    - All, Expenditure, Income
  - Filter by **transaction direction**:
    - All, Credit (Income), Debit (Expenditure)
- Summary cards (quick stats):
  - Total Income
  - Total Expenditure
  - Net Balance
- Table:
  - Shows type labels, amount, credit/debit badge, bill date, description, submitted-by name, and actions.

**Statistics View (Charts)**

Implemented in `src/components/FundStatistics.tsx` and integrated as a toggle in the Funds tab.

- Toggle between:
  - **Table** – detailed records & CRUD.
  - **Statistics** – visual analytics (graphs).

**Charts & Analytics**

All charts use `recharts` with a carefully chosen color palette (green for income, red for expenditure, and distinct colors for each fund category) that is visible in both light and dark themes.

- **Summary Cards**
  - Total Income (green)
  - Total Expenditure (red)
  - Net Balance (green or red based on sign)
  - Total Transactions + average transaction amount.

- **Income vs Expenditure Over Time**
  - Area chart (per month).
  - X-axis: `month` label (e.g. `Jan 2025`).
  - Y-axis: amount (INR, in thousands on ticks).
  - Two series:
    - Income (green)
    - Expenditure (red)

- **Monthly Trends**
  - Stacked or grouped bar chart.
  - Same income & expenditure breakdown by month.

- **Overall Income vs Expenditure**
  - Pie chart with two slices:
    - Income (green)
    - Expenditure (red)
  - Tooltip displays formatted INR.

- **Fund Type Breakdown**
  - Horizontal bar chart (`layout="vertical"`).
  - Each bar shows total income and expenditure per fund type.
  - Uses distinct colors for each metric.

- **Income Categories (By Type)**
  - Pie chart of income-only fund types.
  - Uses a palette of blues, purples, oranges, greens, etc., each type gets a unique color.

- **Expenditure Categories**
  - Pie chart of expenditure-only fund types.
  - Same distinct color strategy as income categories.

**Fund Type Codes (Detailed)**

The project uses normalized fund type codes as defined in `instructions.txt` and implemented in `src/lib/fundTypeStatus.ts`:

- **Expenditure Types**
  - `0 = ADMINISTRATIVE` – general administrative expenses
  - `1 = EVENT` – event-related costs
  - `2 = PROMOTIONAL` – marketing and publicity
  - `3 = EQUIPMENT` – purchase/repair of club equipment
  - `4 = TRAINING` – training, workshops, skill development
  - `5 = MISCELLANEOUS` – uncategorized expenses
  - `6 = OTHER_EXP` – other expenditures not covered above

- **Income Types**
  - `7 = COLLEGE` – funds from the institution
  - `8 = SPONSORS` – external sponsorships
  - `9 = WORKSHOPS` – revenue from workshops
  - `10 = MEMBERS_CONTRIBUTION` – member contributions
  - `11 = SERVICES` – revenue from services
  - `12 = OTHER_INC` – other/misc income

The helpers `getFundTypeLabel`, `isExpenditure`, and `isIncome` ensure that:

- Labels in UI match the above text.
- Income vs expenditure is derived reliably from code.
- Filters and charts group categories correctly.

---

### `/clubs/[clubId]` – Public Club Page

File: `src/app/clubs/[clubId]/page.tsx`

- Public-facing profile per club:
  - Club details (name, description, meta).
  - Public inventory section (from `inventory` table for that club).
  - Public funds section (if permissions allow):
    - Table view of funds with basic stats.
    - Aggregated totals (income/expense/net).
  - Permissions:
    - Controls which users can see funds (club members, admins, or matching email).

---

### `/inventory` – Global Inventory Browser

File: `src/app/inventory/page.tsx`

- Shows all **public** inventory items across clubs.
- Students can:
  - Search and filter items.
  - See owning club, description, quantity, and images.
  - Initiate borrowing requests:
    - Direct club flow if the student is a member of the owning club.
    - Department-mediated flow otherwise.

---

### `/department` – Department Requests

File: `src/app/department/page.tsx`

- For faculty users tied to departments.
- Lists department requests that require departmental approval before the club can act.
- Allows:
  - Filtering by status.
  - Approve / reject actions.

---

### `/student`, `/club`, `/admin`, `/support`, `/contact`

Other routes provide dashboards and support flows for specific audiences. These are implemented under `src/app` with matching names and share common header/footer and auth checks.

---

## Transaction State Machine

The borrowing workflow is strictly controlled by a state machine defined in `instructions.txt` and implemented in `src/lib/transactionStatus.ts`.

**Status Codes:**

- `0 = PROCESSING`
- `1 = DEPARTMENT APPROVAL PENDING`
- `2 = DEPARTMENT REJECTED` (terminal)
- `3 = DEPARTMENT APPROVED`
- `4 = CLUB REJECTED` (terminal)
- `5 = CLUB APPROVED`
- `6 = COLLECTED`
- `7 = OVERDUE`
- `8 = RETURNED` (terminal)

**Key Rules:**

- No backward transitions (status codes must always move forward).
- Department vs direct club flow:
  - If borrower is a member of the lending club, or another club: department is **not** involved; club can move directly from `0` → `4|5`.
  - If borrower is an external student, department must approve:
    - `0` → `1` → `3` → `4|5`.
- Once rejected (`2` or `4`), a transaction cannot be re-opened.
- `5 (APPROVED)` must go to `6 (COLLECTED)` before it can become `7 (OVERDUE)` or `8 (RETURNED)`.

The UI only shows allowed next statuses to the club and department, so invalid transitions are impossible through the frontend.

---

## Database Schema (High Level)

Key tables (see `instructions.txt` for full DDL):

- `auth` – Auth users + role + links to students/faculty/clubs.
- `students` – Student data, including `dept_id`.
- `faculty` – Faculty data.
- `departments` – Academic departments.
- `clubs` – Club profiles.
- `memberships` – Many-to-many (student ↔ club) with `role`.
- `inventory` – Club-owned items and visibility.
- `transactions` – Inventory borrowing requests and their lifecycle.
- `department_requests` – Department approval records.
- `funds` – Income & expenditure entries with types, `is_credit`, and submitter.
- `knowledge_chunks` – Content for AI/RAG features (if used via `/api/ai/chat` and `src/lib/rag.ts`).

---

## Local Development

### Prerequisites

- Node.js 20+
- npm (or pnpm / yarn)
- Supabase project with the schema in `instructions.txt` (or equivalent migration).
- Environment variables configured for Supabase and any AI/email providers.

### Install Dependencies

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

### Build & Lint

```bash
npm run build   # Production build
npm run lint    # TypeScript/Next linting
```

---

## Environment Variables

Create a `.env.local` in the project root with at least:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Depending on enabled features, you may also need:

- Email SMTP creds for `nodemailer` (if mailing routes are used).
- AI keys for `openai` / `groq-sdk` / `@huggingface/inference` (if `/api/ai/chat` and RAG are enabled).

---

## Project Structure (Simplified)

```text
src/
  app/
    page.tsx                 # Landing
    login/, signup/          # Auth pages
    club/page.tsx            # Club management (members, inventory, requests, funds, stats)
    clubs/[clubId]/page.tsx  # Public club page
    inventory/page.tsx       # Global inventory
    department/page.tsx      # Department dashboard
    student/page.tsx         # Student view
    admin/page.tsx           # Admin console
    support/page.tsx         # Support
    contact/page.tsx         # Contact
    api/
      ai/chat/route.ts       # AI chat (optional)
      email/route.ts         # Email sending
      embed-chunks/route.ts  # RAG embeddings
  components/
    Header.tsx, Footer.tsx, ClientProvider.tsx
    FundStatistics.tsx       # Funds analytics graphs
    ui/                      # Reusable UI primitives (button, card, dialog, table, etc.)
  lib/
    supabaseClient.ts        # Supabase initialization
    transactionStatus.ts     # Transaction state machine helpers
    fundTypeStatus.ts        # Fund type codes & helpers
    rag.ts, safe-sql.ts, utils.ts
  hooks/
    useUserInfo.ts           # Current user & role
```

---

## Extending the Project

- **Add more fund analytics**
  - Use `FundStatistics` as a pattern for new charts.
  - Query-level pre-aggregation can be added if performance becomes an issue.

- **Add new roles or permissions**
  - Update Supabase RLS + `auth` table.
  - Extend `useUserInfo` and role checks in pages.

- **Integrate more AI**
  - Use `src/lib/rag.ts` and `/api/ai/chat` as starting points for contextual chat (FAQ, policy Q&A, etc.).

---

## Deployment

You can deploy on any platform that supports Next.js 16 (Edge or Node runtime), e.g.:

- Vercel
- Supabase + custom hosting
- Docker on your own server

Make sure:

- Environment variables are set.
- Supabase has the correct schema and RLS rules.
- `npm run build` succeeds in CI.

---

## License

This project is currently private/internal.


