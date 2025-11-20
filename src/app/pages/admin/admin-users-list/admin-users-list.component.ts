import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminUserService, AdminUser } from '../../../shared/services/admin-user.service';
import { Page } from '../../../shared/models/page';
import { USE_NEW_ADMIN_USERS_API } from '../../../shared/models/api-tokens';
import { inject } from '@angular/core';
import { LoadingSkeletonComponent } from '../../../components/loading-skeleton/loading-skeleton.component';

@Component({
  selector: 'app-admin-users-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSkeletonComponent],
  templateUrl: './admin-users-list.component.html',
  styleUrls: ['./admin-users-list.component.scss']
})
export class AdminUsersListComponent implements OnInit {
  private readonly api = inject(AdminUserService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly featureEnabled = inject(USE_NEW_ADMIN_USERS_API);

  loading: WritableSignal<boolean> = signal(false);
  error: WritableSignal<string | null> = signal(null);
  page: WritableSignal<Page<AdminUser> | null> = signal(null);
  selectedUid: WritableSignal<string | null> = signal(null);
  detailUser: WritableSignal<AdminUser | null> = signal(null);
  detailLoading: WritableSignal<boolean> = signal(false);
  detailError: WritableSignal<string | null> = signal(null);

  pageIndex = 0;
  pageSize = 20;
  sort = 'createdAt,desc';
  q: string = '';
  selectedRoles: string[] = [];
  roleOptions: WritableSignal<string[]> = signal([]);

  ngOnInit(): void {
    if (!this.featureEnabled) return; // do not auto-load if disabled
    this.route.queryParamMap.subscribe(qp => {
      const page = Number(qp.get('page') ?? '0');
      const size = Number(qp.get('size') ?? '20');
      const sort = qp.get('sort') ?? 'createdAt,desc';
      const q = qp.get('q') ?? '';
      const roles = qp.getAll('role');
      const uid = qp.get('uid');
      this.pageIndex = Number.isFinite(page) && page >= 0 ? page : 0;
      this.pageSize = Number.isFinite(size) && size > 0 ? size : 20;
      this.sort = sort;
      this.q = q;
      this.selectedRoles = roles && roles.length ? roles : [];
      this.load();
      // sync selection
      if (uid && uid !== this.selectedUid()) {
        this.selectUid(uid, false);
      } else if (!uid) {
        this.clearSelection(false);
      }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ page: this.pageIndex, size: this.pageSize, sort: this.sort, q: this.q || undefined, role: this.selectedRoles.length ? this.selectedRoles : undefined }).subscribe({
      next: p => {
        this.page.set(p);
        // derive role options from page content (union)
        const set = new Set<string>(['ADMIN','EDITOR']); // include known baseline roles
        p.content.forEach(u => (u.roles||[]).forEach(r => set.add(r)));
        this.roleOptions.set(Array.from(set).sort());
      },
      error: err => this.error.set('Failed to load users'),
      complete: () => this.loading.set(false)
    });
  }

  changePage(delta: number): void {
    const next = Math.max(0, this.pageIndex + delta);
    this.router.navigate([], { relativeTo: this.route, queryParams: { page: next }, queryParamsHandling: 'merge' });
  }

  changeSize(sz: number): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { size: sz, page: 0 }, queryParamsHandling: 'merge' });
  }

  applyFilters(): void {
    const queryParams: any = { q: this.q || undefined, page: 0, size: this.pageSize, sort: this.sort };
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'merge' }).then(() => {
      const roles = this.selectedRoles && this.selectedRoles.length ? this.selectedRoles : undefined;
      if (roles) {
        const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams: { role: roles }, queryParamsHandling: 'merge' });
        this.router.navigateByUrl(tree, { replaceUrl: true });
      } else {
        const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams: { role: null }, queryParamsHandling: 'merge' });
        this.router.navigateByUrl(tree, { replaceUrl: true });
      }
    });
  }

  toggleRole(role: string): void {
    if (!role) return;
    const idx = this.selectedRoles.indexOf(role);
    if (idx >= 0) this.selectedRoles.splice(idx,1); else this.selectedRoles.push(role);
  }

  onRowClick(u: AdminUser): void {
    if (!u?.firebaseUid) return;
    if (this.selectedUid() === u.firebaseUid) {
      this.clearSelection();
    } else {
      this.selectUid(u.firebaseUid);
    }
  }

  private selectUid(uid: string, updateUrl: boolean = true): void {
    this.selectedUid.set(uid);
    this.loadDetail(uid);
    if (updateUrl) {
      this.router.navigate([], { relativeTo: this.route, queryParams: { uid }, queryParamsHandling: 'merge' });
    }
  }

  clearSelection(updateUrl: boolean = true): void {
    this.selectedUid.set(null);
    this.detailUser.set(null);
    this.detailError.set(null);
    this.detailLoading.set(false);
    if (updateUrl) {
      const tree = this.router.createUrlTree([], { relativeTo: this.route, queryParams: { uid: null }, queryParamsHandling: 'merge' });
      this.router.navigateByUrl(tree, { replaceUrl: true });
    }
  }

  private loadDetail(uid: string): void {
    if (!uid) return;
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.detailUser.set(null);
    this.api.get(uid).subscribe({
      next: d => this.detailUser.set(d),
      error: _ => this.detailError.set('Failed to load user detail'),
      complete: () => this.detailLoading.set(false)
    });
  }
}
