import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EventsService } from '../../events/events.service';
import { EventDto } from '../../events/event.model';

@Component({
  selector: 'app-profile-events',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile-events.component.html'
})
export class ProfileEventsComponent implements OnInit {
  myEvents = signal<EventDto[] | null>(null);
  myEventsError = signal<string | null>(null);

  constructor(private events: EventsService) {}

  ngOnInit(): void {
    this.events.listMine({ page: 0, size: 100, sort: 'startAt,asc' }).subscribe({
      next: (resp) => { this.myEvents.set(resp?.items ?? []); this.myEventsError.set(null); },
      error: (err) => {
        this.myEvents.set([]);
        if (err?.status === 401 || err?.status === 403) {
          this.myEventsError.set('You do not have permission to view your events.');
        } else {
          this.myEventsError.set('Failed to load your events.');
        }
      }
    });
  }
}
