import {
    formatDenverDate,
    formatDenverDateTime,
    formatDenverEventTimes,
    formatDenverTime12Hour,
    toDenverLocalDateTimeStringForBackend,
} from './timeUtility';

const DEBUG_TIME_UTILITY_LOGS = true;

describe('timeUtility (America/Denver)', () => {
    it('formats a known summer instant as Denver MDT (7:00 PM on 04/27/2026)', () => {
        // 2026-04-28T01:00:00Z == 2026-04-27 19:00 in America/Denver (MDT, -06:00)
        const iso = '2026-04-28T01:00:00Z';

        if (DEBUG_TIME_UTILITY_LOGS) {
            // eslint-disable-next-line no-console
            console.log('[timeUtility] summer iso input:', iso);
        }

        const date = formatDenverDate(iso, 'en-US');
        expect(date).not.toBeNull();

        if (DEBUG_TIME_UTILITY_LOGS) {
            // eslint-disable-next-line no-console
            console.log('[timeUtility] summer formatDenverDate:', date);
        }

        expect(date!.monthDayYear).toBe('04/27/2026');
        expect(date!.monthDay).toBe('04/27');
        expect(date!.weekdayLong).toBe('Monday');
        expect(date!.monthNameDay).toBe('April 27');

        const time = formatDenverTime12Hour(iso, 'en-US');
        expect(time).not.toBeNull();

        if (DEBUG_TIME_UTILITY_LOGS) {
            // eslint-disable-next-line no-console
            console.log('[timeUtility] summer formatDenverTime12Hour:', time);
        }

        expect(time!.time).toBe('7:00');
        expect(time!.period).toBe('PM');
        expect(time!.display).toBe('7:00 PM');

        const backend = toDenverLocalDateTimeStringForBackend(new Date(iso), 'en-US');

        if (DEBUG_TIME_UTILITY_LOGS) {
            // eslint-disable-next-line no-console
            console.log('[timeUtility] summer backend LocalDateTime string:', backend);
        }

        expect(backend).toBe('2026-04-27T19:00:00');
    });

    it('formats a known winter instant as Denver MST (7:00 PM on 12/10/2026)', () => {
        // 2026-12-11T02:00:00Z == 2026-12-10 19:00 in America/Denver (MST, -07:00)
        const iso = '2026-12-11T02:00:00Z';

        if (DEBUG_TIME_UTILITY_LOGS) {
            // eslint-disable-next-line no-console
            console.log('[timeUtility] winter iso input:', iso);
        }

        const date = formatDenverDate(iso, 'en-US');
        expect(date).not.toBeNull();

        if (DEBUG_TIME_UTILITY_LOGS) {
            // eslint-disable-next-line no-console
            console.log('[timeUtility] winter formatDenverDate:', date);
        }

        expect(date!.monthDayYear).toBe('12/10/2026');
        expect(date!.monthNameDay).toBe('December 10');

        const time = formatDenverTime12Hour(iso, 'en-US');
        expect(time).not.toBeNull();

        if (DEBUG_TIME_UTILITY_LOGS) {
            // eslint-disable-next-line no-console
            console.log('[timeUtility] winter formatDenverTime12Hour:', time);
        }

        expect(time!.display).toBe('7:00 PM');

        const backend = toDenverLocalDateTimeStringForBackend(new Date(iso), 'en-US');

        if (DEBUG_TIME_UTILITY_LOGS) {
            // eslint-disable-next-line no-console
            console.log('[timeUtility] winter backend LocalDateTime string:', backend);
        }

        expect(backend).toBe('2026-12-10T19:00:00');
    });

    it('builds combined objects for start/end', () => {
        const startAt = '2026-04-28T01:00:00Z';
        const endAt = '2026-04-28T03:00:00Z';

        const both = formatDenverEventTimes({ startAt, endAt }, 'en-US');

        if (DEBUG_TIME_UTILITY_LOGS) {
            // eslint-disable-next-line no-console
            console.log('[timeUtility] combined start/end formatted object:', both);
            // eslint-disable-next-line no-console
            console.log('[timeUtility] start formatted:', both.start);
            // eslint-disable-next-line no-console
            console.log('[timeUtility] end formatted:', both.end);
        }

        expect(both.start).not.toBeNull();
        expect(both.end).not.toBeNull();

        // Assert ALL time fields (time, period, display) for start
        expect(both.start!.time.time).toBe('7:00');
        expect(both.start!.time.period).toBe('PM');
        expect(both.start!.time.display).toBe('7:00 PM');

        // Assert ALL time fields (time, period, display) for end
        expect(both.end!.time.time).toBe('9:00');
        expect(both.end!.time.period).toBe('PM');
        expect(both.end!.time.display).toBe('9:00 PM');
    });

    it('returns null/empty for invalid inputs', () => {
        expect(formatDenverDate(null)).toBeNull();
        expect(formatDenverTime12Hour(undefined)).toBeNull();
        expect(formatDenverDateTime('not-a-date')).toBeNull();
        expect(toDenverLocalDateTimeStringForBackend(undefined)).toBe('');
    });
});
