import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventDto } from '../../pages/events/event.model';
import { timeUtility } from '../../shared/utils/timeUtility';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.scss']
})
export class EventCardComponent {
  @Input() event!: EventDto;
  expanded = false;

  // Denver-formatted display model (computed from backend ISO strings)
  startDate = timeUtility.formatDenverDate(null);
  startTime = timeUtility.formatDenverTime12Hour(null);
  startDateTime = timeUtility.formatDenverDateTime(null);
  startLocalDateTimeForBackend = '';

  endDate = timeUtility.formatDenverDate(null);
  endTime = timeUtility.formatDenverTime12Hour(null);
  endDateTime = timeUtility.formatDenverDateTime(null);
  endLocalDateTimeForBackend = '';

  denverEventTimes = timeUtility.formatDenverEventTimes(null);

  badgeMonthShort = '';
  badgeDay2 = '';

  descriptionPreview = '';

  ngOnChanges(_changes: SimpleChanges): void {
    this.updateDisplayModel();
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  private updateDisplayModel(): void {
    const startAt = this.event?.startAt ?? null;
    const endAt = this.event?.endAt ?? null;

    this.startDate = timeUtility.formatDenverDate(startAt);
    this.startTime = timeUtility.formatDenverTime12Hour(startAt);
    this.startDateTime = timeUtility.formatDenverDateTime(startAt);
    this.startLocalDateTimeForBackend = timeUtility.toDenverLocalDateTimeStringForBackend(
      startAt ? new Date(startAt) : null
    );

    this.endDate = timeUtility.formatDenverDate(endAt);
    this.endTime = timeUtility.formatDenverTime12Hour(endAt);
    this.endDateTime = timeUtility.formatDenverDateTime(endAt);
    this.endLocalDateTimeForBackend = timeUtility.toDenverLocalDateTimeStringForBackend(
      endAt ? new Date(endAt) : null
    );

    this.denverEventTimes = timeUtility.formatDenverEventTimes({ startAt, endAt });

    // Badge: month/day (e.g., Apr / 01) derived from existing monthDay "MM/DD"
    const monthDay = this.startDate?.monthDay ?? '';
    const [mmRaw, ddRaw] = monthDay.split('/');
    const mm = Number(mmRaw);
    const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    this.badgeMonthShort = mm >= 1 && mm <= 12 ? monthShort[mm - 1] : '';
    this.badgeDay2 = (ddRaw || '').padStart(2, '0');

    const desc = (this.event?.eventDescription ?? '').trim();
    this.descriptionPreview = desc.length > 160 ? `${desc.slice(0, 160).trimEnd()}…` : desc;
  }
}
