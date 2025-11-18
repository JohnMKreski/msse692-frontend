# Admin Role Requests

This document describes the Admin-only Role Requests moderation feature in the frontend, including routing, guards, UI behavior, query parameters, and API integration.

## Overview

Admins can review, approve, or reject user role requests (e.g., EDITOR). The admin page provides:
- A filterable, paginated table of requests
- Inline actions (Approve/Reject) on each row
- An inline Details panel under the table that fetches full request data on selection
- URL-synced selection for deep-linking to a specific request

## Route & Guards

- Route: `/admin/role-requests`
- Guards: `requireAuthGuard` + `adminRoleGuard` at activation, and `adminRoleMatchGuard` for early matching
- Non-admins cannot match or activate the route and will be redirected/blocked

## Query Parameters

- `q`: free-text search (UID, email, etc.)
- `status`: repeated param for one or more statuses (e.g., `status=PENDING&status=APPROVED`)
- `page`: 0-based page index
- `size`: page size
- `sort`: e.g., `createdAt,desc` or `updatedAt,asc`
- `id`: selected request ID to show in the inline details panel

These parameters are preserved across navigation (filters, pagination, sorting) and allow deep-linking to a specific request via `?id=<REQUEST_ID>`.

## UI Behavior

- Table columns: ID, Requester UID, Roles, Status, Created, Decided, Actions
- Row selection: clicking a row toggles selection; selected row is highlighted
- Details panel:
  - Loads full data via `RoleRequestService.get(id)` when a row is selected
  - Shows summary fields (requester, roles, reason, status, created/updated/decided, approver/notes)
  - Includes Approve/Reject actions alongside a Close button
  - Displays a loading skeleton and any error message
- Actions:
  - Approve/Reject buttons are disabled while loading, while busy with the row, or if the request is not `Pending`
  - Success shows a snackbar and updates both the table row and the details panel, if open
  - Action button clicks do not toggle selection (clicks stop propagation)

## Data Model (frontend)

`RoleRequest` (subset):
- `id: string`
- `requesterUid: string`
- `requestedRoles: string[]`
- `status: 'Pending' | 'Approved' | 'Rejected' | 'Canceled'`
- `approverUid?: string | null`
- `reason?: string | null`
- `approverNote?: string | null`
- `createdAt?: string`
- `updatedAt?: string`
- `decidedAt?: string`

## API Integration

Base path uses non-versioned `/api` per backend mapping.

Admin endpoints (`RoleRequestService`):
- List: `GET /api/admin/users/roles/requests`
  - Params: `page`, `size`, `sort`, repeated `status`, optional `q`
- Get by ID: `GET /api/admin/users/roles/requests/{id}`
- Approve: `POST /api/admin/users/roles/requests/{id}/approve`
  - Body: `{ approverNote?: string }`
- Reject: `POST /api/admin/users/roles/requests/{id}/reject`
  - Body: `{ approverNote?: string }`

The auth interceptor attaches the Firebase JWT to `/api` requests and a global HTTP error handler shows snackbars for API errors.

## Development & Testing

- Start the frontend and navigate to the admin page:

```cmd
cd "D:\School\MSSE 692 - Practicum I\practicum-ave\msse692-frontend"
npm start
```

- Ensure you are authenticated as an admin user; non-admins cannot access the route
- Verify filters, sort, pagination, and that the selected `id` persists in the URL
- Click a row to open details; approve/reject from the row or from the details panel

## Notes & Future Enhancements

- Status badge component: map statuses (Pending/Approved/Rejected/Canceled) to consistent badge colors in both admin and user views
- Optional side drawer or route param (`/admin/role-requests/:id`) for details instead of inline panel
- Add Jest unit tests and E2E smoke tests for request lifecycle (request, cancel, approve/reject)
- Update README with admin workflow overview and any backend environment expectations
