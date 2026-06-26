# 🧩 COMPONENT_MAP.md — GlucoLab Component Reference

> **Last Updated:** 2026-06-26  
> Every component, its props, parent, children, and usage.

---

## Layout Components

---

### `AppShell` — `src/frontend/components/app-shell.tsx`

**Purpose:** Main authenticated application shell. Renders the header, bottom navigation, floating action button, and wraps page content.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | `ReactNode` | ✅ | Page content rendered in `<main>` |

**Parents:** `routes/_authenticated.tsx`  
**Children Rendered:** Header nav, mobile bottom-nav (4 tabs), Scanner FAB, page `children`  
**Dependencies:** `useAuth`, `useTheme`, `useNotifications`, `@capacitor/status-bar`, `@capacitor/haptics`, TanStack Router `Link`  
**Mobile Behavior:** Adds `pt-safe` to header, `pb-safe` to bottom nav, dynamic FAB offset for home indicator

---

## Dialog / Modal Components

---

### `GlucoseDialog` — `src/frontend/components/glucose-dialog.tsx`

**Purpose:** Add or edit a glucose entry. Opens as a modal dialog.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | ✅ | Controls dialog visibility |
| `onClose` | `() => void` | ✅ | Called when dialog closes |
| `onSave` | `(data) => void` | ✅ | Called with saved data |
| `initialData` | `GlucoseEntry \| null` | ❌ | Populates form for editing |

**Parents:** `dashboard.tsx`, `history.tsx`  
**Dependencies:** `react-hook-form`, `zod`, `@/frontend/components/ui/dialog`, `supabase`

---

### `InsulinDialog` — `src/frontend/components/insulin-dialog.tsx`

**Purpose:** Add or edit a daily insulin entry (morning, lunch, evening, night).

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | ✅ | Controls dialog visibility |
| `onClose` | `() => void` | ✅ | Called when dialog closes |
| `onSave` | `(data) => void` | ✅ | Called with saved data |
| `initialData` | `InsulinEntry \| null` | ❌ | Populates form for editing |

**Parents:** `dashboard.tsx`  
**Dependencies:** `react-hook-form`, `zod`, `@/frontend/components/ui/dialog`

---

### `WeightDialog` — `src/frontend/components/weight-dialog.tsx`

**Purpose:** Add or edit a weight entry.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | ✅ | Controls dialog visibility |
| `onClose` | `() => void` | ✅ | Called when dialog closes |
| `onSave` | `(data) => void` | ✅ | Called with saved data |
| `initialData` | `WeightEntry \| null` | ❌ | Populates form for editing |

**Parents:** `dashboard.tsx`  
**Dependencies:** `react-hook-form`, `zod`, `@/frontend/components/ui/dialog`

---

### `ProfileDialog` — `src/frontend/components/profile-dialog.tsx`

**Purpose:** Edit user profile (name, phone number).

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | ✅ | Controls dialog visibility |
| `onClose` | `() => void` | ✅ | Called when dialog closes |
| `profile` | `Profile \| null` | ❌ | Current profile data |

**Parents:** `dashboard.tsx`  
**Dependencies:** `react-hook-form`, `healthService.updateProfile`

---

## Smart Scanner Components

---

### `SmartScannerView` — `src/frontend/components/smart-scanner/SmartScannerView.tsx`

**Purpose:** Full-screen health device scanner. Manages camera, OCR loop, and reading capture.

**Props:** None (self-contained, uses router navigation)

**Internal State:**
| State | Type | Description |
|-------|------|-------------|
| `hasCameraAccess` | `boolean \| null` | null=requesting, true=ok, false=denied |
| `isScanning` | `boolean` | Whether scan loop is active |
| `ocrLog` | `string` | Status message displayed at bottom |
| `detectedReading` | `ParsedReading \| null` | OCR result |
| `confirmOpen` | `boolean` | Show ConfirmationSheet |
| `settingsOpen` | `boolean` | Show API key settings dialog |
| `scannerMode` | `"general" \| "on_call_plus"` | Active scanner profile |

**Parents:** `routes/_authenticated/scanner.tsx`  
**Children:** `ConfirmationSheet`  
**Dependencies:** `@capacitor/camera`, `ocrEngine`, `deviceHeuristics`, `useGlucoseScanner`, `scannerService`

---

### `ConfirmationSheet` — `src/frontend/components/smart-scanner/ConfirmationSheet.tsx`

**Purpose:** Post-scan review sheet. Allows user to edit detected values before saving.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `open` | `boolean` | ✅ | Sheet visibility |
| `onClose` | `() => void` | ✅ | Dismiss without saving |
| `reading` | `ParsedReading \| null` | ✅ | Detected reading from OCR |
| `onSave` | `(data: ScanReadingPayload) => void` | ✅ | Save confirmed reading |

**Parents:** `SmartScannerView`  
**Dependencies:** `scannerService.ScanReadingPayload`, Radix Sheet/Dialog UI primitives

---

## Page Route Components

---

### `DashboardPage` — `src/routes/_authenticated/dashboard.tsx`

**Purpose:** Main dashboard showing health metrics with charts.

**Props:** None (route component)

**Internal Data:**
- Fetches last 90 days of glucose, insulin, weight via `healthService.getDashboardData()`
- Date range filter: 7d / 30d / 90d
- Charts: LineChart (glucose over time), bar chart (insulin), weight trend

**Children Components:** `GlucoseDialog`, `InsulinDialog`, `WeightDialog`, `ProfileDialog`  
**Dependencies:** `healthService`, `recharts`, `date-fns`

---

### `HistoryPage` — `src/routes/_authenticated/history.tsx`

**Purpose:** Searchable log of all glucose readings with edit/delete.

**Dependencies:** `healthService.getHistory()`, `healthService.deleteGlucoseEntry()`, `GlucoseDialog`

---

### `ReportsPage` — `src/routes/_authenticated/reports.tsx`

**Purpose:** Analytics dashboard — averages, time-in-range, trends.

**Dependencies:** `healthService.getReportsData()`, `recharts`

---

### `ExportPage` — `src/routes/_authenticated/export.tsx`

**Purpose:** Date-range PDF and Excel export of all health data.

**Dependencies:** `healthService.getExportData()`, `jspdf`, `jspdf-autotable`, `xlsx`

---

### `ScannerPage` — `src/routes/_authenticated/scanner.tsx`

**Purpose:** Mount point for SmartScannerView.

**Dependencies:** `SmartScannerView`

---

### `TrainingPage` — `src/routes/_authenticated/training.tsx`

**Purpose:** Admin portal for annotating device images with bounding boxes for ML training.

**Dependencies:** `trainingService`, `@capacitor/camera`, `@capacitor/filesystem`

---

## UI Primitive Components — `src/frontend/components/ui/`

> All shadcn/ui components. Do not modify these files directly.

| Component | File | Based On |
|-----------|------|----------|
| Button | `button.tsx` | Radix Slot + CVA |
| Input | `input.tsx` | HTML input |
| Label | `label.tsx` | Radix Label |
| Dialog | `dialog.tsx` | Radix Dialog |
| Sheet | `sheet.tsx` | Radix Dialog (side panel) |
| Select | `select.tsx` | Radix Select |
| Form | `form.tsx` | react-hook-form + Radix Label |
| Card | `card.tsx` | Div composition |
| Badge | `badge.tsx` | Div + CVA |
| Tabs | `tabs.tsx` | Radix Tabs |
| Table | `table.tsx` | HTML table wrappers |
| Sonner | `sonner.tsx` | Sonner toast library |
| Skeleton | `skeleton.tsx` | Animated div |
| Switch | `switch.tsx` | Radix Switch |
| Checkbox | `checkbox.tsx` | Radix Checkbox |
| Calendar | `calendar.tsx` | react-day-picker |
| Popover | `popover.tsx` | Radix Popover |
| Tooltip | `tooltip.tsx` | Radix Tooltip |
| Accordion | `accordion.tsx` | Radix Accordion |
| Dropdown Menu | `dropdown-menu.tsx` | Radix DropdownMenu |
| Alert Dialog | `alert-dialog.tsx` | Radix AlertDialog |
| Progress | `progress.tsx` | Radix Progress |
| Slider | `slider.tsx` | Radix Slider |
| Avatar | `avatar.tsx` | Radix Avatar |
| Textarea | `textarea.tsx` | HTML textarea |
| Separator | `separator.tsx` | Radix Separator |
| Scroll Area | `scroll-area.tsx` | Radix ScrollArea |
| Sidebar | `sidebar.tsx` | Complex sidebar layout |
