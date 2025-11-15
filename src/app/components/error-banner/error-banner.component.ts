import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgIf, NgForOf } from '@angular/common';
import { formatApiError, parseApiError } from '../../shared/api-error';

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
  private _error: any = null;

  @Input()
  set error(err: any) {
    this._error = err;
    if (err == null) return;
    // Only derive values if not explicitly provided by the parent
    if (this.message == null) {
      try { this.message = formatApiError(err); } catch { /* noop */ }
    }
    if (this.status == null || this.status === undefined) {
      const httpStatus = typeof err?.status === 'number' ? err.status : undefined;
      const parsed = parseApiError(err);
      this.status = (httpStatus && httpStatus > 0) ? httpStatus : (parsed?.status && parsed.status > 0 ? parsed.status : undefined);
    }
    if (this.details == null) {
      const parsed = parseApiError(err);
      if (parsed?.details?.length) {
        this.details = parsed.details.map(d => ({ field: d.field, message: d.message }));
      }
    }
  }

  get severity(): 'warn' | 'error' {
    const s = this.status ?? 0;
    return s >= 500 ? 'error' : 'warn';
  }

  onRetry() { this.retry.emit(); }
  onDismiss() { if (this.dismissible) this.dismissed.emit(); }
}
