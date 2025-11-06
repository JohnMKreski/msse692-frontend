import { Component, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged, User } from 'firebase/auth';

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
    private unsub: (() => void) | null = null;

    constructor(private auth: Auth) {}

    ngOnInit(): void {
        this.unsub = onAuthStateChanged(this.auth, (u) => (this.user = u));
    }

    ngOnDestroy(): void {
        if (this.unsub) this.unsub();
    }

}
