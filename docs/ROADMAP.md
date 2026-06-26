# 🗺️ ROADMAP.md — GlucoLab Feature Roadmap

> **Last Updated:** 2026-06-26

---

## ✅ Completed

| Feature | Date | Notes |
|---------|------|-------|
| Project scaffold (React + TanStack + Supabase) | 2026-06-23 | |
| Supabase Auth (email/password) | 2026-06-23 | |
| Glucose tracking (CRUD) | 2026-06-23 | |
| Insulin tracking (CRUD) | 2026-06-23 | |
| Weight tracking (CRUD) | 2026-06-23 | |
| Dashboard with charts | 2026-06-23 | Recharts |
| History page | 2026-06-23 | Filterable, deletable |
| Reports + analytics | 2026-06-23 | |
| PDF + Excel export | 2026-06-23 | jsPDF + xlsx |
| Push notifications | 2026-06-23 | Firebase FCM |
| Offline SQLite cache | 2026-06-23 | Mobile only |
| Network sync service | 2026-06-23 | Auto on reconnect |
| Smart Health Scanner (OCR) | 2026-06-25 | Camera + AI |
| Google Cloud Vision integration | 2026-06-25 | |
| Gemini Vision AI integration | 2026-06-25 | |
| Training portal (admin) | 2026-06-24 | Annotation tool |
| Mobile white screen fix | 2026-06-25 | Capacitor SPA boot |
| TypeScript error resolution | 2026-06-26 | 0 tsc errors |
| Android APK + AAB build | 2026-06-26 | |
| iOS Capacitor sync | 2026-06-26 | |
| AI Documentation System | 2026-06-26 | /docs folder |

---

## 🏃 Current Sprint (Sprint 2 — Mobile Polish)

| Task | Status | Priority |
|------|--------|----------|
| Android keystore signing (release APK) | 🔄 Pending | High |
| iOS production build on Mac + Xcode | 🔄 Pending | High |
| Splash screen configuration | 🔄 Pending | Medium |
| App icon design + all sizes | 🔄 Pending | Medium |
| Deep link handling (password reset) | 🔄 Pending | Medium |

---

## 📅 Upcoming Features (Sprint 3)

| Feature | Description | Priority |
|---------|-------------|----------|
| Medication tracking | Add medications + dosage reminders | High |
| A1C estimation | Calculate estimated HbA1c from glucose averages | High |
| Settings page | Notification schedule, glucose unit (mg/dL ↔ mmol/L) | High |
| Profile photo | Upload avatar to Supabase Storage | Medium |
| Doctor report PDF | Branded PDF summary for physician visits | Medium |
| TanStack Query migration | Replace raw service calls with query caching | Medium |

---

## 🔮 Future Versions

### Version 1.1 — Enhanced Analytics
- Glucose trend graphs (7/30/90 day views already started)
- Time-in-range calculation (TIR)
- Hypoglycemia / Hyperglycemia event detection and alerts
- Insulin-to-glucose correlation graphs

### Version 1.2 — Social + Sharing
- Share readings with family caregiver (view-only access)
- Export and email report directly to doctor
- Doctor portal (read-only view of patient data)

### Version 1.3 — AI Features
- AI-trained scanner model (using training portal data)
- Personalized dietary recommendations
- Predictive glucose trend alerts
- CGM (Continuous Glucose Monitor) device integration

### Version 2.0 — Platform Expansion
- OAuth login (Google, Apple Sign-In)
- Apple Watch / WearOS companion app
- Wearable device auto-sync
- Multi-user households (family accounts)
- Localization: Hindi, Spanish, Arabic

---

## 🏆 Long Term Goals

1. **Clinical Grade Accuracy** — Validated OCR accuracy for all supported meters
2. **HIPAA Compliance** — Data encryption at rest, audit logging, data export/delete tools
3. **Play Store + App Store Launch** — Public distribution with 5-star quality
4. **ML Model Training** — Use annotated training data to build device-specific recognition model
5. **API Platform** — Open API for third-party health app integrations
