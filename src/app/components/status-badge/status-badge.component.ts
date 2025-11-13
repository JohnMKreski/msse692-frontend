import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { EventStatusCode } from '../../pages/events/event.model';
import { MatIconModule } from '@angular/material/icon';

/**
 * Accessible status badge.
 * Provides semantic labeling for screen readers while remaining visually compact.
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass, NgIf, MatIconModule],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  @Input() status?: EventStatusCode | null;
  @Input() size: 'sm' | 'md' = 'md';

  readonly statusMeta: Record<EventStatusCode, { label: string; icon: string; color: string; }> = {
    DRAFT: { label: 'Draft – not yet published', icon: 'edit', color: 'badge--draft' },
    PUBLISHED: { label: 'Published – visible publicly', icon: 'public', color: 'badge--published' },
    UNPUBLISHED: { label: 'Unpublished – hidden from public', icon: 'visibility_off', color: 'badge--unpublished' },
    CANCELLED: { label: 'Cancelled – event will not occur', icon: 'cancel', color: 'badge--cancelled' },
  };

  get meta() {
    return this.status ? this.statusMeta[this.status] : null;
  }
}
