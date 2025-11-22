import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snack = inject(MatSnackBar);
  private readonly platformId = inject(PLATFORM_ID);

  show(message: string, action: string = 'Dismiss', duration = 3500): void {
    if (!isPlatformBrowser(this.platformId)) return; // SSR no-op
    const msg = (message || '').toString().trim();
    if (!msg) return;
    this.snack.open(msg, action, {
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }
}
