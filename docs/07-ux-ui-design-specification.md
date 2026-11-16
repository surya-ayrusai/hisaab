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
│ ayrus AI Assistant                  │  separate section (owner decision D16)
│ chat · tickets · clinic info        │
├─────────────────────────────────────┤
│ ayrus AI                            │  company band
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

### 3.9 Assistant & Ticketing Demo

- Chat: message list, quick-reply buttons, `#chat-input`, `#chat-send`.
- Ticket queue `#ticket-queue`: cards with number, question, status badge, priority, age, requested time, replies, and its own `#staff-reply` and `#staff-send`, plus Close.
- Clinic info editor: one field per knowledge item and language, Save with "Saved · version 4".

## 4. Design tokens (starting proposal)

| Token | Value | Use |
| --- | --- | --- |
| Primary | deep teal `#0F5C55` | header, main buttons |
| Credit / due | warm red `#B3261E` | amounts owed, Udhaar |
| Payment | green `#1B7F3B` | payments |
| Surface | off-white `#FAFAF7`, cards white | |
| Text | `#1C1C1A`; secondary `#5F5F5A` | |
| Demo band | pale blue-grey `#EEF2F6` | marks the separate module |
| Type | system font stack; amounts 28–32 px bold tabular; body 16 px | |
| Radius / spacing | 12 px; 8 px grid | |
| Touch target | 44 px minimum | |

Contrast for text on each colour to be checked at build. Icons always paired with words.

## 5. States

| State | Behaviour |
| --- | --- |
| Loading | Skeleton rows; `#total-outstanding` shows only once the figure is computed |
| Empty | Guidance and one action |
| Validation error | Message beside field; input kept |
| Storage full or write failed | "Could not save. Free up space or download a backup." Nothing partially saved |
| Date override active | Small banner "Showing as if today is 15 Nov 2026" |

## 6. Language

Interface in English for this release with Hindi-origin shop words where natural (Udhaar, Khata). Reminder messages in English, Hindi and Telugu. Full Hindi and Telugu interface is a later item.

## 7. Decisions required

1. One scrolling page with the demo band at the bottom (ADR-4), or a different arrangement.
2. Wording: "Udhaar" and "Payment" as the two button labels.
3. Colours above as a starting point.
