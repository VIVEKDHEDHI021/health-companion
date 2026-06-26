# 📊 DEPENDENCY_GRAPH.md — GlucoLab Dependency Maps

> **Last Updated:** 2026-06-26  
> Mermaid diagrams for all major dependency relationships.

---

## Application Bootstrap

```mermaid
graph TD
    A["entry-client.tsx"] --> B{Capacitor.isNativePlatform?}
    B --> |Mobile| C["createRoot → RouterProvider"]
    B --> |Web| D["hydrateRoot → StartClient"]
    C --> E["router.tsx"]
    D --> E
    E --> F["routeTree.gen.ts"]
    F --> G["routes/__root.tsx"]
    G --> H["ThemeProvider"]
    H --> I["AuthProvider"]
    I --> J["NotificationProvider"]
    J --> K["routes/_authenticated.tsx"]
    K --> L["AppShell"]
    L --> M["Page Routes (Outlet)"]
```

---

## Authentication Flow

```mermaid
graph TD
    A["User visits any route"] --> B["_authenticated.tsx"]
    B --> C{user loaded?}
    C --> |No user| D["/login"]
    C --> |Loading| E["Spinner"]
    C --> |User exists| F["AppShell → Page"]
    D --> G["supabase.auth.signInWithPassword()"]
    G --> H["onAuthStateChange fires"]
    H --> I["AuthContext updates"]
    I --> J["_authenticated.tsx re-renders"]
    J --> F
```

---

## Smart Scanner Pipeline

```mermaid
graph TD
    A["scanner.tsx"] --> B["SmartScannerView.tsx"]
    
    B --> C{Platform?}
    C --> |Web| D["navigator.mediaDevices.getUserMedia()"]
    C --> |Mobile| E["@capacitor/camera getPhoto()"]
    
    D --> F["Canvas frame loop (1.5s)"]
    E --> G["Image to Canvas"]
    F --> H["ocrEngine.performOcr()"]
    G --> H
    
    H --> I{API Key available?}
    I --> |Cloud Vision key| J["POST /api/analyze-image → Cloud Vision"]
    I --> |Gemini key| K["POST /api/analyze-image → Gemini Vision"]
    I --> |No key| L["Tesseract.js local WASM"]
    
    J --> M["deviceHeuristics.detectDeviceAndReadings()"]
    K --> M
    L --> M
    
    M --> N{Reading detected?}
    N --> |Yes| O["ConfirmationSheet.tsx"]
    N --> |No| P["Continue scanning / Show warning"]
    
    O --> Q["User edits values"]
    Q --> R["scannerService.saveScanReading()"]
    R --> S["smart_scan_readings INSERT"]
    R --> T{Device Type?}
    T --> |Blood Glucose| U["glucose_entries INSERT"]
    T --> |Weight| V["weight_entries UPSERT"]
```

---

## Dashboard Data Flow

```mermaid
graph TD
    A["dashboard.tsx"] --> B["healthService.getDashboardData()"]
    B --> C["supabase client (src/db/client.ts)"]
    C --> D{MobileQueryBuilder?}
    D --> |Mobile offline| E["localDbService.ts → SQLite"]
    D --> |Online| F["Supabase REST API"]
    F --> G["PostgreSQL Database"]
    E --> H["Return cached data"]
    G --> H
    H --> I["React state update"]
    I --> J["Recharts LineChart render"]
    I --> K["Summary cards render"]
```

---

## Offline Sync Flow

```mermaid
graph TD
    A["__root.tsx (mobile init)"] --> B["syncService.setupNetworkSyncListener()"]
    B --> C["@capacitor/network addListener()"]
    C --> D{Network restored?}
    D --> |Yes| E["syncService.syncPendingData()"]
    E --> F["localDbService.getPendingSyncRows()"]
    F --> G["glucose pending rows"]
    F --> H["insulin pending rows"]
    F --> I["weight pending rows"]
    F --> J["scan pending rows"]
    G --> K["supabase.from('glucose_entries').insert()"]
    H --> L["supabase.from('insulin_entries').insert()"]
    I --> M["supabase.from('weight_entries').insert()"]
    J --> N["supabase.from('smart_scan_readings').insert()"]
    K --> O["UPDATE sync_status = 'synced'"]
    L --> O
    M --> O
    N --> O
    O --> P["toast.success('Synchronized N records')"]
```

---

## Component Dependencies

```mermaid
graph TD
    AppShell --> useAuth
    AppShell --> useTheme
    AppShell --> useNotifications
    AppShell --> StatusBar["@capacitor/status-bar"]
    AppShell --> Haptics["@capacitor/haptics"]
    
    Dashboard --> healthService
    Dashboard --> GlucoseDialog
    Dashboard --> InsulinDialog
    Dashboard --> WeightDialog
    Dashboard --> ProfileDialog
    Dashboard --> Recharts
    
    GlucoseDialog --> reactHookForm["react-hook-form"]
    GlucoseDialog --> zod
    GlucoseDialog --> Dialog["ui/dialog"]
    
    SmartScannerView --> ocrEngine
    SmartScannerView --> deviceHeuristics
    SmartScannerView --> imageFilters
    SmartScannerView --> useGlucoseScanner
    SmartScannerView --> Camera["@capacitor/camera"]
    SmartScannerView --> ConfirmationSheet
    
    ConfirmationSheet --> scannerService
    
    ocrEngine --> Tesseract["tesseract.js"]
    ocrEngine --> analyzeImage["/api/analyze-image"]
    
    analyzeImage --> CloudVision["Google Cloud Vision API"]
    analyzeImage --> Gemini["Gemini Vision API"]
```

---

## Service Layer Dependencies

```mermaid
graph TD
    healthService --> supabase
    scannerService --> supabase
    authService --> supabase
    trainingService --> supabase
    
    supabase --> client["src/db/client.ts"]
    client --> MobileProxy["MobileQueryBuilder proxy"]
    MobileProxy --> localDbService
    MobileProxy --> SupabaseREST["Supabase REST API"]
    
    localDbService --> SQLite["@capacitor-community/sqlite"]
    syncService --> Network["@capacitor/network"]
    syncService --> supabase
    syncService --> localDbService
```

---

## Authentication Context Dependencies

```mermaid
graph TD
    AuthProvider --> supabase["supabase.auth"]
    supabase --> onAuthStateChange["onAuthStateChange()"]
    supabase --> getSession["getSession()"]
    onAuthStateChange --> AuthContext["AuthContext value"]
    getSession --> AuthContext
    AuthContext --> useAuth["useAuth() hook"]
    useAuth --> AppShell
    useAuth --> authenticated["_authenticated.tsx"]
    useAuth --> services["All backend services"]
```

---

## Build Pipeline Dependencies

```mermaid
graph LR
    A["npm run build:mobile"] --> B["vite build"]
    B --> C["dist/client/ (web assets)"]
    B --> D["dist/server/ (SSR server)"]
    C --> E["generate-index.mjs"]
    E --> F["dist/client/index.html"]
    F --> G["npx cap sync android"]
    G --> H["android/app/.../assets/public/"]
    H --> I["./gradlew assembleDebug"]
    I --> J["app-debug.apk ✅"]
    H --> K["./gradlew assembleRelease"]
    K --> L["app-release-unsigned.apk ✅"]
    H --> M["./gradlew bundleRelease"]
    M --> N["app-release.aab ✅"]
```
