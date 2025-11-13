import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';

export interface ErrorBannerDetail { field?: string; message: string }

@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [CommonModule, NgIf, NgForOf],
  templateUrl: './error-banner.component.html',
  styleUrls: ['./error-banner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'alert', tabindex: '0' }
})
export class ErrorBannerComponent {
  @Input() message: string | null = null;
  @Input() details: ErrorBannerDetail[] | null = null;
  @Input() status?: number | null;
  @Input() dismissible: boolean = true;
  @Input() retryLabel: string = 'Retry';
  @Output() retry = new EventEmitter<void>();
  @Output() dismissed = new EventEmitter<void>();

  get severity(): 'warn' | 'error' {
    const s = this.status ?? 0;
    return s >= 500 ? 'error' : 'warn';
  }

  onRetry() { this.retry.emit(); }
  onDismiss() { if (this.dismissible) this.dismissed.emit(); }
}
