"use strict";
// ─── Time Tracking Types ──────────────────────────────────────────────────────
// Firestore collection layout:
//   /timeTracking/{uid}/days/{YYYY-MM-DD}   → TimeTrackingDayDoc
//   /timeTracking/{uid}/monthlySummary/{YYYY-MM} → MonthlySummaryDoc
//   /timeTrackingLive/{uid}                 → TimeTrackingLiveDoc
Object.defineProperty(exports, "__esModule", { value: true });
