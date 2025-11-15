# Frontend Testing Guide

We use Karma + Jasmine for unit tests.

## Running Tests

Standard run (watch mode):
```
npm test
```

Headless CI run with coverage (Firefox headless):
```
npm run test:ci
```

Edge headless (fallback if needed):
```
npm run test:edge
```

Firefox headless explicitly:
```
npm run test:firefox
```

## Coverage
Generated when using `npm run test:ci` (see Karma config). Use those reports for assessing unit test coverage.

## Troubleshooting

- Browser launch issues: ensure Firefox or Edge is installed; update `karma.conf.js` if necessary.
- Missing dependencies: run `npm install` after pulling changes.
- Flaky async tests: prefer Angular `fakeAsync` and `tick()` utilities.

## Secret Handling Reminder

Do NOT commit environment secrets. Store Firebase/API keys in a separate `.env` or use Angular build-time file replacement with non-sensitive placeholders. If a secret was exposed:
1. Rotate the secret immediately in the provider console.
2. Remove the key from committed files.
3. Purge from Git history (see root README security section if added) using `git filter-repo` or BFG.

## Future

When/if we reintroduce alternative runners, they will be documented here. For now, keep tests in Jasmine/Karma only.

