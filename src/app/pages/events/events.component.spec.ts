import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { EventsComponent } from './events.component';
import { EventsService } from './events.service';
import { PLATFORM_ID } from '@angular/core';
import { EventPageResponse } from './event.model';

class MockEventsService {
  changed$ = new Subject<void>();
  listPublishedCalls = 0;
  publishedResponse: EventPageResponse = { items: [], page: { number: 0, size: 50, totalElements: 0, totalPages: 0 } };
  listPublished(params: any) {
    this.listPublishedCalls++;
    return of(this.publishedResponse);
  }
  listPublicUpcoming(_from: Date, _limit: number) { return of([]); }
}

describe('EventsComponent', () => {
  let fixture: any;
  let component: EventsComponent;
  let service: MockEventsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EventsComponent, RouterTestingModule],
      providers: [
        { provide: EventsService, useClass: MockEventsService },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    fixture = TestBed.createComponent(EventsComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(EventsService) as any as MockEventsService;
  });

  function setPublishedEvents(items: any[]) {
    service.publishedResponse = { items, page: { number: 0, size: items.length, totalElements: items.length, totalPages: 1 } };
  }

  it('initializes and calls listPublished() for published events', fakeAsync(() => {
    setPublishedEvents([]);
    fixture.detectChanges();
    tick();
    expect(service.listPublishedCalls).toBeGreaterThan(0);
    expect(component.publishedEvents).toBeDefined();
  }));

  it('caches published results and avoids duplicate listPublished calls for same month key', fakeAsync(() => {
    setPublishedEvents([]);
    fixture.detectChanges();
    tick();
    (component as any).loadEvents({ from:'2025-01-01', to:'2025-01-31'});
    const firstCalls = service.listPublishedCalls;
    (component as any).loadEvents({ from:'2025-01-01', to:'2025-01-31'});
    expect(service.listPublishedCalls).toBe(firstCalls); // cached
  }));

  it('clears cache on changed$ emission and reloads', fakeAsync(() => {
    setPublishedEvents([{ eventId:1, eventName:'A', startAt:'2025-01-02T00:00:00Z', endAt:null, status:'PUBLISHED', type:'CONCERT'}]);
    fixture.detectChanges();
    tick();
    (component as any).loadEvents();
    const beforeCalls = service.listPublishedCalls;
    service.changed$.next();
    tick();
    expect(service.listPublishedCalls).toBeGreaterThan(beforeCalls);
  }));

  it('date range handler triggers loadEvents with provided window', fakeAsync(() => {
    setPublishedEvents([]);
    fixture.detectChanges();
    tick();
    const before = service.listPublishedCalls;
    component.onCalendarRange({ start:'2025-02-01', end:'2025-02-28'});
    tick();
    expect(service.listPublishedCalls).toBeGreaterThan(before);
  }));

  it('navigates to event detail on event id click', fakeAsync(() => {
    setPublishedEvents([{ eventId:123, eventName:'Go There', startAt:'2025-02-01T12:00:00Z', status:'PUBLISHED', type:'CONCERT' }]);
    fixture.detectChanges();
    tick();
    (component as any).loadEvents();
    const router = TestBed.inject(Router);
    const spy = spyOn(router, 'navigate');
    component.onEventIdClick(123);
    expect(spy).toHaveBeenCalledWith(['/events', '123']);
  }));

  it('loadUpcoming populates upcoming on success', fakeAsync(() => {
    const upcomingSpy = spyOn(service, 'listPublicUpcoming').and.returnValue(of([
      { eventId: 200, eventName: 'Soon', startAt: '2025-02-05T10:00:00Z', status: 'PUBLISHED', type: 'FESTIVAL' }
    ] as any));
    fixture.detectChanges();
    tick();
    (component as any).loadUpcoming();
    tick();
    expect(upcomingSpy).toHaveBeenCalled();
    expect(component.upcoming.length).toBe(1);
    expect(component.upcomingLoading).toBeFalse();
    expect(component.upcomingError).toBeNull();
  }));

  it('loadUpcoming handles error path', fakeAsync(() => {
    const errSpy = spyOn(service, 'listPublicUpcoming').and.returnValue(throwError(() => ({ status: 500, message: 'boom' })));
    fixture.detectChanges();
    tick();
    (component as any).loadUpcoming();
    tick();
    expect(errSpy).toHaveBeenCalled();
    expect(component.upcoming.length).toBe(0);
    expect(component.upcomingLoading).toBeFalse();
    expect(component.upcomingError).toBeTruthy();
  }));

  it('includes events from multiple owners in published list (parity test)', fakeAsync(() => {
    setPublishedEvents([
      { eventId: 10, eventName: 'OwnerA Event', startAt: '2025-03-01T00:00:00Z', status: 'PUBLISHED', type: 'CONCERT', createdByUserId: 111 },
      { eventId: 11, eventName: 'OwnerB Event', startAt: '2025-03-02T00:00:00Z', status: 'PUBLISHED', type: 'FESTIVAL', createdByUserId: 222 }
    ]);
    fixture.detectChanges();
    tick();
    // Force load for the month range containing events (March 2025)
    (component as any).loadEvents({ from: '2025-03-05T00:00:00Z' });
    tick();
    expect(component.publishedEvents.length).toBe(2);
    const ownerIds = component.publishedEvents.map(e => e.createdByUserId).sort();
    expect(ownerIds).toEqual([111, 222]);
  }));

  // Removed permission fallback tests (Mine view eliminated from published-only component)
});
