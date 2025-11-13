import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-error-page',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf, RouterLink],
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorPageComponent {
  private readonly router = inject(Router);

  get state(): any {
    return this.router.getCurrentNavigation()?.extras?.state ?? {};
  }

  get status(): number | undefined { return this.state?.status; }
  get title(): string { return this.state?.title ?? (this.status ? `Error ${this.status}` : 'Something went wrong'); }
  get message(): string { return this.state?.message ?? 'Please try again later.'; }
  get details(): any[] | null { return Array.isArray(this.state?.details) ? this.state.details : null; }
}
