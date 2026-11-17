# 12 — Known Limitations and Risks

Project: HISAAB · 16 November 2026 · Honest list. Nothing here is hidden from the owner or a buyer.

Severity: **High** — would lose a customer's trust or their data. **Medium** — will be asked about. **Low** — worth knowing.

## 1. Product limitations

| # | Limitation | Severity | Why it is this way | What would fix it |
| --- | --- | --- | --- | --- |
| L1 | **Partly addressed 17 Nov.** Opt-in sync over Supabase: a shop is an unguessable uuid, and the same `?shop=` link opens the same ledger on another device. Without that link the app is browser-local as before. Still missing: accounts, so whoever holds the link holds the ledger. | High | ADR-1 kept the ledger local so the product could ship without accounts or a hosting bill; sync was added behind the existing `LedgerRepo` boundary rather than as a rewrite. | Accounts and row-level security per shop. Until then the link is the credential and must be treated as one. |
| L2 | **Clearing browser data erases the ledger.** So does uninstalling the browser, and some "cleaner" apps do it on a schedule. | High | Follows from L1. | Backups mitigate it today: Settings offers a download, and the storage notice on the home page says so. Sync would remove it. |
| L3 | **Backups do not include payment screenshots.** Customers and entries restore exactly; images do not. | Medium | Images are blobs that would bloat a JSON file far past what a phone can hold in memory while parsing. | A zip export, or image upload once there is a backend. Stated in the Settings sheet so nobody is surprised. |
| L4 | **No multi-user access.** One shopkeeper, one device. A second person cannot keep the same book. | Medium | Follows from L1. | Accounts. |
| L5 | **No reminder is sent automatically.** HISAAB opens WhatsApp with the message ready; the shopkeeper presses send. | Low | Deliberate (owner decision D5 and the strategy doc): automatic messages from an unknown number are how a shop loses a customer, and WhatsApp's terms do not permit it from a click-to-chat link anyway. | The WhatsApp Business API, which needs a verified business and per-message cost. |
| L6 | ~~No reminder link for a customer with nothing due.~~ **Closed 17 Nov** (D25). Every customer with a usable number has a link; the message changes with the balance, so a settled customer is thanked rather than asked for Rs 0. | — | The client's criteria ask for a button per customer; D5's intent was never to hide the button, only to avoid a meaningless demand. | Done. |
| L7 | **Entries are corrected by cancelling, never deleting.** A cancelled entry stays visible and stops counting. | Low | Decision D11. A ledger that can silently lose a row is not a ledger. | Nothing to fix; it is intended. Users expecting a delete button need one sentence of explanation. |
| L8 | **English only.** | Medium | Owner decision D20. The name HISAAB stays at the client's request. | Interface translation plus multilingual reminder templates. The reminder builder already takes a tone, so a language axis is a small change; the interface is the larger piece. |

## 2. Technical risks

| # | Risk | Severity | Mitigation in place |
| --- | --- | --- | --- |
| T1 | **A browser database schema bump cannot be rolled back.** Older code refuses to open a newer database. | Medium | `docs/10` section 4 records it. Treat a version bump as a one-way door and say so in the commit. |
| T2 | **Storage can fill up.** A phone low on space can refuse a write, especially with screenshots. | Medium | Every write is in a transaction, so a failure saves nothing partial, and the message says to free up space. Images are downscaled to 1600 px and re-encoded before storage. |
| T3 | **A very large book slows the first paint.** At 2,000 customers the list takes about 1.7 s to appear, because every customer must be in the page. | Low | Measured, and far above any realistic shop. Not virtualised on purpose: the tester contract requires one `[data-customer]` element per customer. |
| T4 | **Private browsing may block storage.** Some browsers refuse IndexedDB in private mode. | Low | The load error is shown plainly rather than failing silently. |
| T6 | **Erasing or restoring on one device changes every device on the link.** Sync pushes the result up a moment later, and the Undo exists only on the device that did it. | Medium | Both actions now say so before they run: the erase confirmation names it in capitals, and the restore preview adds a line. Found by testing the live round-trip, not by reading the code. |
| T5 | **An import of a hand-edited file can carry odd data.** | Low | Every row is validated before anything is written, the whole payload is planned before the first write, rejected rows are listed with reasons, and the import is undoable. Caps: 5,000 customers, 100,000 entries, 10 MB of text. |

## 3. Known departures from the master prompt

| # | Departure | Status |
| --- | --- | --- |
| D-A | **The Assistant & Ticketing module was removed** (owner decision D23, 16 Nov 2026). V3 section 6 mandates it and section 13 requires tracking its contract. | **Six of the twelve tester checks will fail.** The owner was shown this before deciding. Recorded in `docs/11` section B. A browser test asserts the selectors are gone, so the removal is deliberate and verified. The working module is in git history at commit `022315a`. |
| D-B | Multilingual reminders, suggested in V3 section 3.2 C, were removed. | Superseded by owner decision D20, English only. |

## 4. What is explicitly out of scope for this release

No app lock or PIN, no backup encryption, no per-customer delete, no interest or
due-date calculation, no GST or invoicing, no printing to a thermal printer, no
offline installability as a home-screen app, and no analytics of any kind.
Owner decision D17 covers the first three.

## 5. What we would do first with more time

1. **Accounts** (L1, L4). Sync exists now, but the link is the only credential. Proper sign-in and per-shop row-level security is the next step and the one that makes this sellable.
2. **A home-screen install** so the shop opens HISAAB like an app rather than a link.
3. **Interest and due dates**, which is the most common paid feature in the competitors.
4. **Interface translation** (L8), starting with the languages the first shops actually use.
