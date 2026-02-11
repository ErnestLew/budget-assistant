# Budget Assistant

> AI-powered expense tracker that automatically parses Gmail receipts, detects duplicates, and delivers real-time spending insights — built with a NestJS microservices backend and a Next.js dashboard.

**Live Demo:** [budget-assistant-omega.vercel.app](https://budget-assistant-omega.vercel.app)

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/)

---

## Features

- **Gmail Receipt Sync** — Connects to Gmail via OAuth, fetches receipt emails, and parses them automatically
- **Dual AI Providers** — Choose between Groq (Llama 3.1, free) or Google Gemini (2.0 Flash, free tier) for receipt parsing
- **Smart Duplicate Detection** — AI identifies the same purchase across multiple emails (e.g., bank alert + merchant receipt) and groups them
- **Auto-Categorization** — Transactions are categorized into 14 preset categories (Supermarket, Food Delivery, Transport, Bills, etc.)
- **Budget Tracking & Alerts** — Create budgets per category with threshold-based alerts (default 80%)
- **Real-Time Analytics** — Interactive charts for spending trends, category breakdowns, monthly comparisons, and merchant analysis
- **Scheduled Auto-Sync** — Cron-based scheduler syncs Gmail receipts daily at 8 AM in each user's local timezone (auto-detected)
- **Google OAuth** — Secure authentication via Google with JWT session management
- **Microservices Architecture** — 5 independent services communicating via Redis message patterns

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 + React 19 | App Router with Turbopack |
| | Tailwind CSS 4 | Utility-first styling |
| | Redux Toolkit + RTK Query | State management & data fetching |
| | React Hook Form + Zod | Form validation |
| | Recharts | Interactive charts |
| | NextAuth 5 | Google OAuth authentication |
| **Backend** | NestJS 11 | Microservices framework |
| | Nx 22 | Monorepo build system |
| | Prisma 5 | Type-safe ORM |
| | TypeScript 5.9 | End-to-end type safety |
| | ioredis | Redis client for inter-service messaging |
| | Passport + JWT | API authentication |
| **AI** | Groq (Llama 3.1 8B) | Free tier — receipt parsing & categorization |
| | Google Gemini 2.0 Flash | Free tier — faster, higher accuracy |
| **Infrastructure** | PostgreSQL 17 | Primary data store |
| | Redis 7 | Message broker & cache |
| | Docker Compose | Container orchestration |

---

## Prerequisites

- **Node.js** 22+ and npm
- **PostgreSQL** 17+
- **Redis** 7+
- **Google Cloud OAuth credentials** (for Gmail access + sign-in)
- **AI API key** — at least one of:
  - [Groq API key](https://console.groq.com/) (free)
  - [Google Gemini API key](https://aistudio.google.com/apikey) (free tier available)

---

## Getting Started

### Option A: Docker Compose (recommended)

```bash
# Clone the repository
git clone https://github.com/ErnestLew/budget-assistant.git
cd budget-assistant

# Create environment files
cp .env.example .env
# Edit .env with your credentials (see Environment Variables below)

# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend npx prisma db push

# Open the app
# Frontend:  http://localhost:3000
# API:       http://localhost:8000/api/v1
# Health:    http://localhost:8000/api/v1/health
```

### Option B: Local Development

#### 1. Start PostgreSQL & Redis

```bash
# macOS (Homebrew)
brew services start postgresql@17
brew services start redis

# Or use Docker for just the databases
docker compose up -d postgres redis
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client & push schema to database
npx prisma generate
npx prisma db push

# Start all microservices (each in a separate terminal)
npx nx serve gateway
npx nx serve auth-service
npx nx serve core-service
npx nx serve ai-service
npx nx serve notification-service
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your credentials

# Start dev server (with Turbopack)
npm run dev
```

#### 4. Open the app

- **Frontend:** http://localhost:3000
- **API Gateway:** http://localhost:8000/api/v1
- **Health Check:** http://localhost:8000/api/v1/health

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Gmail API**
4. Go to **Credentials** > **Create Credentials** > **OAuth 2.0 Client ID**
5. Set application type to **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret** to your environment files
8. Under **OAuth consent screen**, add the scope: `https://www.googleapis.com/auth/gmail.readonly`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/budget_assistant` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password (Upstash token, enables TLS) | *(empty for local)* |
| `SECRET_KEY` | JWT signing secret (32+ chars) | Generate with `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | Key for encrypting stored API keys (32-byte hex) | Generate with `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-xxx` |
| `GROQ_API_KEY` | Groq API key (optional) | `gsk_xxx` |
| `GROQ_MODEL` | Groq model name | `llama-3.1-8b-instant` |
| `GEMINI_API_KEY` | Google Gemini API key (optional) | `AIza_xxx` |
| `GEMINI_MODEL` | Gemini model name | `gemini-2.0-flash` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:3000` |
| `PORT` | Gateway port | `8000` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|----------|-------------|---------|
| `AUTH_SECRET` | NextAuth secret (32+ chars) | Generate with `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | Same as backend `GOOGLE_CLIENT_ID` |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | Same as backend `GOOGLE_CLIENT_SECRET` |
| `BACKEND_URL` | Backend base URL (for API proxy) | `http://localhost:8000` |
| `NEXTAUTH_URL` | Frontend URL | `http://localhost:3000` |

---

## API Endpoints

All endpoints are prefixed with `/api/v1`. Most require JWT authentication via `Authorization: Bearer <token>` header.

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/google` | Login with Google OAuth token |
| `POST` | `/auth/refresh` | Refresh JWT token |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transactions` | List transactions (paginated, filterable) |
| `POST` | `/transactions` | Create manual transaction |
| `GET` | `/transactions/:id` | Get transaction details |
| `PATCH` | `/transactions/:id` | Update transaction |
| `DELETE` | `/transactions/:id` | Delete transaction |
| `PATCH` | `/transactions/bulk-status` | Bulk update statuses |
| `GET` | `/transactions/with-duplicates` | Get duplicate groups |
| `PATCH` | `/transactions/resolve-duplicate` | Resolve duplicate group |
| `PATCH` | `/transactions/dismiss-duplicate` | Dismiss duplicate group |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/budgets` | List budgets |
| `POST` | `/budgets` | Create budget |
| `PATCH` | `/budgets/:id` | Update budget |
| `DELETE` | `/budgets/:id` | Delete budget |
| `GET` | `/budgets/progress` | Budget progress with spending |
| `GET` | `/budgets/alerts` | List budget alerts |
| `POST` | `/budgets/alerts` | Create budget alert |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/categories` | List categories |
| `POST` | `/categories` | Create category |
| `PATCH` | `/categories/:id` | Update category |
| `DELETE` | `/categories/:id` | Delete category |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/stats` | Dashboard statistics |
| `GET` | `/analytics/spending` | Daily spending chart data |
| `GET` | `/analytics/categories` | Category breakdown |
| `GET` | `/analytics/categories/detailed` | Detailed category stats |
| `GET` | `/analytics/categories/:id/trend` | Single category trend |
| `GET` | `/analytics/merchants` | Top merchants |
| `GET` | `/analytics/monthly-summary` | Monthly comparison |

### Gmail Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/sync/gmail` | Start email sync |
| `POST` | `/sync/cancel` | Cancel running sync |
| `GET` | `/sync/progress` | Get sync progress |
| `GET` | `/sync/status` | Get sync status |
| `GET` | `/sync/providers` | List available AI providers |
| `GET` | `/sync/gmail/test` | Test Gmail connection |

### User Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/me` | Get current user profile |
| `PATCH` | `/users/me` | Update profile |
| `GET` | `/users/me/api-keys` | Get API key status |
| `PATCH` | `/users/me/api-keys` | Add/update API key |
| `DELETE` | `/users/me/api-keys/:provider` | Remove API key |

### Public
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/exchange-rates/supported-currencies` | List supported currencies |
| `GET` | `/exchange-rates/rates` | Get exchange rates |

---

## Database Schema

5 models managed by Prisma:

- **User** — Profile, OAuth tokens, encrypted API keys, currency preference
- **Transaction** — Merchant, amount, currency, date, status, confidence score, duplicate group
- **Category** — Hierarchical categories with icons and colors (14 defaults + custom)
- **Budget** — Per-category or global budgets with configurable periods
- **BudgetAlert** — Threshold-based alerts with trigger tracking

---

## Deployment

Deploy the full stack for **$0/month** using free tiers:

```
Vercel (free)    →  Next.js frontend       →  your-app.vercel.app
Render (free)    →  NestJS backend (all-in-one)  →  your-app.onrender.com
Neon (free)      →  PostgreSQL (0.5 GB)
Upstash (free)   →  Redis (256 MB)
```

### 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project, copy the **pooled connection string**
3. It should look like: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require`

### 2. Redis — Upstash

1. Sign up at [upstash.com](https://upstash.com)
2. Create a Redis database, copy the **host** and **port** from the Redis details page

### 3. Backend — Render

1. Sign up at [render.com](https://render.com)
2. New > **Web Service** > connect your GitHub repo
3. Set **Root Directory** to `backend`
4. Set **Dockerfile Path** to `./Dockerfile`
5. Add environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon pooled connection string |
| `REDIS_HOST` | Your Upstash Redis host |
| `REDIS_PORT` | Your Upstash Redis port |
| `REDIS_PASSWORD` | Your Upstash Redis token |
| `SECRET_KEY` | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth secret |
| `GROQ_API_KEY` | Your Groq API key |
| `GEMINI_API_KEY` | Your Gemini API key *(optional)* |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |

6. Deploy. Note your Render URL (e.g., `https://your-app.onrender.com`)
7. Run the database migration: in Render shell, run `npx prisma db push`

> **Note:** The backend uses a consolidated server (`apps/server/`) that boots all 5 microservices in a single process — perfect for free-tier hosting.

### 4. Frontend — Vercel

1. Sign up at [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add environment variables:

| Variable | Value |
|----------|-------|
| `BACKEND_URL` | `https://your-app.onrender.com` |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Your Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Your Google OAuth secret |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |

5. Deploy

### 5. Google OAuth — Update Redirect URIs

In [Google Cloud Console](https://console.cloud.google.com/), add your production redirect URI:
- `https://your-app.vercel.app/api/auth/callback/google`

### Cold Start Mitigation

Render free tier sleeps after 15 minutes of inactivity (~30s cold start). To keep it warm:
- Use [cron-job.org](https://cron-job.org) to ping `https://your-app.onrender.com/api/v1/health` every 14 minutes

---

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/).

You are free to use, modify, and share this project for **personal and non-commercial purposes** with attribution. Commercial use is not permitted.
