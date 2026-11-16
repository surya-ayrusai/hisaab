# 13 — Security and Privacy Considerations

Project: Hisaab · Phase 1 · 16 November 2026 · Status: **draft for owner approval**. This is a plan. No control below has been implemented or tested. No regulatory compliance is claimed.

## 1. What data exists and where

| Data | Where it lives | Who can reach it |
| --- | --- | --- |
| Customer names and mobile numbers | IndexedDB in the shopkeeper's browser | Anyone with the unlocked phone and that browser |
| Credit and payment entries | Same | Same |
| Payment screenshots (may show UPI IDs, bank names, references) | Same, as image blobs | Same |
| Backup files | Wherever the shopkeeper saves or shares them | Whoever receives the file |
| Demo clinic information and tickets | Separate IndexedDB database | Same as above |

Nothing is sent to a server. Vercel serves the page files only. The single outbound action is opening a `wa.me` link, which hands a customer's number and the message to WhatsApp when the shopkeeper taps it.

## 2. Requirements

| ID | Risk | Control |
| --- | --- | --- |
| SEC-001 | Imported names or notes containing markup run as code | All user and imported text rendered as text only; no HTML injection points; tested with script payloads |
| SEC-002 | Malformed or huge JSON freezes or corrupts the app | Size and count limits; schema validation of the whole payload before any write; single transaction; snapshot and Undo |
| SEC-003 | Prototype-pollution style keys in JSON | Parsed data copied field by field into typed records; unknown keys ignored |
| SEC-004 | Harmful or oversized files in the screenshot input | Accept JPEG, PNG, WebP only; check actual image decoding, not just the file name; 5 MB limit; re-encode after downscaling, which drops embedded metadata |
| SEC-005 | Broken or misleading WhatsApp link | Phone validated as 10 digits before building; `91` added once; message passed through URL encoding; link opens in a new tab with no opener access |
| SEC-006 | Secrets in client code | None exist in this release. If an AI provider is added later, the key stays in a server function, never in the page |
| SEC-007 | Third-party scripts reading ledger data | No analytics, fonts or scripts from other domains; a content security policy restricting sources to the site itself |
| SEC-008 | Shared or lost phone | Stated plainly in the app. No app lock in this release; relies on the phone's lock. App PIN is a later option, and would deter casual viewing only |
| SEC-009 | Backup file exposes customer data | Warning at download: "This file contains your customers' names, numbers and balances. Share it carefully." No encryption in this release |
| SEC-010 | Accidental loss through replace, restore or clearing | Preview and explicit confirmation; backup offered first; Undo |
| SEC-011 | Silent data loss when the browser evicts storage | Request persistent storage from the browser where supported; show a reminder to back up; never describe local storage as backup |
| SEC-012 | Real customer data in a public demo | Only synthetic sample data ships with the app |

## 3. What the user is told

On first run and in Settings:

- Your khata is stored only in this browser on this phone.
- It is not on any server and will not appear on another phone.
- If you clear browser data, uninstall the browser or lose the phone, the khata is gone unless you have downloaded a backup.
- Backups do not include payment screenshots in this version.
- Tapping WhatsApp opens WhatsApp with a message; you decide whether to send it.

## 4. Deletion and retention

Data stays until the shopkeeper clears it. "Erase all data" in Settings removes both ledger records and images after confirmation. Cancelled entries are retained as history. Customers cannot be deleted individually in this release; this is a known limitation to revisit.

## 5. Not covered in this release

Authentication, encryption at rest, access logs, multi-user roles, server-side backup, formal assessment against Indian data-protection law. Each becomes necessary before Hisaab stores real shop data on a server.

## 6. Decisions required

1. Accept no app lock and no backup encryption for the demo.
2. Accept that individual customers cannot be deleted in this release.
