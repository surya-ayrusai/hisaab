# HISAAB — Project Context

Stable product context aligned to HISAAB_MASTER_META_PROMPT_V3. Version 2.0, 16 November 2026. Replaces "HISAAB – MASTER PROJECT CONTEXT" v1.0 (owner approval 16 Nov 2026).

## Product

Hisaab is a simple digital ledger for a local shop. It replaces the paper khata in which a shopkeeper records who bought on credit, who paid, and what each customer still owes.

Core promise: know who owes what, keep every entry clear, and remind customers through WhatsApp in one tap.

Not a full accounting, inventory, GST, POS or ERP system.

## Users

Owners and staff of kirana stores and other small local shops in India, using a phone, often while serving a customer, with varied digital literacy and sometimes weak connectivity.

## Core jobs

Add a customer · record credit · record payment · see customer balance · see shop total outstanding · review history · attach a payment screenshot · open a prefilled WhatsApp reminder · import JSON · keep records across reloads.

## Fixed business rules

- Customer: name and a valid, normalised 10-digit Indian mobile number; one customer per phone.
- CREDIT increases balance; PAYMENT decreases it. Amounts positive, stored as integer paise.
- Customer balance = sum of credits − sum of payments. Negative balances are shown and explained, never clamped.
- Shop total outstanding = sum of positive customer balances. One customer's advance never offsets another's dues.
- One calculation source for every view.
- No silent deletion or mutation of financial history.
- WhatsApp is click-to-chat only; nothing is sent automatically; no delivery claims.
- Browser-local data is not cloud backup and is not available on another device.

## Two modules

A. **Digital ledger** — the product.
B. **Assistant & Ticketing Demo** — separate, clinic-oriented demonstration required by the tester. Isolated data, navigation and terminology.

## Tester contracts (exact; do not change)

Ledger (V3 §5.1):
- `#total-outstanding` — text contains the number, for example 11820 or Rs 11,820
- `[data-customer="<phone>"]` with the balance inside `[data-balance]`
- `a[data-remind="<phone>"]` — link is `https://wa.me/91<phone>?text=<message>`
- textarea `#import-box` and button `#import-go` — tester pastes JSON and presses the button
- file input `#shot-input` on the payment form; saved entry shows `img[data-shot]`
- honour `?today=2026-11-15` for anything date-dependent

Assistant (V3 §6.2):
- `#chat-input`, `#chat-send`
- every bot reply has `.bot-msg`; the last one is the answer
- `?q=<question>` asks on load
- `#ticket-queue`; one `[data-ticket]` per ticket; `data-status` is `answered`, `needs human`, `urgent` or `closed`
- `#staff-reply` and `#staff-send` on each ticket
- tested with and without the AI key; lower score counts

## Approved constraints

- One deployed URL serves both contracts.
- Hosting: Vercel.
- First release: no AI provider, no server, no accounts.
- Ships with the supplied synthetic sample data for the demo.
- Reminder link only where there is a due.
- Mobile first; 375 px mandatory.
- Owner approval before implementation, scope or architecture change, data-affecting actions, paid services and deployment.

## Open product decisions

Framework · monetisation · cloud sync and login · full Hindi and Telugu interface · visual identity.

## Source of truth order

1. HISAAB_MASTER_META_PROMPT_V3
2. Approved PRD and approved change records
3. Approved architecture and roadmap
4. HISAAB_PROJECT_MEMORY and HISAAB_PROJECT_STATUS
5. Code and test results
