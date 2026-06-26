# 🗄️ DATABASE_MAP.md — GlucoLab Database Reference

> **Last Updated:** 2026-06-26  
> Documentation only. Never modify schema here — use migrations.  
> All tables live in the `public` schema with Row Level Security enabled.

---

## Database Overview

| Database | Provider | Type | Auth |
|----------|----------|------|------|
| Primary | Supabase | PostgreSQL 15 | Supabase Auth (JWT) |
| Local Cache | SQLite (mobile) | SQLite 3 | None (device local) |

---

## Tables

---

### `profiles`
**Migration:** `20260420161851_*.sql`  
**Purpose:** User profile information. Auto-created on signup via `handle_new_user` trigger.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | Internal primary key |
| `user_id` | UUID | NO | — | FK → `auth.users.id` (UNIQUE, CASCADE DELETE) |
| `name` | TEXT | YES | — | Display name |
| `email` | TEXT | YES | — | Copied from auth on creation |
| `phone` | TEXT | YES | — | Added in migration `20260422122100` |
| `created_at` | TIMESTAMPTZ | NO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Auto-updated by trigger |

**RLS Policies:** SELECT, INSERT, UPDATE — user can only access own row (`auth.uid() = user_id`)  
**Indexes:** UNIQUE on `user_id`

---

### `glucose_entries`
**Migration:** `20260420161851_*.sql`  
**Purpose:** Individual blood glucose readings.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `user_id` | UUID | NO | — | FK → `auth.users.id` |
| `glucose` | NUMERIC(6,2) | NO | — | Range: 0–1000 mg/dL |
| `reading_type` | `reading_type` ENUM | NO | — | BB, AB, BL, AL, BD, AD, BT, Fasting |
| `food` | TEXT | YES | — | Food context |
| `notes` | TEXT | YES | — | Free text notes |
| `symptoms` | TEXT | YES | — | Symptoms noted |
| `date_time` | TIMESTAMPTZ | NO | `now()` | When reading was taken |
| `created_at` | TIMESTAMPTZ | NO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Auto-updated |

**RLS Policies:** SELECT, INSERT, UPDATE, DELETE — own rows only  
**Indexes:** `idx_glucose_user_date` on `(user_id, date_time DESC)`  
**Constraint:** `date_time` cannot be in the future (migration `20260623120000`)

**ENUMs:**
```sql
CREATE TYPE public.reading_type AS ENUM (
  'BB',      -- Before Breakfast
  'AB',      -- After Breakfast
  'BL',      -- Before Lunch
  'AL',      -- After Lunch
  'BD',      -- Before Dinner
  'AD',      -- After Dinner
  'BT',      -- Before Tea
  'Fasting'
);
```

---

### `insulin_entries`
**Migration:** `20260420161851_*.sql`  
**Purpose:** Daily insulin dose records (one entry per user per day).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `user_id` | UUID | NO | — | FK → `auth.users.id` |
| `entry_date` | DATE | NO | — | The date of doses |
| `morning` | NUMERIC(5,2) | YES | 0 | Range: 0–200 units |
| `lunch` | NUMERIC(5,2) | YES | 0 | Range: 0–200 units |
| `evening` | NUMERIC(5,2) | YES | 0 | Range: 0–200 units |
| `night` | NUMERIC(5,2) | YES | 0 | Range: 0–200 units |
| `notes` | TEXT | YES | — | |
| `created_at` | TIMESTAMPTZ | NO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | |

**RLS Policies:** SELECT, INSERT, UPDATE, DELETE — own rows only  
**Indexes:** `idx_insulin_user_date` on `(user_id, entry_date DESC)`  
**Constraint:** UNIQUE on `(user_id, entry_date)` — one record per day per user

---

### `weight_entries`
**Migration:** `20260420161851_*.sql`  
**Purpose:** Daily body weight measurements.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | UUID | NO | `gen_random_uuid()` | PK |
| `user_id` | UUID | NO | — | FK → `auth.users.id` |
| `entry_date` | DATE | NO | — | Date of measurement |
| `weight_kg` | NUMERIC(5,2) | NO | — | Range: 0–500 kg |
| `notes` | TEXT | YES | — | |
| `created_at` | TIMESTAMPTZ | NO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | |

**RLS Policies:** SELECT, INSERT, UPDATE, DELETE — own rows only  
**Indexes:** `idx_weight_user_date` on `(user_id, entry_date DESC)`  
**Constraint:** UNIQUE on `(user_id, entry_date)` — one record per day per user

---

### `push_tokens`
**Migration:** `20260422164300_*.sql`  
**Purpose:** Stores FCM push notification tokens per device.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK |
| `user_id` | UUID | NO | FK → `auth.users.id` |
| `token` | TEXT | NO | FCM device token |
| `platform` | TEXT | NO | `"android"` or `"ios"` |
| `created_at` | TIMESTAMPTZ | NO | |

---

### `smart_scan_readings`
**Migration:** `20260625120000_*.sql`  
**Purpose:** Stores all Smart Scanner captured readings from any device type.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | PK |
| `user_id` | UUID | NO | FK → `auth.users.id` |
| `device_type` | TEXT | NO | One of 5 supported types |
| `reading_date` | DATE | NO | Date of scan |
| `reading_time` | TIME | NO | Time of scan |
| `confidence` | NUMERIC(4,2) | NO | OCR confidence 0–1 |
| `ocr_source` | TEXT | NO | e.g. "Google Cloud Vision" |
| `image_url` | TEXT | YES | Optional image URL |
| `notes` | TEXT | YES | User notes |
| `sync_status` | TEXT | NO | `'synced'` or `'pending'` |
| `data` | JSONB | NO | Reading-specific fields |
| `created_at` | TIMESTAMPTZ | NO | |
| `updated_at` | TIMESTAMPTZ | NO | |

**`data` JSONB Schema (by device type):**
```json
// Blood Glucose Meter
{ "glucose": 125, "unit": "mg/dL", "glucose_reading_type": "Fasting" }

// Blood Pressure Monitor
{ "systolic": 120, "diastolic": 80, "pulse": 72, "unit": "mmHg" }

// Pulse Oximeter
{ "spo2": 98, "pulse": 70, "unit": "%" }

// Thermometer
{ "temperature": 98.6, "unit": "°F" }

// Weight Scale
{ "weight": 70.5, "unit": "kg" }
```

---

### `smart_scan_training_samples`
**Migration:** `20260625130000_*.sql`  
**Purpose:** Annotated training dataset for future ML model training.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK (nullable, SET NULL on delete) |
| `device_type` | TEXT | Device category |
| `brand` | TEXT | e.g. "Accu-Chek" |
| `model` | TEXT | e.g. "Guide" |
| `device_name` | TEXT | Optional display name |
| `image_url` | TEXT | URL of annotated image |
| `image_resolution` | JSONB | `{ width, height }` |
| `display_bbox` | JSONB | `{ x, y, width, height }` (0.0–1.0 ratios) |
| `reading_bboxes` | JSONB | `{ label: { x, y, w, h } }` |
| `actual_values` | JSONB | `{ label: value }` ground truth |
| `units` | JSONB | `{ label: unit }` |
| `created_at` | TIMESTAMPTZ | |

**RLS:** Public read, authenticated insert/delete

---

### `smart_scan_feedback`
**Migration:** `20260625130000_*.sql`  
**Purpose:** Collects user corrections to OCR predictions for training data improvement.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK (nullable) |
| `device_type` | TEXT | |
| `ocr_prediction` | TEXT | What OCR detected |
| `corrected_value` | TEXT | What user corrected to |
| `created_at` | TIMESTAMPTZ | |

**RLS:** Authenticated insert, authenticated read

---

## Database Relationships

```
auth.users (Supabase managed)
  │
  ├──── profiles (1:1)
  ├──── glucose_entries (1:many)
  ├──── insulin_entries (1:many, unique per day)
  ├──── weight_entries (1:many, unique per day)
  ├──── push_tokens (1:many)
  ├──── smart_scan_readings (1:many)
  ├──── smart_scan_training_samples (1:many, nullable)
  └──── smart_scan_feedback (1:many, nullable)
```

---

## SQLite Local Cache Schema (Mobile Only)

**Service:** `src/services/localDbService.ts`

Mirrors the same tables as Supabase with an additional `sync_status` column:
- `glucose_entries` + `sync_status TEXT DEFAULT 'pending'`
- `insulin_entries` + `sync_status TEXT DEFAULT 'pending'`
- `weight_entries` + `sync_status TEXT DEFAULT 'pending'`
- `profiles` + `sync_status TEXT DEFAULT 'pending'`
- `smart_scan_readings` + `sync_status TEXT DEFAULT 'pending'`

**Sync Logic:** `syncService.ts` polls `sync_status = 'pending'` rows on network reconnect and upserts to Supabase, then marks as `'synced'`.

---

## Triggers & Functions

| Trigger | Table | Function | Purpose |
|---------|-------|----------|---------|
| `on_auth_user_created` | `auth.users` | `handle_new_user()` | Auto-create profile row on signup |
| `trg_profiles_updated` | `profiles` | `update_updated_at_column()` | Auto-update `updated_at` |
| `trg_glucose_updated` | `glucose_entries` | `update_updated_at_column()` | Auto-update `updated_at` |
| `trg_insulin_updated` | `insulin_entries` | `update_updated_at_column()` | Auto-update `updated_at` |
| `trg_weight_updated` | `weight_entries` | `update_updated_at_column()` | Auto-update `updated_at` |
| `trg_smart_scan_updated` | `smart_scan_readings` | `update_updated_at_column()` | Auto-update `updated_at` |
