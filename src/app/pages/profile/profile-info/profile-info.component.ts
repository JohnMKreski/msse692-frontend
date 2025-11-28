import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProfileService } from '../../../shared/services/profile.service';
import { ProfileResponse } from '../../../shared/models/profile.model';
import { formatApiError } from '../../../shared/models/api-error';
import { AppUserService } from '../../../shared/services/app-user.service';
import { AppUserDto } from '../../../shared/models/app-user.model';

@Component({
  selector: 'app-profile-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './profile-info.component.html',
  styleUrls: ['./profile-info.component.scss']
})
export class ProfileInfoComponent implements OnInit {
  existingProfile = signal<ProfileResponse | null>(null);
  loading = signal<boolean>(true);
  appUser = signal<AppUserDto | null>(null);
  rolesText = computed(() => {
    const u = this.appUser();
    return u?.roles && u.roles.length ? u.roles.join(', ') : '—';
  });

  constructor(private profiles: ProfileService, private appUsers: AppUserService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.profiles.getMe().subscribe({
      next: (p) => { this.existingProfile.set(p); this.loading.set(false); },
      error: (err) => { this.existingProfile.set(null); this.loading.set(false); }
    });
    // Load account info (AppUser)
    this.appUsers.getMe().subscribe({
      next: (u: AppUserDto) => { this.appUser.set(u); },
      error: () => { this.appUser.set(null); }
    });
  }

  linkUrl(s: string | null | undefined): string | null {
    if (!s) return null;
    const t = s.trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t)) return t;
    return `https://${t}`;
  }
}
