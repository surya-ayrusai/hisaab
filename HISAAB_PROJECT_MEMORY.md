# HISAAB — Project Memory

Concise durable decisions and learnings. Updated 16 November 2026.

## Approved decisions (owner, 16 Nov 2026)

| # | Decision |
| --- | --- |
| D1 | One-press import when it only adds data, with Undo. Preview and explicit confirmation for replace. |
| D2 | The app ships with the supplied sample data loaded for the demo. |
| D3 | No AI provider in the first release; the assistant is deterministic. |
| D4 | `#staff-reply` and `#staff-send` inside every ticket; repeated IDs accepted for MVP. |
| D5 | WhatsApp reminder link only for customers with a due. |
| D6 | Ledger and assistant tester contracts are checked on the same URL. |
| D7 | Hosting on Vercel. |
| D8 | v1.0 context doc replaced by the V3-aligned context. |
| D9 | Proceed to Phase 1. |
| D10 | Sample data is demo data; the first import onto untouched sample data replaces it, with Undo. No reminder link without a due. |
| D11 | Corrections by cancelling an entry (stays visible, stops counting). No deletion. |
| D12 | Backup JSON excludes screenshot images. |
| D13 | Phone validation follows production standards: 10 digits starting 6–9, in forms and imports. No lenient mode for test data. Reason: avoid rework later. |
| D14 | Imports keep valid rows and list rejected rows. |
| D15 | Framework must be the advanced, robust, industry-standard choice → Next.js (App Router) + React + TypeScript. |
| D16 | No "demo" band. Assistant section is branded "ayrus AI Assistant"; an ayrus AI company band closes the page. |
| D17 | No app lock, backup encryption or per-customer delete in this release. |
| D18 | Owner created Git repo `surya-ayrusai/hisaab`; assistant may create the Vercel project. |
| D19 | Demo date 20 November 2026. |
| D20 | English only in the app. The name stays HISAAB (client requirement); all other terms, options and names are in English. Applied 16 Nov: "Credit" and "ledger" replaced the earlier wording and the Hindi and Telugu reminder templates were removed. Scoped to the ledger; see D21. Supersedes the multilingual reminder item in V3 section 3.2 C. |
| D21 | ~~The assistant keeps Hindi and Telugu replies~~ — superseded by D23. The application is now English only throughout. |
| D23 | **The Assistant & Ticketing module is removed entirely** (16 Nov 2026). The owner first said its clinic wording came from an old prompt; it comes from V3 section 6, which permits clinic terminology and mandates the module. The owner was shown that removal fails six of the twelve tester checks and chose removal anyway. D21 is superseded. The working module is in git history at commit `022315a`. **Reaffirmed 16 Nov** after the build plan cleared early: with three spare days the module was a revert away, and the owner was offered a third option — restoring it on a separate `/assistant` route so the ledger home page stayed untouched — and chose to stand by removal. The decision is closed; do not raise it again. |
| D26 | **Sync tables live in `hisaab_cust_schema`, not `public`** (17 Nov 2026). The schema is not exposed to the REST API; the three `hisaab_*` functions stay in `public`, which is exposed, and are security definer. So the browser can call them but cannot touch a table directly, and no change is needed under Settings → API → Exposed schemas. |
| D25 | **D5 amended 17 Nov 2026: every customer with a usable mobile number gets a WhatsApp link.** What changes with the balance is the message — a due is asked for, a settled account is thanked, and a customer in credit is told what stands in their favour. D5's intent was never to hide the button, only to avoid demanding Rs 0. This closes the single gap against the client's nine acceptance criteria, which ask for a reminder button per customer. |
| D24 | **Visual identity set 16 Nov 2026**: deep emerald `#0b4f43` brand with a muted gold `#b98a2e` accent, a card system with hairline borders and soft elevation, tabular numerals for all money, and inline SVG icons rather than an icon library. Red is only money owed and green only money received; the brand colour never states an amount. Tokens live in `src/app/globals.css` and are documented in `docs/07`. |
| D22 | Vercel project `hisaab` under team ayrus3; production at https://hisaab-ayrus3.vercel.app, deploying from `main`. No environment variables, so there is no key to remove. |

## Standing instructions

- HISAAB_MASTER_META_PROMPT_V3 is the master instruction.
- Tester contracts in V3 §5 and §6.2 must not be changed.
- Assistant module stays architecturally separate from the ledger.
- Owner prefers production-standard choices over demo shortcuts when the two differ.
- No deployment or data-affecting action without owner approval.
- D23 is settled. The assistant module is not coming back, and the halved tester score is an accepted cost, not an open problem.

## Learnings

- Tester import format is unversioned: `shop`, `customers[{name, phone}]`, `entries[{phone, type, amount in rupees, date, note}]`; phone is the join key.
- Sample: 8 customers, 38 entries, total 11,820, highest 9000000102. Dues by age at 2026-11-15: 16–30 days 2,410; 31–60 days 9,180; over 60 days 230.
- The tester pastes and presses `#import-go` once; a second mandatory click would fail.
- Next.js 16 differs from older versions; its bundled docs in `node_modules/next/dist/docs/` must be read before writing framework code.
- Vitest 5.1 needs `@types/node` 22 or newer.
- `next/font/google` was removed in favour of system fonts: no third-party requests, and Hindi and Telugu fall back to device fonts.
- Zod was dropped; import validation is hand-written to give per-row reasons.
- The GitHub App had to be installed on the `surya-ayrusai` account before pushes worked; the Vercel connector separately needed `authorize_team_access` for team ayrus3, which reconnecting alone did not grant.
- Project instructions cannot be edited by the assistant; only project docs can.
- Next.js 16 refuses `Date.now()` during prerender in a client component; read the clock in an effect instead.
- This workspace's proxy blocks `vercel.app`, so deployed checks run through the owner's built-in browser, not from here.
- Indic text renders correctly on the owner's machine; the test container lacks a Telugu font, which only affects screenshots taken here.
- The owner may believe a requirement comes from a superseded prompt when it is in V3; quote the section before acting on a removal.
- A browser that loaded the 16 Nov build may still hold an unused `hisaab-demo` database. It is left alone rather than deleted without asking.
- A background `next start` survives `pkill -f "next start"` because the running process is `next-server`; a stale one on port 3100 makes Playwright reuse an old build and every browser test fails at once. Kill with `pkill -f next` and rebuild.
- Backups carry customers and entries but not payment screenshots; the screenshots are blobs in IndexedDB and stay on the device.
- The ageing bands always sum to `#total-outstanding`, which makes a quick cross-check possible on any deployed build.
- Playwright's `getByRole` computes an accessible name for every element in the page. On a 2,000-row ledger that walk alone takes about seven seconds and makes the app look broken when it is not. Use CSS selectors in performance scripts.
- Deepening the page background pushed `--color-muted` under 4.5:1 against it. Any change to `--color-surface` needs the muted and gold-ink tones rechecked against both white and the field.
- The owner's Supabase dashboard is not signed in inside the built-in browser, so schema changes have to be pasted by him into the SQL editor.
- PL/pgSQL plans a whole boolean expression as one query, so `if to_regclass('x') is not null and not exists (select 1 from x)` fails to parse where `x` has never existed. Guard with an early return and use EXECUTE for anything referring to a table that may not be there. The Supabase SQL editor runs a file in one transaction, so one such error rolls the whole schema back.
- Sync round-trip verified live on 17 Nov: shop `4fb06d9d` created through the UI, a distinctive customer added, the browser database deleted outright, and the full ledger came back from the `?shop=` link. The plain URL made zero external requests in the same browser.
- Any destructive action is no longer local once sync is on. Erase and restore both push up; only the device that acted has an Undo.
