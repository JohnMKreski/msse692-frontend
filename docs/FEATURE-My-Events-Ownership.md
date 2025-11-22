# My Events Ownership & Endpoint (Manage Page Integration)

This document details the migration from client-side filtering of all events to a strict, server-enforced ownership endpoint: `GET /api/v1/events/mine`.

## Background (Previous Approach)
Previously, the frontend derived a "My Events" list by:
1. Calling the general events listing endpoint (returning a mix of owned + published events from other users).
2. Filtering the entire response in the browser by `createdByUserId === currentUserId`.

### Problems
- **Security ambiguity**: Published events owned by other users were still downloaded, creating potential leakage if future logic accidentally exposed hidden fields.
- **Inconsistent visibility rules**: Client code needed to remember filtering logic everywhere "My Events" appeared (profile page, editor management view, etc.).
- **Performance overhead**: Larger payload than necessary; repeated filtering and mapping introduced avoidable work.

## New Approach (Strict Ownership Endpoint)
`GET /api/v1/events/mine` returns only events created by the authenticated user, regardless of publication status. Backend enforces ownership using auditing metadata.

### Endpoint Characteristics
- **Path**: `/api/v1/events/mine`
- **Paging & Sorting**: Accepts paging (`page`, `size`) and a whitelist of sort fields (e.g., `startAt,asc`).
- **Security**: Requires authentication; returns 401 if unauthenticated, 403 if access is denied by role policy (if further restrictions apply). Currently restricted to users with `ADMIN` or `EDITOR` roles based on backend policy evaluation (documented in API endpoint docs).
- **Result Contract**: `EventPageResponse` structure with `items`, `page`, `size`, and `totalElements` (frontend gracefully handles raw arrays for backward compatibility during migration).

### Frontend Integration Changes (Pre-Split vs Current)
| Area | Old Behavior | New Behavior |
|------|--------------|--------------|
| Service | `list()` + client filter | Added `listMine(params)` directly calling `/events/mine` |
| Profile Page | Fetched all events; filtered | Direct `listMine` call; displays count & error fallback |
| Editor Events Page | Loaded all events + filtered by user | Direct `listMine`; removed user ID and filtering logic |
| Public Events Page (legacy) | Toggle between published/mine modes | Split: now published-only; ownership logic removed |
| Error Handling | Generic error on failure | Permission-aware fallback for 401/403, separate messaging for generic failures |
| Templates | Static headings | Dynamic count `(My Events (N))` + empty state + error message |

### Removed Code
- `updateMyEventsFilter()` and all its call sites.
- Local `meId` tracking in editor component for ownership filtering.
- Redundant normalization steps that assumed raw arrays.

## Error & Empty States
| Condition | Profile / Editor Message |
|-----------|--------------------------|
| 401/403 | "You do not have permission to view your events." |
| Non-auth logic error | "Failed to load your events." |
| Success + zero items | "You have not created any events yet." |

## Benefits
- **Security**: Ownership enforced server-side; future sensitive fields remain protected.
- **Performance**: Smaller network payloads; no post-fetch filtering.
- **Maintainability**: Single source of truth for ownership queries; fewer component-specific utilities.
- **UX Clarity**: Explicit messages for permission vs. absence.

## Testing Strategy (Updated)
1. **Service Unit Test**: Mock HttpClient to ensure `listMine` issues correct URL + params; validate mapping to `items`.
2. **Profile Component Test**:
   - Success path: Provide page response with 3 items; expect count and list rendering.
   - Empty path: Response with empty `items`; expect empty-state message.
   - 403 path: Simulate error; expect permission message displayed.
3. **Manage (Editor) Events Page Tests**:
   - Initialization triggers `listMine`; items set; count updates.
   - Status transition emits change bus -> refetch ownership calendar & list.
   - Error path (403) displays permission message; no automatic public fallback (handled by route separation).
4. **Edge Cases**: Large page sizes; sort parameter variations; mid-edit refresh after create/update/publish/unpublish/cancel.

## Follow-Up Enhancements
- Lightweight caching / memoization of last `listMine` response (planned alignment with published page strategy).
- Integrate ownership transfer or reassignment workflows (future admin tools) with clear change audit.
- Add aggregated dashboard combining owned, published, and recently modified events with role-aware segmentation.

## Quick Reference (Service Excerpt)
```ts
// events.service.ts (excerpt)
listMine(params: { page?: number; size?: number; sort?: string }): Observable<EventPageResponse<EventDto>> {
  const qp: any = { ...params };
  if (!qp.sort) qp.sort = 'startAt,asc';
  return this.http.get<EventPageResponse<EventDto>>(`${this.baseUrl}/events/mine`, { params: qp });
}
```

## Observability & Metrics (Future)
Consider adding client timing logs (Performance API) around `listMine` calls and server metrics for owned event retrieval counts to monitor adoption post-migration.

---
Migration complete; all owned-event views now rely on the backend endpoint and are isolated on the manage page (no public-page toggle fallback).
