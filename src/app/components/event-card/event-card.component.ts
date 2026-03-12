import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { EventDto } from '../../pages/events/event.model';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [RouterLink, DatePipe, CommonModule],
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.scss']
})
export class EventCardComponent {
  @Input() event!: EventDto;
  // Optional thumbnail URL; when absent a placeholder will be shown
  @Input() thumbnailUrl?: string;

  @ViewChild('headerEl', { static: true }) headerEl?: ElementRef<HTMLElement>;
  @ViewChild('titleEl', { static: true }) titleEl?: ElementRef<HTMLElement>;
  @ViewChild('locationEl') locationEl?: ElementRef<HTMLElement>;

  private resizeObserver?: ResizeObserver;
  private fitRafId?: number;

  ngAfterViewInit(): void {
    this.installResizeObserver();
    this.scheduleFitTitle();
    this.scheduleFitLocation();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    // Title text can change when input event changes
    this.scheduleFitTitle();
    this.scheduleFitLocation();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.fitRafId != null) {
      cancelAnimationFrame(this.fitRafId);
    }
  }

  private installResizeObserver(): void {
    const header = this.headerEl?.nativeElement;
    if (!header || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => this.scheduleFitTitle());
    this.resizeObserver.observe(header);
  }

  private scheduleFitLocation(): void {
    // Reuse the same RAF slot (cheap and keeps updates in sync)
    this.scheduleFitTitle();
    requestAnimationFrame(() => this.fitLocationToSlot());
  }

  private scheduleFitTitle(): void {
    if (this.fitRafId != null) {
      cancelAnimationFrame(this.fitRafId);
    }
    this.fitRafId = requestAnimationFrame(() => {
      this.fitRafId = undefined;
      this.fitTitleToHeader();
    });
  }

  private fitTitleToHeader(): void {
    const header = this.headerEl?.nativeElement;
    const title = this.titleEl?.nativeElement;
    if (!header || !title) return;

    // Reset any previous inline sizing so we start from CSS.
    title.style.fontSize = '';

    // Compute available height inside the header (minus padding).
    const headerStyle = getComputedStyle(header);
    const padTop = parseFloat(headerStyle.paddingTop || '0') || 0;
    const padBottom = parseFloat(headerStyle.paddingBottom || '0') || 0;
    const availableHeight = Math.max(0, header.clientHeight - padTop - padBottom);
    if (availableHeight <= 0) return;

    // Allow the title to wrap and measure its real height.
    // Binary-search the font size to the largest that fits.
    const maxPx = this.cssPx(title, '--event-card-title-max-px', 28);
    const minPx = this.cssPx(title, '--event-card-title-min-px', 12);

    let low = minPx;
    let high = maxPx;

    for (let i = 0; i < 10; i++) {
      const mid = (low + high) / 2;
      title.style.fontSize = `${mid}px`;
      // scrollHeight captures wrapped height even if overflow hidden
      if (title.scrollHeight <= availableHeight) {
        low = mid;
      } else {
        high = mid;
      }
    }

    title.style.fontSize = `${Math.floor(low)}px`;
  }

  private fitLocationToSlot(): void {
    const location = this.locationEl?.nativeElement;
    if (!location) return;

    // Reset any previous inline sizing so we start from CSS.
    location.style.fontSize = '';

    const slotHeight = location.clientHeight;
    if (slotHeight <= 0) return;

    const maxPx = this.cssPx(location, '--event-card-location-max-px', 16);
    const minPx = this.cssPx(location, '--event-card-location-min-px', 10);

    let low = minPx;
    let high = maxPx;

    for (let i = 0; i < 10; i++) {
      const mid = (low + high) / 2;
      location.style.fontSize = `${mid}px`;
      if (location.scrollHeight <= slotHeight) {
        low = mid;
      } else {
        high = mid;
      }
    }

    location.style.fontSize = `${Math.floor(low)}px`;
  }

  private cssPx(el: HTMLElement, varName: string, fallbackPx: number): number {
    const raw = getComputedStyle(el).getPropertyValue(varName).trim();
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackPx;
  }
}
