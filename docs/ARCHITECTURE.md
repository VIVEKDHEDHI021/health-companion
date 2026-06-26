# 🏛️ ARCHITECTURE.md — GlucoLab Architecture Document

> **Last Updated:** 2026-06-26  
> All decisions are preserved. Mark status: **Active** | **Deprecated** | **Replaced**

---

## Overview

GlucoLab is a **hybrid web + mobile health tracking application**. It is built as a single unified React codebase that compiles to both a web application and native Android/iOS apps via Capacitor. The backend is entirely serverless, powered by Supabase (PostgreSQL + Auth + RLS).

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      Presentation Layer                          │
│   React 19 + TanStack Router (file-based routing)               │
│   Tailwind CSS v4 + shadcn/ui primitives                        │
│   Mobile: Capacitor WebView | Web: SSR hydration                │
├─────────────────────────────────────────────────────────────────┤
│                     Application Layer                            │
│   Backend Services (src/backend/services/)                      │
│   React Contexts (Auth, Theme, Notifications)                   │
│   Feature Modules (features/scanner/)                           │
├─────────────────────────────────────────────────────────────────┤
│                      Data Access Layer                           │
│   src/db/client.ts — Supabase client + MobileQueryBuilder       │
│   src/services/localDbService.ts — SQLite offline cache         │
│   src/services/syncService.ts — Auto cloud sync                 │
├─────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer                        │
│   Supabase (PostgreSQL + Auth + RLS + Storage)                  │
│   Firebase (FCM Push Notifications)                             │
│   Capacitor (Native Android/iOS bridge)                         │
│   Google Cloud Vision API / Gemini Vision AI                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Responsibilities

### `src/routes/` — View Layer
- Pure route components: handle page-level layout and data orchestration
- Thin: fetch data from services, pass to UI components
- No business logic in route files

### `src/backend/services/` — Service Layer
- All Supabase interactions centralized here
- Auth-aware (calls `supabase.auth.getUser()` before operations)
- Separated by domain: health, scanner, auth, training
- **Status:** Active

### `src/db/client.ts` — Database Client
- Creates and exports the Supabase client instance
- On mobile, wraps `from()` calls with a `MobileQueryBuilder` proxy
- Proxy intercepts reads to check SQLite cache first
- **Status:** Active

### `src/services/` — Mobile Services
- `localDbService.ts`: SQLite schema creation, CRUD operations
- `syncService.ts`: Network listener, pending row sync on reconnect
- These services are only activated when `Capacitor.isNativePlatform()` is true
- **Status:** Active

### `src/frontend/components/smart-scanner/` — Scanner UI
- `SmartScannerView.tsx`: Manages camera stream, OCR loop, and capture flow
- `ConfirmationSheet.tsx`: Post-scan editing and confirmation
- `ocrEngine.ts`: AI/OCR fallback chain orchestration
- `deviceHeuristics.ts`: Rule-based text parser for medical device readings
- `imageFilters.ts`: Canvas-based image preprocessing
- **Status:** Active

### `src/features/scanner/` — Scanner Pipeline Logic
- Separated from UI for testability
- `useGlucoseScanner`: React hook wrapping the glucose OCR pipeline
- `glucoseOCR.ts`, `glucoseParser.ts`: Pure functional OCR + parse logic
- **Status:** Active (partially implemented; scoring/validation/preprocessing dirs reserved)

---

## Platform Architecture

### Web Mode (SSR + Hydration)
- TanStack Start handles server-side rendering
- `entry-client.tsx` uses `hydrateRoot` to attach to server-rendered HTML
- API routes (`src/routes/api/`) run as server handlers
- Supabase client uses anon key from `VITE_SUPABASE_*` env vars

### Mobile Mode (Capacitor SPA)
- TanStack Start SSR is **bypassed** on native platforms
- `entry-client.tsx` uses `createRoot` to mount as a plain React SPA
- `generate-index.mjs` creates a standalone `dist/client/index.html` for WebView
- Capacitor bridges native APIs (camera, filesystem, notifications, biometrics)
- API routes cannot be called directly from mobile (no local server)
  - OCR calls the remote server endpoint (`/api/analyze-image`) over HTTPS
  - All data persists in SQLite offline, syncs to Supabase when connected

---

## Key Architecture Decisions

### Decision 1: Unified Codebase (Web + Mobile)
- **Status:** Active
- **Reason:** Avoid code duplication. Single source of truth for all features.
- **Trade-off:** Requires careful `Capacitor.isNativePlatform()` guards throughout
- See `DECISION_LOG.md #1`

### Decision 2: MobileQueryBuilder Proxy
- **Status:** Active
- **Reason:** Transparently intercept Supabase queries on mobile to serve from SQLite cache
- **Trade-off:** Dynamic `any` cast required due to Supabase type overload complexity
- See `DECISION_LOG.md #2`

### Decision 3: Manual Type Sync (`src/db/types.ts`)
- **Status:** Active (temporary)
- **Reason:** Supabase CLI not available in dev environment
- **Future:** Replace with `supabase gen types typescript` in CI pipeline
- See `DECISION_LOG.md #3`

### Decision 4: OCR Fallback Chain
- **Status:** Active
- Chain: Google Cloud Vision → Gemini Vision → Tesseract.js (local WASM)
- Priority: server-side APIs for accuracy, local fallback for offline
- See `DECISION_LOG.md #4`

### Decision 5: shadcn/ui as UI Foundation
- **Status:** Active
- shadcn components are owned code (not a library dependency)
- Located in `src/frontend/components/ui/`
- Never override primitives — compose new components on top

---

## Performance Decisions

- **Lazy Loading:** TanStack Router supports code splitting per route (configured via Vite)
- **Canvas OCR:** Frame processing runs at 1.5s intervals, not every frame, to reduce CPU
- **SQLite Cache:** Reads served from SQLite cache on mobile for instant loading
- **Image Preprocessing:** Contrast/grayscale/sharpen applied before OCR for higher accuracy
- **Scroll Restoration:** Enabled in router for back-navigation UX

---

## Scalability Plan

| Area | Current | Future |
|------|---------|--------|
| Data fetching | Direct service calls + useState | Migrate to TanStack Query |
| Scanner AI | Cloud Vision + Gemini | Fine-tuned model on training dataset |
| Auth | Email/password | Add OAuth (Google, Apple) |
| Storage | No file uploads | Supabase Storage for scan images |
| Offline | SQLite cache | Full offline-first with conflict resolution |
| Localization | English only | i18n library (react-i18next) |
