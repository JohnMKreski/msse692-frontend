import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="not-found">
      <h1>404 — Not Found</h1>
      <p>The requested page or resource was not found.</p>
      <div class="actions"><a routerLink="/">Return Home</a></div>
    </section>
  `,
  styles: [`.not-found{padding:24px}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {}
