# User Deletion & Data Erasure (Planned Feature)

This document captures the planned (not yet implemented) user/account deletion capability. It is intended for future integration and outlines goals, API design, data scope, guardrails, and operational considerations.

## Goals
- Allow an admin to remove a user’s domain data (and optionally their Firebase Auth identity) safely.
- Allow an authenticated end-user to request / perform self-service deletion of their own data.
- Preserve auditability and prevent accidental loss of critical relationships (events, moderation history).
- Support both immediate hard deletion and reversible / staged soft deletion with grace periods.

## Hard vs Soft Delete (Summary)
- **Hard Delete:** Physically removes rows. Simple, irreversible, risks orphaning or breaking foreign key references if not cascaded.
- **Soft Delete:** Marks records as deleted (e.g. `deletedAt`, `deletedBy`, `deleteReason`) while retaining rows. Queries exclude them by default. Enables restore, audit review, staged purge, and safer rollouts.

Initial rollout can start with hard delete for minimal complexity; architecture here anticipates an eventual migration to soft delete for better safety and compliance.

## Data Scope
Domain objects impacted when a user is deleted:
- `AppUser` (core identity & roles)
- Profile data (display name, extended fields)
- Role requests history
- Events created / owned by user (may require reassignment, anonymization, or block deletion)
- Audit / logs (should generally be kept; they may reference UID or a detached foreign key)

Recommended approach for related data:
- Keep historical role requests; reference requester UID as plain string (not FK) to avoid cascade removal.
- For events owned by the user: decide one strategy (transfer to a system account, anonymize creator, or block deletion if events exist).
- Maintain an immutable audit trail of deletions.

## Planned API Endpoints

### Admin-Initiated
```
DELETE /api/admin/users/{firebaseUid}
```
Parameters (future optional): `mode=hard|soft` (default `soft` when soft delete exists; default `hard` during initial phase if soft not implemented). Returns `204 No Content` on success.

### User Self-Service
```
POST /api/me/delete          // or DELETE /api/profile/me (to be finalized)
```
Behavior:
- Initiates deletion (hard or soft depending on configured policy).
- Requires recent re-auth (front-end: force token refresh) for security.
- Optional grace period: mark deletion requested, finalize after N days (cron/job) if not canceled.

### Potential Supporting Endpoints
- `GET /api/me/deletion-status` – user can see if a deletion is pending.
- `POST /api/me/deletion-cancel` – user cancels a soft pending deletion before grace period ends.
- `POST /api/admin/users/{firebaseUid}/restore` – restore a soft-deleted account.

## Soft Delete Schema (Future)
Fields to add to `AppUser` (and possibly Profile):
```
deletedAt      TIMESTAMP NULL
deletedBy      VARCHAR(64)  // admin UID or self UID
deleteReason   VARCHAR(255) // optional free-text reason
deletionStatus ENUM('REQUESTED','SCHEDULED','DELETED','CANCELED') // if grace periods used
```
Queries must exclude `deletedAt IS NOT NULL` by default. Admin reporting endpoints may add `?includeDeleted=true`.

## Guardrails & Business Rules
Admin deletion must NOT:
- Remove the last remaining ADMIN user (prevent total loss of admin access).
- Allow an admin to delete themselves (use explicit check vs current principal UID).
- Proceed if blocking dependencies exist (e.g., events without reassignment policy).

Self-service deletion must:
- Confirm intent (UI modal + typed phrase or password re-entry).
- Optionally enforce cool-down or grace period.
- Remove / anonymize public references where appropriate (e.g., replace display name with "Deleted User").

## Firebase Identity Considerations
- Domain deletion does NOT automatically delete the Firebase Auth user.
- Full account erasure may include calling Firebase Admin SDK `deleteUser(firebaseUid)`.
- Recommended sequence for hard delete: (1) domain cleanup, (2) delete Firebase Auth user, (3) commit transaction & log audit.
- For soft delete with grace period: remove domain access (roles revoked) but keep Firebase user until final purge.

## Audit & Logging
Record every deletion with:
- Initiator UID
- Target UID
- Timestamp
- Mode (`hard` | `soft`)
- Reason (user-provided or admin note)
Store in audit table or append to structured logs for compliance.

## Error & Response Codes
`204` success; `400` self-delete violation / invalid mode; `404` user not found; `409` last-admin or dependency conflict.

## Frontend UX (Planned)
Admin Detail Panel additions:
- “Delete User” button with role-based disabling and confirmation dialog.
- Option to choose deletion mode (if both enabled) and supply optional reason.
Self-Service Page (`/profile` or dedicated `/account/delete`):
- Explanation of consequences.
- Confirmation form with reason (optional) and re-auth prompt.
- Post-deletion or pending state message.

## Incremental Implementation Strategy
1. Document & placeholder (this file).
2. Implement hard delete admin endpoint with guardrails.
3. Add admin UI button (feature-flag controlled).
4. Add self-service endpoint + UI (hard delete only).
5. Introduce soft delete fields (migrations) and switch endpoints to soft-by-default.
6. Add restore, scheduled purge job, and `includeDeleted` reporting.

## Manual Interim Process (Current)
Until automated endpoints exist:
1. Admin manually removes domain data directly in DB for requested user.
2. Admin optionally deletes Firebase Auth user via Firebase Console or Admin SDK script.
3. Admin documents action in internal log / ticket.

## Future Enhancements
- Grace period notifications (email reminders before final purge).
- Cascading anonymization for authored content.
- Bulk admin deletion (select multiple users with filters).
- Privacy compliance tooling (export user data before deletion).
- Rate limiting self-delete requests.

## Cross References
- Admin Users Management: [FEATURE-Admin-Users-Management.md](./FEATURE-Admin-Users-Management.md)
- Admin Role Requests: [FEATURE-Admin-Role-Requests.md](./FEATURE-Admin-Role-Requests.md)

---
Status: Planned – not implemented.