import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { EventsService } from './events.service';
import { API_URL } from '../../shared/api-tokens';

describe('EventsService', () => {
  let svc: EventsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        { provide: API_URL, useValue: '/api/v1' },
      ],
    });
    svc = TestBed.inject(EventsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('list should default page=0,size=50 and normalize sort', () => {
    svc.list({ sort: '-eventName' }).subscribe();
    const req = http.expectOne(r => r.url === '/api/v1/events');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('50');
    expect(req.request.params.get('sort')).toBe('eventName,desc');
    req.flush({ items: [], page: { number: 0, size: 50, totalElements: 0, totalPages: 0 } });
  });

  it('listPublicUpcoming should clamp limit and include from when provided', () => {
    const from = new Date('2025-01-02T03:04:05.000Z');
    svc.listPublicUpcoming(from, 999).subscribe();
    const req = http.expectOne('/api/v1/events/public-upcoming');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('100');
    expect(req.request.params.get('from')).toBe(from.toISOString());
    req.flush([]);
  });

  it('get should GET /events/:id', () => {
    svc.get(123).subscribe();
    const req = http.expectOne('/api/v1/events/123');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 123 });
  });

  it('createRaw/updateRaw/delete should hit expected endpoints', () => {
    svc.createRaw({ eventName: 'A' } as any).subscribe();
    http.expectOne('/api/v1/events').flush({ id: 1 });

    svc.updateRaw(1, { eventName: 'B' } as any).subscribe();
    http.expectOne('/api/v1/events/1').flush({ id: 1 });

    svc.delete(1).subscribe();
    const del = http.expectOne('/api/v1/events/1');
    expect(del.request.method).toBe('DELETE');
    del.flush({});
  });

  it('audits and status transitions', () => {
    svc.getAudits(5, 20).subscribe();
    const auditsReq = http.expectOne(r => r.url === '/api/v1/events/5/audits');
    expect(auditsReq.request.params.get('limit')).toBe('20');
    auditsReq.flush([]);

    svc.publishEvent(5).subscribe();
    http.expectOne('/api/v1/events/5/publish').flush({ id: 5 });
    svc.unpublishEvent(5).subscribe();
    http.expectOne('/api/v1/events/5/unpublish').flush({ id: 5 });
    svc.cancelEvent(5).subscribe();
    http.expectOne('/api/v1/events/5/cancel').flush({ id: 5 });
  });
});
