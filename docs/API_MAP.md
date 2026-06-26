# 🌐 API_MAP.md — GlucoLab API Reference

> **Last Updated:** 2026-06-26  
> Maps every API endpoint, service function, and data flow.

---

## Server API Routes (`src/routes/api/`)

---

### `POST /api/analyze-image`
**File:** `src/routes/api/analyze-image.ts`  
**Purpose:** Server-side proxy for AI image analysis. Protects API keys from client exposure.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Priority Chain:**
1. **Google Cloud Vision API** — if `GOOGLE_CLOUD_VISION_API_KEY` is set
2. **Gemini Vision API** — if `GEMINI_API_KEY` is set
3. Returns 500 error if no API key configured

**Response (success):**
```json
{
  "deviceType": "Blood Glucose Meter",
  "data": {
    "glucose": 125,
    "unit": "mg/dL"
  },
  "confidence": 0.95
}
```

**Response (error):**
```json
{
  "error": "No vision API key configured on the server."
}
```

**Called By:** `src/frontend/components/smart-scanner/ocrEngine.ts`  
**Environment Variables:** `GOOGLE_CLOUD_VISION_API_KEY`, `GEMINI_API_KEY`

---

### `POST /api/admin/reset-password`
**File:** `src/routes/api/admin/reset-password.ts`  
**Purpose:** Admin bypass to reset a user's password using Supabase service role key.

**Request:**
```json
{
  "userId": "uuid",
  "newPassword": "securepassword"
}
```

**Response (success):**
```json
{ "success": true }
```

**Called By:** Admin tooling (not exposed to regular users)  
**Environment Variables:** `SUPABASE_SERVICE_ROLE_KEY`

---

## Backend Service Functions (`src/backend/services/`)

---

### `healthService` — `src/backend/services/healthService.ts`

| Function | Returns | Description |
|----------|---------|-------------|
| `getDashboardData()` | `Promise<[glucose[], insulin[], weight[], profile]>` | Last 90 days of all health data |
| `getHistory()` | `Promise<glucose[]>` | All glucose entries, newest first |
| `deleteGlucoseEntry(id)` | `Promise<void>` | Delete a single glucose entry |
| `getExportData(fromIso, toIso, from, to)` | `Promise<[glucose[], insulin[], weight[], profile]>` | Date-range data for export |
| `getReportsData(sinceIso, sinceDate)` | `Promise<[glucose[], insulin[], weight[]]>` | Date-range data for reports |
| `getProfile()` | `Promise<Profile>` | Current user profile |
| `updateProfile(data)` | `Promise<void>` | Update name/phone |

**Used By:** `dashboard.tsx`, `history.tsx`, `reports.tsx`, `export.tsx`  
**Dependencies:** `supabase` from `@/db/client`

---

### `scannerService` — `src/backend/services/scannerService.ts`

| Function | Returns | Description |
|----------|---------|-------------|
| `saveScanReading(payload)` | `Promise<{data, error}>` | Save scan to DB + mirror to health tables |
| `getScanHistory()` | `Promise<scan[]>` | All scans for current user |
| `saveToLocalStorage(payload)` | `void` | Stub (disabled) |
| `getPendingScans()` | `[]` | Stub (returns empty) |
| `syncPendingScans()` | `Promise<{success, count}>` | Stub (returns success: true) |

**Used By:** `SmartScannerView.tsx` (via ConfirmationSheet), `training.tsx`  
**Dependencies:** `supabase` from `@/db/client`

**Save Flow:**
```
saveScanReading(payload)
  → INSERT into smart_scan_readings
  → [Blood Glucose] INSERT into glucose_entries
  → [Weight Scale]  UPSERT into weight_entries
```

---

### `authService` — `src/backend/services/authService.ts`

| Function | Returns | Description |
|----------|---------|-------------|
| (Wraps Supabase auth) | — | Sign in, sign up, sign out, reset password |

**Used By:** `login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`  
**Dependencies:** `supabase` from `@/db/client`

---

### `trainingService` — `src/backend/services/trainingService.ts`

| Function | Returns | Description |
|----------|---------|-------------|
| `saveTrainingSample(sample)` | `Promise<{data, error}>` | Insert annotated training sample |
| `getTrainingSamples()` | `Promise<sample[]>` | Fetch all training samples |
| `deleteTrainingSample(id)` | `Promise<void>` | Remove a training sample |
| `saveFeedback(feedback)` | `Promise<{data, error}>` | Submit OCR correction feedback |

**Used By:** `training.tsx`  
**Dependencies:** `supabase` from `@/db/client`

---

## Supabase Direct Calls (via `src/db/client.ts`)

All service functions call Supabase via the `supabase` client. On mobile, reads are intercepted by `MobileQueryBuilder` and served from SQLite if offline.

---

## External API Integrations

| API | Used In | Purpose | Auth Method |
|-----|---------|---------|------------|
| Google Cloud Vision | `/api/analyze-image` | OCR for medical device screens | API Key (server env) |
| Gemini Vision AI | `/api/analyze-image` | OCR fallback (AI vision) | API Key (server env) |
| Tesseract.js | `ocrEngine.ts` | Local OCR fallback (WASM) | None |
| Firebase FCM | `push-notifications.ts` | Push notification delivery | Firebase project config |
| Supabase REST | All service files | Database + Auth | JWT (user session) |
| Supabase Admin | `client.server.ts` | Server-only admin operations | Service role key |

---

## Data Flow Summary

```
Frontend Component
  ↓ calls
Backend Service (src/backend/services/)
  ↓ calls
src/db/client.ts (supabase client)
  ↓ [Mobile offline?]
  ├── YES → localDbService.ts (SQLite) → returns cached data
  └── NO  → Supabase REST API → PostgreSQL → returns data
  ↓
Component renders data
```

```
SmartScannerView (capture)
  ↓ base64 image
ocrEngine.ts
  ↓ POST /api/analyze-image (server)
routes/api/analyze-image.ts
  ↓ Cloud Vision API or Gemini API
  ↓ returns { deviceType, data, confidence }
ConfirmationSheet.tsx (user review)
  ↓ confirmed payload
scannerService.saveScanReading()
  ↓
smart_scan_readings table + glucose_entries / weight_entries
```
