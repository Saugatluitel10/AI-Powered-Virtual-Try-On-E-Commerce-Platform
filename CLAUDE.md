# CLAUDE.md — AI-Powered Virtual Try-On E-Commerce Platform

Claude Code reads this file on every session. Follow everything here without being asked.

---

## Project Overview

An AI-powered fashion platform where users upload a photo, virtually try on clothes, get personalized styling advice from Claude, and shop with confidence. Initial market: Nepal. Business model: SaaS for retailers globally.

---

## Monorepo Structure

```
/
├── apps/
│   ├── web/           # Next.js 14 App Router (TypeScript)
│   ├── api/           # Node.js + Express (TypeScript)
│   └── ai-service/    # Python FastAPI — AI/ML only
├── packages/
│   ├── types/         # @vtryon/types — shared TypeScript interfaces
│   └── config/        # @vtryon/config — env schemas + shared constants
├── turbo.json
├── pnpm-workspace.yaml
├── docker-compose.yml
└── .github/workflows/
```

**Package manager**: pnpm@9 with workspaces. Always use `pnpm` — never `npm` or `yarn`.
**Orchestration**: Turborepo (`turbo`). Run tasks from root with `pnpm dev`, `pnpm build`, etc.

---

## Tech Stack

### Frontend (`apps/web`)
- **Framework**: Next.js 14 App Router + TypeScript (strict)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: Zustand (client) + TanStack Query (server cache)
- **Canvas**: Konva.js / react-konva for garment overlay
- **Forms**: React Hook Form + Zod
- **HTTP**: Axios with JWT interceptor (`src/lib/api.ts`)
- **Image CDN**: Cloudinary (`src/lib/cloudinary.ts`)
- **Analytics**: PostHog (`src/lib/posthog.ts`)
- **Errors**: Sentry (`sentry.client.config.ts`)
- **Hosting**: Vercel

### Backend (`apps/api`)
- **Runtime**: Node.js 20 + Express + TypeScript
- **ORM**: Prisma with PostgreSQL (Supabase)
- **Auth**: Supabase Auth — JWT; middleware in `src/middleware/auth.ts`
- **Storage**: Supabase Storage (`src/lib/supabase.ts`)
- **Jobs**: BullMQ + Redis (`src/jobs/`)
- **Email**: Resend (`src/lib/resend.ts`)
- **Payments**: Stripe + eSewa + Khalti (`src/lib/stripe.ts`, `src/services/esewa.ts`, `src/services/khalti.ts`)
- **Errors**: Sentry with Prisma integration (`src/lib/sentry.ts`)
- **Hosting**: Railway

### AI Service (`apps/ai-service`)
- **Runtime**: Python 3.11 + FastAPI
- **Virtual Try-On**: IDM-VTON / OOTDiffusion via Replicate
- **Body Scan**: MediaPipe Pose + BlazePose Heavy
- **Segmentation**: SAM 2 / rembg
- **Size Prediction**: scikit-learn + South Asian size chart fallback
- **AI Stylist**: Claude claude-sonnet-4-6 (Anthropic SDK, prompt caching)
- **GPU Inference**: Modal.com (A10G)
- **Hosting**: Modal.com

### Infrastructure
- **Database**: PostgreSQL via Supabase
- **Cache/Queue**: Redis (BullMQ)
- **CI/CD**: GitHub Actions (`.github/workflows/`)
- **Secrets**: Doppler (`doppler.yaml` — project: vtryon)
- **Monitoring**: Sentry + PostHog
- **Local Dev**: Docker Compose

---

## Shared Packages

### `@vtryon/types` (`packages/types/index.ts`)
All shared TypeScript types. **Both frontend and backend import from here** — never define duplicate types.
Key types: `User`, `BodyProfile`, `Product`, `ProductVariant`, `Cart`, `Order`, `TryOnSession`, `StyleAdvice`, `ApiError`, `PaginatedResponse<T>`

### `@vtryon/config` (`packages/config/index.ts`)
- `backendEnvSchema` — Zod schema for all backend env vars
- `frontendEnvSchema` — Zod schema for all `NEXT_PUBLIC_*` vars
- `CURRENCIES`, `GARMENT_TYPES`, `GENDER_TYPES`, `SIZE_ORDER` constants

---

## API Conventions

- All routes are prefixed: `/api/v1/`
- Auth via `Authorization: Bearer <supabase-jwt>`
- Responses: `{ data: T }` for success, `{ error: string, statusCode: number }` for errors
- Pagination: `?page=1&pageSize=20` → `PaginatedResponse<T>` from `@vtryon/types`
- The AI service is **internal only** — never exposed to the public internet directly; called by the Node.js backend

### Route files (`apps/api/src/routes/`)
- `auth.ts` — register, login, refresh, logout, /me
- `users.ts` — profile, body profile, photo, orders, wishlist
- `products.ts` — CRUD, filtering, variants, images
- `orders.ts` — create, detail, cancel
- `tryOn.ts` — sessions (create/poll/history), body-scan
- `recommendations.ts` — style-advice, for-me, complete-the-look
- `admin.ts` — dashboard stats, store management

---

## Database

Prisma schema at `apps/api/prisma/schema.prisma`.
**Never edit the DB directly** — always create a migration: `pnpm db:migrate`.

Key models: `User`, `BodyProfile`, `Store`, `Category`, `Product`, `ProductVariant`, `ProductImage`, `CartItem`, `Order`, `OrderItem`, `TryOnSession`, `StyleRecommendation`, `Wishlist`

---

## Coding Conventions

### TypeScript
- Strict mode everywhere. No `any` — use `unknown` + type narrowing
- Import shared types from `@vtryon/types`, not from local `types/` folders
- Validate env vars with `@vtryon/config` Zod schemas at startup, not inline
- Prefer `interface` for object shapes, `type` for unions/aliases

### React / Next.js
- Use App Router file conventions: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Server Components by default; add `"use client"` only when needed (event handlers, hooks, browser APIs)
- Never use `getServerSideProps` or `getStaticProps` — those are Pages Router patterns
- shadcn/ui components live in `apps/web/src/components/ui/` — add with `npx shadcn@latest add <component>`
- Zustand stores in `apps/web/src/store/` — one file per domain (`authStore`, `cartStore`, `wardrobeStore`, `tryOnStore`)

### Node.js / Express
- All route handlers are `async` with `try/catch` → `next(err)`
- Use `requireAuth()` middleware from `src/middleware/auth.ts` on protected routes
- BullMQ workers in `src/jobs/workers.ts` — never do heavy work inline in route handlers
- Stripe webhook must use `express.raw()` — already configured in `src/server.ts`

### Python / FastAPI
- All endpoints in `apps/ai-service/app/routers/`
- Services (business logic) in `apps/ai-service/app/services/`
- Flat copies of core logic also in `apps/ai-service/src/` for Modal deployment
- Use `async def` for all route handlers
- Lint with `ruff` — `ruff check .`

### Comments
- No comments unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant)
- No docstrings on simple functions

---

## Environment Variables

See `.env.example` at the repo root for all required vars.
- Backend reads from `process.env` — validated with `backendEnvSchema` from `@vtryon/config`
- Frontend uses `NEXT_PUBLIC_*` vars — validated with `frontendEnvSchema`
- Secrets managed via **Doppler** in production — never commit real secrets

---

## Key Domain Rules

1. **Nepal payments**: eSewa and Khalti use HMAC-SHA256 signatures — always verify server-side, never trust the redirect callback alone
2. **Try-on flow**: User photo → rembg background removal → IDM-VTON via Replicate → BullMQ polls → result stored in Supabase Storage → frontend polls `GET /try-on/sessions/:id`
3. **Size chart**: Primary = AI body measurements from MediaPipe; fallback = South Asian size chart (chest/waist/hips) in `apps/ai-service/src/size_predictor.py`
4. **Claude API**: Always use prompt caching (`cache_control: {type: "ephemeral"}`) on the system prompt to reduce costs; model = `claude-sonnet-4-6`
5. **Supabase JWT**: The `requireAuth()` middleware verifies the token with Supabase — the `userId` comes from the JWT sub claim, not from a sessions table
6. **Multi-tenancy**: Products belong to a `Store`; `retailer_admin` role can only manage their own store's data
7. **Currency**: Nepal uses NPR (Rs.), international uses USD. `formatCurrency()` in `apps/web/src/lib/utils.ts` handles both

---

## Workflow Rule

**The user shares the plan section by section. Build only what is in the section shared — do not anticipate or build ahead.**
