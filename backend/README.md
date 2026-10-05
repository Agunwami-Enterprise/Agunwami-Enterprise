# Agunwami Enterprise — Backend Architecture

The backend for **Agunwami Enterprise** provides a domain-driven, modular architecture designed for the CEO Executive Dashboard and all enterprise operational pages.

Enterprise project configuration is stored in Enterprise Firestore. Each project can configure one metrics endpoint; the Enterprise server reads that endpoint and uses its response for the project card, dashboard KPIs, health, revenue, activity, approvals, tasks, departments, and staff. The workstation Firebase project remains limited to login and role lookup.

Metrics endpoints must return a JSON object. The response may expose fields at the top level or under `data`, and can include `metrics` (or `kpis`/`stats`), `health`, `revenueTrend`, `approvals`, `activity`, `tasks`, `leaveRequests`, `departments`, and `staff`. Missing fields remain unavailable rather than being populated with sample data. Endpoint fetch failures are surfaced on the project card. A project may optionally configure a bearer token; the Enterprise server encrypts it with `SESSION_SECRET` before storage and never returns it to the browser. Keep `SESSION_SECRET` stable across deployments so saved endpoint credentials remain decryptable.

CEO staff tasks created with a configured project are sent to that project's `/api/enterprise/tasks` endpoint (derived from its `/api/enterprise/metrics` endpoint) and stored in the project's `staffTasks` collection. The project must use the shared `ENTERPRISE_METRICS_TOKEN` bearer contract and return active staff and departments from its metrics endpoint. Tasks created with the Enterprise destination selected are stored in Enterprise's own `staffTasks` collection. Personal to-dos remain project-associated.

The CEO Leave Requests page aggregates the `leaveRequests` array from each configured project metrics endpoint. Reviews are sent to the corresponding project's `/api/enterprise/leave-requests` endpoint using the same bearer token; project endpoints should only permit approved/rejected status changes to pending records.

Example response:

```json
{
  "metrics": [
    { "label": "Active Staff", "value": 12 },
    { "label": "Revenue", "value": "₦250,000" }
  ],
  "health": 88,
  "revenueTrend": [{ "month": "Jun", "revenue": 250000 }],
  "tasks": {
    "total": 20,
    "completed": 14,
    "items": [{ "id": "task-1", "title": "Review report", "status": "In Progress" }]
  },
  "leaveRequests": [{
    "id": "leave-1",
    "userId": "staff-1",
    "userName": "Example Staff",
    "leaveType": "Annual Leave",
    "startDate": "2026-06-10",
    "endDate": "2026-06-12",
    "days": 3,
    "status": "pending",
    "reason": "Personal leave",
    "appliedAt": "2026-05-20T09:00:00.000Z"
  }],
  "departments": [{ "id": "operations", "name": "Operations", "headcount": 8 }],
  "staff": [{ "id": "staff-1", "name": "Example Staff", "department": "Operations", "status": "active" }],
  "approvals": [],
  "activity": []
}
```

Configure this URL in the project's **Project Metrics Endpoint** field. The endpoint is fetched server-side by `/api/ceo/projects/overview`; it should be reachable by the Enterprise server and return JSON.

---

## Directory Structure

```
backend/
├── config/                     # Configuration and enterprise constants
│   ├── firebase.config.ts      # Enterprise data project & Firestore REST URL
│   ├── constants.ts            # Roles, departments, collection names
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
│   ├── projects/               # Enterprise project records
│   ├── tasks/                  # /ceo/tasks (Task summaries, staff tasks, status tracking)
│   ├── time-tracking/          # /ceo/time-tracking (Attendance logs, daily & monthly hours)
│   ├── staff/                  # /ceo/staff (Staff directory, roles, departments, clock status)
│   ├── leave-requests/         # /ceo/leave-requests (Leave applications, approval workflows)
│   ├── payments/               # /ceo/payments (Financial vouchers, payroll, status updates)
│   ├── analytics/              # /ceo/analytics (Workforce productivity, venture KPIs)
│   ├── documents/              # /ceo/documents (Executive governance, corporate policies)
│   ├── notifications/          # /ceo/notifications (Announcements, priority alerts, broadcasts)
│   ├── training/               # /ceo/training (courses, enrollments, completion stats)
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
| **Projects** | `/ceo/dashboard` | `modules/projects` | `enterprise_projects` | `GET /api/ceo/projects/overview` (loads each configured project metrics endpoint) |
| **Tasks** | `/ceo/tasks` | `modules/tasks` | `staffTasks`, `tasks`, `analytics_snapshots`, `users` | `GET /api/ceo/tasks`<br>`GET /api/ceo/tasks?mode=summary`<br>`POST /api/ceo/tasks`<br>`PATCH /api/ceo/tasks` |
| **Time Tracking** | `/ceo/time-tracking` | `modules/time-tracking` | `attendanceLogs`, `timeTrackingLive`, `users` | `GET /api/ceo/time-tracking?mode=summary`<br>`GET /api/ceo/time-tracking?mode=departments`<br>`GET /api/ceo/time-tracking` |
| **Staff Management** | `/ceo/staff` | `modules/staff` | `users` (`role: 'staff'`), `attendanceLogs` | `GET /api/ceo/staff`<br>`GET /api/ceo/staff?mode=list` |
| **Leave Requests** | `/ceo/leave-requests` | `modules/leave-requests` | Configured project metrics endpoints | `GET /api/ceo/leave-requests`<br>`GET /api/ceo/leave-requests?mode=summary`<br>`PATCH /api/ceo/leave-requests` |
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
1. The login flow verifies the Firebase ID token and reads the user's role from the workstation Firebase project.
2. The server signs that role into the `ae_session` cookie.
3. API routes validate the signed session and CEO role without querying the workstation database.

Set `NEXT_PUBLIC_ENTERPRISE_FIREBASE_PROJECT_ID` for browser data access and `ENTERPRISE_FIREBASE_PROJECT_ID` for server-side data access. If unset, both use `NEXT_PUBLIC_FIREBASE_PROJECT_ID` as the Enterprise project fallback, then default to `agunwami`. They never fall back to the workstation-specific `NEXT_PUBLIC_WORKSTATION_FIREBASE_PROJECT_ID`. Configure Enterprise Firebase API credentials separately with `NEXT_PUBLIC_ENTERPRISE_FIREBASE_*`.

Login and role routing continue to use `NEXT_PUBLIC_WORKSTATION_FIREBASE_*` and `SESSION_SECRET`; workstation Firestore is used only for the authenticated user's profile.

The Enterprise Firestore REST client supports multiple credential strategies:
- **Local Development (No `gcloud` required)**: If you are logged into the Firebase CLI (`firebase login`), run `npm run setup:adc` (or the backend will auto-provision local ADC automatically). Alternatively, if Google Cloud CLI is installed, you can run `gcloud auth application-default login`.
- **Production (Cloud / Vercel / Railway / Docker)**: Provide `FIREBASE_SERVICE_ACCOUNT_KEY` as an environment variable (containing either raw JSON or base64-encoded service account credentials), or deploy to GCP where the runtime service account / Workload Identity provides credentials automatically.
- Do not commit service account credentials or credentials files to git.

Firebase CLI deploy commands must specify the intended project explicitly; this repository no longer defaults deployments to the workstation authentication project.
