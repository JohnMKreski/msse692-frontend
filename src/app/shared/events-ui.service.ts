import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Lightweight UI event bus for cross-component coordination around Events updates.
 */
@Injectable({ providedIn: 'root' })
export class EventsUiService {
  private readonly _changed = new Subject<void>();
  readonly changed$ = this._changed.asObservable();

  notifyChanged() {
    this._changed.next();
  }
}
