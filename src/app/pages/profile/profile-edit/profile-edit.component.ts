import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../../shared/services/profile.service';
import { ProfileRequest, ProfileResponse, ProfileType } from '../../../shared/models/profile.model';
import { formatApiError } from '../../../shared/models/api-error';

@Component({
  selector: 'app-profile-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './profile-edit.component.html',
  styleUrls: ['./profile-edit.component.scss']
})
export class ProfileEditComponent implements OnInit {
  form!: FormGroup<{
    displayName: FormControl<string>;
    profileType: FormControl<ProfileType>;
    location: FormControl<string | null>;
    description: FormControl<string | null>;
    socials: FormControl<string | null>; // comma-separated
    websites: FormControl<string | null>; // comma-separated
  }>;
  saving = signal<boolean>(false);
  loading = signal<boolean>(true);

  constructor(private fb: NonNullableFormBuilder, private profiles: ProfileService, private snack: MatSnackBar) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      displayName: this.fb.control('', { validators: [Validators.required, Validators.maxLength(200)] }),
      profileType: this.fb.control<'VENUE'|'ARTIST'|'OTHER'>('OTHER', { validators: [Validators.required] }),
      location: this.fb.control<string | null>(null, { validators: [Validators.maxLength(255)] }),
      description: this.fb.control<string | null>(null, { validators: [Validators.maxLength(1000)] }),
      socials: this.fb.control<string | null>(null),
      websites: this.fb.control<string | null>(null),
    });

    this.profiles.getMe().subscribe({
      next: (p: ProfileResponse) => {
        this.form.patchValue({
          displayName: p.displayName ?? '',
          profileType: p.profileType,
          location: p.location ?? null,
          description: p.description ?? null,
          socials: (p.socials && p.socials.length ? p.socials.join(', ') : null),
          websites: (p.websites && p.websites.length ? p.websites.join(', ') : null),
        });
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const req: Partial<ProfileRequest> = {
      displayName: (v.displayName || '').trim(),
      profileType: v.profileType,
      location: (v.profileType === 'VENUE') ? (v.location || '') : (v.location || undefined),
      description: v.description || undefined,
      socials: (v.socials || '')
        .split(',')
        .map(s => s.trim())
        .filter(s => !!s) || undefined,
      websites: (v.websites || '')
        .split(',')
        .map(s => s.trim())
        .filter(s => !!s) || undefined,
    };
    if (req.profileType === 'VENUE' && !req.location) {
      this.snack.open('Location is required for VENUE profiles.', 'Dismiss', { duration: 3000, horizontalPosition: 'right' });
      return;
    }
    this.saving.set(true);
    this.profiles.patch(req).subscribe({
      next: (resp) => {
        this.snack.open('Profile updated', 'Dismiss', { duration: 2500, horizontalPosition: 'right' });
      },
      error: (err) => {
        const msg = formatApiError(err) || 'Failed to update profile';
        this.snack.open(msg, 'Dismiss', { duration: 3500, horizontalPosition: 'right' });
      },
      complete: () => this.saving.set(false)
    });
  }
}
