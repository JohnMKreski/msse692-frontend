import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL, API_PATH_PREFIX } from '../models/api-tokens';
import { Page } from '../models/page';
import { RoleRequest, RoleRequestCreate, RoleRequestDecision } from '../models/role-request';
import { RoleRequestStatus } from '../models/role-request-status';

export interface UserListParams {
  page?: number; // 0-based
  size?: number;
  sort?: string; // e.g. 'createdAt,desc'
  status?: RoleRequestStatus | RoleRequestStatus[];
}

export interface AdminListParams {
  page?: number; // 0-based
  size?: number;
  sort?: string; // e.g. 'createdAt,desc'
  status?: RoleRequestStatus | RoleRequestStatus[];
  q?: string; // free-text search by uid/email/etc. if supported
}

@Injectable({ providedIn: 'root' })
export class RoleRequestService {
  private readonly http = inject(HttpClient);

  // Base paths
  private readonly apiBase: string = inject(API_BASE_URL);
  private readonly apiPrefix: string = inject(API_PATH_PREFIX);

  // Helpers to build non-versioned API paths (backend maps RoleRequest under /api not /api/v1)
  private join(base: string, path: string): string {
    const b = (base || '').replace(/\/+$/g, '');
    const p = (path || '').replace(/^\/+/, '');
    return `${b}/${p}`;
  }

  private get userBase(): string {
    const prefix = (this.apiPrefix || '/api').replace(/\/+$/g, '');
    return this.join(this.join(this.apiBase, prefix), 'roles/requests');
  }
  private get adminBase(): string {
    const prefix = (this.apiPrefix || '/api').replace(/\/+$/g, '');
    return this.join(this.join(this.apiBase, prefix), 'admin/users/roles/requests');
  }

  // USER endpoints
  create(body: RoleRequestCreate): Observable<RoleRequest> {
    return this.http.post<RoleRequest>(this.userBase, body);
  }

  listMy(params?: UserListParams): Observable<Page<RoleRequest>> {
    const httpParams = this.buildParams(params);
    return this.http.get<Page<RoleRequest>>(this.userBase, { params: httpParams });
  }

  cancel(id: string): Observable<RoleRequest> {
    return this.http.post<RoleRequest>(`${this.userBase}/${encodeURIComponent(id)}/cancel`, {});
  }

  // ADMIN endpoints
  list(params?: AdminListParams): Observable<Page<RoleRequest>> {
    const httpParams = this.buildParams(params);
    return this.http.get<Page<RoleRequest>>(this.adminBase, { params: httpParams });
  }

  get(id: string): Observable<RoleRequest> {
    return this.http.get<RoleRequest>(`${this.adminBase}/${encodeURIComponent(id)}`);
  }

  approve(id: string, body: RoleRequestDecision = {}): Observable<RoleRequest> {
    return this.http.post<RoleRequest>(`${this.adminBase}/${encodeURIComponent(id)}/approve`, body ?? {});
  }

  reject(id: string, body: RoleRequestDecision = {}): Observable<RoleRequest> {
    return this.http.post<RoleRequest>(`${this.adminBase}/${encodeURIComponent(id)}/reject`, body ?? {});
  }

  private buildParams(params?: UserListParams | AdminListParams): HttpParams | undefined {
    if (!params) return undefined;
    let hp = new HttpParams();
    if (typeof params.page === 'number') hp = hp.set('page', String(params.page));
    if (typeof params.size === 'number') hp = hp.set('size', String(params.size));
    if (params.sort) hp = hp.set('sort', params.sort);

    const st = params.status;
    if (st) {
      const list = Array.isArray(st) ? st : [st];
      list.forEach((s) => {
        if (!s) return;
        // Backend likely expects enum names; normalize display labels to uppercase enum values
        // 'Pending' -> 'PENDING', 'Approved' -> 'APPROVED', 'Rejected' -> 'REJECTED', 'Canceled' -> 'CANCELED'
        const upper = String(s).toUpperCase();
        hp = hp.append('status', upper);
      });
    }

    if ('q' in params && params.q) {
      hp = hp.set('q', params.q);
    }

    return hp;
  }
}
