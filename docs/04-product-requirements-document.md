# 04 — Product Requirements Document

Project: Hisaab · Phase 1 · 16 November 2026 · Status: **draft for owner approval**. Nothing is implemented.

Governing instruction: HISAAB_MASTER_META_PROMPT_V3. Tester contracts are quoted from it and must not change.

## 1. Summary

Hisaab is a digital khata for kirana and small shops. First release: a browser-local, single-URL web app on Vercel with (A) the ledger and (B) a separate Assistant & Ticketing Demo. No accounts, no server, no AI provider.

## 2. Decision log

| # | Decision | Owner response, 16 Nov 2026 | Effect |
| --- | --- | --- | --- |
| D1 | One-press import when it only adds data, with Undo; preview and confirmation for replace | Approved | FR-014, FR-015. Softens V3 §4.6 for the additive case |
| D2 | Start empty vs sample data | Use the sample data for the demo | FR-019. Supersedes strategy doc §6 item 3 |
| D3 | No AI provider in first release | Approved | AR-013 |
| D4 | `#staff-reply` and `#staff-send` inside every ticket | Approved for MVP | AR-011. Repeated IDs documented as a known deviation |
| D5 | Reminder link for all customers | Only when there is a due | FR-012. Supersedes strategy doc §6 item 7 |
| D6 | Both tester contracts on one URL | Yes | UX: single page |
| D7 | Hosting | Vercel | Static deployment; no server function needed in this release |
| D8 | Replace v1.0 context doc | Approved | Done |
| D9 | Proceed to Phase 1 | Approved | This document set |

### Second round, owner responses 16 Nov 2026

| # | Decision | Effect |
| --- | --- | --- |
| D10 | P1 and P2 approved: sample data is demo data replaced by the first import; no reminder link without a due | FR-012, FR-015, FR-019 |
| D11 | P3 approved: cancel instead of delete | FR-010 |
| D12 | P4 approved: backups exclude screenshot images | FR-016 |
| D13 | P5 **rejected**: phone validation follows production standards. A number must be 10 digits starting with 6–9, in forms and in imports. Rows that fail are rejected | FR-001, FR-015 |
| D14 | Partial import approved: valid rows import, rejected rows are listed | FR-015 |
| D15 | Framework: the industry-standard option. Chosen: Next.js (App Router) + React + TypeScript on Vercel | Architecture ADR-2 |
| D16 | No "demo" band. The assistant section is branded **ayrus AI Assistant**, and an ayrus AI company band closes the page | AR-014, UX §2 |
| D17 | No app lock, no backup encryption, no per-customer delete in this release | Security §6 |
| D18 | Git repository `surya-ayrusai/hisaab` created by the owner; the assistant may create the Vercel project | Deployment |
| D19 | Demo date: 20 November 2026 | Roadmap |

Risk recorded for D13: a test dataset containing numbers outside 6–9 would have those customers rejected.

### Proposals from the first Phase 1 draft (now decided above)

| # | Proposal | Reason |
| --- | --- | --- |
| P1 | Sample data is loaded as **demo data**, clearly labelled. While the ledger still holds only untouched demo data, the first import replaces it, with a notice and Undo | D2 plus the tester: importing another shop on top of seeded customers would give a wrong total. Demo data is not the shopkeeper's data, so nothing of theirs is lost |
| P2 | A customer with zero balance or an advance has no `a[data-remind]` | D5. Risk: if the tester looks for a link on a customer with nothing due, that check fails. In the supplied sample all eight customers have dues |
| P3 | Mistakes are corrected by **cancelling** an entry: it stays visible, struck through, with time and reason, and stops counting. Editing = cancel plus new entry | Simpler for a shopkeeper than contra-entries; nothing is deleted or silently changed |
| P4 | Backup JSON excludes screenshot images in this release | Keeps files small (V3 §8.5). Stated plainly at export and restore |
| P5 | Phone validation: exactly 10 digits after normalisation. A first digit outside 6–9 gives a warning, not a rejection | A test dataset may use numbers that are not real mobile ranges |

## 3. Scope

**In (Phases 2–5):** FR-001 to FR-024, AR-001 to AR-014.
**Out:** login, cloud sync, automatic sending, UPI, billing, GST, inventory, loans, ads, voice entry, analytics, AI provider, native apps.

## 4. Users

| Persona | Need |
| --- | --- |
| Shop owner at the counter, Android phone | Note udhaar or payment before the next customer speaks |
| Helper or family member | Record without fear of spoiling the book |
| Demo evaluator / automated tester | Find every contracted element on one page and get correct numbers |

## 5. Business rules

- BR-1 Amounts are positive, stored as integer paise.
- BR-2 Customer balance = sum of active credits − sum of active payments. Cancelled entries do not count.
- BR-3 Shop total outstanding = sum of balances that are greater than zero.
- BR-4 A negative balance is shown as an advance. It never reduces another customer's dues or the shop total.
- BR-5 One customer per normalised phone.
- BR-6 Every figure on every screen comes from one calculation module reading stored entries.
- BR-7 Entry date is a calendar date; creation time is stored separately. `?today=` never changes stored dates.
- BR-8 Nothing is sent to WhatsApp automatically.

## 6. Functional requirements — ledger

Priority: P0 mandatory, P1 high value, P2 useful.

| ID | Requirement | Acceptance criteria | Pri | Phase |
| --- | --- | --- | --- | --- |
| FR-001 | Add customer with name and phone | Name 1–60 characters. Phone normalised by removing spaces, dashes, `+91`, a leading `91` on 12 digits, or a leading `0` on 11 digits; result must be 10 digits starting with 6–9. Errors shown beside the field; typed input is kept | P0 | 3 |
| FR-002 | Prevent duplicate customers | Adding an existing phone is blocked with "Already in your khata" and a link to that customer | P0 | 3 |
| FR-003 | Customer list and search | Newest first by default; search matches name or phone as typed; optional sort "Highest due"; empty state explains the first step | P0 | 3 |
| FR-004 | Customer row contract | Exactly one element `[data-customer="<phone>"]` per customer, containing one `[data-balance]` whose text is the balance in rupees as a plain number (`670`, `670.50`, `-200`). No other element on the page uses these attributes | P0 | 3 |
| FR-005 | Record credit | Customer, amount, date (default effective today), optional note up to 80 characters. Balance and total update at once | P0 | 3 |
| FR-006 | Record payment | As FR-005. Partial payments allowed. A payment above the balance is allowed after a notice that the customer will be in advance | P0 | 3 |
| FR-007 | Balance engine | Implements BR-1 to BR-4; unit-tested including zero, negative and paise cases | P0 | 2 |
| FR-008 | Total outstanding | One element `#total-outstanding`, visible on the home screen, text `Rs 11,820` style; `Rs 0` when nothing is due | P0 | 3 |
| FR-009 | Transaction history | Per customer, newest first by date then creation time; credit and payment differ in label, colour and sign; cancelled entries shown struck through | P0 | 3 |
| FR-010 | Cancel and undo | Each entry has Cancel with confirmation; a 10-second Undo appears after every save; cancelled entries keep time and reason | P0 | 3 |
| FR-011 | Payment screenshot | Payment form has file input `#shot-input`. JPEG, PNG or WebP up to 5 MB; larger images are downscaled; unreadable or other types rejected with a message and the payment can still be saved. Saved entry renders `img[data-shot]` with alt text; tap opens full size. No `img[data-shot]` when nothing was attached. Survives reload | P0 | 4 |
| FR-012 | WhatsApp reminder | For each customer with balance > 0, the row holds `a[data-remind="<phone>"]` with `href` `https://wa.me/91<phone>?text=<encoded message>`. Message has customer name, shop name, balance, polite request. Opens WhatsApp; user sends. "Copy message" offered | P0 | 4 |
| FR-013 | Reminder language and tone | English, Hindi, Telugu × friendly, polite, formal. Default English polite; chosen in Settings; the link always reflects the saved choice | P1 | 4 |
| FR-014 | Paste import | Visible textarea `#import-box` and button `#import-go` on the home page. Whole payload validated before any change. Accepts the legacy tester format and Hisaab v1 | P0 | 4 |
| FR-015 | Import safety | Additive import applies in one database transaction on the single press, then shows a summary (created, matched, skipped, rejected) and Undo. Replace shows a preview and needs explicit confirmation. Demo-only ledger is replaced per P1. Any failure leaves data unchanged. Bad JSON, unknown version, bad phone, bad amount, bad date, entry for unknown phone: each reported in plain words with the row number | P0 | 4 |
| FR-016 | Export and restore | "Download backup" produces versioned JSON. Restore uses the import flow in replace mode. Screen states what is and is not included | P1 | 4 |
| FR-017 | Effective date | `?today=YYYY-MM-DD` sets today for defaults, labels and ageing; absent or invalid uses device date; a small banner shows when an override is active | P0 | 2 |
| FR-018 | Persistence | Customers, entries, images and settings survive reload and browser restart in the same profile | P0 | 2 |
| FR-019 | Demo data | First run loads the supplied sample shop, labelled "Sample data", with "Clear sample data" | P0 | 3 |
| FR-020 | Shop settings | Shop name (used in reminders and statements), reminder language and tone | P1 | 4 |
| FR-021 | Storage notice | Plain statement that data lives only in this browser on this device, with a link to backup | P0 | 3 |
| FR-022 | How old are the dues | Bands 0–7, 8–15, 16–30, 31–60, over 60 days; oldest credit paid first; band totals equal `#total-outstanding`; method explained on screen | P1 | 4 |
| FR-023 | Customer statement | Date range, opening balance, entries in date order, closing balance; print layout that saves as PDF from the browser | P1 | 4 |
| FR-024 | Opening balance | When adding a customer, optional opening amount and date, stored as a marked opening entry so it is counted once | P1 | 4 |

## 7. Functional requirements — Assistant & Ticketing Demo

Separate module. Clinic wording is allowed here only.

| ID | Requirement | Acceptance criteria | Pri |
| --- | --- | --- | --- |
| AR-001 | Chat controls | One `#chat-input` and one `#chat-send`; Enter also sends; empty input ignored | P0 |
| AR-002 | Bot replies | Every bot reply element has class `bot-msg`, appended in order. No greeting, typing indicator or error carries `bot-msg` | P0 |
| AR-003 | Ask on load | `?q=<text>` is asked exactly once per page load | P0 |
| AR-004 | Language | Devanagari input answered in Hindi, Telugu script in Telugu, otherwise English; common romanised Hindi and Telugu words detected | P0 |
| AR-005 | Knowledge answers | Timings, address, phone, fees, doctors, services answered from saved knowledge; unknown questions get a hand-off reply | P0 |
| AR-006 | Knowledge editing | Staff edit each record; validated; saved with a version number and time; the next answer uses the new text; success and error shown | P0 |
| AR-007 | Quick replies | Editable list of buttons that send a fixed question | P1 |
| AR-008 | Booking to ticket | A booking request creates a ticket with the requested date and time when stated (relative to effective today), otherwise "time not given", and the reply says so | P0 |
| AR-009 | Ticket queue | `#ticket-queue` holds one `[data-ticket]` per ticket with `data-status` exactly `answered`, `needs human`, `urgent` or `closed` | P0 |
| AR-010 | Priority and age | Each ticket shows priority (urgent, high, normal) and age since creation | P0 |
| AR-011 | Staff reply | Each ticket contains `#staff-reply` and `#staff-send`, acting on that ticket only; reply saved, shown, status becomes `answered` | P0 |
| AR-012 | Close ticket | Staff can close; status `closed` | P1 |
| AR-013 | No key | No AI provider or network call anywhere in the module | P0 |
| AR-014 | Isolation | Own storage database, own code folder, no shared entities with the ledger; shown as a separate section titled "ayrus AI Assistant" | P0 |

Status rules: answered from knowledge → `answered`; booking or unknown → `needs human`; emergency words → `urgent`; staff close → `closed`. Every question is logged as a ticket.

## 8. Non-functional requirements

| ID | Requirement |
| --- | --- |
| NFR-001 | Works at 375 px with no horizontal scroll, no clipped amounts, touch targets at least 44 px |
| NFR-002 | A routine entry needs at most 4 taps plus the amount after the customer is in view |
| NFR-003 | Home screen usable with 500 customers and 10,000 entries (assumption to be measured) |
| NFR-004 | Keyboard operable; every input labelled; colour never the only signal for credit versus payment |
| NFR-005 | Works without network after first load of the page; no claim of offline install in this release |
| NFR-006 | No secrets, analytics or third-party calls in the client |
| NFR-007 | Imported and typed text is always rendered as text, never as markup |
| NFR-008 | All tester selectors present in the rendered, visible page of the deployed URL |

## 9. User journeys

1. **First visit.** Page opens with sample shop, total at top, storage notice. Owner taps "Clear sample data", sets shop name, adds first customer.
2. **Give credit.** Find customer → tap "Udhaar" → type amount → Save. Row and total change; Undo shown.
3. **Take payment with proof.** Tap "Payment" on the row → amount → attach screenshot → Save. Entry shows thumbnail.
4. **Remind.** Tap WhatsApp icon on a row → WhatsApp opens with message → owner presses send.
5. **Move data in.** Paste JSON → Import → summary and Undo.
6. **Protect data.** Settings → Download backup.
7. **Demo.** Open the Assistant section, ask a question, see the ticket, reply as staff.

## 10. Success measures for the demo

- All six ledger checks and all assistant checks pass on the Vercel URL, with identical results on repeat runs.
- Sample import reproduces every value in `sample-expected.json`.
- A first-time user records a credit without instructions (to be observed with two or three people).

## 11. Open questions

1. Confirm P1 to P5 above.
2. Shop name for the seeded sample: keep "Lakshmi Provision Store (fictional)"?
3. Target date for the demo, so the roadmap can be sized. I have not assumed one.
