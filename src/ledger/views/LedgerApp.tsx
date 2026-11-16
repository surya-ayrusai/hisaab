"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { resolveEffectiveDate, type EffectiveDate } from "@/platform/dates";
import { Avatar, ChevronRightIcon, ClockIcon, PlusIcon, SearchIcon, SettingsIcon, WhatsAppIcon } from "@/ui/icons";
import { Wordmark } from "@/ui/Wordmark";
import type { CustomerRecord, EntryRecord } from "../data/db";
import type { LedgerSnapshot } from "../data/ledgerRepo";
import { balancesByCustomer, compareNewestFirst, countWithDues, totalOutstanding, type EntryType } from "../domain/balance";
import type { Rejection } from "../domain/importPlan";
import { formatIndianRupees, formatPlainRupees } from "../domain/money";
import { buildWhatsAppUrl, type ReminderTone } from "../domain/reminder";
import { AddCustomerSheet, EntrySheet } from "./forms";
import {
  AgeingSheet,
  CustomerDetailSheet,
  EntryLine,
  SettingsSheet,
  ShotSheet,
  StatementSheet,
  formatDate,
} from "./sheets";
import { useLedger } from "./useLedger";

type SheetState =
  | { kind: "none" }
  | { kind: "add-customer" }
  | { kind: "entry"; customerId: string; type: EntryType | null }
  | { kind: "detail"; customerId: string }
  | { kind: "statement"; customerId: string }
  | { kind: "ageing" }
  | { kind: "settings" }
  | { kind: "shot"; url: string };

interface Toast {
  text: string;
  undo?: () => Promise<void>;
}

interface ImportResult {
  tone: "ok" | "error";
  text: string;
  rejected: Rejection[];
  warnings: string[];
  snapshot?: LedgerSnapshot;
}

/**
 * One customer row. Memoised on purpose: a shop with a few thousand customers
 * renders a few thousand of these, and without this every sheet that opens or
 * closes re-rendered the whole list, which took seconds. Virtualising the list
 * would be faster still, but the tester contract requires one [data-customer]
 * element per customer in the page, so the list stays complete.
 */
const CustomerRow = memo(function CustomerRow({
  customer,
  balance,
  shopName,
  tone,
  onOpen,
  onEntry,
}: {
  customer: CustomerRecord;
  balance: number;
  shopName: string;
  tone: ReminderTone;
  onOpen: (customerId: string) => void;
  onEntry: (customerId: string, type: EntryType) => void;
}) {
  const remindUrl = buildWhatsAppUrl(customer.phone, {
    customerName: customer.name,
    shopName,
    balancePaise: balance,
    tone,
  });
  return (
    <li data-customer={customer.phone} className="card overflow-hidden">
      <button
        type="button"
        onClick={() => onOpen(customer.id)}
        className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-hairline/60"
      >
        <Avatar name={customer.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold">{customer.name}</span>
          <span className="tnum block text-sm text-muted">{customer.phone}</span>
        </span>
        <span className="shrink-0 text-right">
          <span
            className={`tnum block text-xl font-bold ${
              balance > 0 ? "text-due" : balance < 0 ? "text-paid" : "text-muted"
            }`}
          >
            <span aria-hidden="true">₹</span>
            <span data-balance>{formatPlainRupees(balance)}</span>
          </span>
          <span className="block text-xs font-bold uppercase tracking-wide text-muted">
            {balance > 0 ? "Due" : balance < 0 ? "Advance" : "Settled"}
          </span>
        </span>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted" />
      </button>
      <div className="hairline-top flex">
        <button
          type="button"
          onClick={() => onEntry(customer.id, "credit")}
          className="min-h-12 flex-1 text-sm font-bold text-due transition hover:bg-due-soft"
        >
          Credit
        </button>
        <button
          type="button"
          onClick={() => onEntry(customer.id, "payment")}
          className="min-h-12 flex-1 border-l border-hairline text-sm font-bold text-paid transition hover:bg-paid-soft"
        >
          Payment
        </button>
        {remindUrl && (
          <a
            data-remind={customer.phone}
            href={remindUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 flex-1 items-center justify-center gap-1.5 border-l border-hairline text-sm font-bold text-brand transition hover:bg-brand-soft"
          >
            <WhatsAppIcon className="h-4 w-4" />
            WhatsApp
          </a>
        )}
      </div>
    </li>
  );
});

export function LedgerApp() {
  const { state, loadError, reload, repo } = useLedger();
  const [effective, setEffective] = useState<EffectiveDate | null>(null);
  const [sheet, setSheet] = useState<SheetState>({ kind: "none" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "due">("newest");
  const [toast, setToast] = useState<Toast | null>(null);
  const [importText, setImportText] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  useEffect(() => {
    // The effective date depends on the page URL, which only exists in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of an external value after mount
    setEffective(resolveEffectiveDate(window.location.search));
  }, []);

  const openDetail = useCallback((customerId: string) => setSheet({ kind: "detail", customerId }), []);
  const openEntry = useCallback(
    (customerId: string, type: EntryType) => setSheet({ kind: "entry", customerId, type }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 10_000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const view = useMemo(() => {
    if (!state) return null;
    const balances = balancesByCustomer(
      state.entries,
      state.customers.map((c) => c.id),
    );
    const byId = new Map(state.customers.map((c) => [c.id, c]));
    const needle = search.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    const rows = state.customers
      .filter(
        (c) => needle === "" || c.name.toLowerCase().includes(needle) || (digits !== "" && c.phone.includes(digits)),
      )
      .sort((a, b) => {
        if (sort === "due") {
          const diff = (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0);
          if (diff !== 0) return diff;
        }
        if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
        return b.seq - a.seq;
      });
    return {
      balances,
      byId,
      rows,
      total: totalOutstanding(balances.values()),
      withDues: countWithDues(balances.values()),
      recent: [...state.entries].sort(compareNewestFirst).slice(0, 10),
    };
  }, [state, search, sort]);

  if (loadError) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-10">
        <Wordmark tone="onLight" />
        <p className="mt-4 text-base text-due">{loadError}</p>
      </main>
    );
  }

  if (!state || !view || !effective) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-10" aria-busy="true">
        <Wordmark tone="onLight" />
        <p className="mt-4 text-base text-muted">Opening your ledger…</p>
      </main>
    );
  }

  const { settings, shotUrls } = state;
  const close = () => setSheet({ kind: "none" });
  const viewShot = (url: string) => setSheet({ kind: "shot", url });
  const sheetCustomer =
    sheet.kind === "entry" || sheet.kind === "detail" || sheet.kind === "statement"
      ? (view.byId.get(sheet.customerId) ?? null)
      : null;

  async function cancelEntry(entry: EntryRecord) {
    if (!window.confirm("Cancel this entry? It will stay in the history but will no longer count.")) return;
    await repo.cancelEntry(entry.id, "Cancelled by shopkeeper");
    await reload();
    setToast({ text: "Entry cancelled." });
  }

  async function runImport() {
    if (importBusy) return;
    setImportBusy(true);
    setImportResult(null);
    try {
      const plan = await repo.planImport(importText);
      if (!plan.ok) {
        setImportResult({ tone: "error", text: plan.error, rejected: [], warnings: [] });
        return;
      }
      const outcome = await repo.applyImport(plan);
      await reload();
      const summary = `${outcome.created} customers added, ${outcome.matched} already in ledger, ${outcome.added} entries added, ${outcome.skipped} skipped as duplicates, ${outcome.rejected} rejected.`;
      setImportResult({
        tone: "ok",
        text:
          outcome.mode === "demo-replace" ? `Sample data was replaced by your import. ${summary}` : `Import complete. ${summary}`,
        rejected: plan.rejected,
        warnings: plan.warnings,
        snapshot: outcome.snapshot,
      });
    } catch {
      setImportResult({ tone: "error", text: "The import could not be completed. Nothing was changed.", rejected: [], warnings: [] });
    } finally {
      setImportBusy(false);
    }
  }

  async function undoSnapshot(snapshot: LedgerSnapshot, message: string) {
    await repo.restoreSnapshot(snapshot);
    await reload();
    setImportResult(null);
    setToast({ text: message });
  }

  async function clearSample() {
    if (!window.confirm("Remove the sample customers and start your own ledger?")) return;
    await repo.clearSampleData();
    await reload();
  }

  return (
    <>
      <header className="brand-gradient pb-16 text-white">
        <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-3 px-4 pt-4">
          <Wordmark subtitle={settings.shopName} />
          <button
            type="button"
            onClick={() => setSheet({ kind: "settings" })}
            aria-label="Settings and data"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      <main id="ledger" className="mx-auto -mt-12 w-full max-w-[720px] flex-1 px-4 pb-12">
        <section aria-label="Total to collect" className="card card-raised p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted">Total to collect</p>
              <p id="total-outstanding" className="display-amount tnum mt-1.5 text-due">
                Rs {formatIndianRupees(view.total)}
              </p>
            </div>
            <span className="mt-1 h-7 rounded-full bg-gold-soft px-2.5 text-xs font-bold leading-7 text-gold-ink">
              {formatDate(effective.today)}
            </span>
          </div>
          <div className="mt-4 flex items-stretch gap-3 border-t border-hairline pt-3">
            <div className="flex-1">
              <p className="tnum text-lg font-bold">{state.customers.length}</p>
              <p className="text-xs font-semibold text-muted">
                {state.customers.length === 1 ? "Customer" : "Customers"}
              </p>
            </div>
            <div className="flex-1 border-l border-hairline pl-3">
              <p className="tnum text-lg font-bold text-due">{view.withDues}</p>
              <p className="text-xs font-semibold text-muted">With dues</p>
            </div>
            <button
              type="button"
              data-open-ageing
              onClick={() => setSheet({ kind: "ageing" })}
              className="flex min-h-11 items-center gap-1 self-center rounded-xl bg-brand-soft px-3 text-sm font-bold text-brand transition hover:brightness-95"
            >
              <ClockIcon className="h-4 w-4" />
              Dues by age
            </button>
          </div>
        </section>

        {effective.overridden && (
          <p className="mt-3 rounded-xl bg-gold-soft px-3 py-2 text-sm font-semibold text-gold-ink">
            Showing as if today is {formatDate(effective.today)}.
          </p>
        )}
        {settings.isDemoData && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2">
            <p className="min-w-0 text-sm text-muted">Sample data, for a quick look.</p>
            <button
              type="button"
              onClick={clearSample}
              aria-label="Clear sample data"
              className="min-h-11 shrink-0 text-sm font-bold text-brand underline"
            >
              Clear
            </button>
          </div>
        )}

        <section aria-label="Customers" className="mt-5">
          <div className="flex gap-2">
            <label htmlFor="customer-search" className="sr-only">
              Search name or phone
            </label>
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="customer-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer"
                className="min-h-12 w-full rounded-xl border border-line bg-card pl-10 pr-3 text-base outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
              />
            </div>
            <button
              type="button"
              onClick={() => setSheet({ kind: "add-customer" })}
              aria-label="Add customer"
              className="flex min-h-12 shrink-0 items-center gap-1 rounded-xl bg-brand px-4 text-base font-bold text-white shadow-sm transition hover:bg-brand-deep"
            >
              <PlusIcon className="h-5 w-5" />
              Customer
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold">
              {search.trim() === "" ? "All customers" : `Results for “${search.trim()}”`}
            </h2>
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor="customer-sort" className="text-muted">
                Show first
              </label>
              <select
                id="customer-sort"
                value={sort}
                onChange={(e) => setSort(e.target.value === "due" ? "due" : "newest")}
                className="min-h-11 rounded-lg border border-line bg-card px-2 font-semibold outline-none"
              >
                <option value="newest">Newest</option>
                <option value="due">Highest dues</option>
              </select>
            </div>
          </div>

          {state.customers.length === 0 ? (
            <div className="card mt-3 p-8 text-center">
              <p className="text-base font-bold">No customers yet.</p>
              <p className="mt-1 text-sm text-muted">Add your first customer to start your ledger.</p>
              <button
                type="button"
                onClick={() => setSheet({ kind: "add-customer" })}
                className="mx-auto mt-4 flex min-h-12 items-center gap-1 rounded-xl bg-brand px-5 text-base font-bold text-white"
              >
                <PlusIcon className="h-5 w-5" />
                Add customer
              </button>
            </div>
          ) : view.rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No customer matches “{search}”.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {view.rows.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  balance={view.balances.get(customer.id) ?? 0}
                  shopName={settings.shopName}
                  tone={settings.reminderTone}
                  onOpen={openDetail}
                  onEntry={openEntry}
                />
              ))}
            </ul>
          )}
        </section>

        {view.recent.length > 0 && (
          <section aria-label="Recent entries" className="mt-7">
            <h2 className="text-base font-bold">Recent entries</h2>
            <ul className="card mt-2 divide-y divide-hairline px-4">
              {view.recent.map((entry) => (
                <EntryLine
                  key={entry.id}
                  entry={entry}
                  customerName={view.byId.get(entry.customerId)?.name}
                  shotUrl={shotUrls.get(entry.id)}
                  onViewShot={viewShot}
                />
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Bring in data" className="card mt-7 p-4">
          <h2 className="text-base font-bold">Bring in data</h2>
          <p className="mt-1 text-sm text-muted">
            Paste a ledger file (JSON) and press Import. New customers and entries are added, anything already in your
            ledger is skipped, and you can undo the import.
          </p>
          <label htmlFor="import-box" className="sr-only">
            Ledger data in JSON
          </label>
          <textarea
            id="import-box"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={5}
            spellCheck={false}
            placeholder='{"shop": "...", "customers": [...], "entries": [...]}'
            className="mt-3 block w-full rounded-xl border border-line bg-surface p-3 font-mono text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
          />
          <button
            id="import-go"
            type="button"
            onClick={runImport}
            disabled={importBusy}
            className="mt-2.5 min-h-12 w-full rounded-xl bg-brand px-4 text-base font-bold text-white shadow-sm transition hover:bg-brand-deep disabled:opacity-60"
          >
            {importBusy ? "Importing…" : "Import"}
          </button>
          {importResult && (
            <div
              role="status"
              data-import-result={importResult.tone}
              className={`mt-3 rounded-xl p-3 text-sm ${
                importResult.tone === "ok" ? "bg-paid-soft text-ink" : "bg-due-soft text-due"
              }`}
            >
              <p className="font-bold">{importResult.text}</p>
              {importResult.warnings.map((w) => (
                <p key={w} className="mt-1">
                  {w}
                </p>
              ))}
              {importResult.rejected.length > 0 && (
                <ul className="mt-2 list-disc pl-5">
                  {importResult.rejected.slice(0, 20).map((r) => (
                    <li key={`${r.list}-${r.row}`}>
                      {r.list === "customers" ? "Customer" : "Entry"} {r.row}: {r.reason}
                    </li>
                  ))}
                  {importResult.rejected.length > 20 && <li>and {importResult.rejected.length - 20} more.</li>}
                </ul>
              )}
              {importResult.snapshot && (
                <button
                  type="button"
                  onClick={() => undoSnapshot(importResult.snapshot!, "Import undone. Your ledger is as it was before.")}
                  className="mt-2 min-h-11 font-bold text-brand underline"
                >
                  Undo this import
                </button>
              )}
            </div>
          )}
        </section>

        <p className="mt-5 text-sm text-muted">
          Your ledger is stored only in this browser on this device. It is not saved on any server and will not appear on
          another phone. Clearing browser data will erase it, so download a backup from Settings.
        </p>
      </main>

      {sheet.kind === "add-customer" && (
        <AddCustomerSheet
          repo={repo}
          existing={state.customers}
          today={effective.today}
          onClose={close}
          onOpenExisting={(c) => setSheet({ kind: "detail", customerId: c.id })}
          onSaved={async (c) => {
            await reload();
            close();
            setToast({ text: `${c.name} added.` });
          }}
        />
      )}

      {sheet.kind === "entry" && sheetCustomer && (
        <EntrySheet
          repo={repo}
          customer={sheetCustomer}
          balancePaise={view.balances.get(sheetCustomer.id) ?? 0}
          initialType={sheet.type}
          today={effective.today}
          onClose={close}
          onSaved={async (entry) => {
            await reload();
            close();
            setToast({
              text: `${entry.type === "credit" ? "Credit" : "Payment"} of ₹${formatIndianRupees(entry.amountPaise)} saved.`,
              undo: async () => {
                await repo.cancelEntry(entry.id, "Undone right after saving");
                await reload();
              },
            });
          }}
        />
      )}

      {sheet.kind === "detail" && sheetCustomer && (
        <CustomerDetailSheet
          customer={sheetCustomer}
          balance={view.balances.get(sheetCustomer.id) ?? 0}
          entries={state.entries.filter((e) => e.customerId === sheetCustomer.id).sort(compareNewestFirst)}
          settings={settings}
          shotUrls={shotUrls}
          onClose={close}
          onEntry={(type) => setSheet({ kind: "entry", customerId: sheetCustomer.id, type })}
          onCancel={cancelEntry}
          onViewShot={viewShot}
          onStatement={() => setSheet({ kind: "statement", customerId: sheetCustomer.id })}
        />
      )}

      {sheet.kind === "statement" && sheetCustomer && (
        <StatementSheet
          customer={sheetCustomer}
          entries={state.entries.filter((e) => e.customerId === sheetCustomer.id)}
          settings={settings}
          today={effective.today}
          onClose={() => setSheet({ kind: "detail", customerId: sheetCustomer.id })}
        />
      )}

      {sheet.kind === "ageing" && (
        <AgeingSheet
          customers={state.customers}
          entries={state.entries}
          today={effective.today}
          onClose={close}
          onOpenCustomer={(c) => setSheet({ kind: "detail", customerId: c.id })}
        />
      )}

      {sheet.kind === "settings" && (
        <SettingsSheet
          repo={repo}
          settings={settings}
          customerCount={state.customers.length}
          onClose={close}
          onChanged={reload}
          onRestored={async (message, snapshot) => {
            await reload();
            close();
            setToast({
              text: message,
              undo: async () => {
                await repo.restoreSnapshot(snapshot);
                await reload();
              },
            });
          }}
        />
      )}

      {sheet.kind === "shot" && <ShotSheet url={sheet.url} onClose={close} />}

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-[560px] items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-2xl"
        >
          <p className="text-sm font-semibold">{toast.text}</p>
          {toast.undo && (
            <button
              type="button"
              className="pointer-events-auto min-h-11 shrink-0 px-2 text-sm font-bold text-gold underline"
              onClick={async () => {
                const undo = toast.undo!;
                setToast(null);
                await undo();
                setToast({ text: "Undone." });
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}
    </>
  );
}
