# Msse692Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Feature Guides

-   Events Calendar (FullCalendar + SSR-safe): [docs/FEATURE-Events-Calendar.md](./docs/FEATURE-Events-Calendar.md)

## Profile & Onboarding Flow

The application separates authentication (Firebase) from domain profile data stored in the backend.

### Steps
1. User signs up with email/password (Firebase). Display name is applied to the Firebase user.
2. After signup we force a token refresh and navigate to `/profile`.
3. The Profile page calls `GET /api/profile/me`:
	- 200: Pre-fills the form.
	- 404: Shows an empty profile form (user has not created a domain profile yet).
4. User saves a display name via `POST /api/profile` which creates/updates their profile and marks it completed.
5. Certain privileged actions (event creation) require both appropriate roles AND a completed profile.

### Backend Contract (current)
`GET /api/profile/me` → 200 with ProfileResponse or 404 if no profile.
`POST /api/profile`  → creates or updates (idempotent). Body: `{ displayName: string }`.

### Guarding Logic
`profile-completed.guard.ts` redirects to `/profile` if profile is missing or incomplete. The event CRUD UI also checks completion before rendering.

### Future Enhancements
- Extend profile fields (venueName, about) once backend supports them.
- Show email verification (currently `verified=false`).
- Add toast/snackbar UX patterns for consistency.

