# Frontend Build & Run Guide (Angular 19 + SSR)

This document explains how the `msse692-frontend` Angular application is built, served (client & SSR), tested, optimized, and debugged.

---
## 1. Tech Stack Overview
- Framework: Angular 19 (unified application builder)
- Styling: SCSS (global `src/styles.scss` + component styles)
- UI Libraries: Angular Material, CDK
- Calendar: FullCalendar 6 (dayGrid, timeGrid, list views)
- Firebase: `@angular/fire` for potential auth / data features
- SSR: Unified build (browser + server) via `@angular-devkit/build-angular:application`
- Server runtime: Node (Express imported for potential server customization)

---
## 2. Key Files
| Purpose | File |
|---------|------|
| Main browser entry | `src/main.ts` |
| Server bundle entry | `src/main.server.ts` |
| Express-style SSR bootstrap | `src/server.ts` (referenced in `angular.json` `ssr.entry`) |
| Global styles | `src/styles.scss` |
| Environment configs | `src/environments/*.ts` |
| Angular build config | `angular.json` |
| TypeScript configs | `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json` |
| Package scripts | `package.json` |

---
## 3. NPM Scripts (package.json)
| Script | Command | Purpose |
|--------|---------|---------|
| `start` | `ng serve` | Dev server (browser only) with live reload |
| `build` | `ng build` | Production build (browser + server + prerender) |
| `build:ssr` | `ng build` | Same as `build` (legacy variant updated) |
| `serve:ssr` | `node dist/msse692-frontend/server/server.mjs` | Run built SSR server |
| `dev:ssr` | `npm run build:ssr && npm run serve:ssr` | Build then launch SSR (no watch) |
| `watch` | `ng build --watch --configuration development` | Rebuild on file changes (no serve) |
| `test` | `ng test` | Karma tests in Chrome (default) |
| `test:ci` | `ng test --browsers FirefoxHeadless --watch=false --code-coverage` | Headless CI + coverage |
| `test:edge` | `ng test --browsers EdgeHeadless` | Cross-browser sanity |
| `test:firefox` | `ng test --browsers FirefoxHeadless` | Firefox test run |

---
## 4. Build Modes
### Development
```
npm ci
npm start
```
- Source maps enabled
- No full optimizations
- Good for rapid iteration

### Production + SSR (Unified)
```
npm run build
```
Generates:
- `dist/msse692-frontend/browser` – client bundle
- `dist/msse692-frontend/server` – server bundle (`server.mjs`)
- Optional prerendered HTML (if routes suitable & `prerender: true`)

Run SSR server:
```
node dist/msse692-frontend/server/server.mjs
```
Visit the reported port (commonly 4000 or 4200 depending on configuration in `server.ts`).

### Watch Build (No Serve)
```
npm run watch
```
Useful for external container or reverse proxy setups.

---
## 5. SSR Explained (Angular 19 Application Builder)
- **No separate `server` architect target**. SSR is baked into the application build using:
  - `"server": "src/main.server.ts"`
  - `"ssr": { "entry": "src/server.ts" }`
- `ng build` produces both browser & server output; old `ng run <proj>:server` is obsolete.
- Hydration automatically bootstraps the browser application after server-rendered HTML loads.

### Verifying Hydration
1. View source (should show pre-rendered markup).
2. Open DevTools > Network, disable cache, reload: first paint contains content.
3. Interact with a component (e.g. calendar navigation) – if no full redraw flicker, hydration succeeded.

---
## 6. Budgets & Warnings
`angular.json` production configuration includes:
```json
{
  "type": "anyComponentStyle",
  "maximumWarning": "4kB",
  "maximumError": "8kB"
}
```
A warning example:
```
[WARNING] events.component.scss exceeded maximum budget by 88 bytes (4.09 kB > 4.00 kB)
```
### Adjusting Budget
Increase warning ceiling (optional):
```json
{
  "type": "anyComponentStyle",
  "maximumWarning": "6kB",
  "maximumError": "10kB"
}
```
Or optimize styles:
- Remove commented blocks / unused selectors
- Consolidate repeated `::ng-deep` selectors
- Reduce long variable names or excessive nesting

---
## 7. Testing & Coverage
Run all tests:
```
npm test
```
CI-style + coverage:
```
npm run test:ci
```
Coverage output: check `coverage/` or designated folder (Jest vs Karma distinction; current setup uses Karma + Jasmine). Inspect HTML report for lines missed.

Cross-browser spot checks:
```
npm run test:firefox
npm run test:edge
```

---
## 8. Common Issues & Fixes
| Symptom | Cause | Fix |
|---------|-------|-----|
| `Project target does not exist` after `build:ssr` | Legacy script referencing missing `server` target | Update script to just `ng build` (done) |
| Style budget warning | Large component SCSS | Increase budget or refactor stylesheet |
| Memory heap OOM | Large production bundle build | `set NODE_OPTIONS=--max_old_space_size=4096` then rebuild |
| Module resolution errors | Missing clean install | Run `npm ci` to exactly match lockfile |
| SSR server 404 root | Custom Express not serving static correctly | Verify `server.ts` static & route handling |

---
## 9. Performance Optimization Checklist
- Enable production config (default) – already sets optimizations.
- Lazy load heavy feature routes (calendar could be isolated if needed).
- Leverage standalone components (already using them) to reduce NgModule overhead.
- Tree-shake FullCalendar plugins: only keep required ones (dayGrid, timeGrid, list, interaction).
- Audit bundle via stats:
```
ng build --configuration production --stats-json
npx source-map-explorer dist/msse692-frontend/browser/*.js
```
- Use Angular CLI's budget thresholds to monitor growth.

---
## 10. CI Pipeline (Example)
Minimal steps:
```
npm ci
npm run test:ci
npm run build
node dist/msse692-frontend/server/server.mjs  # (Optional smoke test)
```
Artifacts: upload `dist/msse692-frontend/browser` (static) and `dist/msse692-frontend/server` (SSR bundle) to hosting.

---
## 11. Deployment Approaches
| Approach | Notes |
|----------|-------|
| Static Hosting (Browser Only) | Use `dist/.../browser`; no SSR benefits |
| Node Server (SSR) | Run `server.mjs`; better SEO & first paint |
| Container Image | COPY `dist` + Node runtime + start with `node dist/.../server/server.mjs` |
| Edge (Prerender Only) | Use prerendered HTML for main routes + dynamic fallback server |

---
## 12. Environment Variables
Use standard Angular environment files (`environment.ts`, `environment.prod.ts`). For runtime secrets (server side), inject via process env in `server.ts` before Express (if used).

---
## 13. Updating Dependencies Safely
1. Inspect major version jumps (`npm outdated`).
2. Update Angular with official migration tool:
```
npx ng update @angular/core @angular/cli
```
3. Rebuild & test:
```
npm ci
npm run build
npm test
```
4. Run SSR to confirm server bundle integrity.

---
## 14. Troubleshooting Checklist
- Clear build cache: delete `dist/` & optional `.angular/` folder.
- Verify Node version (LTS 18 or 20). `node -v`
- Ensure `tsconfig.app.json` includes needed paths.
- Inspect console for hydration mismatch (rare): verify identical markup server vs client.
- FullCalendar layout issues: check CSS overrides (`overflow` and fixed heights) in `events.component.scss`.

---
## 15. Optimizing Component Styles
If hitting style budget frequently:
- Split large SCSS into utility partials imported globally.
- Remove `::ng-deep` where possible (prefer proper selectors or global style overrides).
- Compress repetitive color definitions into CSS custom properties.

---
## 16. Fast Dev Cycle Tips
| Goal | Tip |
|------|-----|
| Quick UI feedback | `npm start` (HMR) |
| Inspect SSR diff | Load page with `serve:ssr`, compare DOM against dev server |
| Toggle production flags | `ng serve --configuration production` to preview optimized build |
| Reduce rebuild time | Limit open editors; avoid heavy watch tasks concurrently |

---
## 17. Next Potential Enhancements
- Add a `dev:ssr:watch` script using Node + nodemon to auto-restart on server changes.
- Implement route-level lazy loading for events detail/calendar if bundle grows.
- Introduce bundle analyzer in CI pipeline.
- Add prebuild lint step (`ng lint` if configured).

---
## 18. Quick Command Reference
```
# Install
npm ci

# Dev serve (browser)
npm start

# Production + SSR build
npm run build

# Run SSR server
node dist/msse692-frontend/server/server.mjs

# Tests
npm test
npm run test:ci

# Bundle analysis
ng build --configuration production --stats-json
npx source-map-explorer dist/msse692-frontend/browser/*.js
```

---
## 19. FAQ
**Q: Why is there a server folder after just `ng build`?**  
Angular 19 application builder outputs both browser and server when `server` entry is configured.

**Q: Do I need `ng run <project>:server`?**  
No. Legacy workflow replaced by unified build.

**Q: A component style exceeded 4kB—should I worry?**  
Only if it grows rapidly. Warning is a nudge; consider refactoring or raising the threshold.

**Q: How do I deploy SSR?**  
Build, then run `server.mjs` in Node environment; optionally reverse proxy (NGINX) to it.

---
## 20. Contact / Maintenance
Keep this file updated when:
- Angular major version upgrades
- New build scripts added
- SSR configuration changes (e.g., custom Express route logic)

---
End of build guide.
