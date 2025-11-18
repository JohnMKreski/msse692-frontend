// Role request models aligned with backend DTOs
import { RoleRequestStatus } from './role-request-status';

export interface RoleRequest {
  id: string;
  requesterUid: string;
  requestedRoles: string[]; // e.g., ['EDITOR']
  status: RoleRequestStatus;
  approverUid?: string | null;
  reason?: string | null;
  approverNote?: string | null;
  createdAt?: string; // ISO-8601
  updatedAt?: string; // ISO-8601
}

// Request payloads
export interface RoleRequestCreate {
  requestedRoles: string[]; // for phase 1 typically ['editor'] from UI, server normalizes
  reason?: string;
}

export interface RoleRequestDecision {
  approverNote?: string;
}
