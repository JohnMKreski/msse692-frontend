import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL, USE_NEW_ADMIN_USERS_API } from '../models/api-tokens';
import { Page } from '../models/page';

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

export interface AdminUserListParams {
  page?: number; // 0-based
  size?: number;
  sort?: string; // e.g. 'createdAt,desc'
  q?: string;    // free-text
  role?: string[]; // filter by one or more roles
}

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly useNew = inject(USE_NEW_ADMIN_USERS_API);

  private join(a: string, b: string): string {
    const trimTrail = (s: string) => s.replace(/\/+$/,'');
    const trimLead = (s: string) => s.replace(/^\/+/, '');
    return `${trimTrail(a)}/${trimLead(b)}`;
  }

  private get adminUsersBase(): string {
    // new endpoint base
    return this.join(this.apiUrl, 'admin/users');
  }

  private get legacyRolesBase(): string {
    // legacy pattern (only roles operations per user)
    return this.join(this.apiUrl, 'admin/users');
  }

  list(params?: AdminUserListParams): Observable<Page<AdminUser>> {
    if (this.useNew) {
      const httpParams = this.buildParams(params);
      return this.http.get<Page<AdminUser>>(this.adminUsersBase, { params: httpParams });
    }
    // Fallback: no list endpoint in legacy, return empty page shape
    return new Observable<Page<AdminUser>>((sub) => {
      sub.next({ content: [], number: params?.page ?? 0, size: params?.size ?? 20, totalElements: 0, totalPages: 0, first: true, last: true });
      sub.complete();
    });
  }

  get(firebaseUid: string): Observable<AdminUser> {
    if (this.useNew) {
      return this.http.get<AdminUser>(this.join(this.adminUsersBase, encodeURIComponent(firebaseUid)));
    }
    // Legacy fallback: build from roles endpoint minimal data
    return this.http.get<{ firebaseUid: string; roles: string[] }>(this.join(this.legacyRolesBase, `${encodeURIComponent(firebaseUid)}/roles`))
      .pipe(
        // map response to AdminUser minimal shape
        (source) => new Observable<AdminUser>((sub) => {
          source.subscribe({
            next: (r) => {
              sub.next({ id: -1, firebaseUid: r.firebaseUid, roles: r.roles });
            },
            error: (e) => sub.error(e),
            complete: () => sub.complete()
          });
        })
      );
  }

  private buildParams(p?: AdminUserListParams): HttpParams | undefined {
    if (!p) return undefined;
    let hp = new HttpParams();
    if (typeof p.page === 'number') hp = hp.set('page', String(p.page));
    if (typeof p.size === 'number') hp = hp.set('size', String(p.size));
    if (p.sort) hp = hp.set('sort', p.sort);
    if (p.q) hp = hp.set('q', p.q.trim());
    if (p.role && p.role.length) {
      p.role.forEach(r => { if (r) hp = hp.append('role', r); });
    }
    return hp;
  }
}
