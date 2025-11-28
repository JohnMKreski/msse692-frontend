import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, FormControl, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RoleRequestService } from '../../../shared/services/role-request.service';
import { RoleRequest } from '../../../shared/models/role-request';
import { formatApiError } from '../../../shared/models/api-error';
import { LoadingSkeletonComponent } from '../../../components/loading-skeleton/loading-skeleton.component';

@Component({
  selector: 'app-profile-requests',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './profile-requests.component.html'
})
export class ProfileRequestsComponent implements OnInit {
  roleReqLoading: WritableSignal<boolean> = signal(false);
  roleReqError: WritableSignal<string | null> = signal(null);
  latestRoleRequest: WritableSignal<RoleRequest | null> = signal(null);
  roleReason!: FormControl<string>;
  roleHistoryLoading: WritableSignal<boolean> = signal(false);
  roleHistoryError: WritableSignal<string | null> = signal(null);
  roleHistory: WritableSignal<RoleRequest[] | null> = signal(null);

  constructor(private fb: NonNullableFormBuilder, private roleRequests: RoleRequestService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.roleReason = this.fb.control('', { validators: [Validators.maxLength(500)] });
    this.refreshRoleRequestState();
    this.loadRoleRequestHistory();
  }

  private refreshRoleRequestState(): void {
    this.roleReqLoading.set(true);
    this.roleReqError.set(null);
    this.roleRequests.listMy({ status: 'Pending', page: 0, size: 1, sort: 'createdAt,desc' }).subscribe({
      next: (page) => { const item = (page as any)?.content?.[0] ?? null; this.latestRoleRequest.set(item ?? null); },
      error: (err) => { this.roleReqError.set(formatApiError(err)); },
      complete: () => this.roleReqLoading.set(false),
    });
  }

  private loadRoleRequestHistory(): void {
    this.roleHistoryLoading.set(true);
    this.roleHistoryError.set(null);
    this.roleRequests.listMy({ page: 0, size: 10, sort: 'createdAt,desc' }).subscribe({
      next: (page) => { const items = (page as any)?.content ?? []; this.roleHistory.set(Array.isArray(items) ? items : []); },
      error: (err) => this.roleHistoryError.set(formatApiError(err) || 'Failed to load request history'),
      complete: () => this.roleHistoryLoading.set(false),
    });
  }

  submitRoleRequest(): void {
    const reason = (this.roleReason.value || '').trim();
    this.roleReqLoading.set(true);
    this.roleReqError.set(null);
    this.roleRequests.create({ requestedRoles: ['EDITOR'], reason: reason || undefined }).subscribe({
      next: (req) => { this.latestRoleRequest.set(req); this.snack.open('Role request submitted', 'Dismiss', { duration: 2500, horizontalPosition: 'right' }); this.loadRoleRequestHistory(); },
      error: (err) => { this.roleReqError.set(formatApiError(err)); },
      complete: () => this.roleReqLoading.set(false),
    });
  }

  cancelPendingRoleRequest(): void {
    const cur = this.latestRoleRequest();
    if (!cur) return;
    this.roleReqLoading.set(true);
    this.roleReqError.set(null);
    this.roleRequests.cancel(cur.id).subscribe({
      next: (updated) => { this.latestRoleRequest.set(updated); this.snack.open('Role request canceled', 'Dismiss', { duration: 2500, horizontalPosition: 'right' }); this.loadRoleRequestHistory(); },
      error: (err) => { this.roleReqError.set(formatApiError(err)); },
      complete: () => this.roleReqLoading.set(false),
    });
  }
}
