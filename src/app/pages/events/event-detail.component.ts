import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventsService } from './events.service';
import { EventDto } from './event.model';
import { ActivatedRoute, Router } from '@angular/router';
import { materialImports } from '../../shared/material';
import { StatusBadgeComponent } from '../../components/status-badge/status-badge.component';
import { CancelConfirmDialogComponent } from '../../components/cancel-confirm-dialog/cancel-confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs/operators';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { AppUserService } from '../../shared/app-user.service';
import { formatApiError } from '../../shared/api-error';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, materialImports, StatusBadgeComponent],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(EventsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(Auth);
  private readonly appUserService = inject(AppUserService);

  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly event = signal<EventDto | null>(null);
  readonly error = signal<string | null>(null);
  readonly canManage = signal<boolean>(false);

  readonly canPublish = computed(() => this.event()?.status === 'DRAFT' || this.event()?.status === 'UNPUBLISHED');
  readonly canUnpublish = computed(() => this.event()?.status === 'PUBLISHED');
  readonly canCancel = computed(() => this.event() && this.event()!.status !== 'CANCELLED');

  constructor() {
    // Determine if current user can manage (ADMIN/EDITOR). If not authenticated, false by default.
    onAuthStateChanged(this.auth, (user) => {
      if (!user) { this.canManage.set(false); return; }
      this.appUserService.getMe().pipe(take(1)).subscribe({
        next: me => {
          const roles = me?.roles || [];
          const allowed = Array.isArray(roles) && roles.some(r => ['ADMIN','EDITOR'].includes(String(r).toUpperCase()));
          this.canManage.set(!!allowed);
        },
        error: () => { this.canManage.set(false); }
      });
    });
    effect(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) { this.error.set('Missing event id'); return; }
      this.loading.set(true);
      this.events.get(id).pipe(take(1)).subscribe({
        next: e => { this.event.set(e); this.loading.set(false); },
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

  private updateAfter(obs: ReturnType<EventsService['publishEvent'] | EventsService['unpublishEvent'] | EventsService['cancelEvent']>) {
    this.saving.set(true);
    (obs as any).pipe(take(1)).subscribe({
      next: (e: EventDto) => { this.event.set(e); this.saving.set(false); },
      error: (err: unknown) => { console.error(err); this.error.set(formatApiError(err)); this.saving.set(false); }
    });
  }

  publish() { if (!this.event()) return; this.updateAfter(this.events.publishEvent(this.event()!.eventId)); }
  unpublish() { if (!this.event()) return; this.updateAfter(this.events.unpublishEvent(this.event()!.eventId)); }
  cancel() {
    if (!this.event()) return;
    const ref = this.dialog.open(CancelConfirmDialogComponent, { data: { eventName: this.event()!.eventName } });
    ref.afterClosed().pipe(take(1)).subscribe(result => { if (result) this.updateAfter(this.events.cancelEvent(this.event()!.eventId)); });
  }
}
