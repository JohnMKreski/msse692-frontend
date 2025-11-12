import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './api-tokens';
import { Observable } from 'rxjs';
import { AppUserDto } from './app-user.model';

@Injectable({ providedIn: 'root' })
export class AppUserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(API_URL);

  getMe(): Observable<AppUserDto> {
    return this.http.get<AppUserDto>(`${this.apiUrl}/app-users/me`);
  }
}
