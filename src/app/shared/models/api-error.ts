export interface FieldIssueDto {
  field: string;
  message: string;
  rejectedValue?: unknown;
}

export interface ApiErrorDto {
  timestamp?: string;
  status?: number;
  error?: string;
  code?: string;
  message?: string;
  path?: string;
  requestId?: string;
  details?: FieldIssueDto[];
}

export function parseApiError(err: any): ApiErrorDto | null {
  const e = err?.error ?? err;
  if (e && typeof e === 'object' && ('status' in e || 'message' in e || 'code' in e || 'details' in e)) {
    const cast: ApiErrorDto = {
      timestamp: safeString(e.timestamp),
      status: safeNumber(e.status),
      error: safeString(e.error),
      code: safeString(e.code),
      message: safeString(e.message),
      path: safeString(e.path),
      requestId: safeString(e.requestId),
      details: Array.isArray(e.details)
        ? e.details.map((d: any) => ({ field: safeString(d?.field), message: safeString(d?.message), rejectedValue: d?.rejectedValue }))
        : undefined,
    };
    return cast;
  }
  return null;
}

export function formatApiError(err: any): string {
  try {
    const api = parseApiError(err);
    if (api) {
      const parts: string[] = [];
      if (api.message) parts.push(api.message);
      if (api.details && api.details.length) {
        const detailSummary = api.details
          .slice(0, 3)
          .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
          .filter(Boolean)
          .join('; ');
        if (detailSummary) parts.push(detailSummary);
        if (api.details.length > 3) parts.push(`(+${api.details.length - 3} more)`);
      }
      if (!parts.length && api.error) parts.push(api.error);
      if (!parts.length && api.status) parts.push(`HTTP ${api.status}`);
      return parts.join(' — ') || 'Request failed.';
    }
    // Fallbacks
    if (typeof err?.error === 'string') return err.error;
    if (typeof err?.message === 'string') return err.message;
    return JSON.stringify(err, null, 2);
  } catch {
    return 'Request failed.';
  }
}

function safeString(v: any): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function safeNumber(v: any): number | undefined {
  const n = typeof v === 'number' ? v : Number.isFinite(+v) ? +v : undefined;
  return Number.isFinite(n as number) ? (n as number) : undefined;
}
