# 08 — Implementation Roadmap

Project: Hisaab · Phase 1 · 16 November 2026 · Status: **draft for owner approval**. No implementation has started.

Effort is given as relative size (S, M, L), not days. No repository exists and no target date has been given, so calendar estimates would be guesses. Tell me the demo date and I will convert sizes into a dated plan.

Sizes assume: Vite + React + TypeScript, browser-local storage, one builder, tests written alongside.

## Order and dependencies

```
Phase 2 Foundation ──► Phase 3 Core ledger ──► Phase 4 Ledger workflows ──┐
        └────────────► Phase 5 Assistant demo ────────────────────────────┼─► Phase 6 Hardening ─► Phase 7 Deploy
```

Phase 5 depends only on Phase 2, so it can follow Phase 3 or run after Phase 4. Recommendation: 2 → 3 → 4 (tester items first) → 5 → 4 (remaining items) → 6 → 7. That clears every tester check before the non-tester features.

## Phase 2 — Foundation · size M

| Item | Detail |
| --- | --- |
| Objective | A running shell with storage, money and date utilities, and tests |
| Scope | Repository, build, page shell at 375 px, design tokens, two databases, repositories, money and phone and effective-date modules, validation schemas, error boundary, unit and browser test setup |
| Dependencies | Approval of ADR-1 to ADR-6; Git repository |
| Deliverables | Running page locally; FR-007, FR-017, FR-018 logic |
| Acceptance | App starts; unit tests for balance, paise parsing, phone normalisation and `?today=` pass; sample file reproduces expected balances in a unit test |
| Risks | Library versions; IndexedDB behaviour in private browsing |
| Definition of done | Tests green; nothing user-facing claimed |
| Gate | Owner sees test report |

## Phase 3 — Core ledger · size L

| Item | Detail |
| --- | --- |
| Objective | Usable khata on the home page |
| Scope | FR-001 to FR-006, FR-008 to FR-010, FR-019, FR-021 |
| Dependencies | Phase 2 |
| Deliverables | Home with total, rows, search, add customer, entry form, customer detail, cancel and undo, sample data |
| Acceptance | TC-L1 and TC-L2 pass in browser tests with sample data; totals correct after add, cancel, reload |
| Risks | Wrong-type entry; double submission |
| Definition of done | Browser tests at 375 px and desktop pass; checklist updated with evidence |
| Gate | Owner walkthrough on a preview link |

## Phase 4 — Practical ledger workflows · size L

Split in two.

**4a, tester items (size M):** FR-011 screenshot, FR-012 reminder link, FR-014 and FR-015 import, FR-020 settings. Acceptance: TC-L3, TC-L4, TC-L5, TC-L6 pass.

**4b, remaining (size M):** FR-013 templates, FR-016 backup and restore, FR-022 dues by age, FR-023 statement, FR-024 opening balance. Acceptance: band totals equal the total; statement closing balance equals the row balance; backup then restore gives identical balances.

Risks: image size and storage quota; import edge cases; Hindi and Telugu encoding in links.
Gate: owner review of import and reminder behaviour.

## Phase 5 — Assistant & Ticketing Demo · size M

| Item | Detail |
| --- | --- |
| Objective | Pass the assistant contract with no key |
| Scope | AR-001 to AR-014 |
| Dependencies | Phase 2 only |
| Acceptance | TC-A1 to TC-A6 pass; two consecutive runs give identical results |
| Risks | Romanised Hindi and Telugu; time phrases in bookings |
| Gate | Owner tries ten questions in three languages |

## Phase 6 — Quality and hardening · size M

Full regression at 375 px, tablet and desktop; accessibility pass; import abuse tests; storage-full behaviour; performance with 500 customers; security review against document 13. Acceptance: no open critical or high defects, or each one accepted by you in writing.

## Phase 7 — Deployment and handover · size S

Vercel project, production deploy after your approval, checks repeated on the live URL, documents 10, 12 and 14, final checklist with evidence. Rollback: redeploy the previous build; browser data is unaffected by a redeploy.

## Requirement to phase map

| Phase | Requirements |
| --- | --- |
| 2 | FR-007, FR-017, FR-018 |
| 3 | FR-001–006, FR-008–010, FR-019, FR-021 |
| 4a | FR-011, FR-012, FR-014, FR-015, FR-020 |
| 4b | FR-013, FR-016, FR-022, FR-023, FR-024 |
| 5 | AR-001–014 |
| 6 | NFR-001–008 verified |

## What I need from you to start Phase 2

1. Approval of documents 04 to 09 and 13.
2. A Git repository and Vercel project, or permission to create them in your accounts.
3. Demo date, if there is one.
