import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { NgIf, NgForOf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { EventDto } from '../../pages/events/event.model';

@Component({
    selector: 'app-events-calendar-list',
    standalone: true,
    imports: [NgIf, NgForOf, AsyncPipe, FormsModule],
    templateUrl: './events-calendar-list.component.html',
    styleUrls: ['./events-calendar-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventsCalendarListComponent {
    @Input() events: EventDto[] = [];
    @Input() loading = false;
    @Input() selectedType: string | null = null;
    @Input() typeOptions$: Observable<Array<{ label: string; value: string | null }>> | null = null;

    @Output() eventClick = new EventEmitter<number>();
    @Output() typeChange = new EventEmitter<string | null>();
    @Output() refreshRequested = new EventEmitter<void>();
    @Output() monthChange = new EventEmitter<{ start: string; end: string }>();

    currentMonthDate = new Date();

    get monthLabel(): string {
        return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
            .format(this.currentMonthDate);
    }

    previousMonth(): void {
        const d = new Date(this.currentMonthDate);
        d.setMonth(d.getMonth() - 1);
        this.currentMonthDate = d;
        this.emitMonthRange();
    }

    nextMonth(): void {
        const d = new Date(this.currentMonthDate);
        d.setMonth(d.getMonth() + 1);
        this.currentMonthDate = d;
        this.emitMonthRange();
    }

    private emitMonthRange(): void {
        const year = this.currentMonthDate.getFullYear();
        const month = this.currentMonthDate.getMonth(); // 0-indexed
        const lastDay = new Date(year, month + 1, 0).getDate();
        const mm = String(month + 1).padStart(2, '0');
        const dd = String(lastDay).padStart(2, '0');
        this.monthChange.emit({
            start: `${year}-${mm}-01T00:00:00`,
            end: `${year}-${mm}-${dd}T23:59:59`
        });
    }

    onTypeChange(value: string | null): void {
        this.typeChange.emit(value);
    }

    onEventClick(id: number): void {
        this.eventClick.emit(id);
    }

    onRefreshClick(): void {
        this.refreshRequested.emit();
    }
}