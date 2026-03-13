# ClubSync

ClubSync is a full-stack college club operations platform built with Next.js, TypeScript, Supabase, and Tailwind CSS.

It combines:
- Club and department operations
- Inventory lending workflows
- Funds and analytics
- AI-assisted data access and report generation
- Gmail-aware assistant actions

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS + reusable UI primitives
- Supabase (Auth, Postgres, Storage)
- Recharts (analytics)
- Vercel AI SDK + multiple model providers
- pdfmake + xlsx (report exports)

## Implemented Features

### 1) Authentication and Role-Based Access

- Email/password auth (login/signup)
- OAuth callback support
- Role-based access patterns for student, club, faculty/department, and admin flows
- Middleware-based route guarding

### 2) Club Management Console

Route: `/club`

- Member management (list, role handling, member operations)
- Inventory management for club-owned assets
- Request lifecycle handling with status transitions
- Funds management (income/expenditure tracking)
- Stats view with financial visualizations

### 3) Inventory and Borrowing Workflow

Route: `/inventory`

- Browse inventory across clubs
- Public/private inventory visibility support
- Borrow/request flow with status progression
- Department-mediated and direct-club paths

### 4) Department and Club Discovery

- Departments list and detail pages
- Clubs list and club profile pages
- Public-facing club information and related views

### 5) Dashboards and Student Hub

- Student dashboard and membership summary views
- Active requests and borrow tracking
- Profile and organization context rendering

### 6) AI Assistant (Core)

Routes:
- `/ai-assistant`
- `/ai-assistant/[id]`

API:
- `/api/ai/chat`
- `/api/chats`, `/api/chats/list`, `/api/chats/[id]`, `/api/chats/[id]/messages`
- `/api/messages`

Capabilities:
- Streaming AI responses
- Multi-model support via model resolver
- Tool-enabled execution with strict mode rules
- Chat persistence (conversation IDs and message history)

Assistant tools wired in the backend:
- `schema_info` (schema metadata)
- `sql` (read-only SQL execution)
- `report` (financial report generation)
- `read_gmail` (email listing/detail/search)
- `send_gmail` (draft/send/reply)
- `web_search` (Tavily)

### 7) AI Report Generation

Implemented through `report` tool and report UI components.

What is generated:
- Club funds PDF report
- Cover page and club metadata
- Fund records table
- Summary metrics (income, expenditure, net balance)
- Time-range filtering (`7d`, `30d`, `3m`, `6m`, `1y`, `all`)

Output handling:
- AI report pipeline returns base64 PDF payload + computed stats
- Manual report workflows support document-aware exports from stored fund documents
- Supabase storage bucket integration for fund documents

### 8) Gmail-Integrated Assistant Workflows

APIs:
- `/api/gmail/read`
- `/api/gmail/send`

Supported operations:
- List recent emails
- Read specific email details
- Search emails with Gmail query syntax
- Send/reply email through connected provider token

### 9) Financial Analytics

- Funds table and filters
- Income vs expenditure summaries
- Net balance tracking
- Category/type-aware grouping
- Chart components for quick insights

### 10) Contact and Support

Routes:
- `/contact`
- `/support`

Email endpoint:
- `/api/email`

## Current Route Map (App)

- `/`
- `/login`
- `/signup`
- `/auth/callback`
- `/dashboard`
- `/student`
- `/club`
- `/clubs`
- `/clubs/[clubId]`
- `/department`
- `/departments`
- `/departments/[deptId]`
- `/inventory`
- `/contact`
- `/support`
- `/ai-assistant`
- `/ai-assistant/[id]`

## API Surface (Highlights)

- AI: `/api/ai/chat`
- Chats and messages: `/api/chats/*`, `/api/messages`
- Gmail: `/api/gmail/read`, `/api/gmail/send`
- Email utility: `/api/email`
- Auth/admin utilities:
  - `/api/auth/user-details`
  - `/api/auth/users-with-status`
  - `/api/auth/block-user`
  - `/api/auth/delete-user`
  - `/api/auth/reset-password`

## Local Development

### Prerequisites

- Node.js 20+
- npm
- Supabase project with required tables and policies

### Install

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

Open `http://localhost:3000`.

### Build and Lint

```bash
npm run build
npm run lint
```

## Environment Variables

Copy `.env.example` to `.env.local` and set values.

Core required:
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional depending on enabled features:
- AI providers: `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `AI_GATEWAY_API_KEY`
- Web search: `TAVILY_API_KEY`
- Upstash: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- App/admin: `NEXT_PUBLIC_ADMIN_CODE`, `EMAIL`, `PASSWORD`

## Notes

- The AI assistant follows a strict tool-mode protocol defined in the system prompt.
- SQL interactions are intended to be read-only and schema-aware.
- Report generation is available both via assistant tooling and report-focused UI flows.
