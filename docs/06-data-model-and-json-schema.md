# 06 — Data Model and JSON Schema

Project: Hisaab · Phase 1 · 16 November 2026 · Status: **draft for owner approval**

## 1. Ledger database `hisaab-ledger`

### Shop settings (single record)

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| shopName | text | yes | 1–60 characters |
| reminderLanguage | `en` / `hi` / `te` | yes | default `en` |
| reminderTone | `friendly` / `polite` / `formal` | yes | default `polite` |
| isDemoData | boolean | yes | true while only untouched sample data is present |
| schemaVersion | integer | yes | for migrations |
| updatedAt | timestamp | yes | |

### Customer

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| id | text | yes | generated |
| phone | text | yes | 10 digits, **unique** |
| name | text | yes | 1–60 characters |
| notes | text | no | up to 200 characters |
| createdAt, updatedAt | timestamp | yes | |
| seq | integer | yes | keeps order for customers created in the same instant, such as an import |

Customers are not deleted in this release.

### Ledger entry

| Field | Type | Required | Rule |
| --- | --- | --- | --- |
| id | text | yes | generated |
| customerId | text | yes | must exist |
| type | `credit` / `payment` | yes | |
| kind | `normal` / `opening` | yes | `opening` only with type `credit` or `payment`, at most one per customer |
| amountPaise | integer | yes | greater than 0 |
| date | `YYYY-MM-DD` | yes | real calendar date |
| note | text | no | up to 80 characters |
| shotId | text | no | payments only |
| status | `active` / `cancelled` | yes | |
| cancelledAt, cancelReason | timestamp, text | when cancelled | |
| source | `manual` / `import` / `demo` | yes | |
| importKey | text | no | fingerprint for duplicate detection |
| createdAt | timestamp | yes | |

Indexes: customerId; date; status.

### Payment screenshot

| Field | Type | Rule |
| --- | --- | --- |
| id | text | generated |
| entryId | text | unique; must be a payment |
| blob | binary | JPEG, PNG or WebP; stored after downscaling to at most 1600 px on the long side |
| mimeType, bytes | text, integer | |
| createdAt | timestamp | |

### Import log

id, at, mode (`add` / `replace` / `demo-replace`), counts (created, matched, skipped, rejected), sourceVersion, and a snapshot reference kept until the user dismisses Undo or the next import.

### Reminder event (optional, Phase 4 if time allows)

id, customerId, at, language, tone, balancePaise. Records that the link was opened, not that a message was sent.

## 2. Demo database `hisaab-demo`

| Entity | Fields |
| --- | --- |
| Knowledge item | key (`timings`, `address`, `phone`, `fees`, `doctors`, `services`), text per language (`en`, `hi`, `te`), version, updatedAt |
| Quick reply | id, label, question, order |
| Ticket | id, number, createdAt, question, language, intent, status (`answered` / `needs human` / `urgent` / `closed`), priority (`urgent` / `high` / `normal`), requestedDate, requestedTime, botReply, updatedAt |
| Ticket message | id, ticketId, from (`staff`), text, at |

No field in this database refers to the ledger.

## 3. Import formats

### 3.1 Legacy format (the tester's; no version field)

```json
{
  "shop": "Lakshmi Provision Store (fictional)",
  "customers": [ { "name": "Ravi Kumar", "phone": "9000000101" } ],
  "entries": [
    { "phone": "9000000101", "type": "credit", "amount": 250, "date": "2026-09-27", "note": "groceries" }
  ]
}
```

`amount` is rupees. Entries join to customers by `phone`.

### 3.2 Hisaab format, version 1 (export and import)

A superset of the legacy format, so a file exported by Hisaab reads the same way.

```json
{
  "format": "hisaab-ledger",
  "version": 1,
  "exportedAt": "2026-11-16T10:00:00Z",
  "shop": "My Shop",
  "customers": [
    { "name": "Ravi Kumar", "phone": "9000000101", "createdAt": "2026-11-01T08:00:00Z", "notes": "" }
  ],
  "entries": [
    { "id": "e_01", "phone": "9000000101", "type": "credit", "kind": "normal", "amount": 250,
      "date": "2026-09-27", "note": "groceries", "status": "active",
      "createdAt": "2026-09-27T09:10:00Z", "hasScreenshot": false }
  ]
}
```

### 3.3 Validation rules

| Check | Result on failure |
| --- | --- |
| Text is valid JSON and an object | Whole import refused |
| `version` present and greater than 1, or `format` present and not `hisaab-ledger` | Whole import refused: "made by a newer or different app" |
| `customers` and `entries` are lists | Whole import refused |
| Customer `phone` normalises to 10 digits; `name` not empty | That customer and its entries rejected, listed by row |
| Same phone twice in the file | Later one matched to the first |
| Entry `phone` belongs to a customer in the file or already stored | Entry rejected |
| `type` is `credit` or `payment` (any letter case) | Entry rejected |
| `amount` is a number or numeric text, greater than 0, at most two decimals | Entry rejected |
| `date` is a real `YYYY-MM-DD` date | Entry rejected |
| `note` longer than 80 characters | Trimmed, counted as a warning |
| More than 5,000 customers or 100,000 entries, or text over 10 MB | Whole import refused |

Decision needed: if any row is rejected, should the rest still import? Recommendation: **yes** for the additive one-press path, with rejected rows listed, because the tester expects rows to appear; **no** for replace, which should refuse until the file is clean.

### 3.4 Duplicate handling in additive mode

- Customer already stored (same phone): matched; stored name kept; reported as "matched".
- Entry with an `id` already stored: skipped.
- Entry without `id`: fingerprint of phone, type, amount, date and note. If the store already holds *n* such entries and the file holds *m*, only *m − n* are added. Pasting the same file twice therefore changes nothing.

### 3.5 Attachments

Images are not in the JSON. `hasScreenshot` records that one existed. After a restore, such entries show "screenshot not in backup". A full backup including images is a later item.

### 3.6 Opening balances

Exported as an entry with `"kind": "opening"`. Counted once by the balance rules like any entry of its type.

## 4. Migrations

`schemaVersion` in settings; Dexie version upgrades are forward-only. Before any upgrade that rewrites records, the app offers a backup download.
