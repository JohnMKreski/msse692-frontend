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

  upsert(req: ProfileRequest): Observable<ProfileResponse> {
    return this.http.post<ProfileResponse>(`${this.baseUrl}`, req);
  }
}
