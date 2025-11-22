# Admin Users Management

This document describes the feature-flagged Admin Users Management UI and supporting service used to view and inspect application users and their roles.

## Overview

When enabled, admins can navigate to `/admin/users` to:
- List users with pagination
- Filter by free-text (`q`) and one or more roles
- View a side detail panel with metadata (UID, display name, email, roles, created/updated timestamps)

The feature is gated by a runtime configuration flag to allow incremental rollout without breaking legacy role management endpoints.

## Feature Flag

Runtime config key: `useNewAdminUsersApi` in `public/config.json`.

Example:
```jsonc
{
  // ... other runtime config
  "useNewAdminUsersApi": true
}
```

Injection token: `USE_NEW_ADMIN_USERS_API` (boolean). When `false`, the route still renders but shows an informational disabled message and does not call the new endpoints.

## Route & Guards

- Route: `/admin/users`
- Guards: Inherits admin guards from parent `/admin` route (`requireAuthGuard`, `adminRoleGuard`, `adminRoleMatchGuard`).

## Query Parameters

All filters and selection are URL-synced:
- `q`: free-text search (display name, email, UID fragments)
- `role`: repeated param for role filters (e.g. `role=ADMIN&role=EDITOR`)
- `page`: 0-based page index
- `size`: page size (default 20)
- `sort`: standard Spring-style sort (e.g. `createdAt,desc`)
- `uid`: selected user's Firebase UID to open the detail side panel

Deep linking to a specific user: `/admin/users?uid=<FIREBASE_UID>`.

## Component (`AdminUsersListComponent`)

Location: `src/app/pages/admin/admin-users-list/`.

Key behaviors:
- Reads query params and issues a list request via `AdminUserService.list(...)`.
- Derives available `roleOptions` from returned page content plus baseline known roles.
- Click on a row toggles selection, updating `uid` in the URL and fetching user detail via `AdminUserService.get(uid)`.
- Side panel displays detail metadata and can be closed, clearing `uid` param.
- Disabled template renders guidance when feature flag off.

Signals used (simplified):
- `page`, `loading`, `error` for list state
- `selectedUid`, `detailUser`, `detailLoading`, `detailError` for panel state

## Service (`AdminUserService`)

Location: `src/app/shared/services/admin-user.service.ts`.

Endpoints (new API):
- List: `GET /api/admin/users`
  - Query params: `q`, repeated `role`, `page`, `size`, `sort`
- Detail: `GET /api/admin/users/{firebaseUid}`

Fallback when feature flag `false`:
- `list()` returns an empty page structure (no legacy list endpoint)
- `get(uid)` falls back to legacy roles endpoint and synthesizes a minimal user object with `id = -1` and roles.

Interface shape (`AdminUser`):
```ts
export interface AdminUser {
  id: number;
  firebaseUid: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  roles: string[];
}
```

## Backend Contract (Summary)

New admin user endpoints (Spring Boot):
- `GET /api/admin/users` (page of `AppUserWithRolesDto`)
- `GET /api/admin/users/{firebaseUid}` (single `AppUserWithRolesDto`)

Filters:
- `q` matches partial (displayName, email, firebaseUid)
- `role` filters users that have ANY of the provided roles

Pagination & sorting follow standard Spring Data semantics.

## Enabling / Disabling

1. Set `useNewAdminUsersApi` in `public/config.json`.
2. Reload the application (runtime config is fetched at startup).
3. Verify `/admin/users` shows the list UI (enabled) or instructional message (disabled).

## Testing & Verification

Manual steps:
```cmd
cd "D:\School\MSSE 692 - Practicum I\practicum-ave\msse692-frontend"
npm start
```
1. Log in as an admin user.
2. Navigate to `/admin/users`.
3. Use search and role checkboxes; observe query params updating.
4. Click a row; detail panel appears, `uid` param set.
5. Toggle feature flag off; reload and confirm disabled template.

## Future Enhancements

- Add delete user action (pending backend `DELETE /api/admin/users/{uid}` implementation).
- Patch endpoint for atomic role changes (reduces multiple add/remove calls).
- Role badges for consistent visual styling across admin views.
- Column for last login timestamp once backend field available.
- Sorting UI controls beyond basic pager (e.g., clickable column headers).

## Cross-References

- Role Requests moderation: [FEATURE-Admin-Role-Requests.md](./FEATURE-Admin-Role-Requests.md)
- Events calendar: [FEATURE-Events-Calendar.md](./FEATURE-Events-Calendar.md)
