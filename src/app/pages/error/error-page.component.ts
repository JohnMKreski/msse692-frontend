import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule, NgIf, RouterLink],
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPageComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  code = signal<number | null>(null);
  from = signal<string | null>(null);

  ngOnInit(): void {
    const snap = this.route.snapshot;
    const c = Number(snap.paramMap.get('code'));
    this.code.set(Number.isFinite(c) ? c : null);
    const f = snap.queryParamMap.get('from');
    this.from.set(f && f.trim() ? f : null);
  }

  get title(): string {
    const c = this.code();
    switch (c) {
      case 401: return '401 — Unauthorized';
      case 403: return '403 — Forbidden';
      case 404: return '404 — Not Found';
      case 500: return '500 — Server Error';
      default: return c ? `Error ${c}` : 'Something went wrong';
    }
  }

  get message(): string {
    const c = this.code();
    switch (c) {
      case 401: return 'You need to sign in to continue.';
      case 403: return "You don't have permission to access this page.";
      case 404: return 'The requested page or resource was not found.';
      case 500: return 'An unexpected error occurred.';
      default: return 'Please try again later.';
    }
  }

  get loginLink(): any[] | string {
    const f = this.from();
    return f ? ['/login', { from: f }] : '/login';
  }
}
