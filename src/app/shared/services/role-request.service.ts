import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../models/api-tokens';
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
  private readonly apiUrl = inject(API_URL);

  // Base paths
  private readonly userBase = `${this.apiUrl}/roles/requests`;
  private readonly adminBase = `${this.apiUrl}/admin/users/roles/requests`;

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
        if (s) hp = hp.append('status', s);
      });
    }

    if ('q' in params && params.q) {
      hp = hp.set('q', params.q);
    }

    return hp;
  }
}
