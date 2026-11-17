# 07 — UX / UI Design Specification

Project: HISAAB · 16 November 2026 · Status: **as built and deployed** at https://hisaab-ayrus3.vercel.app. Supersedes the Phase 1 wireframe draft.

## 1. Principles

One page. The biggest thing on screen is what the shop is owed. Two verbs only: Credit (goods given) and Payment (money received). Every save can be undone. English throughout, in the plainest words that still say the right thing (owner decision D20).

## 2. Page structure at 375 px

```
┌─────────────────────────────────────┐
│ HISAAB · <Shop name>            ⚙   │  gradient header, settings button
├─────────────────────────────────────┤
│ ┌─ card, lifted over the header ──┐ │
│ │ TOTAL TO COLLECT     [15 Nov]   │ │
│ │ Rs 11,820         #total-outstanding
│ │ 8 Customers │ 8 With dues │ ⏱ Dues by age
│ └─────────────────────────────────┘ │
│ [Showing as if today is …]          │  only with ?today=
│ [Sample data — Clear sample data]   │  only while sample data is loaded
├─────────────────────────────────────┤
│ 🔍 Search customer        [+ Customer]
│ All customers        Show first [▾] │
├─────────────────────────────────────┤
│ (S) Sunita Devi          ₹3470  ›   │  [data-customer] row; number is [data-balance]
│     9000000102            DUE       │
│ ──────────────────────────────────  │
│ Credit │ Payment │ ⬤ WhatsApp       │  WhatsApp = a[data-remind], only if due
├─────────────────────────────────────┤
│ … more rows …                       │
├─────────────────────────────────────┤
│ Recent entries                      │  latest 10, with screenshot thumbnails
├─────────────────────────────────────┤
│ Bring in data                       │
│ [ textarea  #import-box          ]  │
│ [ Import  #import-go ]              │
├─────────────────────────────────────┤
│ Storage notice                      │
╞═════════════════════════════════════╡
│ ayrus AI                            │  company band
└─────────────────────────────────────┘
```

Everything beyond the home page is a bottom sheet, so the ledger is never more than one tap away and nothing navigates away from the total. Tablet and desktop: the same order in a centred column up to 720 px; sheets become centred cards from 640 px.

## 3. Screens and sheets

### 3.1 Home (above)

- A row shows the customer's initial, name, phone and balance. Money owed in the due colour, an overpayment labelled "Advance", a settled customer in neutral grey.
- Tapping the row opens Customer detail. The three actions below it skip that step: Credit, Payment, WhatsApp.
- Empty state: "No customers yet." with one button.

### 3.2 Add customer (sheet)

Name and mobile number (numeric keypad). A tick box, "This customer already owes money", reveals an opening amount and the date it has been owed since; it is written as a single `kind: "opening"` credit entry so it is counted once and shows in the history (FR-024). A duplicate phone shows the existing customer with "Open".

### 3.3 Entry form (sheet) — the payment form

```
Sunita Devi · Owes ₹3,470
[ Credit ]  [ Payment ]        ← two large toggles, no default when opened from the row
Amount  ₹ [        ]           ← numeric keypad, focused, 30 px figure
Date    [ 15 Nov 2026 ]        ← effective today
Note    [ optional ]
Payment screenshot  [ Choose file ]   ← input #shot-input, shown for Payment
[ Save payment of ₹500 ]       ← button text repeats type and amount
```

- Opened from a row's Credit or Payment button the type is preset, so the routine path is: button, amount, Save.
- The Save button takes the colour and wording of the type, which is what prevents a wrong-type save.
- The button disables on first press, so a double tap cannot save twice.
- A payment larger than the balance says so before saving: the extra will show as an advance.
- After saving: the sheet closes, the row and total update, and a toast offers Undo.

### 3.4 Customer detail (sheet)

Balance, with credit given and received beneath it. Four actions: Credit, Payment, Remind (if due) and Statement. History newest first — date, type, amount, note, thumbnail if any (`img[data-shot]`), and a quiet Cancel action. Cancelled entries are struck through and stop counting.

This sheet does not use `data-customer` or `data-balance`, so the home rows stay the only match.

### 3.5 Import

On the home page. After pressing Import:
- Additive: a summary — customers added, already in ledger, entries added, skipped as duplicates, rejected — with Undo.
- Sample data present and untouched: "Sample data was replaced by your import", with Undo.
- Errors: a panel listing row and reason; the pasted text stays in the box.
- Replacing the whole ledger is deliberately **not** on this button. It lives in Settings, behind a preview and a tick box (3.6).

### 3.6 Settings and data (sheet)

Shop name · reminder tone (Friendly, Polite, Formal) with a live preview of the actual WhatsApp message · Download backup · Restore from backup · Erase all data · the storage and privacy explanation.

Restore shows what the file holds and what will be lost, and needs a tick box before the button works. Restore and Erase both leave an Undo in the toast. Backups carry customers and entries, not payment screenshots, and the sheet says so.

### 3.7 How old are the dues (sheet)

Five bands with amounts and a share bar, the total beneath them, then customers ordered by the oldest unpaid credit with the number of days. One line of explanation: payments are counted against the oldest credit first.

### 3.8 Statement (print view)

Shop name, customer, period, opening balance, dated lines with a running balance, closing balance, and a sentence stating what is owed as on the end date. "Print or save as PDF" prints the statement alone, through a print stylesheet that hides the rest of the page.

## 4. Design system (as built)

Defined once in `src/app/globals.css` as Tailwind theme tokens, so every screen draws from the same set.

| Token | Value | Use |
| --- | --- | --- |
| `--color-brand` | deep emerald `#0b4f43` | primary buttons, links, brand gradient |
| `--color-brand-deep` | `#06302a` | gradient end, footer band |
| `--color-brand-soft` | `#e7f0ed` | quiet brand surfaces, selected chips |
| `--color-gold` | muted gold `#b98a2e` | the single accent: date chip, ayrus AI mark, undo |
| `--color-gold-soft` | `#fbf4e4` | accent surfaces, the date-override banner |
| `--color-due` | `#b42318` | money owed, credit entries, destructive actions |
| `--color-due-soft` | `#fef3f2` | due surfaces |
| `--color-paid` | `#067647` | money received, payment entries |
| `--color-paid-soft` | `#ecfdf3` | paid surfaces |
| `--color-ink` / `--color-body` / `--color-muted` / `--color-faint` | `#0c111d` / `#344054` / `#5b6878` / `#98a2b3` | four steps of text weight. `--color-faint` is hairlines and decorative glyphs only, never text |
| `--color-line` / `--color-hairline` | `#e4e7ec` / `#f2f4f7` | card edges and internal dividers |
| `--color-surface` / `--color-card` | `#eef3f0` / `#ffffff` | page behind cards, and the cards |
| `--radius-card` | 16 px | every card and sheet, 8 px grid elsewhere |

Utility classes carry the rest: `.card` (radius, hairline ring, one-pixel lift), `.card-raised` (the hero card), `.brand-gradient` (header and footer), `.display-amount` (40 px / 800 weight / tight tracking for the headline figure), `.tnum` (tabular numerals, so columns of money line up), `.hairline-top`, and a `:focus-visible` ring in the brand colour.

**Rules the tokens enforce.** Red is only ever money owed; green is only ever money received; gold is an accent and never a status. The brand colour never states an amount, so a shopkeeper reading quickly cannot confuse a button with a balance. Icons are inline SVG defined in `src/ui/icons.tsx` — no icon library, no remote asset, so the page stays fast and works offline.

**The page field.** The background is not flat. A fixed `body::before` layer carries two brand washes, a warm one and a fine dot grid, so a long customer list scrolls over a still background. It is a pseudo-element rather than `background-attachment: fixed`, which is cheaper and behaves on iOS, and it is hidden in print. Cards stay pure white, so the texture never touches the contrast of anything a shopkeeper reads.

**Contrast.** Measured against both white and the page field. Body text `#344054` is 9.3:1 on white and 9.3:1 on the field; muted `#5b6878` is 5.7:1 and 5.1:1 — it was darkened from `#667085` when the field deepened, which took it from 4.43:1 there to 5.06:1; white on `#0b4f43` is 10.4:1; `#b42318` on white is 6.6:1; `#067647` on white is 4.9:1. All pass WCAG AA for their sizes. Touch targets stay at 44 px minimum.

## 5. States

| State | Behaviour |
| --- | --- |
| Loading | "Opening your ledger…"; `#total-outstanding` appears only once the figure is computed |
| Empty | Guidance and one action (Add customer) |
| Validation error | Message beside the field; the input is kept |
| Storage full or write failed | "Could not save. Free up space or try again." Nothing is partially saved |
| Date override active | Banner "Showing as if today is 15 Nov 2026" |
| Destructive action | Preview first, explicit confirmation, then an Undo in the toast |

## 6. Language

English throughout, by owner decision D20 — interface, buttons, reminder messages, statements and errors. The product name HISAAB is the one exception, kept at the client's request. Amounts use Indian digit grouping (11,820) and the rupee sign; the plain, ungrouped number is what sits inside `[data-balance]` for the automated tester.

## 7. Decisions taken

| # | Decision |
| --- | --- |
| 1 | One scrolling page; the ayrus AI band closes it (ADR-4, amended by D23 — no demo band, the assistant module was removed) |
| 2 | Button labels are "Credit" and "Payment", in English (D20) |
| 3 | Palette as in section 4, replacing the starting proposal: deep emerald with a muted gold accent |
| 4 | Secondary views are bottom sheets, not pages, so the ledger is never more than one tap away |
