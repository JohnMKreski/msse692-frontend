/**
 * Community (Denver) time formatting helpers.
 *
 * Frontend policy: ALWAYS display event times in America/Denver,
 * regardless of the user's browser timezone.
 *
 * Notes:
 * - Backend returns ISO strings with an offset (e.g. 2026-04-27T19:00:00-06:00).
 * - `new Date(iso)` represents the correct absolute instant.
 * - We format that instant using Intl.DateTimeFormat with timeZone=America/Denver.
 */

// ---------- Constants (single source of truth) ----------

export const COMMUNITY_TIME_ZONE_IANA_NAME = 'America/Denver' as const;
export const DEFAULT_LOCALE_BCP_47 = 'en-US' as const;

// ---------- Types (objects we can pass around) ----------

export type IsoDateTimeString = string;

export type TwelveHourPeriod = 'AM' | 'PM';

export interface FormattedDenverTime12Hour {
    /** Example: "7:00" */
    time: string;
    /** Example: "PM" */
    period: TwelveHourPeriod;
    /** Example: "7:00 PM" */
    display: string;
}

export interface FormattedDenverDate {
    /** Example: "04/27/2026" */
    monthDayYear: string;
    /** Example: "04/27" */
    monthDay: string;
    /** Example: "Monday" */
    weekdayLong: string;
    /** Example: "April 27" */
    monthNameDay: string;
}

export interface FormattedDenverDateTime {
    date: FormattedDenverDate;
    time: FormattedDenverTime12Hour;
}

export interface FormattedDenverEventTimes {
    start: FormattedDenverDateTime | null;
    end: FormattedDenverDateTime | null;
}

// ---------- Core helpers ----------

function isValidDate(date: Date): boolean {
    return date instanceof Date && !Number.isNaN(date.getTime());
}

function toDate(input: IsoDateTimeString | Date | null | undefined): Date | null {
    if (!input) return null;
    const date = input instanceof Date ? input : new Date(input);
    return isValidDate(date) ? date : null;
}

function formatParts(
    date: Date,
    options: Intl.DateTimeFormatOptions,
    locale: string
): Intl.DateTimeFormatPart[] {
    return new Intl.DateTimeFormat(locale, {
        timeZone: COMMUNITY_TIME_ZONE_IANA_NAME,
        ...options,
    }).formatToParts(date);
}

function findPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
    return parts.find((part) => part.type === type)?.value ?? '';
}

// ---------- Public: date formatting (Denver) ----------

export function formatDenverDate(
    input: IsoDateTimeString | Date | null | undefined,
    locale: string = DEFAULT_LOCALE_BCP_47
): FormattedDenverDate | null {
    const date = toDate(input);
    if (!date) return null;

    const monthDayYearParts = formatParts(
        date,
        { year: 'numeric', month: '2-digit', day: '2-digit' },
        locale
    );
    const month = findPart(monthDayYearParts, 'month');
    const day = findPart(monthDayYearParts, 'day');
    const year = findPart(monthDayYearParts, 'year');

    const weekdayLong = new Intl.DateTimeFormat(locale, {
        timeZone: COMMUNITY_TIME_ZONE_IANA_NAME,
        weekday: 'long',
    }).format(date);

    const monthNameDay = new Intl.DateTimeFormat(locale, {
        timeZone: COMMUNITY_TIME_ZONE_IANA_NAME,
        month: 'long',
        day: 'numeric',
    }).format(date);

    return {
        monthDayYear: `${month}/${day}/${year}`,
        monthDay: `${month}/${day}`,
        weekdayLong,
        monthNameDay,
    };
}

// ---------- Public: time formatting (Denver) ----------

export function formatDenverTime12Hour(
    input: IsoDateTimeString | Date | null | undefined,
    locale: string = DEFAULT_LOCALE_BCP_47
): FormattedDenverTime12Hour | null {
    const date = toDate(input);
    if (!date) return null;

    const parts = formatParts(
        date,
        {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        },
        locale
    );

    const hour = findPart(parts, 'hour');
    const minute = findPart(parts, 'minute');
    const dayPeriodRaw = findPart(parts, 'dayPeriod');

    // Intl can return different casing/localized strings; normalize for the UI expectation.
    const normalizedPeriod = (dayPeriodRaw || '').toUpperCase();
    const period: TwelveHourPeriod = normalizedPeriod === 'PM' ? 'PM' : 'AM';

    const time = `${hour}:${minute}`;
    return {
        time,
        period,
        display: `${time} ${period}`,
    };
}

// ---------- Public: combined date + time object (Denver) ----------

export function formatDenverDateTime(
    input: IsoDateTimeString | Date | null | undefined,
    locale: string = DEFAULT_LOCALE_BCP_47
): FormattedDenverDateTime | null {
    const date = formatDenverDate(input, locale);
    const time = formatDenverTime12Hour(input, locale);
    if (!date || !time) return null;
    return { date, time };
}

// ---------- Public: convenience for EventDto-like objects ----------

export function formatDenverEventTimes(
    input: { startAt?: IsoDateTimeString | null; endAt?: IsoDateTimeString | null } | null | undefined,
    locale: string = DEFAULT_LOCALE_BCP_47
): FormattedDenverEventTimes {
    return {
        start: formatDenverDateTime(input?.startAt ?? null, locale),
        end: formatDenverDateTime(input?.endAt ?? null, locale),
    };
}

// ---------- Public: backend filter / query string helper ----------

/**
 * Converts a Date into a Denver-local "LocalDateTime" string for backend query params.
 * Output example: "2026-04-27T19:00:00" (NO offset, NO Z).
 */
export function toDenverLocalDateTimeStringForBackend(
    input: Date | null | undefined,
    locale: string = DEFAULT_LOCALE_BCP_47
): string {
    if (!input) return '';
    const date = toDate(input);
    if (!date) return '';

    const dateParts = formatParts(
        date,
        { year: 'numeric', month: '2-digit', day: '2-digit' },
        locale
    );
    const timeParts = formatParts(
        date,
        { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', hour12: false },
        locale
    );

    const year = findPart(dateParts, 'year');
    const month = findPart(dateParts, 'month');
    const day = findPart(dateParts, 'day');
    const hour = findPart(timeParts, 'hour');
    const minute = findPart(timeParts, 'minute');

    return `${year}-${month}-${day}T${hour}:${minute}:00`;
}

// ---------- Optional: object wrapper export (if you prefer) ----------

/**
 * Optional convenience wrapper to match your original "timeUtility" usage style.
 * Prefer importing the named functions above where possible.
 */
export const timeUtility = {
    COMMUNITY_TIME_ZONE_IANA_NAME,
    DEFAULT_LOCALE_BCP_47,

    formatDenverDate,
    formatDenverTime12Hour,
    formatDenverDateTime,
    formatDenverEventTimes,
    toDenverLocalDateTimeStringForBackend,
} as const;
