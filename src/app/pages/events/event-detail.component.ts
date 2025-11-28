import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EventsService } from './events.service';
import { ProfileService } from '../../shared/services/profile.service';
import { EventDto } from './event.model';
import { ActivatedRoute, Router } from '@angular/router';
import { materialImports } from '../../shared/material';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { take } from 'rxjs/operators';
import { formatApiError } from '../../shared/models/api-error';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, materialImports, StatusBadgeComponent, RouterLink],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(EventsService);
  private readonly router = inject(Router);
  private readonly profile = inject(ProfileService);
  private readonly auth = inject(Auth);

  readonly loading = signal<boolean>(true);
  // Removed manage logic: no saving state needed on public view
  readonly event = signal<EventDto | null>(null);
  readonly error = signal<string | null>(null);
  readonly ownerDisplayName = signal<string>('');

  constructor() {
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) { this.error.set('Missing event id'); return; }
      this.loading.set(true);
      this.events.get(id).pipe(take(1)).subscribe({
        next: e => {
          this.event.set(e);
          this.loading.set(false);
          // Fetch profile display name only if authenticated (avoid 401 toast)
          const user = this.auth.currentUser;
          if (user && e?.createdByUserId != null) {
            this.profile.getByUserId(e.createdByUserId).pipe(take(1)).subscribe({
              next: p => this.ownerDisplayName.set(p?.displayName || ''),
              error: () => this.ownerDisplayName.set('') // swallow unauthorized
            });
          } else {
            this.ownerDisplayName.set('');
          }
        },
        error: err => {
          console.error(err);
          // If backend returns 404 for missing/unpublished when unauthenticated, route to Not Found
          if (err?.status === 404) {
            this.router.navigateByUrl('/not-found', { state: { status: 404, title: 'Event Not Found', message: 'This event does not exist or is not available.' } });
          } else if (err?.status >= 500) {
            const api = err?.error || {};
            this.router.navigateByUrl('/error', { state: {
              status: err.status,
              title: 'Server Error',
              message: formatApiError(err),
              details: api?.details || null,
              path: api?.path,
              requestId: api?.requestId
            }});
          } else {
            this.error.set(formatApiError(err));
          }
          this.loading.set(false);
        }
      });
    });
  }

  // Public page: management actions removed.
}
