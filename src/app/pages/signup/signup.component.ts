import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth } from '@angular/fire/auth';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

@Component({
    selector: 'app-signup',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './signup.component.html',
    styleUrls: ['./signup.component.scss'],
})
export class SignupComponent {
    form: FormGroup;
    loading = signal(false);
    error = signal<string | null>(null);
    authUserCreated = signal(false);

    constructor(private fb: FormBuilder, private auth: Auth, private router: Router) {
        this.form = this.fb.group({
            displayName: ['', [Validators.required, Validators.minLength(2)]],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]],
        }, { validators: [this.passwordsMatchValidator] });
    }

    private passwordsMatchValidator = (group: FormGroup) => {
        const p = group.get('password')?.value;
        const c = group.get('confirmPassword')?.value;
        return p && c && p === c ? null : { passwordsMismatch: true };
    };

    // Step 2: Firebase create user wiring
    async submit(): Promise<void> {
        if (this.form.invalid) return;
        this.loading.set(true);
        this.error.set(null);

        const { displayName, email, password } = this.form.value as {
            displayName: string; email: string; password: string;
        };

        try {
            const cred = await createUserWithEmailAndPassword(this.auth, email, password);
            // Set displayName on the Firebase user profile if provided
            if (displayName) {
                await updateProfile(cred.user, { displayName });
            }
            this.authUserCreated.set(true);
            // Force a token refresh so backend upsert filter sees the new user
            await cred.user.getIdToken(true);
            // Optional: small delay to allow backend to persist user via filter on first API call
            // Now navigate to /profile to complete onboarding
            await this.router.navigateByUrl('/profile');
        } catch (e: any) {
            this.error.set(e?.message ?? 'Account creation failed');
        } finally {
            this.loading.set(false);
        }
    }
}
