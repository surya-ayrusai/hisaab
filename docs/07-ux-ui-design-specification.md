# 07 — UX / UI Design Specification

Project: Hisaab · Phase 1 · 16 November 2026 · Status: **draft for owner approval**. Wireframe level; no visual design has been produced.

## 1. Principles

One page. Biggest thing on screen is what the shop is owed. Two verbs only: Udhaar (credit given) and Payment received. Every save can be undone. Words a shopkeeper uses.

## 2. Page structure at 375 px

```
┌─────────────────────────────────────┐
│ Hisaab · <Shop name>            ⚙   │  header
│ [Sample data — Clear]               │  only while demo data is loaded
├─────────────────────────────────────┤
│ Total to collect                    │
│ Rs 11,820          #total-outstanding
│ 8 customers · 8 with dues           │
│ [ How old are the dues › ]          │
├─────────────────────────────────────┤
│ 🔍 Search name or phone   [+ Customer]
├─────────────────────────────────────┤
│ Sunita Devi                 ₹ 3470  │  [data-customer] row; number is [data-balance]
│ 9000000102                          │
│ [Udhaar] [Payment] [WhatsApp]       │  WhatsApp = a[data-remind], only if due
├─────────────────────────────────────┤
│ … more rows …                       │
├─────────────────────────────────────┤
│ Recent entries                      │  latest 10, with screenshot thumbnails
├─────────────────────────────────────┤
│ Bring in data                       │
│ [ textarea  #import-box          ]  │
│ [ Import  #import-go ]              │
├─────────────────────────────────────┤
│ Data on this phone only · Backup    │
╞═════════════════════════════════════╡
│ ayrus AI                            │  company band (the assistant section
│                                     │  was removed by decision D23)
└─────────────────────────────────────┘
```

A fixed bottom bar offers two jumps: **Khata** and **Demo**. Tablet and desktop: same order in a centred column up to 720 px; the demo band may sit as a second column from 1100 px.

## 3. Screens and sheets

### 3.1 Home (above)

- Row shows name, phone, balance. Due in the credit colour, advance labelled "Advance" with a negative number, zero in neutral.
- Tapping the name opens Customer detail.
- Empty state: "No customers yet. Add your first customer." with one button.

### 3.2 Add customer (sheet)

Fields: Name, Mobile number (numeric keypad). Optional "Already owes" amount and date (FR-024). Save disabled until valid. Duplicate phone shows the existing customer with "Open".

### 3.3 Entry form (sheet) — the payment form

```
Sunita Devi · owes ₹3,470
[ Udhaar ]  [ Payment ]        ← two large toggles, no default when opened from the row's name
Amount  ₹ [        ]           ← numeric keypad, focused
Date    [ 16 Nov 2026 ]        ← effective today
Note    [ optional ]
Payment screenshot  [ Choose file ]   ← input #shot-input, shown for Payment
[ Save payment of ₹500 ]       ← button text repeats type and amount
```

- Opened from a row's Udhaar or Payment button, the type is preset, so the routine path is: button, amount, Save.
- Save button colour and wording follow the type, to prevent wrong-type saves.
- Double-tap protection: button disables on first press.
- After save: sheet closes, row and total update, toast "Payment ₹500 saved · Undo".

### 3.4 Customer detail (sheet)

Name, phone, balance, three actions (Udhaar, Payment, WhatsApp if due), Statement. History newest first. Each entry: date, type, amount, note, thumbnail if any (`img[data-shot]`), and a Cancel action. Cancelled entries struck through with "cancelled on …".

This sheet does not use `data-customer` or `data-balance`, so the home rows stay the only match.

### 3.5 Import

On the home page. After pressing Import:
- Additive: green summary "8 customers added, 38 entries added, 0 skipped, 0 rejected · Undo".
- Sample data present and untouched: "Sample data was replaced by your import · Undo".
- Replace or conflicts: preview panel with counts, a plain explanation of Add versus Replace, and "Replace my data" requiring a tick box first.
- Errors: red panel listing row and reason; the pasted text stays in the box.

### 3.6 Settings and data (sheet)

Shop name · reminder language and tone with live preview of the message · Download backup · Restore from backup · Clear sample data · storage and privacy explanation.

### 3.7 How old are the dues (sheet)

Five bands with amounts, then customers ordered by oldest unpaid credit. One line of explanation: "Payments are counted against the oldest udhaar first."

### 3.8 Statement (print view)

Shop name, customer, period, opening balance, dated lines, closing balance. "Print or save as PDF".

### 3.9 Assistant & Ticketing Demo — removed by owner decision D23 (16 Nov 2026)

- Chat: message list, quick-reply buttons, `#chat-input`, `#chat-send`.
- Ticket queue `#ticket-queue`: cards with number, question, status badge, priority, age, requested time, replies, and its own `#staff-reply` and `#staff-send`, plus Close.
- Clinic info editor: one field per knowledge item and language, Save with "Saved · version 4".

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
| `--color-ink` / `--color-body` / `--color-muted` / `--color-faint` | `#0c111d` / `#344054` / `#667085` / `#98a2b3` | four steps of text weight |
| `--color-line` / `--color-hairline` | `#e4e7ec` / `#f2f4f7` | card edges and internal dividers |
| `--color-surface` / `--color-card` | `#f6f8f7` / `#ffffff` | page behind cards, and the cards |
| `--radius-card` | 16 px | every card and sheet, 8 px grid elsewhere |

Utility classes carry the rest: `.card` (radius, hairline ring, one-pixel lift), `.card-raised` (the hero card), `.brand-gradient` (header and footer), `.display-amount` (40 px / 800 weight / tight tracking for the headline figure), `.tnum` (tabular numerals, so columns of money line up), `.hairline-top`, and a `:focus-visible` ring in the brand colour.

**Rules the tokens enforce.** Red is only ever money owed; green is only ever money received; gold is an accent and never a status. The brand colour never states an amount, so a shopkeeper reading quickly cannot confuse a button with a balance. Icons are inline SVG defined in `src/ui/icons.tsx` — no icon library, no remote asset, so the page stays fast and works offline.

**Contrast.** Body text `#344054` on white is 9.3:1; muted `#667085` on white is 5.2:1; white on `#0b4f43` is 10.4:1; `#b42318` on white is 6.6:1; `#067647` on white is 4.9:1. All pass WCAG AA for their sizes. Touch targets stay at 44 px minimum.

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

English throughout, by owner decision D22 — interface, buttons, reminder messages, statements and errors. The product name HISAAB is the one exception, kept at the client's request. Amounts use Indian digit grouping (11,820) and the rupee sign; the plain, ungrouped number is what sits inside `[data-balance]` for the automated tester.

## 7. Decisions taken

| # | Decision |
| --- | --- |
| 1 | One scrolling page; the ayrus AI band closes it (ADR-4, amended by D23 — no demo band, the assistant module was removed) |
| 2 | Button labels are "Credit" and "Payment", in English (D22) |
| 3 | Palette as in section 4, replacing the starting proposal: deep emerald with a muted gold accent |
| 4 | Secondary views are bottom sheets, not pages, so the ledger is never more than one tap away |
