import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppUserDto } from './app-user.model';

@Injectable({ providedIn: 'root' })
export class AppUserService {
  constructor(private http: HttpClient) {}

  getMe(): Observable<AppUserDto> {
    return this.http.get<AppUserDto>('/api/app-users/me');
  }
}
