import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { AppUserService } from '../../shared/services/app-user.service';
import { ProfileService } from '../../shared/services/profile.service';
import { ThemeService } from '../../shared/theme.service';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
    user: User | null = null;
    isEditor = false;
    isAdmin = false;
    profileName: string | null = null;
    private unsub: (() => void) | null = null;
    menuOpen = false;

    constructor(private auth: Auth, private appUsers: AppUserService, private theme: ThemeService, private profiles: ProfileService) {}

    ngOnInit(): void {
        // Initialize theme from localStorage
        // Theme initialization handled by ThemeService (already applied in service constructor)
        this.unsub = onAuthStateChanged(this.auth, (u) => {
            this.user = u;
            this.profileName = null;
            if (u) {
                this.appUsers.getMe().subscribe({
                    next: (me) => {
                        const roles = me?.roles ?? [];
                        this.isEditor = Array.isArray(roles) && roles.includes('EDITOR');
                        this.isAdmin = Array.isArray(roles) && roles.includes('ADMIN');
                    },
                    error: () => { this.isEditor = false; this.isAdmin = false; },
                });

                // Fetch profile to prefer public display name in header
                this.profiles.getMe().subscribe({
                    next: (p) => { this.profileName = p?.displayName ?? null; },
                    error: () => { this.profileName = null; }
                });
            } else {
                this.isEditor = false;
                this.isAdmin = false;
                this.profileName = null;
            }
        });
    }

    // Header no longer directly toggles theme; Settings page handles this via ThemeService.

    ngOnDestroy(): void {
        if (this.unsub) this.unsub();
    }

    async logout(): Promise<void> {
        await signOut(this.auth);
    }

    toggleMenu(): void {
        this.menuOpen = !this.menuOpen;
    }

    closeMenu(): void {
        this.menuOpen = false;
    }

    logoutAndClose(): void {
        this.closeMenu();
        this.logout();
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        if (!this.menuOpen) return;
        const target = event.target as HTMLElement | null;
        if (target && !target.closest('.account-area')) {
            this.closeMenu();
        }
    }

}
