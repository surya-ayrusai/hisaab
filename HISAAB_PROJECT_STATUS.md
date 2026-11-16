# HISAAB — Project Status

Last updated: 16 November 2026 · Demo date: 20 November 2026

## Current phase

Phases 2, 3, 4a, 4b and **6** are built, tested and **deployed**. Live at https://hisaab-ayrus3.vercel.app. Phase 5 was built and then removed by owner decision D23. Every planned document now exists. The owner checked it on his own phone on 16 Nov and approved how it looks and feels. Nothing on the build plan is outstanding.

**Known departure from the master prompt:** V3 section 6 requires an Assistant & Ticketing module and section 13 requires tracking its contract. The owner removed it on 16 Nov after being shown that six of the twelve tester checks would fail. Recorded in `docs/11-ai-tester-acceptance-checklist.md`, section B.

## Evidence

| Check | Result |
| --- | --- |
| Unit tests (`npm test`) | 47 of 47 passed |
| Browser tests (`npm run test:e2e`, Chrome at 375×812) | 21 of 21 passed |
| Accessibility (axe-core, WCAG 2.1 AA, five screens) | 0 violations |
| Performance (`node scripts/perf.mjs`, 2,000 customers / 50,000 entries) | 6 of 6 within budget |
| Horizontal overflow at 320, 768 and 1280 px | None |
| Type check, lint, production build | Passed |
| Deployed page checks | All six ledger checks verified on the live URL |

Detail, with what was checked where, is in `docs/11-ai-tester-acceptance-checklist.md`.

## Built

**Ledger** — total to collect, customer rows with balances, search and sort, add customer (with an optional opening balance carried over from the notebook), credit and payment entry, payment screenshot, customer detail with history, cancel an entry, undo after saving, paste import with summary, rejected-row reasons and undo, `?today=`, storage notice, sample shop on first run.

**Settings and data** — shop name, reminder tone with a live preview of the WhatsApp message, download backup (versioned JSON), restore from backup behind a preview and an explicit confirmation, erase all data. Restore and erase are both undoable.

**Dues by age** — five ageing bands with oldest-credit-first allocation, a share bar per band, and a "chase these first" list ordered by how long the money has been waiting.

**Customer statement** — date range, opening and closing balance, running balance per line, and print or save as PDF through a dedicated print stylesheet.

**Design** — deep emerald brand gradient with a muted gold accent, a card system with hairline borders and soft elevation, avatar initials on customer rows, and inline SVG icons (no icon library and no remote assets, so the page stays fast and works offline).

**Typography** — IBM Plex Sans throughout and IBM Plex Serif for the HISAAB wordmark, both served from this origin. Plex was chosen over Plus Jakarta Sans, Source Sans 3 and Inter on the test that matters for a ledger: Plus Jakarta's `1` reads as a lowercase `l` at display size, so `Rs 11,820` looked like `Rs ll,820`. Plex draws an unmistakable 1 and puts every digit on the same advance width, so columns of money line up. The serif is pinned to one weight and subset to capitals — 3 KB for the one word it draws. 48 KB for both files, no third-party request, no layout shift.

**Accessibility** — zero axe violations against WCAG 2.1 AA on all five screens; contrast failures were measured and fixed rather than eyeballed. Sheets move focus inside on open, keep Tab within the panel, and return focus to whatever opened them.

**Branding** — HISAAB in the header; an ayrus AI band closes the page.

**Removed** — the Assistant & Ticketing module (decision D23). A browser test asserts none of its selectors remains.

## Not built yet

- No assistant module, by decision D23. This is a decision, not unfinished work, but it is the one thing that still costs half the tester score.

## Open points

1. The deployed demo **in the owner's browser** holds verification entries from today's checks: a ₹100 payment against Ravi Kumar and a customer "Deploy Check". Data is per browser, so every other visitor and the tester still sees the pristine sample. Settings → **Erase all data**, then reload, restores the clean sample shop.
2. `#shot-input` appears only after a Payment button is pressed.
3. No reminder link for a customer with nothing due (owner decision D5).
4. Documents 04 and 05 still carry outdated "decisions required" sections at their ends. Document 07 has been rewritten.
5. Backups hold customers and entries but not payment screenshots, which stay in the browser only. Stated in the Settings sheet.

## Plan to 20 November

| Day | Target |
| --- | --- |
| 17–19 Nov | Spare. The build plan is clear; the only open question is D23 (see below) |
| 20 Nov | Clear the demo browser, final run of every check on the live URL, then the demo |

## Single most useful next action

Decide whether to stand by D23. With three spare days and the module one `git revert` away, this is now a choice rather than a constraint. `docs/14` is the script for the demo itself.
