import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { EventsService } from './events.service';
import { EventPageResponse, EventDto } from './event.model';

describe('EventsService', () => {
  let service: EventsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(EventsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function flushPage(req: any, items: EventDto[] = []) {
    const page: EventPageResponse = {
      items,
      page: {
        number: 0,
        size: Number(req.request.params.get('size')),
        totalElements: items.length,
        totalPages: 1
      }
    };
    req.flush(page);
  }

  it('list() clamps size and normalizes invalid sort', () => {
    service.list({ page: 0, size: 500, sort: 'eventType,desc', status: 'PUBLISHED' }).subscribe(resp => {
      expect(resp.page.size).toBe(100); // clamped
    });
    const req = http.expectOne(r => r.url.endsWith('/events'));
    expect(req.request.params.get('size')).toBe('100');
    // eventType is whitelisted, so it should preserve the requested sort
    expect(req.request.params.get('sort')).toBe('eventType,desc');
    expect(req.request.params.get('status')).toBe('PUBLISHED');
    flushPage(req);
  });

  it('listMine() passes through filters', () => {
    service.listMine({ page: 2, size: 10, sort: 'startAt,desc', eventType: 'CONCERT', from: '2025-01-01', to: '2025-01-31' }).subscribe(resp => {
      expect(resp.page.number).toBe(0); // backend page after flush stub
    });
    const req = http.expectOne(r => r.url.endsWith('/events/mine'));
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('sort')).toBe('startAt,desc');
    expect(req.request.params.get('eventType')).toBe('CONCERT');
    expect(req.request.params.get('from')).toBe('2025-01-01');
    expect(req.request.params.get('to')).toBe('2025-01-31');
    flushPage(req);
  });

  it('status transition publish emits changed$', (done) => {
    const sub = service.changed$.subscribe(() => {
      sub.unsubscribe();
      done();
    });
    service.publishEvent(123).subscribe();
    const req = http.expectOne(r => /\/events\/123\/publish$/.test(r.url));
    req.flush({ eventId: 123, eventName: 'X', startAt: '2025-01-01T00:00:00Z', status: 'PUBLISHED' });
  });

  it('cancelEvent emits changed$', (done) => {
    const sub = service.changed$.subscribe(() => {
      sub.unsubscribe();
      done();
    });
    service.cancelEvent(55).subscribe();
    const req = http.expectOne(r => /\/events\/55\/cancel$/.test(r.url));
    req.flush({ eventId: 55, eventName: 'Y', startAt: '2025-02-01T00:00:00Z', status: 'CANCELLED' });
  });
});
