// Canonical role request statuses (display names from backend JSON)
export type RoleRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Canceled';

export const ROLE_REQUEST_STATUSES: readonly RoleRequestStatus[] = [
  'Pending',
  'Approved',
  'Rejected',
  'Canceled',
] as const;

export function isRoleRequestStatus(value: unknown): value is RoleRequestStatus {
  return (
    typeof value === 'string' &&
    (ROLE_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}
