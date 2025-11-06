import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged, User, getIdTokenResult, signOut } from 'firebase/auth';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
    })
export class ProfileComponent implements OnInit, OnDestroy {
    user = signal<User | null>(null);
    roles = signal<string[] | null>(null);
    claims = signal<Record<string, any> | null>(null);
    loading = signal<boolean>(true);

    private unsub: (() => void) | null = null;

    constructor(private auth: Auth) {}

    ngOnInit(): void {
        this.unsub = onAuthStateChanged(this.auth, async (u) => {
        this.user.set(u);
        this.roles.set(null);
        this.claims.set(null);
        if (u) {
            try {
            const token = await getIdTokenResult(u, /*forceRefresh*/ false);
            const c = token.claims || {};
            const r = Array.isArray(c['roles']) ? (c['roles'] as string[]) : (typeof c['roles'] === 'string' ? [c['roles']] : []);
            this.claims.set(c);
            this.roles.set(r.length ? r : null);
            } catch {
            // ignore claim fetch errors; show basic profile
            }
        }
        this.loading.set(false);
        });
    }

    ngOnDestroy(): void {
        if (this.unsub) this.unsub();
    }

        async logout(): Promise<void> {
            await signOut(this.auth);
        }
}
