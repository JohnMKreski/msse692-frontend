import { HttpErrorResponse, HttpInterceptorFn, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { NotificationService } from '../shared/services/notification.service';
import { formatApiError, parseApiError } from '../shared/models/api-error';
import { catchError, throwError } from 'rxjs';

// Per-request opt-out flag for global error notifications
export const SUPPRESS_GLOBAL_ERROR = new HttpContextToken<boolean>(() => false);

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const suppressed = req.context.get(SUPPRESS_GLOBAL_ERROR);
        if (!suppressed) {
          const status = err.status ?? parseApiError(err)?.status ?? 0;
          let message: string;
          switch (true) {
            case status === 0:
              message = 'Network error. Check your connection.';
              break;
            case status === 401:
              message = 'Sign-in required to continue.';
              break;
            case status === 403:
              message = "You don't have permission to perform this action.";
              break;
            case status === 404:
              message = 'Not found.';
              break;
            case status === 409:
              message = formatApiError(err) || 'Conflict. Please refresh and try again.';
              break;
            case status >= 500:
              message = 'Something went wrong. Please try again.';
              break;
            default:
              message = formatApiError(err) || `Request failed (HTTP ${status}).`;
          }
          notify.show(message);
        }
      }
      return throwError(() => err);
    })
  );
};
