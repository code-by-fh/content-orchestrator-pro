# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Content Orchestrator Pro is a full-stack AI-powered platform that transforms YouTube transcripts and Medium articles into SEO-optimized technical articles, with multi-channel distribution to LinkedIn, Medium, Xing, RSS, and Webhooks. AI generation is powered by Google Gemini (`gemini-2.5-flash`), and content is written in German by default.

## Development Commands

### Server (Express + TypeScript)
```bash
cd server
npm run dev        # Start with hot-reload (nodemon)
npm run build      # Compile TypeScript to dist/
npm start          # Run compiled server
npm run worker     # Start BullMQ worker for AI processing (separate process)
npm run seed       # Seed database
npm run db:wipe    # Clear all database data
```

### Client (React + Vite)
```bash
cd client
npm run dev        # Start Vite dev server (port 5173)
npm run build      # Build production bundle to dist/
npm run lint       # Run ESLint
npm run preview    # Preview production build
```

### Docker (full stack)
```bash
docker-compose up  # Starts client (3000), server (3003), PostgreSQL (5432), Redis (6379)
```

## Architecture

### Data Flow
```
User submits URL → Express API → BullMQ Queue (Redis) → Worker Process
  → Extract content (YouTube transcript or Medium HTML)
  → Google Gemini AI generates structured JSON
  → Zod validates response
  → PostgreSQL stores article
  → Frontend polls for status update
```

### Key Components

**`server/src/index.ts`** — Express entry point (default port 3003). Registers routes under `/api/auth`, `/api/content`, `/api/distribution`. Serves uploaded images at `/uploads`.

**`server/src/worker.ts`** — BullMQ worker that runs as a separate process. Consumes `content-queue` from Redis, extracts source content, calls Gemini, validates with Zod, and updates article status (`PENDING → PROCESSING → DRAFT | FAILED`).

**`server/src/services/aiConfig.ts`** — Gemini configuration with structured JSON schema. Outputs: `markdownContent`, `linkedinTeaser`, `xingSummary`, `seoTitle`, `seoDescription`, `slug`, `category`, `rawTranscript`.

**`server/src/services/publishingService.ts`** — Orchestrates multi-platform distribution. Handles image uploads to CMS (Directus-compatible), rewrites Markdown image links to production URLs, and delegates to platform adapters.

**`server/src/services/adapters/`** — Platform-specific publishing adapters (LinkedIn, Medium, Xing, RSS, Webhook). Follows adapter pattern for extensibility.

**`server/prisma/schema.prisma`** — Three main models: `User` (JWT auth), `Article` (content with DE/EN fields and status tracking), `Publication` (per-platform distribution records with status `PENDING → PUBLISHED | ERROR`).

**`client/src/App.tsx`** — React Router v7 setup with protected routes. Dashboard, Editor, Settings views.

**`client/src/api.ts`** — Axios client pointing to `VITE_API_URL`. All API calls go through here.

### Environment Variables

Server (`.env`): `DATABASE_URL`, `PORT`, `JWT_SECRET`, `GEMINI_API_KEY`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `PUBLIC_ARTICLE_BASE_URL`, `BACKEND_URL`, `WEBHOOK_URL`, `WEBHOOK_API_KEY`, `CONTENT_MANAGEMENT_IMAGE_URL`, `CONTENT_MANAGEMENT_TOKEN`, `WHITELISTED_DOMAINS`

Client (`.env`): `VITE_API_URL`

### Data Persistence Notes
- **Articles**: PostgreSQL (persistent)
- **Uploaded images**: `server/uploads/` — requires Docker volume mount in production
- **Job queue**: Redis — jobs are transient unless Redis persistence is configured

## UI / Styling Guidelines

Design philosophy: **"Harmonized Adaptive Depth"** — paper-like light mode, glassmorphic dark mode.

- **Color palette**: Slate (slate-50 to slate-950) with semantic accents: indigo (primary), amber (warning), emerald (success), rose (error)
- **Radius**: `rounded-xl` for cards/panels, `rounded-lg` for internal elements
- **Dark mode**: Use `backdrop-blur`, `border-white/10`, glow effects on hover
- **Typography**: Inter/Plus Jakarta Sans for body, Roboto Mono/JetBrains Mono for code
- **Icons**: Lucide React exclusively
- **Components**: Radix UI primitives with Shadcn/ui-style patterns
- **Theme toggle**: Fixed bottom-left or sidebar footer placement

Full design rules are in `.agent/rules/styling-only.md`.
