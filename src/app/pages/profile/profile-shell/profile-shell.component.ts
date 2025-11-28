import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { onAuthStateChanged, User } from 'firebase/auth';

@Component({
  selector: 'app-profile-shell',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './profile-shell.component.html',
  styleUrls: ['./profile-shell.component.scss']
})
export class ProfileShellComponent implements OnInit {
  user = signal<User | null>(null);
  loading = signal<boolean>(true);
  hasProfile = signal<boolean>(false); // optional hint for future

  constructor(private auth: Auth) {}

  ngOnInit(): void {
    onAuthStateChanged(this.auth, (u) => { this.user.set(u); this.loading.set(false); });
  }
}
