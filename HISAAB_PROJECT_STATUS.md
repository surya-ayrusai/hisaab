# HISAAB — Project Status

Last updated: 16 November 2026 · Demo date: 20 November 2026

## Current phase

Phases 2, 3 and 4a are built and tested **locally**. Code is on GitHub (`surya-ayrusai/hisaab`, branch `main`). **Nothing is deployed.** Phase 5 (ayrus AI Assistant) and Phase 4b are not started.

## Evidence (16 Nov 2026, local production build, Node 22.23, Next.js 16.4.6, Chrome at 375×812)

| Check | Result |
| --- | --- |
| Unit tests (`npm test`) | 40 of 40 passed |
| Browser tests (`npm run test:e2e`) | 10 of 10 passed |
| Type check, lint, production build | Passed |

Browser tests cover: TC-L1 total, TC-L2 customer rows and balances against `sample-expected.json`, TC-L3 reminder link format and absence when nothing is due, TC-L4 paste-and-press import (same file twice, another shop replacing sample data, undo, bad input), TC-L5 screenshot saved, shown, kept after reload, refused for bad files, TC-L6 `?today=` valid and invalid, add customer, undo, advance, no horizontal overflow at 375 px.

## Built

- Home page: total, search, sort, customer rows with Udhaar / Payment / WhatsApp, recent entries, import box, storage notice, ayrus AI band.
- Add customer, entry form (payment form with screenshot), customer detail with history, cancel entry, undo after save.
- Sample shop loaded on first run and replaced by the first import.

## Not built yet

- ayrus AI Assistant (chat, tickets, staff reply, clinic info). No assistant selector exists on the page.
- Settings (shop name, reminder language and tone), backup and restore, explicit replace import with preview, dues by age, statement, opening balance.
- Tablet and desktop layouts not reviewed; accessibility pass not done; not tried on a real phone.
- Vercel project not created.

## Open points

1. Vercel: the Vercel connector available here can read projects but not create one. Creation needs the owner (import the GitHub repo in Vercel) or the owner signing in to Vercel in the built-in browser so the assistant can do it.
2. `#shot-input` is rendered only after a customer's Payment button is pressed. If the tester expects it on the first screen, this must change.
3. Documents 04, 05 and 07 still carry outdated "decisions required" sections at their ends.

## Plan to 20 November

| Day | Target |
| --- | --- |
| 17 Nov | ayrus AI Assistant (Phase 5), TC-A1 to TC-A6 |
| 18 Nov | Settings, backup and restore, dues by age, statement |
| 19 Nov | Hardening at 375 px, tablet, desktop; real-phone check; Vercel deploy after approval |
| 20 Nov | All checks on the live URL; demo guide |

## Single most useful next action

Owner creates the Vercel project from the GitHub repo (or signs in to Vercel in the built-in browser), and approves starting the ayrus AI Assistant.
