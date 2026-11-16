# 09 — Test Strategy and Test Cases

Project: Hisaab · Phase 1 · 16 November 2026 · Status: **draft for owner approval**. No test has been run against an application; none exists.

## 1. Approach

| Layer | Tool | What it proves |
| --- | --- | --- |
| Unit | Vitest | Money, balance, phone, date, ageing, import planning, reminder text, language and intent rules |
| Browser | Playwright at 375×812, 768×1024, 1280×800 | Real page behaviour and every tester selector |
| Deployed | Same browser suite pointed at the Vercel URL | What the tester will actually see |
| Manual | Android phone with Chrome | Keyboard, file picker, WhatsApp hand-off |

A requirement is "Tested — passed" only with a recorded run: date, build, environment, result.

## 2. Ledger test cases

| ID | Case | Expected | Covers |
| --- | --- | --- | --- |
| TEST-001 | Add valid customer | Row appears first; balance 0 | FR-001, FR-003 |
| TEST-002 | Phone with 9 digits, letters, 11 digits | Rejected with message; input kept | FR-001 |
| TEST-003 | Phone typed as `+91 90000 00101`, `09000000101` | Stored as `9000000101` | FR-001 |
| TEST-004 | Add existing phone | Blocked; link to existing | FR-002 |
| TEST-005 | Record credit 250 | Balance +250; total +250 | FR-005, FR-008 |
| TEST-006 | Record payment 100 against 250 | Balance 150 | FR-006 |
| TEST-007 | Payment above balance | Notice; balance negative; shown as Advance; total unaffected by the negative | FR-006, BR-4 |
| TEST-008 | Amount 0, negative, `12.345`, text | Rejected | BR-1 |
| TEST-009 | `0.10 + 0.20` style paise sums | Exact | FR-007 |
| TEST-010 | Cancel an entry | Struck through; balance and total recalculated; still stored | FR-010 |
| TEST-011 | Undo within 10 seconds | Entry cancelled; totals restored | FR-010 |
| TEST-012 | History order with same-day entries | Newest first by date then creation | FR-009 |
| TEST-013 | Search by part of name and part of phone | Matching rows only | FR-003 |
| TEST-014 | Reload and browser restart | All data present | FR-018 |
| TEST-015 | Double-tap Save | One entry | NFR |
| TEST-016 | Opening balance on new customer | Counted once | FR-024 |
| TEST-017 | Dues by age on sample at 2026-11-15 | 0–7: 0; 8–15: 0; 16–30: 2,410; 31–60: 9,180; over 60: 230; sum 11,820 | FR-022 |
| TEST-018 | Opening balance on a new customer | One `kind: "opening"` credit entry; the balance and the total both move by that amount | FR-005 |
| TEST-019 | Backup export then import into an empty ledger | Same 8 customers, same 38 entries, same total | FR-030 |
| TEST-020 | Restore from backup (replace) | Preview and an explicit confirmation first; then the ledger is only what the file held; Undo restores the previous ledger exactly | FR-031 |
| TEST-021 | Erase all data | Customers, entries and screenshots gone; shop settings kept; Undo restores everything | FR-032 |
| TEST-022 | Statement for one customer | Opening balance, each line's running balance, and a closing balance equal to that customer's current balance | FR-023 |
| TEST-018 | Statement for a date range | Opening + lines = closing = row balance at range end | FR-023 |
| TEST-019 | Backup, clear, restore | Identical balances and total | FR-016 |

## 3. Tester contract cases — ledger

| ID | Check | Case | Expected |
| --- | --- | --- | --- |
| TEST-101 | TC-L1 | Empty ledger | `#total-outstanding` text contains `0` |
| TEST-102 | TC-L1 | Sample data | Text contains `11,820`; digits-only reading gives 11820 |
| TEST-103 | TC-L1 | After credit, payment, cancel, import, restore | Matches recomputed total each time |
| TEST-104 | TC-L1 | Exactly one `#total-outstanding` in the page | Count is 1 |
| TEST-105 | TC-L2 | Sample data | 8 elements `[data-customer]`; each has one `[data-balance]` with the expected number |
| TEST-106 | TC-L2 | Zero and negative balances | `0` and `-200` shown, not hidden or clamped |
| TEST-107 | TC-L2 | Import same file twice | Still 8 rows |
| TEST-108 | TC-L2 | Customer detail open | Still one `[data-customer]` per phone in the page |
| TEST-109 | TC-L3 | Customer with dues | `a[data-remind="9000000102"]` exists; `href` starts `https://wa.me/919000000102?text=` |
| TEST-110 | TC-L3 | Decode message | Contains customer name, shop name, `3470` or `3,470` |
| TEST-111 | TC-L3 | Hindi and Telugu templates, name with `&`, `#`, `+` | `href` decodes to the exact message |
| TEST-112 | TC-L3 | Customer with zero or advance | No `a[data-remind]` (owner decision D5) |
| TEST-113 | TC-L3 | Phone never produces `9191…` | Checked for all rows |
| TEST-114 | TC-L4 | Paste sample into `#import-box`, press `#import-go` once, on demo data | Rows and total equal expected file with no further click |
| TEST-115 | TC-L4 | Same on an empty ledger | Same result |
| TEST-116 | TC-L4 | Paste a different shop onto untouched demo data | Demo replaced; totals equal the new file alone |
| TEST-117 | TC-L4 | Empty text, broken JSON, wrong shape, `version: 99` | Readable error; data unchanged |
| TEST-118 | TC-L4 | Bad phone, zero amount, bad date, unknown phone in an entry | Those rows rejected and listed; others imported |
| TEST-119 | TC-L4 | Replace on real data | Preview shown; nothing changes until confirmed |
| TEST-120 | TC-L4 | Force a failure mid-import | No partial data |
| TEST-121 | TC-L4 | Undo after import | Previous state restored exactly |
| TEST-122 | TC-L5 | Payment form | `#shot-input` is a file input, visible |
| TEST-123 | TC-L5 | Save payment with PNG | Entry contains `img[data-shot]` that loads; still there after reload |
| TEST-124 | TC-L5 | Save payment without image | No `img[data-shot]` in that entry |
| TEST-125 | TC-L5 | PDF, 20 MB image, corrupt file | Message; payment can still be saved without image |
| TEST-126 | TC-L6 | `?today=2026-11-15` | Default entry date and ageing use 15 Nov 2026; banner shown |
| TEST-127 | TC-L6 | No parameter; `?today=abc`; `?today=2026-02-30` | Device date used; no crash |
| TEST-128 | TC-L6 | Open with one `today`, then another | Stored entry dates unchanged |

## 4. Tester contract cases — assistant

| ID | Check | Case | Expected |
| --- | --- | --- | --- |
| TEST-201 | TC-A1 | Type and press `#chat-send`; type and press Enter | Reply appears |
| TEST-202 | TC-A2 | After any question | Last `.bot-msg` in the page is the answer to it |
| TEST-203 | TC-A2 | Initial page | Greeting, if any, has no `bot-msg` class |
| TEST-204 | TC-A3 | `?q=What are your timings?` | Asked once; one new ticket; reply present |
| TEST-205 | TC-A3 | `?q=` with `?today=` together | Both honoured |
| TEST-206 | TC-A4 | English, Hindi, Telugu timing questions | Reply in the same language with saved timings |
| TEST-207 | TC-A4 | Unknown question | Hand-off reply; ticket `needs human` |
| TEST-208 | TC-A4 | "I want an appointment tomorrow at 5 pm" | Ticket with date and 17:00; `needs human` |
| TEST-209 | TC-A4 | Emergency wording | Ticket `urgent`, priority urgent |
| TEST-210 | TC-A4 | All tickets | `data-status` is one of the four exact values |
| TEST-211 | TC-A5 | Two tickets; reply in the second ticket's `#staff-reply` and press its `#staff-send` | Only the second ticket shows the reply and becomes `answered` |
| TEST-212 | — | Edit timings, save, ask again | New timings in the reply; version increased |
| TEST-213 | — | Quick reply button | Sends its question |
| TEST-214 | TC-A6 | Run whole suite twice | Identical results; no network requests from the module |
| TEST-215 | — | Ticket age and priority after time passes | Age increases; display correct |

## 5. Responsive, accessibility, security checks

| ID | Check |
| --- | --- |
| TEST-301 | No horizontal scroll at 375 px on every sheet |
| TEST-302 | Amount of ₹99,99,999.50 not clipped in rows or total |
| TEST-303 | All controls reachable by keyboard; visible focus; inputs labelled |
| TEST-304 | Import text containing `<script>` and HTML in names and notes renders as plain text |
| TEST-305 | Built files contain no keys or third-party endpoints |
| TEST-306 | 500 customers and 10,000 entries: home usable |
| TEST-307 | Storage write failure simulated: clear message, no partial save |

## 6. Traceability matrix (initial)

All rows: test status **Not started**, evidence none, owner approval pending.

| Requirement | Pri | Phase | Design ref | Component | Tests |
| --- | --- | --- | --- | --- | --- |
| FR-001, FR-002 | P0 | 3 | 07 §3.2 | ledger/views add customer; domain/phone | 001–004 |
| FR-003 | P0 | 3 | 07 §3.1 | ledger/views home | 001, 013 |
| FR-004 (TC-L2) | P0 | 3 | 07 §2 | ledger/views home row | 105–108 |
| FR-005, FR-006 | P0 | 3 | 07 §3.3 | ledger/views entry form | 005–008, 015 |
| FR-007 | P0 | 2 | 05 §6 | ledger/domain balance, money | 007–009 |
| FR-008 (TC-L1) | P0 | 3 | 07 §2 | ledger/views home total | 101–104 |
| FR-009, FR-010 | P0 | 3 | 07 §3.4 | ledger/views detail | 010–012 |
| FR-011 (TC-L5) | P0 | 4a | 07 §3.3 | ledger/data shots; platform image | 122–125 |
| FR-012, FR-013 (TC-L3) | P0/P1 | 4a/4b | 07 §2 | ledger/domain reminder | 109–113 |
| FR-014, FR-015 (TC-L4) | P0 | 4a | 06 §3; 07 §3.5 | ledger/domain import | 114–121 |
| FR-016 | P1 | 4b | 06 §3.2 | ledger/domain export | 019 |
| FR-017 (TC-L6) | P0 | 2 | 05 §5 | app/effective date | 126–128 |
| FR-018 | P0 | 2 | 05 ADR-1 | ledger/data | 014 |
| FR-019 | P0 | 3 | 04 P1 | ledger/data seed | 114, 116 |
| FR-022 | P1 | 4b | 07 §3.7 | ledger/domain ageing | 017 |
| FR-023 | P1 | 4b | 07 §3.8 | ledger/views statement | 018 |
| FR-024 | P1 | 4b | 06 §3.6 | ledger/domain | 016 |
| AR-001–003 (TC-A1–A3) | P0 | 5 | 07 §3.9 | demo/views chat | 201–205 |
| AR-004–008 | P0 | 5 | 04 §7 | demo/domain | 206–209, 212, 213 |
| AR-009–012 (TC-A4, A5) | P0 | 5 | 07 §3.9 | demo/views queue | 210, 211, 215 |
| AR-013, AR-014 (TC-A6) | P0 | 5 | 05 ADR-6 | demo | 214 |
| NFR-001–008 | P0 | 6 | 07, 13 | all | 301–307 |
