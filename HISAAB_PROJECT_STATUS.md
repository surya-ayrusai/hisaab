# HISAAB — Project Status

Last updated: 16 November 2026 · Demo date: 20 November 2026

## Current phase

Phases 2, 3 and 4a are built, tested and **deployed**. Live at https://hisaab-ayrus3.vercel.app. Phase 5 was built and then removed by owner decision D23. Phase 4b and Phase 6 hardening remain.

**Known departure from the master prompt:** V3 section 6 requires an Assistant & Ticketing module and section 13 requires tracking its contract. The owner removed it on 16 Nov after being shown that six of the twelve tester checks would fail. Recorded in `docs/11-ai-tester-acceptance-checklist.md`, section B.

## Evidence

| Check | Result |
| --- | --- |
| Unit tests (`npm test`) | 41 of 41 passed |
| Browser tests (`npm run test:e2e`, Chrome at 375×812) | 12 of 12 passed |
| Type check, lint, production build | Passed |
| Deployed page checks | All six ledger checks verified on the live URL |

Detail, with what was checked where, is in `docs/11-ai-tester-acceptance-checklist.md`.

## Built

**Ledger** — total to collect, customer rows with balances, search and sort, add customer, credit and payment entry, payment screenshot, customer detail with history, cancel an entry, undo after saving, paste import with summary, rejected-row reasons and undo, `?today=`, storage notice, sample shop on first run.

**Branding** — HISAAB in the header; an ayrus AI band closes the page.

**Removed** — the Assistant & Ticketing module (decision D23). A browser test asserts none of its selectors remains.

## Not built yet

- Phase 4b: settings (shop name, reminder tone), backup and restore, replace-import with preview, dues by age, customer statement, opening balance.
- Phase 6: accessibility pass, tablet and desktop review, performance with many customers, a try on a real phone.
- No assistant module, by decision D23.
- Documents 10, 12 and 14 (deployment guide, known limitations, demo guide).

## Open points

1. The deployed demo **in the owner's browser** holds verification entries from today's checks: a ₹100 payment against Ravi Kumar and a customer "Deploy Check". Data is per browser, so every other visitor and the tester still sees the pristine sample. Say the word and I will reset that browser's copy.
2. `#shot-input` appears only after a Payment button is pressed.
3. No reminder link for a customer with nothing due (owner decision D5).
4. Documents 04, 05 and 07 still carry outdated "decisions required" sections at their ends.

## Plan to 20 November

| Day | Target |
| --- | --- |
| 17 Nov | Phase 4b: settings, backup and restore, dues by age, statement |
| 18 Nov | Accessibility, tablet and desktop review, real-phone check |
| 19 Nov | Regression pass, documents 10, 12 and 14 |
| 20 Nov | Final run of every check on the live URL |

## Single most useful next action

Owner opens https://hisaab-ayrus3.vercel.app on a phone and says what feels wrong; meanwhile Phase 4b starts.
