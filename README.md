# 👗 Virtual Try-On — AI-Powered E-Commerce Platform

An AI-powered fashion platform where users upload a photo, virtually try on clothes, get personalized styling advice from Claude, and shop with confidence. Initial market: Nepal. Business model: SaaS for retailers globally.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Express](https://img.shields.io/badge/Express-4-grey?logo=express)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)
![License](https://img.shields.io/badge/license-private-red)

---

## ✨ Features

- **Virtual Try-On** — Upload a photo and see how any garment looks on you, powered by IDM-VTON / OOTDiffusion via Replicate
- **AI Body Scanning** — Automatic body measurements using MediaPipe Pose + BlazePose Heavy
- **Smart Size Prediction** — ML-based sizing with South Asian size chart fallback
- **AI Stylist** — Personalized styling advice powered by Claude (complete-the-look, recommendations)
- **Multi-Payment** — Stripe (international), eSewa & Khalti (Nepal) with server-side signature verification
- **Multi-Tenant SaaS** — Retailers onboard their own store and manage products
- **Admin Panel** — Role-based admin dashboard with store management, analytics, and editorial tools
- **Embeddable SDK** — Drop a try-on widget into any retailer's site

---

## 🏗 Architecture

```
┌───────────────┐     ┌───────────────┐     ┌───────────────────┐
│   Next.js 14  │────▶│  Express API  │────▶│  FastAPI AI Svc   │
│  (Vercel)     │     │  (Railway)    │     │  (Modal.com)      │
└───────────────┘     └───────┬───────┘     └─────────┬─────────┘
                              │                       │
                    ┌─────────┴─────────┐    ┌────────┴────────┐
                    │  PostgreSQL       │    │  Replicate      │
                    │  (Supabase)       │    │  (GPU inference)│
                    │  + Auth + Storage │    │  Modal (A10G)   │
                    └─────────┬─────────┘    └─────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Redis (BullMQ)   │
                    └───────────────────┘
```

---

## 📁 Monorepo Structure

```
/
├── apps/
│   ├── web/             # Next.js 14 App Router — storefront & admin UI
│   ├── api/             # Node.js + Express — REST API + background jobs
│   └── ai-service/      # Python FastAPI — AI/ML orchestration (internal only)
├── packages/
│   ├── types/           # @vtryon/types — shared TypeScript interfaces
│   ├── config/          # @vtryon/config — env schemas + constants
│   ├── sdk/             # @vtryon/sdk — client SDK for API consumers
│   └── embed/           # @vtryon/embed — embeddable try-on widget
├── turbo.json           # Turborepo task config
├── pnpm-workspace.yaml  # pnpm workspaces
├── docker-compose.yml   # Local dev services
└── .github/workflows/   # CI/CD (ci.yml, deploy.yml, doppler-sync.yml)
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 — `corepack enable && corepack prepare pnpm@9 --activate`
- **Python** 3.11 (for the AI service)
- **Docker** (for local PostgreSQL + Redis)
- **Doppler CLI** (optional, for secrets in production)

### 1. Clone & Install

```bash
git clone https://github.com/Saugatluitel10/AI-Powered-Virtual-Try-On-E-Commerce-Platform.git
cd AI-Powered-Virtual-Try-On-E-Commerce-Platform
pnpm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env
```

Fill in the required values — see `.env.example` for the full list. Key groups:

| Group | Variables |
|-------|-----------|
| **Supabase** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `DATABASE_URL` |
| **Payments** | `STRIPE_SECRET_KEY`, `ESEWA_MERCHANT_CODE`, `KHALTI_SECRET_KEY` |
| **AI** | `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`, `MODAL_TOKEN_ID` |
| **Email** | `RESEND_API_KEY` |
| **CDN** | `CLOUDINARY_URL` |
| **Monitoring** | `SENTRY_DSN`, `POSTHOG_KEY` |

### 3. Start Local Services

```bash
docker compose up -d   # PostgreSQL + Redis
```

### 4. Set Up the Database

```bash
pnpm db:generate       # Generate Prisma client
pnpm db:migrate        # Run migrations
```

### 5. Run Development Servers

```bash
pnpm dev               # Starts all apps via Turborepo
```

| App | URL |
|-----|-----|
| Web (Next.js) | `http://localhost:3000` |
| API (Express) | `http://localhost:4000` |
| AI Service (FastAPI) | `http://localhost:8000` |

### AI Service (standalone)

```bash
cd apps/ai-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 📜 Scripts

Run all commands from the repo root with `pnpm`:

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | TypeScript strict type checking |
| `pnpm test` | Run all test suites |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm format` | Format code with Prettier |

---

## 🔑 API Overview

All routes are prefixed with `/api/v1/`. Auth via `Authorization: Bearer <supabase-jwt>`.

| Module | Endpoints | Description |
|--------|-----------|-------------|
| **Auth** | `/auth/*` | Register, login, refresh, logout, /me |
| **Users** | `/users/*` | Profile, body profile, photo, orders, wishlist |
| **Products** | `/products/*` | CRUD, filtering, variants, images |
| **Orders** | `/orders/*` | Create, detail, cancel |
| **Cart** | `/cart/*` | Add, update, remove items |
| **Try-On** | `/try-on/*` | Create session, poll result, history, body-scan |
| **Recommendations** | `/recommendations/*` | AI style advice, for-me, complete-the-look |
| **Reviews** | `/reviews/*` | Product reviews & ratings |
| **Payments** | `/payments/*` | Stripe, eSewa, Khalti processing |
| **Admin** | `/admin/*` | Dashboard stats, store management |
| **Tenants** | `/tenants/*` | Multi-tenant store onboarding |
| **Public API** | `/public/*` | Embeddable widget endpoints |

**Response format:**
```jsonc
// Success
{ "data": T }

// Error
{ "error": "message", "statusCode": 400 }

// Paginated
{ "data": T[], "total": number, "page": number, "pageSize": number, "totalPages": number }
```

---

## 🤖 AI Pipeline

```
User Photo
   │
   ▼
Background Removal (rembg / SAM 2)
   │
   ▼
Body Pose Estimation (MediaPipe + BlazePose Heavy)
   │
   ├──▶ Size Prediction (scikit-learn + SA size chart fallback)
   │
   ▼
Virtual Try-On (IDM-VTON via Replicate)
   │
   ▼
Result → Supabase Storage → Frontend polls for completion
   │
   ▼
AI Stylist (Claude) → Personalized recommendations
```

---

## 🧪 Testing

```bash
pnpm test                       # All suites
cd apps/api && pnpm test        # Backend only
cd apps/web && pnpm test        # Frontend only
```

Backend API tests live in `apps/api/src/routes/__tests__/`.

---

## 🚢 Deployment

| Service | Platform | Config |
|---------|----------|--------|
| Frontend | Vercel | Auto-deploy from `main` |
| API | Railway | `apps/api/Dockerfile` |
| AI Service | Modal.com | `apps/ai-service/Dockerfile` |
| Database | Supabase | Managed PostgreSQL |
| Secrets | Doppler | `doppler.yaml` — project: `vtryon` |

CI/CD via GitHub Actions:
- **`ci.yml`** — Lint, type-check, test on every PR
- **`deploy.yml`** — Deploy on merge to `main`
- **`doppler-sync.yml`** — Sync secrets from Doppler

---

## 🛠 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query, Konva.js |
| Backend | Node.js 20, Express, Prisma, PostgreSQL (Supabase), BullMQ, Redis |
| AI Service | Python 3.11, FastAPI, MediaPipe, scikit-learn, Replicate, Anthropic Claude |
| Payments | Stripe, eSewa, Khalti |
| Infrastructure | Vercel, Railway, Modal.com, Supabase, Doppler, Sentry, PostHog |

---

## 📄 License

Private — all rights reserved.
