// import { HttpInterceptorFn } from '@angular/common/http';

// // Temporary debugging interceptor: logs request URL and a stack trace
// // to identify which service/component initiated the HttpClient call.
// // Remove once offending services are fixed to use API_URL.
// export const requestTraceInterceptor: HttpInterceptorFn = (req, next) => {
//   const err = new Error('HTTP Initiator Trace');
//   // Using console.group for cleaner logs, works in browser and Node SSR.
//   // Stack traces in SSR may be minified but still helpful.
//   // Note: This does not modify the request.
//   // eslint-disable-next-line no-console
//   console.groupCollapsed(`[HTTP] ${req.method} ${req.url}`);
//   // eslint-disable-next-line no-console
//   console.log('Headers:', Object.fromEntries(req.headers.keys().map(k => [k, req.headers.get(k)])));
//   // eslint-disable-next-line no-console
//   console.log('Stack:', err.stack);
//   // eslint-disable-next-line no-console
//   console.groupEnd();
//   return next(req);
// };
