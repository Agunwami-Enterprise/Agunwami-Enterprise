# Agunwami Enterprise — Backend Architecture

The backend for **Agunwami Enterprise** provides a domain-driven, modular architecture designed for the CEO Executive Dashboard and all enterprise operational pages.

It connects directly to the live Firebase Firestore database (`aehub-eafa6`) with automated token management, authenticated REST clients, and zero dummy/mock data.

---

## Directory Structure

```
backend/
├── config/                     # Configuration and enterprise constants
│   ├── firebase.config.ts      # Firebase project credentials & REST URLs
│   ├── constants.ts            # Enterprise ventures, roles, departments, collection names
│   └── index.ts                # Barrel export
│
├── core/                       # Core infrastructure & database client
│   ├── firestore.ts            # Authenticated Firestore REST client (CRUD + Query)
│   ├── types.ts                # Core types, API responses, query filters, pagination
│   ├── utils.ts                # Formatting, calculations, currency & relative time helpers
│   └── index.ts                # Barrel export
│
├── modules/                    # Feature/Domain modules (1-to-1 with CEO dashboard pages)
│   ├── dashboard/              # /ceo/dashboard (Overview stats, activity, approvals, revenue)
│   ├── projects/               # Enterprise ventures (AE Hub live stats; MCS, AWA, Trendora)
│   ├── tasks/                  # /ceo/tasks (Task summaries, staff tasks, status tracking)
│   ├── time-tracking/          # /ceo/time-tracking (Attendance logs, daily & monthly hours)
│   ├── staff/                  # /ceo/staff (Staff directory, roles, departments, clock status)
│   ├── leave-requests/         # /ceo/leave-requests (Leave applications, approval workflows)
│   ├── payments/               # /ceo/payments (Financial vouchers, payroll, status updates)
│   ├── analytics/              # /ceo/analytics (Workforce productivity, venture KPIs)
│   ├── documents/              # /ceo/documents (Executive governance, corporate policies)
│   ├── notifications/          # /ceo/notifications (Announcements, priority alerts, broadcasts)
│   ├── training/               # /ceo/training (AE Hub courses, enrollments, completion stats)
│   ├── messages/               # /ceo/messages (Executive channels, direct chat rooms)
│   ├── settings/               # /ceo/settings (Executive profile, security, configurations)
│   └── index.ts                # Barrel export for all modules
│
├── services/                   # Backward-compatibility layer (for legacy callers)
│   ├── overview.service.ts     # Re-exports from modules/dashboard
│   ├── projects.service.ts     # Re-exports from modules/projects
│   ├── activity.service.ts     # Re-exports from modules/dashboard
│   ├── approvals.service.ts    # Re-exports from modules/dashboard
│   └── revenue.service.ts      # Re-exports from modules/dashboard
│
├── firestore.ts                # Backward-compatibility re-export to core/firestore
└── index.ts                    # Central entry point: export * from './config', './core', './modules'
```

---

## Module Mapping to CEO Dashboard Pages

| CEO Page | Route | Backend Module | Firestore Collections | Key Endpoints |
|---|---|---|---|---|
| **Overview** | `/ceo/dashboard` | `modules/dashboard` | `users`, `attendanceLogs`, `leaveRequests`, `payments`, `announcements`, `analytics_snapshots` | `GET /api/ceo/overview`<br>`GET /api/ceo/activity-feed`<br>`GET /api/ceo/approvals`<br>`GET /api/ceo/revenue` |
| **Ventures** | `/ceo/dashboard` | `modules/projects` | `courses`, `users`, `leaveRequests` | `GET /api/ceo/projects/overview`<br>`GET /api/ceo/projects/aehub` |
| **Tasks** | `/ceo/tasks` | `modules/tasks` | `staffTasks`, `tasks`, `analytics_snapshots`, `users` | `GET /api/ceo/tasks`<br>`GET /api/ceo/tasks?mode=summary`<br>`POST /api/ceo/tasks`<br>`PATCH /api/ceo/tasks` |
| **Time Tracking** | `/ceo/time-tracking` | `modules/time-tracking` | `attendanceLogs`, `timeTrackingLive`, `users` | `GET /api/ceo/time-tracking?mode=summary`<br>`GET /api/ceo/time-tracking?mode=departments`<br>`GET /api/ceo/time-tracking` |
| **Staff Management** | `/ceo/staff` | `modules/staff` | `users` (`role: 'staff'`), `attendanceLogs` | `GET /api/ceo/staff`<br>`GET /api/ceo/staff?mode=list` |
| **Leave Requests** | `/ceo/leave-requests` | `modules/leave-requests` | `leaveRequests`, `users` | `GET /api/ceo/leave-requests`<br>`GET /api/ceo/leave-requests?mode=summary`<br>`PATCH /api/ceo/leave-requests` |
| **Payments** | `/ceo/payments` | `modules/payments` | `payments` | `GET /api/ceo/payments`<br>`GET /api/ceo/payments?mode=stats`<br>`PATCH /api/ceo/payments` |
| **Analytics** | `/ceo/analytics` | `modules/analytics` | `analytics_snapshots`, `attendanceLogs`, `users`, `courses`, `payments` | `GET /api/ceo/analytics`<br>`GET /api/ceo/analytics?mode=departments` |
| **Documents** | `/ceo/documents` | `modules/documents` | `documents` | `GET /api/ceo/documents`<br>`POST /api/ceo/documents` |
| **Notifications** | `/ceo/notifications` | `modules/notifications` | `announcements`, `notifications` | `GET /api/ceo/notifications?mode=announcements`<br>`GET /api/ceo/notifications`<br>`POST /api/ceo/notifications` |
| **Training** | `/ceo/training` | `modules/training` | `courses`, `users` | `GET /api/ceo/training`<br>`GET /api/ceo/training?mode=summary` |
| **Messages** | `/ceo/messages` | `modules/messages` | `channels`, `users` | `GET /api/ceo/messages`<br>`GET /api/ceo/messages?channelId=...`<br>`POST /api/ceo/messages` |
| **Settings** | `/ceo/settings` | `modules/settings` | `users`, `metadata` | `GET /api/ceo/settings`<br>`GET /api/ceo/settings?mode=enterprise`<br>`PATCH /api/ceo/settings` |

---

## Authentication & Authorization

All API endpoints are protected by `requireCeoSession()` in `@/lib/workstation/api-auth`.
Under the hood:
1. Validates the `ae_session` cookie against the Firebase session verification.
2. Ensures the user belongs to the workstation executive pool (`dept === 'ceo'` or `role === 'ceo'`).
3. Queries Firestore with server-authenticated bearer tokens generated via Google Identity Toolkit REST API (`that.dev.guy.aeceo@aehub.io`).

The workstation Firestore REST client requires `WORKSTATION_FIRESTORE_AUTH_PASSWORD` at runtime. It may use `WORKSTATION_FIRESTORE_AUTH_EMAIL` to override the default service identity. Never commit either credential.

The AE Hub metrics integration uses a shared server-only token: set `AEHUB_ENTERPRISE_METRICS_TOKEN` in the enterprise server environment and configure the same value as the Firebase Functions secret `ENTERPRISE_METRICS_TOKEN`. Requests attach this token only to AE Hub's configured metrics endpoint.
