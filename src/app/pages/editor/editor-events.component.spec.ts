import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { EditorEventsComponent } from './editor-events.component';
import { EventsService } from '../events/events.service';
import { PLATFORM_ID } from '@angular/core';
import { EventPageResponse, EventDto } from '../events/event.model';
import { EnumsService } from '../events/enums.service';
import { MatDialog } from '@angular/material/dialog';

class MockEventsService {
  changed$ = new Subject<void>();
  mineCalls = 0;
  publishCalls = 0;
  unpublishCalls = 0;
  cancelCalls = 0;
  response: EventPageResponse = { items: [], page: { number: 0, size: 0, totalElements: 0, totalPages: 0 } };
  listMine(params: any) { this.mineCalls++; return of(this.response); }
  createRaw(payload: any) { return of({ eventId: 999, ...payload } as EventDto); }
  updateRaw(id: number, payload: any) { return of({ eventId: id, ...payload } as EventDto); }
  publishEvent(id: number) { this.publishCalls++; this.changed$.next(); return of({ eventId:id, eventName:'X', startAt:'2025-01-01T00:00:00Z', status:'PUBLISHED'} as any); }
  unpublishEvent(id: number) { this.unpublishCalls++; this.changed$.next(); return of({ eventId:id, eventName:'X', startAt:'2025-01-01T00:00:00Z', status:'UNPUBLISHED'} as any); }
  cancelEvent(id: number) { this.cancelCalls++; this.changed$.next(); return of({ eventId:id, eventName:'X', startAt:'2025-01-01T00:00:00Z', status:'CANCELLED'} as any); }
  delete(id: number) { this.changed$.next(); return of(void 0); }
  notifyChanged() { this.changed$.next(); }
}

class MockEnumsService {
  getEventStatuses() { return of([]); }
  getEventTypes() { return of([]); }
}

class MockDialog {
  open() { return { afterClosed: () => of(true) }; }
}

describe('EditorEventsComponent', () => {
  let fixture: any;
  let component: EditorEventsComponent;
  let service: MockEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EditorEventsComponent, RouterTestingModule],
      providers: [
        { provide: EventsService, useClass: MockEventsService },
        { provide: EnumsService, useClass: MockEnumsService },
        { provide: MatDialog, useClass: MockDialog },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    fixture = TestBed.createComponent(EditorEventsComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(EventsService) as any as MockEventsService;
  });

  function setMine(items: any[]) {
    service.response = { items, page: { number: 0, size: items.length, totalElements: items.length, totalPages: 1 } };
  }

  it('initializes and loads mine events', fakeAsync(() => {
    setMine([{ eventId: 1, eventName: 'Mine', startAt: '2025-01-02T00:00:00Z', status: 'DRAFT' }]);
    fixture.detectChanges();
    tick();
    expect(service.mineCalls).toBeGreaterThan(0);
    expect(component.items().length).toBe(1);
    expect(component.error()).toBeNull();
  }));

  it('calendar event click loads edit form', fakeAsync(() => {
    setMine([{ eventId: 5, eventName: 'EditMe', startAt: '2025-01-02T00:00:00Z', endAt: '2025-01-02T01:00:00Z', status: 'PUBLISHED' }]);
    fixture.detectChanges();
    tick();
    component.onCalendarEventClick(5);
    expect(component.editId).toBe(5);
    expect(component.form.value.eventName).toBe('EditMe');
  }));

  it('range change triggers reload with date params', fakeAsync(() => {
    setMine([]);
    fixture.detectChanges();
    tick();
    const before = service.mineCalls;
    component.onCalendarRange({ start: '2025-02-01', end: '2025-02-28' });
    tick();
    expect(service.mineCalls).toBeGreaterThan(before);
  }));

  it('status publish transition invokes service and refreshes', fakeAsync(() => {
    setMine([{ eventId: 7, eventName: 'ToPublish', startAt: '2025-01-02T00:00:00Z', status: 'DRAFT' }]);
    fixture.detectChanges();
    tick();
    component.onStatusChange(component.items()[0], 'PUBLISHED');
    tick();
    expect(service.publishCalls).toBe(1);
    expect(service.mineCalls).toBeGreaterThan(1); // initial + refresh
  }));

  it('handles permission error (403) displaying message', fakeAsync(() => {
    spyOn(service, 'listMine').and.returnValue(throwError(() => ({ status: 403 })));
    fixture.detectChanges();
    tick();
    expect(component.items().length).toBe(0);
    expect(component.error()).toContain('permission');
  }));

  it('submit creates a new event then reloads list', fakeAsync(() => {
    setMine([]);
    fixture.detectChanges();
    tick();
    component.form.patchValue({
      eventName: 'New',
      type: 'CONCERT',
      dateStart: '2025-03-01',
      dateEnd: '2025-03-01',
      timeStart: '10:00',
      timeEnd: '11:00',
      eventLocation: 'Loc',
      eventDescription: 'Desc'
    });
    component.submit();
    tick();
    expect(service.mineCalls).toBeGreaterThan(1); // initial + reload
  }));
});
