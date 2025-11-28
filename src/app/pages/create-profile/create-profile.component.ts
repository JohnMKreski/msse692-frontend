import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../shared/services/profile.service';
import { ProfileRequest } from '../../shared/models/profile.model';
import { materialImports } from '../../shared/material';

type ProfileType = 'VENUE' | 'ARTIST' | 'OTHER';

@Component({
  selector: 'app-create-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, materialImports],
  templateUrl: './create-profile.component.html',
  styleUrls: ['./create-profile.component.scss']
})
export class CreateProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);

  profileForm!: FormGroup;
  submitting = false;
  submitError: string | null = null;

  readonly profileTypes: { value: ProfileType; label: string }[] = [
    { value: 'VENUE', label: 'Venue' },
    { value: 'ARTIST', label: 'Artist' },
    { value: 'OTHER', label: 'Other' },
  ];

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
      profileType: ['ARTIST', Validators.required],
      location: [''], // conditional required when VENUE
      description: [''],
      socials: this.fb.array([]),
      websites: this.fb.array([])
    });
    this.profileForm.get('profileType')!.valueChanges.subscribe(v => this.syncLocationValidator(v as ProfileType));
    // Ensure validator state matches initial type
    this.syncLocationValidator(this.profileForm.get('profileType')!.value as ProfileType);
  }

  get socialsArray(): FormArray { return this.profileForm.get('socials') as FormArray; }
  get websitesArray(): FormArray { return this.profileForm.get('websites') as FormArray; }

  addSocial(): void { this.socialsArray.push(new FormControl('', [Validators.pattern(/^https?:\/\//i)])); }
  removeSocial(i: number): void { this.socialsArray.removeAt(i); }
  addWebsite(): void { this.websitesArray.push(new FormControl('', [Validators.pattern(/^https?:\/\//i)])); }
  removeWebsite(i: number): void { this.websitesArray.removeAt(i); }

  private syncLocationValidator(type: ProfileType): void {
    const ctrl = this.profileForm.get('location');
    if (!ctrl) return;
    if (type === 'VENUE') {
      ctrl.addValidators([Validators.required, Validators.minLength(2), Validators.maxLength(255)]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  submit(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const formValue = this.profileForm.value;
    const trimmedDisplayName = (formValue.displayName ?? '').trim();
    const isVenue = formValue.profileType === 'VENUE';
    const trimmedLocation = isVenue ? (formValue.location ?? '').trim() : undefined;
    const req: ProfileRequest = {
      displayName: trimmedDisplayName,
      profileType: formValue.profileType,
      location: isVenue ? trimmedLocation : undefined,
      description: (formValue.description ?? '').trim() || undefined,
      socials: (formValue.socials || [])
        .map((s: string) => (s ?? '').trim())
        .filter((s: string) => !!s),
      websites: (formValue.websites || [])
        .map((w: string) => (w ?? '').trim())
        .filter((w: string) => !!w)
    };
    this.submitting = true;
    this.submitError = null;
    this.profiles.create(req).subscribe({
      next: () => {
        this.submitting = false;
        // Navigate to profile page after creation
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = (err?.message || 'Failed to create profile');
      }
    });
  }
}