# 11 — Tester Acceptance Checklist

Project: Hisaab · First version, Phase 0 · 15 November 2026

The contract lines below are copied from HISAAB_MASTER_META_PROMPT_V3 sections 5.1 and 6.2. They must not be renamed, removed, reinterpreted or weakened. All statuses are "Not started": no application exists yet.

Status values: Not started · In progress · Implemented — not tested · Tested — passed · Tested — failed · Blocked · Accepted limitation.

## A. Hisaab ledger contract (six checks, tracked independently)

| ID | Exact contract | What must be true on the deployed page | Status | Evidence |
| --- | --- | --- | --- | --- |
| TC-L1 | `#total-outstanding, the text contains the number, for example 11820 or Rs 11,820` | Visible element; text includes the computed sum of positive customer balances; correct after entries, imports and restores; shows 0 for an empty ledger | Not started | — |
| TC-L2 | `[data-customer="<phone>"], with the balance inside [data-balance]` | One row per normalised 10-digit phone; a `[data-balance]` descendant with that customer's current balance; no duplicate rows after import | Not started | — |
| TC-L3 | `a[data-remind="<phone>"], the link is https://wa.me/91<phone>?text=<message>` | Real anchor; `data-remind` is the 10-digit phone; `href` starts `https://wa.me/91<phone>?text=`; message URL-encoded, names shop and customer, states balance, polite; nothing is sent automatically; no doubled `91` | Not started | — |
| TC-L4 | `a text area #import-box and a button #import-go. The tester pastes the JSON and presses the button` | Visible textarea and button; pasted JSON validated as a whole; rows and total update; errors readable; replace needs explicit confirmation; failed import changes nothing | Not started | — |
| TC-L5 | `a file input #shot-input on the payment form. After saving, the entry shows img[data-shot]` | File input on the payment form; saved payment entry renders `img[data-shot]` from stored data, survives reload; no `img[data-shot]` when nothing was attached | Not started | — |
| TC-L6 | `if you add anything that depends on the date, honour ?today=2026-11-15 in the URL` | Valid `today` becomes the effective date for defaults, labels, filters and ageing; absent uses device date; invalid falls back safely; stored dates never rewritten | Not started | — |

### Reference values from the supplied sample

Import of `sample-data.json` with `?today=2026-11-15` must give:

| Check | Expected |
| --- | --- |
| `#total-outstanding` | 11820 |
| `[data-customer="9000000101"] [data-balance]` | 670 |
| `[data-customer="9000000102"] [data-balance]` | 3470 |
| `[data-customer="9000000103"] [data-balance]` | 2810 |
| `[data-customer="9000000104"] [data-balance]` | 1260 |
| `[data-customer="9000000105"] [data-balance]` | 230 |
| `[data-customer="9000000106"] [data-balance]` | 2830 |
| `[data-customer="9000000107"] [data-balance]` | 250 |
| `[data-customer="9000000108"] [data-balance]` | 300 |
| Highest balance | 9000000102 |
| Customers with a balance | 8 |

These were confirmed on 15 Nov 2026 by running the proposed rules (credits minus payments per phone; total of positive balances) over the sample file. That is a check of the rules, not of an application.

## B. Assistant & Ticketing Demo contract (tracked separately)

| ID | Exact contract | What must be true | Status | Evidence |
| --- | --- | --- | --- | --- |
| TC-A1 | Input `#chat-input`; send button `#chat-send` | One of each, visible and working by click and Enter | Not started | — |
| TC-A2 | Every bot reply has class `.bot-msg`; the last `.bot-msg` in the DOM is the latest answer | No placeholder, greeting or error with `.bot-msg` appears after the real answer | Not started | — |
| TC-A3 | `?q=<question>` in the page URL asks that question when the page opens | Asked exactly once; no duplicate on re-render | Not started | — |
| TC-A4 | `#ticket-queue`; one `[data-ticket]` per ticket; `data-status` exactly one of `answered`, `needs human`, `urgent`, `closed` | Exact spelling and case; no other values | Not started | — |
| TC-A5 | Each ticket has a text area `#staff-reply` and a button `#staff-send` | Controls act on their own ticket; repeated IDs documented | Not started | — |
| TC-A6 | No-key run: tested with the AI key and with it removed; the lower score counts | Every check above passes identically without any key | Not started | — |

## C. Rules for marking a check passed

1. Tested against the running application, then against the deployed URL.
2. Element visible and usable, not hidden, mocked or test-only.
3. Evidence recorded: date, build, environment, result.
4. Run at 375 px width as well as desktop.

## D. Open questions affecting this checklist

- Are sections A and B checked on the same URL?
- Does the tester start from an empty browser profile?
- How does the tester reach the payment form to find `#shot-input`?
