import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ChangeDetectorRef, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { EventDto } from '../../pages/events/event.model';
// FullCalendar Angular wrapper
// https://github.com/fullcalendar/fullcalendar-angular
import { FullCalendarModule } from '@fullcalendar/angular';

/**
 * Lightweight reusable calendar wrapper.
 * Presentation only: parent supplies events and handles fetching + permission.
 * Mode influences color mapping (Published => type color priority, Mine => status color priority).
 */
@Component({
  selector: 'app-events-calendar',
  standalone: true,
  imports: [CommonModule, FullCalendarModule],
  templateUrl: './events-calendar.component.html',
  styleUrls: ['./events-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventsCalendarComponent implements OnInit {
  /** Calendar semantic mode for color logic */
  @Input() mode: 'PUBLISHED' | 'MINE' = 'PUBLISHED';
  /** Raw event DTOs provided by parent */
  @Input() events: EventDto[] = [];
  /** Loading flag to optionally show skeleton overlay */
  @Input() loading = false;
  /** Status color map (parent configurable) */
  @Input() statusColors: Record<string,string> = {
    PUBLISHED: '#58a6ff',
    DRAFT: '#e2c76e',
    UNPUBLISHED: '#a08fe0',
    CANCELLED: '#ff6b6b'
  };
  /** Type color map (parent configurable) */
  @Input() typeColors: Record<string,string> = {
    CONCERT: '#d97706',
    FESTIVAL: '#2563eb',
    PARTY: '#059669',
    OTHER: '#7c3aed'
  };
  /** Emit clicked event id */
  @Output() eventClick = new EventEmitter<number>();
  /** Emit date window changes (start ISO, end ISO) */
  @Output() dateRangeChange = new EventEmitter<{ start: string; end: string }>();
  /** Parent may request a refresh (e.g., re-fetch) */
  @Output() refreshRequested = new EventEmitter<void>();

    calendarOptions: CalendarOptions = {
    timeZone: 'local',
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
    nowIndicator: true,
    dayMaxEvents: true,
    navLinks: true,
    expandRows: true, // keep month view fully expanded within fixed height
    height: 700, // Option B: fixed total calendar height for all views (header + view)
    slotDuration: '00:30:00',
    // Optional: initial scroll position for timeGrid views (morning focus)
    scrollTime: '06:00:00',
    // Minimal defaults (use library defaults for time range/scroll/timed duration)
    eventClick: (arg) => this.onCalendarEventClick(arg),
    eventDidMount: (arg) => this.onEventDidMount(arg),
    datesSet: (arg) => this.onDatesSet(arg),
    windowResize: () => this.applyResponsiveOptions(),
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]
  };

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}

  ngOnInit(): void {
    // Initial render of any provided events
    this.rebuildCalendarEvents();
    this.applyResponsiveOptions();
  }

  ngOnChanges(): void {
    this.rebuildCalendarEvents();
  }

  /** Map raw DTOs to FullCalendar event objects */
  private rebuildCalendarEvents(): void {
    const mapped = this.events.map(e => {
      const statusColor = this.statusColors[e.status?.toUpperCase() || ''] || '#58a6ff';
      const typeColor = e.type ? this.typeColors[e.type.toUpperCase()] : undefined;
      const finalColor = this.mode === 'MINE' ? statusColor : (typeColor || statusColor);
      // Ensure end time is present and after start for proper span; if missing or invalid, default to +1 hour
      const startMs = Date.parse(e.startAt);
      const endMsRaw = e.endAt ? Date.parse(e.endAt) : NaN;
      const startDate = !isNaN(startMs) ? new Date(startMs) : new Date(e.startAt);
      let endDate: Date | undefined = undefined;
      if (!isNaN(endMsRaw)) {
        endDate = new Date(endMsRaw);
        if (!isNaN(startMs) && endDate.getTime() <= startMs) {
          endDate = new Date(startMs + 30 * 60 * 1000); // minimum 30m span
        }
      } else {
        // No end provided. Keep undefined to avoid forcing 1h default.
        // If needed later, we can restore a fallback like +60m.
        endDate = undefined;
      }
      return {
        id: String(e.eventId),
        title: e.eventName,
        start: startDate,
        end: endDate,
        allDay: false,
        color: finalColor,
        extendedProps: {
          location: e.eventLocation,
          status: e.status,
          type: e.type,
          typeDisplayName: e.typeDisplayName
        }
      };
    });
    this.calendarOptions = { ...this.calendarOptions, events: mapped };
    this.cdr.markForCheck();
  }

  private onCalendarEventClick(arg: any): void {
    const id = arg?.event?.id ? Number(arg.event.id) : undefined;
    if (id == null) return;
    this.zone.run(() => this.eventClick.emit(id));
  }

  private onDatesSet(arg: any): void {
    const start = arg.startStr || (arg.start?.toISOString?.() ?? '');
    const end = arg.endStr || (arg.end?.toISOString?.() ?? '');
    this.zone.run(() => this.dateRangeChange.emit({ start, end }));
  }

  requestRefresh(): void {
    this.refreshRequested.emit();
  }

  /** Attach tooltip via data attribute */
  private onEventDidMount(arg: any): void {
    if (!arg?.el || !arg?.event) return;
    const e = arg.event;
    const title = e.title as string | undefined;
    const loc = e.extendedProps?.location as string | undefined;
    const type = (e.extendedProps?.typeDisplayName || e.extendedProps?.type) as string | undefined;
    const start: Date | null = e.start ?? null;
    const end: Date | null = e.end ?? null;
    const timeFmt: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };
    const startStr = start ? new Date(start).toLocaleString(undefined, timeFmt) : '';
    const endStr = end ? new Date(end).toLocaleString(undefined, timeFmt) : '';
    const lines: string[] = [];
    if (title) lines.push(`Title: ${title}`);
    if (loc) lines.push(`Location: ${loc}`);
    if (type) lines.push(`Type: ${type}`);
    if (startStr) lines.push(`Start: ${startStr}`);
    if (endStr) lines.push(`End: ${endStr}`);
    if (lines.length) {
      arg.el.removeAttribute('title');
      arg.el.setAttribute('data-tooltip', lines.join('\n'));
    }
  }

  private applyResponsiveOptions(): void {
    const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 600px)').matches;
    const headerToolbar = narrow
      ? { left: 'prev,next', center: 'title', right: 'today' }
      : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' };
    const initialView = narrow ? 'listWeek' : 'dayGridMonth';
    this.calendarOptions = { ...this.calendarOptions, headerToolbar, initialView };
    this.cdr.markForCheck();
  }
}
