import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    User,
} from 'firebase/auth';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterModule],
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
})

export class LoginComponent implements OnInit, OnDestroy {
    form: FormGroup;
    loading = signal(false);
    error = signal<string | null>(null);
    user = signal<User | null>(null);

    private unsub: (() => void) | null = null;

    constructor(private fb: FormBuilder, private auth: Auth) {
        this.form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        });
    }

    ngOnInit(): void {
        this.unsub = onAuthStateChanged(this.auth, (u) => this.user.set(u));
    }

    ngOnDestroy(): void {
        if (this.unsub) this.unsub();
    }

    async loginWithEmail(): Promise<void> {
        if (this.form.invalid) return;
        this.loading.set(true);
        this.error.set(null);
        const { email, password } = this.form.value;
        try {
        await signInWithEmailAndPassword(this.auth, email, password);
        } catch (e: any) {
        this.error.set(e?.message ?? 'Login failed');
        } finally {
        this.loading.set(false);
        }
    }

    async loginWithGoogle(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);
        try {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(this.auth, provider);
        } catch (e: any) {
        this.error.set(e?.message ?? 'Google sign-in failed');
        } finally {
        this.loading.set(false);
        }
    }

    async logout(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);
        try {
        await signOut(this.auth);
        } catch (e: any) {
        this.error.set(e?.message ?? 'Sign out failed');
        } finally {
        this.loading.set(false);
        }
    }
}
