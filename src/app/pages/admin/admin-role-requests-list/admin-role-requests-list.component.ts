import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RoleRequestService } from '../../../shared/services/role-request.service';
import { RoleRequest } from '../../../shared/models/role-request';
import { RoleRequestStatus, ROLE_REQUEST_STATUSES } from '../../../shared/models/role-request-status';
import { Page } from '../../../shared/models/page';
import { LoadingSkeletonComponent } from '../../../components/loading-skeleton/loading-skeleton.component';
import { formatApiError } from '../../../shared/models/api-error';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-admin-role-requests-list',
    standalone: true,
    imports: [CommonModule, FormsModule, LoadingSkeletonComponent],
    templateUrl: './admin-role-requests-list.component.html',
    styleUrls: ['./admin-role-requests-list.component.scss']
})
    export class AdminRoleRequestsListComponent implements OnInit, OnDestroy {
        loading: WritableSignal<boolean> = signal(false);
        error: WritableSignal<string | null> = signal(null);
        page: WritableSignal<Page<RoleRequest> | null> = signal(null);
        busyId: WritableSignal<string | null> = signal(null);
        selectedId: WritableSignal<string | null> = signal(null);
        detailLoading: WritableSignal<boolean> = signal(false);
        detailError: WritableSignal<string | null> = signal(null);
        detail: WritableSignal<RoleRequest | null> = signal(null);

        // Filters and paging
        q: string = '';
        statusSel: RoleRequestStatus[] = [];
        pageIndex = 0; // 0-based
        pageSize = 20;
        sort = 'createdAt,desc';

        readonly statusOptions = ROLE_REQUEST_STATUSES as RoleRequestStatus[];

        private qpSub: any;

        constructor(private route: ActivatedRoute, private router: Router, private api: RoleRequestService, private snack: MatSnackBar) {}

        ngOnInit(): void {
            this.qpSub = this.route.queryParamMap.subscribe((qp) => {
            // read filters from URL
            const q = qp.get('q') ?? '';
            const s = qp.getAll('status');
            const page = Number(qp.get('page') ?? '0');
            const size = Number(qp.get('size') ?? '20');
            const sort = qp.get('sort') ?? 'createdAt,desc';
            const selId = qp.get('id');
            this.q = q;
            this.statusSel = (s && s.length ? s : []) as RoleRequestStatus[];
            this.pageIndex = Number.isFinite(page) && page >= 0 ? page : 0;
            this.pageSize = Number.isFinite(size) && size > 0 ? size : 20;
            this.sort = sort;
            this.load();

            // sync selection from URL
            const currentSel = this.selectedId();
            if (selId && selId !== currentSel) {
                this.selectById(selId);
            }
            if (!selId && currentSel) {
                this.clearSelection(false);
            }
            });
        }

        ngOnDestroy(): void { if (this.qpSub) this.qpSub.unsubscribe?.(); }

        applyFilters(): void {
            const queryParams: any = { q: this.q || undefined, page: 0, size: this.pageSize, sort: this.sort };
            // multi status -> multiple query params
            const status = this.statusSel && this.statusSel.length ? this.statusSel : undefined;
            this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' }).then(() => {
            // set status as repeated params through navigate extras replacement
            if (status) {
                const tree = this.router.createUrlTree([], {
                relativeTo: this.route,
                queryParams: { status },
                queryParamsHandling: 'merge',
                });
                this.router.navigateByUrl(tree, { replaceUrl: true });
            } else {
                // clear existing status params
                const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams: { status: null }, queryParamsHandling: 'merge' });
                this.router.navigateByUrl(tree, { replaceUrl: true });
            }
            });
        }

        changePage(delta: number): void {
            const next = Math.max(0, this.pageIndex + delta);
            this.router.navigate([], { relativeTo: this.route, queryParams: { page: next }, queryParamsHandling: 'merge' });
        }

        changeSize(size: number): void {
            this.router.navigate([], { relativeTo: this.route, queryParams: { size, page: 0 }, queryParamsHandling: 'merge' });
        }

        changeSort(sort: string): void {
            this.router.navigate([], { relativeTo: this.route, queryParams: { sort, page: 0 }, queryParamsHandling: 'merge' });
        }

        private load(): void {
            this.loading.set(true);
            this.error.set(null);
            this.api.list({ page: this.pageIndex, size: this.pageSize, sort: this.sort, q: this.q || undefined, status: this.statusSel && this.statusSel.length ? this.statusSel : undefined }).subscribe({
            next: (p) => this.page.set(p),
            error: (err) => this.error.set(formatApiError(err) || 'Failed to load role requests'),
            complete: () => this.loading.set(false),
            });
        }

        onRowClick(r: RoleRequest): void {
            if (!r?.id) return;
            if (this.selectedId() === r.id) {
            this.clearSelection();
            return;
            }
            this.selectById(r.id);
        }

        private selectById(id: string): void {
            this.selectedId.set(id);
            // ensure URL param reflects selection
            this.router.navigate([], { relativeTo: this.route, queryParams: { id }, queryParamsHandling: 'merge' });
            this.loadDetail(id);
        }

        clearSelection(updateUrl: boolean = true): void {
            this.selectedId.set(null);
            this.detail.set(null);
            this.detailError.set(null);
            this.detailLoading.set(false);
            if (updateUrl) {
            const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams: { id: null }, queryParamsHandling: 'merge' });
            this.router.navigateByUrl(tree, { replaceUrl: true });
            }
        }

        private loadDetail(id: string): void {
            if (!id) return;
            this.detailLoading.set(true);
            this.detailError.set(null);
            this.detail.set(null);
            this.api.get(id).subscribe({
            next: (d) => this.detail.set(d),
            error: (err) => this.detailError.set(formatApiError(err) || 'Failed to load details'),
            complete: () => this.detailLoading.set(false),
            });
        }

        private updateRow(updated: RoleRequest): void {
            const p = this.page();
            if (!p) return;
            const idx = p.content.findIndex((r) => r.id === updated.id);
            if (idx >= 0) {
            const next = { ...p, content: [...p.content] } as Page<RoleRequest>;
            next.content[idx] = updated;
            this.page.set(next);
            }
        }

        approve(r: RoleRequest): void {
            if (!r || r.status !== 'Pending' || this.busyId()) return;
            const note = window.prompt('Optional approver note:', '') ?? '';
            this.busyId.set(r.id);
            this.api.approve(r.id, note ? { approverNote: note } : {}).subscribe({
            next: (updated) => {
                this.updateRow(updated);
                // keep detail view in sync if selected
                if (this.selectedId() === updated.id) this.detail.set(updated);
                this.snack.open('Request approved', 'Dismiss', { duration: 2500, horizontalPosition: 'right' });
            },
            error: (err) => {
                this.error.set(formatApiError(err) || 'Failed to approve request');
            },
            complete: () => this.busyId.set(null),
            });
        }

        reject(r: RoleRequest): void {
            if (!r || r.status !== 'Pending' || this.busyId()) return;
                const confirmReject = window.confirm('Reject this role request?');
            if (!confirmReject) return;
            const note = window.prompt('Optional rejection note:', '') ?? '';
            this.busyId.set(r.id);
            this.api.reject(r.id, note ? { approverNote: note } : {}).subscribe({
            next: (updated) => {
                this.updateRow(updated);
                if (this.selectedId() === updated.id) this.detail.set(updated);
                this.snack.open('Request rejected', 'Dismiss', { duration: 2500, horizontalPosition: 'right' });
            },
            error: (err) => {
                this.error.set(formatApiError(err) || 'Failed to reject request');
            },
            complete: () => this.busyId.set(null),
            });
    }
}
