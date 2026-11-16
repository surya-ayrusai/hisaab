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
| D21 | The assistant keeps Hindi and Telugu replies (owner, 16 Nov 2026): its interface is English, but it answers in the language the visitor writes in, as V3 section 6.1 requires. |
| D22 | Vercel project `hisaab` under team ayrus3; production at https://hisaab-ayrus3.vercel.app, deploying from `main`. No environment variables, so there is no key to remove. |

## Standing instructions

- HISAAB_MASTER_META_PROMPT_V3 is the master instruction.
- Tester contracts in V3 §5 and §6.2 must not be changed.
- Assistant module stays architecturally separate from the ledger.
- Owner prefers production-standard choices over demo shortcuts when the two differ.
- No deployment or data-affecting action without owner approval.

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
