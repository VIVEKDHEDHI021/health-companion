# 🏗️ PROJECT_BLUEPRINT.md — GlucoLab Complete Project Map

> **App:** GlucoLab — Premium Diabetes & Health Management Platform  
> **Stack:** React 19 + TypeScript + TanStack Start + TanStack Router + Supabase + Capacitor  
> **Last Updated:** 2026-06-26

---

## 📁 Complete Folder Structure

```
health-companion-main/
├── android/                    # Capacitor Android native project
│   ├── app/                    # Android app module
│   │   ├── build/outputs/      # Build artifacts: APK, AAB
│   │   └── src/main/assets/public/  # Synced web assets (dist/client)
│   └── gradlew(.bat)           # Gradle build wrapper
│
├── ios/                        # Capacitor iOS native project (SPM)
│   └── App/                    # Xcode project + Swift source
│
├── docs/                       # AI Knowledge System (this folder)
│   ├── MEMORY.md               # Project permanent memory
│   ├── PROJECT_BLUEPRINT.md    # This file
│   ├── ARCHITECTURE.md         # Architecture decisions
│   ├── CHANGELOG.md            # Implementation log
│   ├── ROADMAP.md              # Feature roadmap
│   ├── KNOWN_ISSUES.md         # Bug tracker
│   ├── AI_CONTEXT.md           # AI pre-task reading
│   ├── COMPONENT_MAP.md        # Component hierarchy
│   ├── API_MAP.md              # API endpoint map
│   ├── DATABASE_MAP.md         # Database schema map
│   ├── FEATURE_MAP.md          # Feature status map
│   ├── DEPENDENCY_GRAPH.md     # Mermaid dependency graphs
│   └── DECISION_LOG.md         # Architecture decisions log
│
├── src/
│   ├── entry-client.tsx        # Client entry point (Web: hydrateRoot, Mobile: createRoot)
│   ├── router.tsx              # TanStack Router factory with error boundary
│   ├── routeTree.gen.ts        # Auto-generated route tree (do not edit manually)
│   ├── styles.css              # Global CSS + Tailwind tokens + safe-area utilities
│   │
│   ├── routes/                 # TanStack Router file-based routes
│   │   ├── __root.tsx          # Root layout: DB init, Biometric auth, ThemeProvider, AuthProvider
│   │   ├── _authenticated.tsx  # Auth guard layout: checks user, registers push notifications
│   │   ├── _authenticated/
│   │   │   ├── dashboard.tsx   # Main dashboard with glucose/insulin/weight charts
│   │   │   ├── history.tsx     # Full glucose history with search + delete
│   │   │   ├── reports.tsx     # Analytics and insights page
│   │   │   ├── export.tsx      # PDF/Excel export with date range picker
│   │   │   ├── scanner.tsx     # Smart scanner mount point (renders SmartScannerView)
│   │   │   └── training.tsx    # Admin training portal for scanner dataset annotation
│   │   ├── api/
│   │   │   ├── analyze-image.ts  # Server: POST /api/analyze-image — Google Vision/Gemini OCR proxy
│   │   │   └── admin/
│   │   │       └── reset-password.ts  # Server: POST /api/admin/reset-password — admin auth bypass
│   │   ├── index.tsx           # Root redirect: / → /dashboard or /login
│   │   ├── login.tsx           # Login page
│   │   ├── signup.tsx          # Signup page with auto profile creation
│   │   ├── forgot-password.tsx # Password reset email trigger
│   │   └── reset-password.tsx  # Password reset form (from email link)
│   │
│   ├── backend/
│   │   └── services/           # Data access layer (frontend-callable, uses supabase client)
│   │       ├── authService.ts  # Supabase auth helpers
│   │       ├── healthService.ts  # CRUD for glucose/insulin/weight/profiles
│   │       ├── scannerService.ts # Smart scan reading save + history query
│   │       └── trainingService.ts # Training dataset CRUD for scanner annotation
│   │
│   ├── db/
│   │   ├── client.ts           # Supabase client factory + MobileQueryBuilder proxy (offline cache)
│   │   ├── client.server.ts    # Server-only Supabase admin client (service role key)
│   │   ├── types.ts            # Manually maintained Supabase DB type definitions
│   │   └── auth-middleware.ts  # Server-side auth verification middleware
│   │
│   ├── frontend/
│   │   ├── components/
│   │   │   ├── app-shell.tsx      # Main layout: header, bottom-nav, FAB, safe-area, haptics
│   │   │   ├── glucose-dialog.tsx # Add/edit glucose reading modal
│   │   │   ├── insulin-dialog.tsx # Add/edit insulin entry modal
│   │   │   ├── weight-dialog.tsx  # Add/edit weight entry modal
│   │   │   ├── profile-dialog.tsx # Edit profile (name, phone) modal
│   │   │   ├── smart-scanner/     # Scanner feature UI components
│   │   │   │   ├── SmartScannerView.tsx  # Full-screen scanner view (camera/mobile capture)
│   │   │   │   ├── ConfirmationSheet.tsx # Post-scan review and save sheet
│   │   │   │   ├── deviceHeuristics.ts   # Text-based device reading parser
│   │   │   │   ├── imageFilters.ts       # Canvas preprocessing (grayscale, contrast, sharpen)
│   │   │   │   ├── ocrEngine.ts          # OCR orchestration (Cloud Vision > Gemini > Tesseract)
│   │   │   │   └── types.ts              # Shared scanner types
│   │   │   └── ui/                # shadcn/ui component library (45 primitives)
│   │   │
│   │   ├── hooks/
│   │   │   ├── use-mobile.tsx     # Detects viewport ≤768px (web only)
│   │   │   └── useNotifications.ts  # Schedules local reminder notifications via Capacitor
│   │   │
│   │   └── lib/
│   │       ├── auth-context.tsx   # AuthProvider + useAuth hook (Supabase session)
│   │       ├── theme.tsx          # ThemeProvider + useTheme hook (dark/light + localStorage)
│   │       ├── push-notifications.ts  # FCM push token registration + Capacitor push setup
│   │       ├── messaging.ts       # Firebase messaging helper (web FCM)
│   │       ├── utils.ts           # cn() utility (clsx + tailwind-merge)
│   │       └── types.ts           # Shared frontend types
│   │
│   ├── features/
│   │   └── scanner/              # Feature-level scanner pipeline
│   │       ├── hooks/
│   │       │   └── useGlucoseScanner.ts  # React hook: wraps OCR/parser pipeline
│   │       ├── meterProfiles/
│   │       │   └── onCallPlus.ts         # Device profile: crop + confidence settings
│   │       ├── ocr/
│   │       │   └── glucoseOCR.ts         # Low-level OCR execution wrapper
│   │       ├── parser/
│   │       │   └── glucoseParser.ts      # Extract glucose value from OCR text
│   │       ├── preprocessing/            # (reserved) Image preprocessing module
│   │       ├── scoring/                  # (reserved) OCR confidence scoring
│   │       └── validation/               # (reserved) Reading range validation
│   │
│   ├── providers/
│   │   └── NotificationProvider.tsx  # Context: notification permission state management
│   │
│   ├── hooks/
│   │   └── useNotifications.ts   # Root-level: fetches notifications from backend (legacy)
│   │
│   ├── services/                 # Mobile-specific services
│   │   ├── localDbService.ts     # SQLite offline database CRUD (mobile only)
│   │   └── syncService.ts        # Network listener + cloud sync for pending SQLite rows
│   │
│   └── lib/
│       └── firebase.ts           # Firebase app + Firestore init
│
├── supabase/
│   ├── config.toml               # Supabase project config
│   └── migrations/               # Ordered SQL migration files (append only)
│       ├── 20260420161851_*.sql  # Initial schema: profiles, glucose, insulin, weight
│       ├── 20260422122100_*.sql  # Add phone to profiles
│       ├── 20260422164300_*.sql  # Create push_tokens table
│       ├── 20260525150000_*.sql  # Ensure RLS policies
│       ├── 20260623120000_*.sql  # Prevent future date entries
│       ├── 20260625120000_*.sql  # Create smart_scan_readings table
│       └── 20260625130000_*.sql  # Create training tables (samples + feedback)
│
├── generate-index.mjs            # Build script: creates dist/client/index.html for Capacitor
├── capacitor.config.ts           # Capacitor app config (appId, webDir, etc.)
├── vite.config.ts (or in package.json)  # Vite build config
├── package.json                  # Dependencies + scripts
├── tsconfig.json                 # TypeScript configuration
└── .env                          # Environment variables (never commit)
```

---

## 🔗 File Connection Map

### Application Bootstrap Chain

```
entry-client.tsx
  ├── [Mobile]  → createRoot → RouterProvider → router.tsx
  └── [Web]     → hydrateRoot → StartClient → router.tsx
                                    ↓
                              routeTree.gen.ts
                                    ↓
                              routes/__root.tsx
                    ┌───────────────┴──────────────────┐
                    │ initMobile()                     │ Web pass-through
                    │  ├── localDbService.initDb()     │
                    │  ├── syncService.setupListener() │
                    │  └── BiometricAuth check         │
                    ↓
              ThemeProvider → AuthProvider → NotificationProvider → Outlet
                                    ↓
                        routes/_authenticated.tsx
                    (Redirects unauthenticated users to /login)
                                    ↓
                               AppShell
                    ┌──────────┬───────────┬──────────┐
                    │dashboard │ history   │ reports  │
                    │export    │ scanner   │ training │
                    └──────────┴───────────┴──────────┘
```

### Dashboard Data Flow

```
routes/_authenticated/dashboard.tsx
  └── healthService.getDashboardData()
        └── supabase.from("glucose_entries" | "insulin_entries" | "weight_entries" | "profiles")
              └── src/db/client.ts (MobileQueryBuilder proxy)
                    ├── [Mobile offline] → localDbService.ts → SQLite
                    └── [Online]         → Supabase REST API → PostgreSQL
```

### Smart Scanner Flow

```
routes/_authenticated/scanner.tsx
  └── SmartScannerView.tsx
        ├── [Web]    → navigator.mediaDevices.getUserMedia()
        │              → Canvas frame capture loop
        │              → ocrEngine.performOcr()
        │                    ├── [1st] POST /api/analyze-image (Cloud Vision / Gemini)
        │                    └── [fallback] Tesseract.js (local WASM)
        │              → deviceHeuristics.detectDeviceAndReadings()
        │              → ConfirmationSheet.tsx
        │                    └── scannerService.saveScanReading()
        │
        └── [Mobile] → @capacitor/camera (native camera/gallery)
                       → Canvas conversion
                       → ocrEngine.performOcr() (same chain)
                       → ConfirmationSheet.tsx
                             └── scannerService.saveScanReading()
```

### Scanner Service Save Flow

```
scannerService.saveScanReading(payload)
  ├── supabase.from("smart_scan_readings").insert()
  ├── [if Blood Glucose] → supabase.from("glucose_entries").insert()
  └── [if Weight Scale]  → supabase.from("weight_entries").upsert()
```

---

## 🌳 Component Tree

```
App (entry-client.tsx)
  └── Router (router.tsx)
        └── __root.tsx (RootComponent)
              └── RootShell (html wrapper | native fragment)
                    └── ThemeProvider
                          └── AuthProvider
                                └── NotificationProvider
                                      └── _authenticated.tsx (AuthenticatedLayout)
                                            └── AppShell (app-shell.tsx)
                                                  ├── Header (sticky top bar + nav)
                                                  ├── Main content (Outlet)
                                                  │     ├── dashboard.tsx
                                                  │     │     ├── GlucoseDialog
                                                  │     │     ├── InsulinDialog
                                                  │     │     ├── WeightDialog
                                                  │     │     └── ProfileDialog
                                                  │     ├── history.tsx
                                                  │     │     └── GlucoseDialog (edit)
                                                  │     ├── reports.tsx
                                                  │     ├── export.tsx
                                                  │     ├── scanner.tsx
                                                  │     │     └── SmartScannerView
                                                  │     │           └── ConfirmationSheet
                                                  │     └── training.tsx
                                                  ├── Bottom Nav (mobile 4-tab)
                                                  └── Scanner FAB (floating action button)
```

---

## 🗺️ Routing Map

```
/                         → Redirects to /dashboard (if logged in) or /login
/login                    → Login page
/signup                   → Signup + auto profile creation
/forgot-password          → Trigger reset email
/reset-password           → Set new password (from email link)

[Protected by _authenticated.tsx]
/dashboard                → Main dashboard, health metrics
/history                  → Glucose history log
/reports                  → Analytics and trends
/export                   → PDF/Excel data export
/scanner                  → Smart Health Scanner (OCR)
/training                 → AI Training Portal (admin)

[API Routes — server handlers]
POST /api/analyze-image           → Cloud Vision / Gemini OCR proxy
POST /api/admin/reset-password    → Admin password reset bypass
```

---

## 🔄 State Flow

```
Auth State:
  supabase.auth.onAuthStateChange() → AuthContext (user, session, loading)
    → Used by: _authenticated.tsx, app-shell.tsx, all service calls

Theme State:
  localStorage("theme") → ThemeProvider → useTheme()
    → Used by: app-shell.tsx (StatusBar update), any component with dark mode

Notification State:
  NotificationProvider → permission state
    → useNotifications hook → schedules local notifications via @capacitor/local-notifications

Scanner State (local to SmartScannerView.tsx):
  hasCameraAccess, isScanning, ocrLog, detectedReading, confirmOpen
    → Flows into ConfirmationSheet when reading detected

React Query:
  No global QueryClient configured yet — services called directly with useState/useEffect
  (Opportunity: migrate to TanStack Query for caching)
```
