# HISAAB

A simple digital ledger for a local shop: who owes what, every entry clear, and a WhatsApp reminder in one tap.

Status: Phase 2 (foundation). The ledger screens are not built yet. See `HISAAB_PROJECT_STATUS.md`.

## Commands

```
npm install
npm run dev        # local development
npm test           # unit tests
npm run typecheck
npm run lint
npm run build
```

## Layout

- `src/ledger/domain` — money, phone, dates, balance, dues by age, reminder, import planning (pure functions)
- `src/ledger/data` — IndexedDB (Dexie) database and repository; bundled synthetic sample shop
- `tests/unit` — unit tests
- `docs/` — research, PRD, architecture, data model, UX, roadmap, tests, security
- `HISAAB_MASTER_META_PROMPT_V3.md` — governing project instruction

All data stays in the browser. Sample data is synthetic.
