# Frontend Testing Guide

This project supports both Jest (unit tests in Node/jsdom) and Karma/Jasmine (browser-based) during the transition. Jest is the recommended default.

## Jest (recommended)

- Install deps
```
npm install
```

- Run once (console output)
```
npm run test:jest
```

- Watch mode (reruns on file change)
```
npm run test:jest:watch
```

- CI-style (single run, coverage)
```
npm run test:jest:ci
```

### Logs and Reports

- Human-readable log (cmd.exe)
```
REM Fresh file
npm run test:jest:ci > logs\jest-run.log 2>&1

REM Append
npm run test:jest:ci >> logs\jest-run.log 2>&1
```

- Human-readable log (PowerShell)
```
npm run test:jest:ci 2>&1 | Tee-Object -FilePath .\logs\jest-run.log
```

- JUnit XML (machine-readable for CI)
```
npm run test:jest:junit
```
Outputs: `logs/junit.xml`

- JSON summary
```
npm run test:jest:json
```
Outputs: `logs/jest-report.json`

Notes:
- Create `logs/` once if missing: `mkdir logs`.
- JUnit reporter is always enabled via `jest.config.js`, writing to `logs/junit.xml`.

## Karma/Jasmine (legacy, optional)

- Default run (uses current Karma config)
```
npm run test
```

- Headless CI run with Edge (if configured)
```
npm run test:ci
```

## Troubleshooting

- Jest fails to start or complains about environment:
  - Ensure `jest-environment-jsdom` is installed and listed in `devDependencies`.
  - Verify `setup-jest.ts` exists and is referenced by `jest.config.js`.

- Style or asset import errors in Jest:
  - CSS/SCSS are mapped via `identity-obj-proxy`.
  - Files (png/svg/etc.) are stubbed via `__mocks__/fileMock.js`.

- Angular TestBed issues:
  - Most Angular specs work unchanged. If timers are involved, prefer Angular’s `fakeAsync/tick` or use `jest.useFakeTimers()` carefully.

## CI suggestions

- Use Jest for unit tests in pipelines:
```
npm ci
npm run test:jest:ci
```
- Publish `logs/junit.xml` as a test report artifact and `coverage-jest/` for coverage.

