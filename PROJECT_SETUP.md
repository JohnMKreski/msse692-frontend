# Angular Project Setup Documentation

This document outlines the setup and configuration steps for an Angular project using the standalone API, Prettier formatting, routing, and optional SSR and backend integration. Update this file as the project evolves.

## Angular Standalone API

- Uses Angular's standalone API (no `AppModule` required).
- Routing is configured in `app.routes.ts` and provided via `provideRouter` in `app.config.ts`.
- Supports both browser and server-side rendering (SSR) with `main.ts` (browser) and `main.server.ts` (SSR).

## Code Formatting: Prettier

- `.prettierrc` file defines code formatting rules.
- `.vscode/settings.json` enables auto-format on save and sets Prettier as the default formatter.
- Recommended VS Code extensions: "Prettier - Code formatter" and "Prettier ESLint".

## Routing

- Routing is set up using the standalone approach.
- Define routes in `app.routes.ts`.
- The root component imports `RouterOutlet` to display routed views.

## Server-Side Rendering (SSR)

- `main.server.ts` is configured for SSR, exporting a function for server bootstrapping.
- `provideServerRendering()` is included in `app.config.server.ts`.
- The SSR bootstrap uses `bootstrapApplication(AppComponent, config, context as BootstrapContext)` to support static prerendering.
- For local development, use `main.ts` (browser entry point).
- Use `npm run dev:ssr` to build and serve the app on `http://localhost:4000`.

## Organizing Angular Material Imports

To efficiently use Angular Material components across your app:

- Create a `material.ts` file (e.g., in a `shared` folder) that imports and exports all required Material modules as an array:

```ts
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
// ...other Material modules

export const materialImports = [
  MatButtonModule,
  MatToolbarModule,
  // ...other modules
];
```

- In each standalone component that needs Material components, import `materialImports` in the `imports` array:

```ts
import { materialImports } from '../shared/material';

@Component({
  // ...other config
  imports: [materialImports /* other imports */],
})
export class MyComponent {}
```

This approach keeps your Material imports organized and avoids repetition across components.

## Recommended Dependencies

- Core Angular packages: `@angular/core`, `@angular/common`, `@angular/forms`, `@angular/common/http`
- RxJS for reactive programming
- Optional: Angular Material, ngx-translate, JWT, NgRx, etc.

## Enabling HTTP Services

To use Angular's HTTP client in a standalone app, add `provideHttpClient()` to the providers array in your `app.config.ts`:

```ts
import { provideHttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...other providers
    provideHttpClient(),
  ],
};
```

This enables HTTP services throughout your Angular app without needing an NgModule.

## Backend Integration (Java Spring Example)

- Use Angular's `HttpClientModule` (enabled via `provideHttpClient()`) to communicate with backend APIs.
- Ensure CORS is enabled on the backend for local development.

## Prerendering Support (Static Site Generation)

- Pre-rendering is enabled by default (in `angular.json` under `prerender`).
- Use it to generate static HTML pages for routes like `/`, `/about`, etc.
- Run `npm run build:ssr` to generate output under `dist/<project>/browser`.
- SSR fallback is available for routes not pre-rendered.

## Best Practices

- Guard browser-only code (e.g., `window`, `document`) to avoid SSR errors.
- Keep all Angular packages at the same major version to avoid dependency conflicts.
- Use Prettier and/or ESLint for consistent code style.

---

This documentation is intended as a living reference for anyone setting up or maintaining this Angular project. Update as new tools, patterns, or dependencies are added.

---

## Reference: `main.server.ts`

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

import type { BootstrapContext } from '@angular/platform-browser';

export default (context: unknown) =>
  bootstrapApplication(AppComponent, config, context as BootstrapContext);
```
