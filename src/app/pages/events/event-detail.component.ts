import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
import { FormattedDenverDateTime, timeUtility } from '../../shared/utils/timeUtility';
import { SafeResourceUrl } from '@angular/platform-browser';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, materialImports, StatusBadgeComponent, RouterLink],
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventDetailComponent {
  private readonly platformId: Object = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly events = inject(EventsService);
  private readonly router = inject(Router);
  private readonly profile = inject(ProfileService);
  private readonly auth = inject(Auth);
  private readonly sanitizer = inject(DomSanitizer);

  readonly loading = signal<boolean>(true);
  // Removed manage logic: no saving state needed on public view
  readonly event = signal<EventDto | null>(null);
  readonly error = signal<string | null>(null);
  readonly ownerDisplayName = signal<string>('');

  // Denver-formatted display model (computed from backend ISO strings)
  readonly startDate = computed(() => timeUtility.formatDenverDate(this.event()?.startAt ?? null));
  readonly startTime = computed(() => timeUtility.formatDenverTime12Hour(this.event()?.startAt ?? null));
  readonly startDateTime = computed(() => timeUtility.formatDenverDateTime(this.event()?.startAt ?? null));

  readonly endDate = computed(() => timeUtility.formatDenverDate(this.event()?.endAt ?? null));
  readonly endTime = computed(() => timeUtility.formatDenverTime12Hour(this.event()?.endAt ?? null));
  readonly endDateTime = computed(() => timeUtility.formatDenverDateTime(this.event()?.endAt ?? null));

  readonly primaryStartDisplay = computed(() => this.formatPrimaryDateTime(this.startDateTime()));
  readonly primaryEndDisplay = computed(() => this.formatPrimaryDateTime(this.endDateTime()));
  readonly metaStartDisplay = computed(() => this.formatMetaDateTime(this.startDateTime()));
  readonly metaEndDisplay = computed(() => this.formatMetaDateTime(this.endDateTime()));

  readonly whenDateDisplay = computed(() => this.formatWhenDate(this.startDateTime()));
  readonly whenTimeRangeDisplay = computed(() => this.formatWhenTimeRange(this.startDateTime(), this.endDateTime()));

  readonly shareUrl = computed(() => this.getShareUrl());
  readonly shareTitle = computed(() => (this.event()?.eventName ?? '').trim());
  readonly shareFacebookHref = computed(() => this.buildFacebookShareHref(this.shareUrl()));
  readonly shareTwitterHref = computed(() => this.buildTwitterShareHref(this.shareTitle(), this.shareUrl()));
  readonly shareEmailHref = computed(() => this.buildEmailShareHref(this.shareTitle(), this.shareUrl()));

  readonly mapSrc = computed<SafeResourceUrl | null>(() => {
    const location = (this.event()?.eventLocation ?? '').trim();
    if (!location) return null;
    const url = `https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

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

  private extractYear(monthDayYear: string): string {
    // monthDayYear is always "MM/DD/YYYY" when coming from formatDenverDate().
    const parts = (monthDayYear || '').split('/');
    return parts.length === 3 ? parts[2] : '';
  }

  private formatPrimaryDateTime(dt: FormattedDenverDateTime | null): string {
    if (!dt) return 'TBA';
    const year = this.extractYear(dt.date.monthDayYear);
    const yearSuffix = year ? `, ${year}` : '';
    return `${dt.date.monthNameDay}${yearSuffix} ${dt.time.display}`;
  }

  private formatMetaDateTime(dt: FormattedDenverDateTime | null): string {
    if (!dt) return 'TBA';
    const year = this.extractYear(dt.date.monthDayYear);
    const yearSuffix = year ? `, ${year}` : '';
    return `${dt.date.weekdayLong}, ${dt.date.monthNameDay}${yearSuffix} @ ${dt.time.display}`;
  }

  private formatWhenDate(dt: FormattedDenverDateTime | null): string {
    if (!dt) return 'TBA';
    const year = this.extractYear(dt.date.monthDayYear);
    const yearSuffix = year ? `, ${year}` : '';
    return `${dt.date.weekdayLong}, ${dt.date.monthNameDay}${yearSuffix}`;
  }

  private formatWhenTimeRange(start: FormattedDenverDateTime | null, end: FormattedDenverDateTime | null): string {
    if (!start?.time) return 'TBA';
    if (!end?.time) return start.time.display;
    return `${start.time.display} – ${end.time.display}`;
  }

  private getShareUrl(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    try {
      const origin = window.location?.origin ?? '';
      const path = this.router.url ?? '';
      return origin && path ? `${origin}${path}` : '';
    } catch {
      return '';
    }
  }

  private buildFacebookShareHref(url: string): string {
    if (!url) return '';
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  }

  private buildTwitterShareHref(title: string, url: string): string {
    if (!url) return '';
    const text = title || 'Check out this event';
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  }

  private buildEmailShareHref(title: string, url: string): string {
    if (!url) return '';
    const subject = title || 'Event';
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(url)}`;
  }

  // Public page: management actions removed.
}
