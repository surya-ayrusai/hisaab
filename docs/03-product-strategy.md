# 03 — Product Strategy, Opportunity Analysis and Recommended MVP

Project: Hisaab · Phase 0 · 15 November 2026 · Status: draft for owner review. Nothing here is approved until the owner says so.

## 1. Executive summary

Build the smallest correct khata: one screen that shows what the shop is owed, one row per customer, entry in a few taps, a WhatsApp reminder link, paste-to-import, and nothing else competing for attention. Keep the Assistant & Ticketing Demo as a separate, deterministic module.

The V3 tester contract shapes the design as much as the research does. Six ledger checks and the assistant checks must pass on the real deployed page, so the layout, import flow and seed-data policy are chosen to make those checks pass reliably.

## 2. Why would a shopkeeper choose Hisaab?

**Instead of a notebook.** Totals are always right, a customer is found in a second, history settles disputes, a reminder is one tap, and a backup file survives a lost notebook. This case is sound, on one condition: recording an entry must be as quick as writing it. If it is slower, the notebook wins.

**Instead of an existing app.** The honest answer today is: only partly. OkCredit and Khatabook give cloud backup, automatic reminders and UPI collection for free, which a browser-local Hisaab does not. What Hisaab can offer against them is a khata with no ads, no loan offers, no sign-up and no data leaving the phone, plus free ageing and free export. Recent reviews show some users want exactly that, but the evidence is a handful of reviews, not a measured segment.

**Conclusion.** The evidence supports building the demo and passing the tester. It does not yet support a commercial claim. Before treating Hisaab as a business, validate two things: that shopkeepers will trade cloud convenience for a clean, private khata, and that a backup story stronger than "export a file" can be offered at acceptable cost.

## 3. Positioning (proposed)

For a shopkeeper who keeps a credit notebook and wants nothing more: Hisaab shows who owes what, records udhaar and payment in seconds, and opens a polite WhatsApp reminder in one tap. No ads, no loans, no account.

Plain-language rule: the interface says "Udhaar / Credit given" and "Payment received", "Balance due" and "Advance". It does not say receivables, reconciliation or ageing; the ageing view is titled "How old are the dues".

## 4. Feature prioritisation

Value/Effort, scored High/Medium/Low to avoid false precision. Effort assumes a browser-local build and no existing code.

| Feature | User value | Frequency | Differentiation | Effort | Risk | Class |
| --- | --- | --- | --- | --- | --- | --- |
| Customers, credit, payment, balances, total, history | High | Daily | Low | Medium | Low | MVP |
| Persistence in IndexedDB | High | Always | Low | Low | Medium | MVP |
| WhatsApp reminder link (tester contract) | High | Weekly | Low | Low | Low | MVP |
| Paste-JSON import (tester contract) | Medium | Rare | Medium | Medium | High | MVP |
| Payment screenshot (tester contract) | Medium | Weekly | Low | Medium | Medium | MVP |
| `?today=` effective date (tester contract) | Low for users | — | — | Low | Low | MVP |
| A. Fast entry | High | Daily | High | Medium | Low | MVP |
| Safe correction by reversal | High | Monthly | Medium | Low | Low | MVP |
| G. Export backup and restore | High | Monthly | Medium | Low | Medium | MVP |
| C. Reminder templates in English, Hindi, Telugu with three tones | Medium | Weekly | Medium | Low | Low | MVP |
| D. Ageing, oldest credit paid first | Medium | Weekly | High | Medium | Medium | Next |
| B. Statements (print and save as PDF) | Medium | Monthly | Medium | Low | Low | Next |
| H. Opening balances | Medium | Once | Low | Low | Medium | Next |
| Reminder history / follow-up note | Low | Weekly | Low | Low | Low | Next |
| CSV export | Low | Rare | Low | Low | Low | Later |
| F. Installable offline shell (service worker) | Medium | — | Low | Medium | Medium | Later |
| E. Voice entry | Unknown | Daily if it works | High | High | High | Later, as an experiment |
| Cloud sync, login, multi-device | High | Always | Low | High | High | Later; needs backend approval |
| J. Business insights | Low | Monthly | Low | Medium | Low | Later |
| I. Tally, POS, UPI, WhatsApp Business integrations | Low now | — | — | High | High | Out of scope for now |
| Billing, GST, inventory, loans, ads | — | — | — | — | — | Out of scope |

Assistant & Ticketing Demo: MVP, because it is an acceptance requirement. It is prioritised separately from the ledger and built after the ledger contract passes.

Departure from V3 to flag: V3 lists ageing and statements as high priority. I place them in "Next", immediately after the tester-critical MVP, because neither is in the tester contract and both depend on a correct ledger. They remain in the first release plan (Phase 4). This is ordering, not removal.

## 5. Recommended MVP boundary

**In:** customer add/search with 10-digit validation and duplicate block; credit and payment with integer paise; balance and total from one calculation module; history newest first; reversal instead of delete; payment screenshot stored as a blob; WhatsApp link per customer; paste import with validation and summary; export and restore; `?today=`; 375 px layout; plain-language storage notice; Assistant & Ticketing Demo.

**Out:** accounts, sync, automatic sending, UPI, billing, voice, analytics, any server unless an AI key is approved.

## 6. Design consequences of the tester contract (need approval)

| # | Issue | Recommendation | Why |
| --- | --- | --- | --- |
| 1 | The tester must find every selector | One URL. The home screen itself shows `#total-outstanding`, every `[data-customer]` row with `[data-balance]` and `a[data-remind]`, and the import box. The payment form opens in one tap from home | Fewer ways to fail; also the fastest layout for the shopkeeper |
| 2 | One-press import versus "preview and confirm" | Pressing `#import-go` validates the whole payload. If the ledger is empty, or the import only adds, apply it in one database transaction and show a summary with Undo. If it would replace or conflict, show the preview and require explicit confirmation | The tester pastes and presses once. A mandatory second click would fail the check. Undo keeps the owner in control |
| 3 | Seed data | Start empty. Offer "Load sample shop" as a button | Seeded customers would be added to the tester's imported total |
| 4 | Import format | Accept the tester's unversioned format (`shop`, `customers[name, phone]`, `entries[phone, type, amount, date, note]`, rupees as whole numbers) as "legacy v0". Hisaab's own export is versioned | The supplied sample has no version field |
| 5 | Text inside `[data-balance]` | Plain rupee number, no separators (for example `1260`), with the ₹ sign outside the element. Advance shown as a negative number plus the word "Advance" beside it | Easiest for any parser; V3 forbids clamping to zero |
| 6 | Text in `#total-outstanding` | `Rs 11,820`, the tester's own example | Matches the contract wording |
| 7 | Which customers get `a[data-remind]` | Every customer. With no balance due, the message is a neutral account note | A missing selector fails hard; an extra link costs nothing |
| 8 | Repeated `#staff-reply` / `#staff-send` | Place both inside every `[data-ticket]`, wired by ticket scope. Document that repeated IDs are not standards-compliant | The contract says "each ticket"; V3 forbids renaming |
| 9 | AI key | No AI provider in the first release; deterministic engine only, behind an interface that can take a provider later | Lower score counts; a key needs a server; identical runs are safest |
| 10 | `?q=` and `?today=` on the same URL | `?q=` opens the Assistant view and asks once; `?today=` is read by one date utility used everywhere | Both are "in the page URL" in the contract |

Recommendation 2 softens V3 section 4.6 for the additive case. It needs your explicit approval.

## 7. Sample data check

The supplied sample (8 customers, 38 entries) was run through the proposed rules: all eight balances, the total of 11,820, the top customer and the count of customers with a balance match the expected file. With oldest-credit-first allocation at 15 Nov 2026 the dues fall as: 16–30 days ₹2,410; 31–60 days ₹9,180; over 60 days ₹230; total ₹11,820.

## 8. Initial technical direction (to be decided in Phase 1)

- No repository or code exists. Options will be compared in the architecture record, not chosen here.
- Leaning: static single-page app, IndexedDB for records and image blobs, localStorage for settings only, no backend. A backend is needed only for cloud sync or an AI key; both are deferred.
- Statements by print stylesheet rather than a PDF library, because Hindi and Telugu render correctly that way.

## 9. Assumptions

1. The tester uses a fresh browser profile and one deployed URL.
2. The tester reads numbers by stripping non-digits, as its "11820 or Rs 11,820" example implies.
3. The ledger and assistant contracts are checked on the same deployment.
4. Amounts in imports are whole rupees unless a decimal is present.
5. Shopkeepers value absence of ads enough to accept manual backup. Unvalidated.

## 10. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Tester behaviour differs from assumptions 1–3 | Failed checks | Ask the owner; keep selectors on the first screen; test on the deployed URL |
| Local-only data lost when browser data is cleared | Loss of trust | Prominent notice; backup prompt after imports and periodically; never call it backup |
| Import corrupts existing data | Financial error | Validate fully first; single transaction; snapshot and Undo |
| Repeated IDs break accessibility tools | Minor | Scope by ticket; add labels; document |
| Scope creep from 14 documents and many "should" features | Delay | Create each document when its phase starts; keep tester checks as the gate |
| Commercial case unproven | Wasted build beyond demo | Shopkeeper interviews before any spend on backend |

## 11. Documentation structure (proposed)

All fourteen `/docs` files from V3 section 12, created when their phase begins rather than as empty shells:

| When | Documents |
| --- | --- |
| Phase 0 (now) | 01 market research, 02 competitive analysis, 03 product strategy, 11 tester acceptance checklist (first version), PROJECT_CONTEXT, PROJECT_MEMORY, PROJECT_STATUS, copy of V3 |
| Phase 1 | 04 PRD, 05 architecture, 06 data model and JSON schema, 07 UX specification, 08 roadmap, 09 test strategy, 13 security and privacy |
| Phases 6–7 | 10 deployment, 12 known limitations, 14 demo guide |

## 12. Decisions required from the owner

1. Approve the product direction and MVP boundary in sections 3–5.
2. Approve each tester-driven design choice in section 6, especially items 2, 3, 7, 8 and 9.
3. Confirm whether both contracts are checked on one URL.
4. Choose hosting, and say whether a small server function is acceptable.
5. Approve replacing the older "HISAAB – MASTER PROJECT CONTEXT" (v1.0) with the V3-aligned context file, and updating the project instructions, which list only the assistant selectors.
6. Approve moving to Phase 1 (PRD, UX and architecture). No code will be written before that.
