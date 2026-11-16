# 10 — Deployment and Operations

Project: HISAAB · 16 November 2026 · Live at https://hisaab-ayrus3.vercel.app

## 1. What is deployed where

| Thing | Value |
| --- | --- |
| Repository | `surya-ayrusai/hisaab`, branch `main` |
| Host | Vercel, project `hisaab`, team `ayrus3` |
| Production URL | https://hisaab-ayrus3.vercel.app |
| Build | `next build` (Next.js 16, App Router, Turbopack) |
| Runtime | Static page plus client JavaScript; no server code of our own |
| Environment variables | **None.** There is no key to rotate and none to leak |
| Data | IndexedDB in the visitor's browser. Nothing is sent anywhere |

Every push to `main` deploys to production automatically. There is no staging
environment, because there is no server state to stage.

## 2. Deploying

```bash
npm ci
npx tsc --noEmit         # types
npm run lint             # lint
npx vitest run           # 47 unit tests
npm run build            # production build
npx playwright test      # 21 browser tests at 375x812
git push origin main     # Vercel builds and promotes
```

Do not push on a red suite. The browser tests run against a production build of
the same commit, so a pass here is a fair prediction of the deployed page.

## 3. Verifying a deployment

A deploy is not done when Vercel says READY. Open the live URL and check the six
contract points, which is what `docs/11` tracks:

1. `#total-outstanding` shows the expected figure.
2. One `[data-customer]` row per customer, each with one `[data-balance]`.
3. `a[data-remind]` points at `https://wa.me/91<phone>?text=…` with no doubled 91.
4. `#import-box` plus one press of `#import-go` imports a pasted file.
5. A payment with an image produces an `img[data-shot]` that loads.
6. `?today=2026-11-15` shows the banner and dates a new entry 15 Nov 2026.

A quick cross-check that catches most arithmetic faults in one glance: open
**Dues by age** and confirm the five bands sum exactly to `#total-outstanding`.

## 4. Rolling back

Vercel keeps every previous deployment. Promote the last good one from the
project's Deployments tab, or `git revert` the bad commit and push. A rollback
is safe: no migration runs and no customer data lives on the server, so an older
build reads the same browser database.

**The one thing to watch** is the database schema in `src/ledger/data/db.ts`. A
visitor's browser keeps whatever version it last opened. Rolling the code back
past a schema change would leave a newer database in front of older code, which
Dexie refuses to open. Treat a schema version bump as a one-way door and say so
in the commit message.

## 5. Performance expectations

Measured on a production build with `node scripts/perf.mjs`:

| Interaction | 500 customers / 10,000 entries | 2,000 customers / 50,000 entries |
| --- | --- | --- |
| Reload to first customer row | 565 ms | 1,737 ms |
| Search keystroke to filtered list | 67 ms | 194 ms |
| Re-sort by highest dues | 138 ms | 552 ms |
| Open customer detail | 148 ms | 239 ms |
| Dues by age across the whole book | 103 ms | 199 ms |

A kirana shop is realistically 100 to 500 customers, so there is a wide margin.
Re-run the script after any change to the list, the import path or the ageing
maths. Use CSS selectors in that script and never `getByRole`: resolving a role
selector makes Playwright compute an accessible name for every element on the
page, which on a 2,000-row ledger costs seven seconds and makes the application
look broken when it is not.

## 6. Operating notes

- **There is no backend to monitor.** No uptime alarm, no database to back up,
  no bill that scales with usage. Vercel's free tier serves a static page.
- **Support questions are local.** "My data is gone" almost always means the
  browser was cleared, a different browser was used, or private browsing. The
  answer is the backup file, which is why Settings offers one.
- **Each shop is one browser.** Two devices do not sync. This is a product
  limitation, not an incident; `docs/12` records it as the first thing to change
  if the product goes further.
