# HISAAB — Project Status

Last updated: 16 November 2026 · Demo date: 20 November 2026

## Current phase

Phase 2 — Foundation: **built and tested locally; awaiting owner review.** Phase 3 (core ledger screens) not started. Nothing is deployed.

## Phase 2 evidence (16 Nov 2026, local, Node 22.23, Next.js 16.4.6)

| Check | Result |
| --- | --- |
| Unit tests (`npm test`, Vitest 5.1.0) | 40 of 40 passed |
| Type check (`npm run typecheck`) | Passed |
| Lint (`npm run lint`) | Passed |
| Production build (`npm run build`) | Passed; one static page |

What the tests cover: paise parsing and formatting; phone normalisation (strict 6–9 rule); `?today=` resolution; balance, advance and cancelled-entry rules; the supplied sample reproducing all eight balances, the 11,820 total, the top customer and the dues-by-age bands; WhatsApp link format and Hindi/Telugu encoding; import planning (duplicates, rejections, unknown versions, untrusted fields); IndexedDB repository (add, duplicate block, cancel, reopen, import, undo, sample data replaced by first import).

## Built in Phase 2

- Next.js + React + TypeScript project with Tailwind, system fonts, no third-party calls.
- `src/ledger/domain`: money, phone, dates, balance, ageing, reminder, importPlan.
- `src/ledger/data`: Dexie database, ledger repository, bundled sample shop.
- Placeholder home page only. **No tester selector exists in the page yet**; all tester checks remain "Not started".

## Not done / known gaps

- Code is committed locally only. Pushing to `surya-ayrusai/hisaab` is refused: the Claude GitHub App has no access to that account yet.
- Vercel project not created (needs the pushed repository first).
- Browser (Playwright) tests not set up yet; planned at the start of Phase 3.
- Assistant database and module not started (Phase 5).
- Document 11 checklist statuses unchanged: all "Not started".

## Blockers

1. GitHub push access for Claude on `surya-ayrusai/hisaab`.

## Plan to 20 November (sizes, not promises)

| Day | Target |
| --- | --- |
| 16–17 Nov | Phase 3 core ledger screens; TC-L1, TC-L2 |
| 17–18 Nov | Phase 4a: import, reminder link, screenshot, date; TC-L3 to TC-L6 |
| 18–19 Nov | Phase 5 ayrus AI Assistant; TC-A1 to TC-A6 |
| 19 Nov | Phase 4b as time allows (dues by age, statement, backup); hardening at 375 px |
| 19–20 Nov | Vercel deploy after approval; checks on the live URL |

If time runs short, Phase 4b items are cut first; they are not in the tester contract.

## Single most useful next action

Owner grants the Claude GitHub App access to the repository, then approves Phase 3.
