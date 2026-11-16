# 05 — System Architecture and Decision Record

Project: Hisaab · Phase 1 · 16 November 2026 · Status: **draft for owner approval**

## 1. Summary

A static single-page web app on Vercel. All data stays in the browser (IndexedDB). No server, no accounts, no AI provider. Two modules, ledger and assistant demo, share only the page shell and visual components.

## 2. Starting point

No repository or code exists. Constraints: one URL for both tester contracts (D6), Vercel (D7), no AI provider (D3), browser-local data, 375 px first.

## 3. Decisions

### ADR-1 Storage: browser IndexedDB, no backend

| Option | Cost | Complexity | Backup and sync | Privacy | Verdict |
| --- | --- | --- | --- | --- | --- |
| IndexedDB in the browser | None | Low | Manual export only; one device | Data never leaves the phone | **Chosen** |
| Hosted database with login | Recurring; not estimated | High: auth, tenancy, sync conflicts | Real backup and multi-device | Customer data held by us | Later; needs separate approval |

Consequence: clearing browser data or losing the phone loses the ledger unless a backup file exists. The app must say so.

### ADR-2 Application type: client-rendered single page

| Option | For | Against | Verdict |
| --- | --- | --- | --- |
| Next.js (App Router) + React + TypeScript | Industry standard on Vercel; server functions, auth and API routes available when cloud sync or an AI key is added, so no re-platforming later | Server rendering needs care because data exists only in the browser; ledger screens are client components | **Chosen by owner decision D15 (16 Nov 2026)**. Installed: Next.js 16.4.6, React 19.3 |
| Vite + React + TypeScript | Smaller and simpler for a browser-only app | Would need re-platforming when a backend arrives | Earlier recommendation, superseded |
| Plain HTML and TypeScript, no framework | Fewest dependencies | Hand-written state handling for lists, forms and dialogs; slower to change | Viable fallback |

### ADR-3 Supporting libraries (to be pinned and licence-checked at setup)

| Need | Choice | Why |
| --- | --- | --- |
| IndexedDB access | Dexie | Transactions, indexes, blob storage, less error-prone than the raw API |
| Validation | Hand-written validators in the domain layer | Row-by-row reasons for import rejections; one fewer dependency. (Zod was proposed, then dropped during Phase 2.) |
| Styling | Tailwind CSS 4 (ships with the Next.js scaffold) | No separate component library |
| Unit tests | Vitest | Runs the calculation and import logic fast |
| Browser tests | Playwright | Drives the real page at 375 px; can assert the tester selectors |
| State | Live database queries plus component state | No second copy of data to drift |
| PDF | None; print stylesheet | Hindi and Telugu render correctly; no font embedding |

No UI component library, charting library, router or analytics.

### ADR-4 One page, no routes

Home is one scrolling page: ledger first, then import, then an ayrus AI company band (D16). The assistant section was removed by decision D23. Customer detail, forms and settings open as sheets over it. Reason: every tester selector stays in the rendered page at the single URL. `?q=` scrolls to the assistant and asks; `?today=` sets the effective date.

### ADR-5 Corrections by cancel, not delete

Entries carry a status. Cancelled entries remain stored and visible and are excluded by the calculation module.

### ADR-6 One database (revised 16 Nov 2026)

The application uses a single IndexedDB database, `hisaab-ledger`. The second database existed only for the assistant module, which was removed by owner decision D23. A browser that used the earlier build may still hold an orphaned `hisaab-demo` database; it is unused and harmless, and is left alone rather than deleted without asking.

## 4. Structure

```
src/
  app/            page shell, navigation, effective-date provider
  ui/             shared buttons, sheets, inputs, toasts
  ledger/
    domain/       money, balance, ageing, phone, reminder text, import parse and plan   (pure, unit-tested)
    data/         repositories over Dexie: customers, entries, shots, settings
    views/        home, customer detail, entry form, import, settings, statement
  demo/
    domain/       language detect, intent match, booking parse, ticket rules   (pure, unit-tested)
    data/         knowledge, quick replies, tickets, messages
    views/        chat, ticket queue, knowledge editor
  platform/       file reading, image downscale, clipboard, print
tests/
  unit/  e2e/
```

Rules: `views` never calculate money; `domain` never touches storage; `ledger` and `demo` never import from each other.

## 5. Key flows

**Save entry.** Form validates → repository writes entry (and image blob) in one transaction → live queries refresh rows and total → Undo toast.

**Import.** Parse JSON → validate whole payload against schema → build a plan (create, match, skip, reject) without writing → if additive, snapshot current data, apply in one transaction, show summary and Undo → if replace, show preview and wait for confirmation.

**Effective date.** Read once at start from the URL; exposed through one provider; every default date, label and ageing call takes it as input.

**Ask on load.** A module-level flag records that `?q=` has been handled, so a re-render cannot ask twice.

## 6. Money and dates

- Paise as integers. Rupee input parsed from text, at most two decimals, never through floating-point multiplication.
- Display: Indian grouping for visible amounts; `[data-balance]` holds the plain number.
- Entry date `YYYY-MM-DD` in the shop's local calendar; creation time in UTC ISO format.

## 7. Deployment (not started; needs approval)

Static build to Vercel from a Git repository in your account. No environment variables or secrets in this release. Preview deployments for testing; production only after your approval.

## 8. Limits stated honestly

One browser, one device, no sync, no automatic backup, no access control beyond the phone's own lock. Not a production accounting system.

## 9. Decisions required

1. Approve ADR-1 to ADR-6.
2. Vite + React + TypeScript, or the no-framework fallback.
3. Who creates the Git repository and Vercel project: you, or me through your accounts with your approval at each step.
