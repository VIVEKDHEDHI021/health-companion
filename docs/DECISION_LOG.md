# 📝 DECISION_LOG.md — GlucoLab Architecture Decisions

> All decisions are preserved permanently. Never remove old decisions.  
> **Status options:** Active | Deprecated | Replaced  
> **Last Updated:** 2026-06-26

---

## DECISION-001: Unified Codebase for Web + Mobile

| Field | Value |
|-------|-------|
| **Date** | 2026-06-23 |
| **Status** | ✅ Active |
| **Decision Maker** | Project Architect |

**Decision:**  
Maintain a single React codebase that compiles to both web and native mobile (Android + iOS) using Capacitor, rather than maintaining separate web and mobile codebases.

**Reason:**  
- Eliminate code duplication between web and mobile
- Single source of truth for business logic, UI, and data access
- Faster feature development — implement once, works everywhere
- Lower maintenance burden

**Benefits:**
- One codebase to review, test, and deploy
- Consistent UI between web and mobile
- Shared TypeScript types between all layers
- Single `npm` dependency tree

**Trade-offs:**
- Requires `Capacitor.isNativePlatform()` guards throughout the code
- Build process is more complex (dual output: web + mobile)
- Some native features require conditional code paths
- SSR hydration must be bypassed on native platforms

**Implementation:**  
`src/entry-client.tsx` uses `createRoot` on native vs `hydrateRoot` on web.

---

## DECISION-002: MobileQueryBuilder Proxy for Offline Cache

| Field | Value |
|-------|-------|
| **Date** | 2026-06-23 |
| **Status** | ✅ Active |
| **Decision Maker** | Project Architect |

**Decision:**  
Intercept Supabase `from()` calls on mobile using a JavaScript Proxy (`MobileQueryBuilder`) to transparently serve cached data from SQLite when offline.

**Reason:**  
- Existing service code calls `supabase.from("tableName")` throughout the app
- We don't want to add offline conditionals in every service function
- Transparent interception at the database client level keeps services clean

**Benefits:**
- Zero changes required to existing service functions
- Offline behavior is centralized in one place (`src/db/client.ts`)
- Gradual enhancement — can improve caching logic without touching services

**Trade-offs:**
- Requires `any` type cast in proxy handler (Supabase type overloads are too complex for dynamic table names)
- Proxy logic must be maintained when Supabase client API changes
- Debugging can be harder when interception is unexpected

**Alternative Considered:**  
Add explicit offline checks in every service function — rejected as too verbose and error-prone.

---

## DECISION-003: Manual TypeScript Type Sync for Supabase

| Field | Value |
|-------|-------|
| **Date** | 2026-06-26 |
| **Status** | ✅ Active (Temporary) |
| **Decision Maker** | Developer |

**Decision:**  
Manually maintain `src/db/types.ts` with Supabase database type definitions, rather than using the Supabase CLI (`supabase gen types typescript`) for automatic generation.

**Reason:**  
- Supabase CLI was not available in the development environment at the time
- TypeScript compilation errors needed to be resolved immediately
- New tables (`smart_scan_training_samples`, `smart_scan_feedback`) were added without a CLI refresh

**Benefits:**
- Immediate unblocking of TypeScript compilation
- No CLI configuration required
- Works in any development environment

**Trade-offs:**
- Risk of type drift if schema changes without updating `types.ts`
- Manual effort required for each schema change
- Can cause type errors if missed

**Future Plan:**  
Set up `supabase gen types typescript --project-id <id> > src/db/types.ts` as a CI pipeline step after each migration push.

---

## DECISION-004: OCR Fallback Chain (Cloud Vision → Gemini → Tesseract)

| Field | Value |
|-------|-------|
| **Date** | 2026-06-25 |
| **Status** | ✅ Active |
| **Decision Maker** | Project Architect |

**Decision:**  
Implement a three-tier OCR fallback chain for the Smart Health Scanner:
1. **Google Cloud Vision API** (highest accuracy, server-side)
2. **Gemini Vision AI** (AI model, server-side fallback)
3. **Tesseract.js** (local WASM, client-side, fully offline)

**Reason:**  
- No single OCR solution is perfect for all device types/lighting conditions
- Cloud-based APIs are more accurate but require network + API key
- Local OCR is needed for offline functionality
- API keys must never be exposed to clients (server proxy required)

**Benefits:**
- Best possible accuracy by trying cloud APIs first
- Graceful degradation to local OCR if server unavailable
- User can configure their own API keys via settings dialog
- Server proxy (`/api/analyze-image`) protects API credentials

**Trade-offs:**
- Multiple HTTP hops add latency
- Server API route only available on web (mobile calls remote server)
- Tesseract WASM bundle adds ~5MB to web bundle

**Alternative Considered:**  
Use only Tesseract.js locally — rejected due to poor accuracy on 7-segment LCD displays.

---

## DECISION-005: shadcn/ui as UI Component Foundation

| Field | Value |
|-------|-------|
| **Date** | 2026-06-23 |
| **Status** | ✅ Active |
| **Decision Maker** | Project Architect |

**Decision:**  
Use shadcn/ui components as the base UI primitive library. Components are owned source code (not a library import) located in `src/frontend/components/ui/`.

**Reason:**  
- Full control over component implementation
- No version lock-in or breaking changes from external library
- Consistent design system based on Radix UI primitives
- Tailwind CSS v4 integration is clean
- Can customize any component when needed

**Benefits:**
- Complete ownership and control
- No runtime component library overhead
- Type-safe Radix UI primitives underneath
- Easy to extend with custom variants

**Trade-offs:**
- 45+ component files to maintain
- Cannot simply `npm update` to get UI improvements
- New component additions require manual generation

**Rule:**  
Never modify `src/frontend/components/ui/*.tsx` files directly. Compose new components on top of these primitives.

---

## DECISION-006: TanStack Router with File-Based Routing

| Field | Value |
|-------|-------|
| **Date** | 2026-06-23 |
| **Status** | ✅ Active |
| **Decision Maker** | Project Architect |

**Decision:**  
Use TanStack Router with file-based routing via the `@tanstack/router-plugin` Vite plugin, which auto-generates `routeTree.gen.ts`.

**Reason:**  
- Type-safe routing with full TypeScript support
- File-based convention reduces boilerplate
- Automatic code splitting per route
- Works with TanStack Start for SSR

**Benefits:**
- Zero routing configuration — files in `src/routes/` are routes automatically
- Type-safe `Link` components with route inference
- Scroll restoration built-in
- Nested layout routes (`_authenticated.tsx`)

**Trade-offs:**
- `routeTree.gen.ts` must never be manually edited
- Route changes require a Vite dev server restart to regenerate
- Naming conventions (`_authenticated`, `__root`) must be followed strictly

---

## DECISION-007: Supabase as Backend-as-a-Service

| Field | Value |
|-------|-------|
| **Date** | 2026-06-23 |
| **Status** | ✅ Active |
| **Decision Maker** | Project Architect |

**Decision:**  
Use Supabase (PostgreSQL + Auth + RLS) as the entire backend — no separate custom API server.

**Reason:**
- Eliminate need for separate Node.js/Express server
- PostgreSQL is production-grade and scalable
- Built-in Auth with session management
- Row Level Security enforces data isolation without application code
- Real-time subscriptions available if needed in the future

**Benefits:**
- No server to maintain, deploy, or scale
- Auth, database, and storage in one platform
- Generous free tier for initial development
- RLS means the database itself enforces security

**Trade-offs:**
- Server-side business logic must be written as TanStack Start API routes
- Complex queries may be limited by RLS policy complexity
- Supabase vendor lock-in (though migration to raw PostgreSQL is possible)

**Constraint:**  
All API keys requiring server-side protection (Cloud Vision, Gemini) use TanStack Start server route handlers (`src/routes/api/`) since Supabase cannot run arbitrary server code.
