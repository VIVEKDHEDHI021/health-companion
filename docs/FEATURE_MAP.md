# 🗺️ FEATURE_MAP.md — GlucoLab Feature Status

> **Last Updated:** 2026-06-26  
> Every feature with purpose, status, files, dependencies, and known issues.

---

## Feature Status Legend
- ✅ **Complete** — Fully implemented and tested
- 🔄 **In Progress** — Partially implemented
- 📅 **Planned** — On roadmap, not started
- ❌ **Blocked** — Cannot proceed without dependency

---

## Feature 1: Authentication System

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Secure user login, registration, and session management |

**Files:**
- `src/routes/login.tsx` — Login form
- `src/routes/signup.tsx` — Registration form
- `src/routes/forgot-password.tsx` — Password reset email
- `src/routes/reset-password.tsx` — New password form
- `src/routes/_authenticated.tsx` — Auth guard layout
- `src/frontend/lib/auth-context.tsx` — AuthContext + useAuth hook
- `src/backend/services/authService.ts` — Auth operations
- `src/db/auth-middleware.ts` — Server-side auth verification

**Flow:**
```
User visits /login
  → Supabase Auth (email/password)
  → onAuthStateChange fires
  → AuthContext updates (user, session)
  → _authenticated.tsx allows access
  → Redirects to /dashboard
```

**Future Improvements:** OAuth (Google, Apple Sign-In), magic link login

---

## Feature 2: Glucose Tracking

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Log and manage blood glucose readings with type, notes, and timestamps |

**Files:**
- `src/frontend/components/glucose-dialog.tsx` — Add/edit modal
- `src/routes/_authenticated/dashboard.tsx` — Dashboard card
- `src/routes/_authenticated/history.tsx` — History list
- `src/backend/services/healthService.ts` — Data operations

**Dependencies:** Supabase `glucose_entries` table, `reading_type` ENUM  
**Future Improvements:** Glucose unit conversion (mg/dL ↔ mmol/L), photo of food pairing

---

## Feature 3: Insulin Tracking

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Daily insulin dose logging (morning, lunch, evening, night) |

**Files:**
- `src/frontend/components/insulin-dialog.tsx` — Add/edit modal
- `src/routes/_authenticated/dashboard.tsx` — Dashboard card
- `src/backend/services/healthService.ts` — Data operations

**Dependencies:** Supabase `insulin_entries` table  
**Known Issue:** One entry per day constraint — users cannot log multiple corrections

---

## Feature 4: Weight Tracking

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Daily body weight logging |

**Files:**
- `src/frontend/components/weight-dialog.tsx` — Add/edit modal
- `src/routes/_authenticated/dashboard.tsx` — Dashboard card
- `src/backend/services/healthService.ts` — Data operations

**Dependencies:** Supabase `weight_entries` table  
**Known Issue:** One entry per day constraint — cannot log multiple times per day

---

## Feature 5: Dashboard

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Visual overview of health metrics with charts and quick actions |

**Files:**
- `src/routes/_authenticated/dashboard.tsx`

**Features:**
- Glucose line chart (7/30/90 day filter)
- Latest glucose, insulin, weight summary cards
- Quick add buttons (glucose, insulin, weight)
- Profile header with welcome message
- Data from last 90 days on load

**Dependencies:** `healthService.getDashboardData()`, Recharts  
**Future Improvements:** Glucose trend indicator, A1C estimation card

---

## Feature 6: History

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Browse, search, edit, and delete all glucose readings |

**Files:**
- `src/routes/_authenticated/history.tsx`
- `src/frontend/components/glucose-dialog.tsx` (edit mode)

**Features:**
- Paginated/scrollable list of all readings
- Search/filter by date
- Edit entry (opens GlucoseDialog)
- Delete with confirmation

**Dependencies:** `healthService.getHistory()`, `healthService.deleteGlucoseEntry()`

---

## Feature 7: Reports & Analytics

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Data visualization with trend analysis over selectable time ranges |

**Files:**
- `src/routes/_authenticated/reports.tsx`

**Features:**
- Selectable range: 7d / 30d / 90d
- Glucose trend chart
- Average glucose, min, max, standard deviation
- Insulin totals
- Weight trend

**Dependencies:** `healthService.getReportsData()`, Recharts  
**Future Improvements:** Time-in-range calculation, A1C estimate, meal correlation

---

## Feature 8: PDF & Excel Export

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Export health data in PDF or Excel format for doctor visits |

**Files:**
- `src/routes/_authenticated/export.tsx`

**Features:**
- Date range picker (from/to)
- PDF generation with jsPDF + autoTable
- Excel export with xlsx library
- Includes all three data types (glucose, insulin, weight)

**Dependencies:** `healthService.getExportData()`, `jspdf`, `jspdf-autotable`, `xlsx`  
**Future Improvements:** Branded PDF with GlucoLab logo, doctor-ready format

---

## Feature 9: Smart Health Scanner

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | AI-powered OCR to capture readings from medical device screens |

**Files:**
- `src/routes/_authenticated/scanner.tsx`
- `src/frontend/components/smart-scanner/SmartScannerView.tsx`
- `src/frontend/components/smart-scanner/ConfirmationSheet.tsx`
- `src/frontend/components/smart-scanner/ocrEngine.ts`
- `src/frontend/components/smart-scanner/deviceHeuristics.ts`
- `src/frontend/components/smart-scanner/imageFilters.ts`
- `src/features/scanner/` (pipeline modules)
- `src/backend/services/scannerService.ts`
- `src/routes/api/analyze-image.ts`

**Supported Devices:**
- Blood Glucose Meter → saves to `glucose_entries`
- Blood Pressure Monitor → saves to `smart_scan_readings`
- Pulse Oximeter → saves to `smart_scan_readings`
- Thermometer → saves to `smart_scan_readings`
- Weight Scale → saves to `weight_entries`

**OCR Pipeline:**
1. Google Cloud Vision API (server-side, most accurate)
2. Gemini Vision AI (server-side, AI fallback)
3. Tesseract.js (client-side WASM, offline fallback)

**Known Issues:**
- `@capacitor-community/image-to-text` has no iOS SPM package — iOS must use cloud OCR

---

## Feature 10: Training Portal (Admin)

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Annotate device images with bounding boxes and actual values for ML training |

**Files:**
- `src/routes/_authenticated/training.tsx`
- `src/backend/services/trainingService.ts`

**Features:**
- Upload device image
- Draw bounding boxes (display area + individual readings)
- Enter actual values and units
- Submit to `smart_scan_training_samples` table
- Submit OCR feedback corrections to `smart_scan_feedback` table

**Future:** Use training data to fine-tune a device-specific ML model

---

## Feature 11: Push Notifications

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete (Android) |
| **Purpose** | Remind users to log readings, deliver alerts |

**Files:**
- `src/lib/firebase.ts`
- `src/frontend/lib/push-notifications.ts`
- `src/frontend/lib/messaging.ts`
- `src/frontend/hooks/useNotifications.ts`
- `src/providers/NotificationProvider.tsx`
- `src/routes/api/send-push.ts`
- `supabase/migrations/20260422164300_*.sql`

**Known Issue:** iOS push notifications require additional APNs configuration

---

## Feature 12: Offline Support (Mobile)

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete |
| **Purpose** | Mobile app works offline; data syncs when network reconnects |

**Files:**
- `src/services/localDbService.ts`
- `src/services/syncService.ts`

**Tables Cached:** glucose_entries, insulin_entries, weight_entries, profiles, smart_scan_readings  
**Sync Trigger:** `@capacitor/network` `networkStatusChange` event

---

## Feature 13: Biometric Authentication

| Field | Value |
|-------|-------|
| **Status** | ✅ Complete (future-ready) |
| **Purpose** | Fingerprint/face unlock to access the app on mobile |

**Files:**
- `src/routes/__root.tsx` (biometric gate logic)

**Plugin:** `@capgo/capacitor-native-biometric`  
**Flow:** If `biometrics_enabled` preference is true → show locked screen → verify identity → allow access

---

## Feature 14: Medication Tracking

| Field | Value |
|-------|-------|
| **Status** | 📅 Planned |
| **Purpose** | Track medications, dosages, and schedules with reminder alerts |

**Future Files:**
- `src/routes/_authenticated/medications.tsx`
- `src/frontend/components/medication-dialog.tsx`
- `src/backend/services/medicationService.ts`
- `supabase/migrations/YYYYMMDD_create_medications.sql`

---

## Feature 15: Settings Page

| Field | Value |
|-------|-------|
| **Status** | 📅 Planned |
| **Purpose** | User preferences: units, notification schedule, biometric toggle |

**Future Files:**
- `src/routes/_authenticated/settings.tsx`
