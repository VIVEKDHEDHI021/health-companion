# 🧠 MEMORY.md — GlucoLab Project Memory

> **Last Updated:** 2026-06-26  
> **Status:** Active Development  
> **Platform:** Web + Android + iOS (Capacitor)

---

## 📍 Current Project Status

| Field            | Value                                |
|------------------|--------------------------------------|
| **App Name**     | GlucoLab                             |
| **Version**      | 1.0.0 (Pre-Release)                  |
| **App ID**       | com.glucolab.app                     |
| **Current Branch** | `fix-typescript-errors`            |
| **Build Status** | ✅ Web ✅ Android APK ✅ Android AAB ✅ iOS Sync |
| **TypeScript**   | ✅ Clean (0 errors)                  |

---

## ✅ Completed Work

- [x] Initial React + TanStack Start scaffold
- [x] Supabase Auth integration (email/password)
- [x] Glucose entry tracking (CRUD)
- [x] Insulin entry tracking (CRUD)
- [x] Weight entry tracking (CRUD)
- [x] Dashboard with charts (Recharts)
- [x] History page with filtering and delete
- [x] Reports page with date-range analytics
- [x] Export page (PDF via jsPDF + Excel via xlsx)
- [x] Smart Health Scanner (OCR via Tesseract.js + Google Cloud Vision + Gemini Vision)
- [x] Scanner Confirmation Sheet with editable fields
- [x] Device heuristics parser (Blood Glucose, BP, SpO2, Temp, Weight)
- [x] Training Portal for scanner annotation (admin)
- [x] Push Notifications (Firebase FCM + Capacitor Push)
- [x] Local Notifications (Capacitor)
- [x] Biometric authentication (NativeBiometric)
- [x] Offline SQLite caching (mobile only)
- [x] Network sync service (auto-sync on reconnect)
- [x] Capacitor Android build (Debug APK + Release APK + AAB)
- [x] Capacitor iOS sync
- [x] TypeScript compilation errors resolved
- [x] Safe Area support for mobile (notch/home indicator)
- [x] Status bar theming (dark/light)
- [x] Haptic feedback on navigation
- [x] Dark/light theme with `ThemeProvider`
- [x] AI Documentation System (`/docs` folder)

---

## 🔄 Work In Progress

- [ ] iOS production build (requires Mac + Xcode)
- [ ] App Store / Google Play submission preparation
- [ ] Keystore signing for release APK

---

## ⏳ Pending Tasks

- [ ] Medication tracking feature (planned)
- [ ] Doctor-sharing export (PDF with branding)
- [ ] A1C estimation from glucose averages
- [ ] Settings page (notification preferences, units)
- [ ] Profile photo upload (Supabase Storage)
- [ ] Deep-link handling for password reset emails
- [ ] Supabase CLI type generation automation (`supabase gen types typescript`)

---

## 🚧 Blockers

- iOS production build requires Mac with Xcode installed.
- Release APK is unsigned — needs a keystore for Play Store.
- `@capacitor-community/image-to-text` has no iOS SPM package (warning during sync).

---

## 🐛 Known Issues

See `KNOWN_ISSUES.md` for full detail.

- `@capacitor-community/image-to-text` does not support SPM for iOS — iOS OCR must use camera capture + Cloud Vision instead.
- Release APK strip symbols warning for `libsqlcipher.so` (non-breaking).

---

## 🧠 Important Decisions

1. **Hybrid Entry Point**: Mobile uses `createRoot`, web uses `hydrateRoot`. See `DECISION_LOG.md`.
2. **Manual type sync**: `src/db/types.ts` is manually maintained (not CLI-generated).
3. **Supabase proxy**: Uses `any` cast in `client.ts` for dynamic table routing.
4. **Scanner AI fallback chain**: Google Cloud Vision → Gemini Vision → Tesseract local OCR.

---

## 🤖 AI Instructions

Before starting ANY implementation in this project:

1. Read `AI_CONTEXT.md` — for current task and rules
2. Read `MEMORY.md` — for project state (this file)
3. Read `PROJECT_BLUEPRINT.md` — for complete file map
4. Read `ARCHITECTURE.md` — for design decisions
5. Read `ROADMAP.md` — for sprint context

**Never modify:**
- `supabase/migrations/` — append only
- `src/db/types.ts` — only when schema changes, update manually
- `src/frontend/components/ui/` — do not customize shadcn primitives directly

**Always:**
- Check `Capacitor.isNativePlatform()` before using any native API
- Use the `safe-area-*` utility classes for mobile layouts
- Update all relevant docs after a feature is completed
