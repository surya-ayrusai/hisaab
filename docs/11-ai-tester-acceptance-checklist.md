# 11 — Tester Acceptance Checklist

Project: HISAAB · Updated 16 November 2026 · Deployed URL: https://hisaab-ayrus3.vercel.app

The contract lines below are copied from HISAAB_MASTER_META_PROMPT_V3 sections 5.1 and 6.2. They must not be renamed, removed, reinterpreted or weakened.

Status values: Not started · In progress · Implemented — not tested · Tested — passed · Tested — failed · Blocked · Accepted limitation.

## Evidence sources

| Ref | What was run |
| --- | --- |
| **L** | Local production build, Chrome at 375×812, `npm run test:e2e` — 17 of 17 browser tests passed, plus 47 unit tests. Commit `b7cc72f`, 16 Nov 2026. |
| **D** | The deployed page at https://hisaab-ayrus3.vercel.app, opened in the owner's browser and checked through the live DOM. First at commit `022315a`, re-checked at `b7cc72f` after the theme and Phase 4b work. 16 Nov 2026. |

**Re-check at `b7cc72f`.** The theme rewrite and the Phase 4b features touched every screen, so all six ledger checks were run again on the deployed page. `#total-outstanding`, `[data-customer]` with `[data-balance]`, `a[data-remind]` with a correct `wa.me/91…` link, `#import-box`, `#import-go` and the `?today=` banner are all present and behave as before. The ageing bands summed to the same figure as `#total-outstanding` (₹12,120 in that browser's copy, which holds earlier verification entries), and a customer statement closed at that customer's current balance.

## A. HISAAB ledger contract (six checks, tracked independently) — all passing

| ID | Exact contract | Status | Evidence |
| --- | --- | --- | --- |
| TC-L1 | `#total-outstanding, the text contains the number, for example 11820 or Rs 11,820` | Tested — passed | **D**: exactly one element, text `Rs 11,820` on the sample data; changed to `Rs 11,720` after a ₹100 payment and `Rs 12,120` after an import. **L**: also zero on an empty ledger, and correct after entry, cancel, import, undo and reload. |
| TC-L2 | `[data-customer="<phone>"], with the balance inside [data-balance]` | Tested — passed | **D**: 8 rows, one per phone, each with one `[data-balance]`: 9000000101→670, …102→3470, …103→2810, …104→1260, …105→230, …106→2830, …107→250, …108→300. All match `sample-expected.json`. **L**: no duplicate rows after re-import; zero and negative balances shown, not clamped. |
| TC-L3 | `a[data-remind="<phone>"], the link is https://wa.me/91<phone>?text=<message>` | Tested — passed | **D**: 8 anchors; sample href `https://wa.me/919000000108?text=Hello%20…`, no doubled `91`. **L**: decoded message carries shop, customer and balance; special characters encode reversibly; the link disappears when the balance reaches zero (owner decision D5); nothing is sent automatically. |
| TC-L4 | `a text area #import-box and a button #import-go. The tester pastes the JSON and presses the button` | Tested — passed | **D**: one paste and one press imported 1 customer and 1 entry and rejected 1 bad phone with a reason; pressing again added nothing and reported 1 matched, 1 skipped; `{not json` gave "This is not valid JSON…" and changed nothing; Undo restored the previous state. **L**: the full sample file reproduces every expected value; a different shop replaces untouched sample data with Undo; unknown schema version refused. |
| TC-L5 | `a file input #shot-input on the payment form. After saving, the entry shows img[data-shot]` | Tested — passed | **D**: `#shot-input` is a file input on the payment form; after saving a ₹100 payment with a PNG the entry rendered one `img[data-shot]` that loaded, with alt text "Payment screenshot for ₹100 on 15 Nov 2026"; still present after reload. **L**: no `img[data-shot]` when nothing is attached; a PDF is refused and the payment can still be saved. |
| TC-L6 | `if you add anything that depends on the date, honour ?today=2026-11-15 in the URL` | Tested — passed | **D**: `?today=2026-11-15` showed the banner and set the saved entry's date to 15 Nov 2026. **L**: absent and invalid values fall back to the device date without crashing; stored dates are never rewritten. |

### Reference values from the supplied sample

| Check | Expected | Seen on the deployed page |
| --- | --- | --- |
| `#total-outstanding` | 11820 | Rs 11,820 |
| Per-customer balances | 670 · 3470 · 2810 · 1260 · 230 · 2830 · 250 · 300 | all match |
| Highest balance | 9000000102 | 9000000102 (3470) |
| Customers with a balance | 8 | 8 |

## B. Assistant & Ticketing contract — REMOVED BY OWNER DECISION (D23, 16 Nov 2026)

The module was built, verified on the deployed page, and then removed at the owner's direction. The owner was shown the consequence below before deciding.

**These six checks will fail.** V3 section 6 requires the module and section 13 requires tracking its contract independently; the application no longer provides any of it.

| ID | Exact contract | Status |
| --- | --- | --- |
| TC-A1 | Input `#chat-input`; send button `#chat-send` | Will fail — removed by owner decision |
| TC-A2 | Every bot reply has class `.bot-msg`; the last one is the latest answer | Will fail — removed by owner decision |
| TC-A3 | `?q=<question>` asks that question when the page opens | Will fail — removed by owner decision |
| TC-A4 | `#ticket-queue`; `[data-ticket]`; `data-status` of `answered`, `needs human`, `urgent`, `closed` | Will fail — removed by owner decision |
| TC-A5 | Each ticket has `#staff-reply` and `#staff-send` | Will fail — removed by owner decision |
| TC-A6 | No-key run; the lower score counts | Not applicable — no AI provider anywhere in the application |

A browser test now asserts that none of these selectors exists, so the removal is deliberate and verified rather than accidental. `?q=` in the URL is ignored and does not disturb the ledger.

The working module is in git history at commit `022315a` if it is ever wanted back.

## C. Rules for marking a check passed

1. Tested against the running application, then against the deployed URL.
2. Element visible and usable, not hidden, mocked or test-only.
3. Evidence recorded: date, build, environment, result.
4. Run at 375 px width as well as desktop.

## D. Notes and remaining risks

- `#shot-input` is rendered when a customer's Payment button is pressed, not on the first screen. If the tester expects it without any interaction, the layout must change.
- `a[data-remind]` exists only for customers with a due (owner decision D5). A tester that looks for a reminder link on a customer with nothing owing would not find one. All eight customers in the supplied sample have dues.
- The deployed checks above were run at desktop width in the owner's Chrome; the 375 px checks were run locally.
- Assumed, not confirmed: the tester starts from an empty browser profile. Data is per browser, so a browser that has already been used will not show the pristine sample.
