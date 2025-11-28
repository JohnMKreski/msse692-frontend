import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../models/api-tokens';
import { Observable } from 'rxjs';
import { ProfileRequest, ProfileResponse } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);
  private readonly baseUrl = `${this.apiUrl}/profile`;

  getMe(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.baseUrl}/me`);
  }

  // Create if absent (409 if exists)
  create(req: ProfileRequest): Observable<ProfileResponse> {
    return this.http.post<ProfileResponse>(`${this.baseUrl}/create`, req);
  }

  // Full replace
  update(req: ProfileRequest): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${this.baseUrl}`, req);
  }

  // Partial update (nulls ignored server-side)
  patch(req: Partial<ProfileRequest>): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(`${this.baseUrl}`, req);
  }

  // Delete current user's profile
  delete(): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}`);
  }

  // ===== Admin endpoints (under /api/v1/profile/{userId}) =====
  getByUserId(userId: number): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.baseUrl}/${userId}`);
  }

  createForUser(userId: number, req: ProfileRequest): Observable<ProfileResponse> {
    return this.http.post<ProfileResponse>(`${this.baseUrl}/${userId}/create`, req);
  }

  updateForUser(userId: number, req: ProfileRequest): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${this.baseUrl}/${userId}`, req);
  }

  patchForUser(userId: number, req: Partial<ProfileRequest>): Observable<ProfileResponse> {
    return this.http.patch<ProfileResponse>(`${this.baseUrl}/${userId}`, req);
  }

  deleteForUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${userId}`);
  }
}
