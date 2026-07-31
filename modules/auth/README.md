# Auth Module

## Security Policy — IMPORTANT

Any **vital or sensitive action** on this platform **MUST** go through a Firebase Cloud Function, not a direct client-side Firestore write. This includes, but is not limited to:

- Staff account creation and deactivation
- Role assignment and role changes (custom claims)
- Leave request approvals/rejections
- Payment initiation and status updates
- Document access grants
- Any other action that produces a state change with financial, legal, or HR consequence

### Why

Firestore security rules act as a backstop, but they cannot enforce business logic (e.g. "a leave approval email must be sent", "an audit log entry must be created", "a payment record must match a verified payroll entry"). Cloud Functions are the only place where these invariants can be enforced atomically.

### Implementation timeline

Cloud Functions for the above actions will be wired up starting in **Stage 3**. Until then, mock data and hardcoded states are used for UI development only. No real Firestore writes should occur before Stage 3 integration is in place.

### Reference

- Functions live in `/functions/src/index.ts` (separate TypeScript project).
- Firebase Admin SDK (server-side) is the only SDK that may write custom claims or perform privileged Firestore operations.
