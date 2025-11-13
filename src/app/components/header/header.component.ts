import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { AppUserService } from '../../shared/app-user.service';

@Component({
    selector: 'app-header',
    standalone: true,
    host: { class: 'app-header' },
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
    user: User | null = null;
    isEditor = false;
    private unsub: (() => void) | null = null;

    constructor(private auth: Auth, private appUsers: AppUserService) {}

    ngOnInit(): void {
        this.unsub = onAuthStateChanged(this.auth, (u) => {
            this.user = u;
            if (u) {
                this.appUsers.getMe().subscribe({
                    next: (me) => {
                        const roles = me?.roles ?? [];
                        this.isEditor = Array.isArray(roles) && roles.includes('EDITOR');
                    },
                    error: () => (this.isEditor = false),
                });
            } else {
                this.isEditor = false;
            }
        });
    }

    ngOnDestroy(): void {
        if (this.unsub) this.unsub();
    }

    async logout(): Promise<void> {
        await signOut(this.auth);
    }

}
