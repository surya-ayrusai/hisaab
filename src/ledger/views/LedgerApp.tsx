"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet } from "@/ui/Sheet";
import type { CustomerRecord, EntryRecord } from "../data/db";
import type { LedgerSnapshot } from "../data/ledgerRepo";
import { balancesByCustomer, compareNewestFirst, countWithDues, totalOutstanding, type EntryType } from "../domain/balance";
import { resolveEffectiveDate, type EffectiveDate } from "@/platform/dates";
import type { Rejection } from "../domain/importPlan";
import { formatIndianRupees, formatPlainRupees } from "../domain/money";
import { buildWhatsAppUrl } from "../domain/reminder";
import { AddCustomerSheet, EntrySheet } from "./forms";
import { useLedger } from "./useLedger";

type SheetState =
  | { kind: "none" }
  | { kind: "add-customer" }
  | { kind: "entry"; customerId: string; type: EntryType | null }
  | { kind: "detail"; customerId: string }
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

function formatDate(iso: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(iso.slice(8, 10))} ${months[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

function EntryLine({
  entry,
  customerName,
  shotUrl,
  onViewShot,
  onCancel,
}: {
  entry: EntryRecord;
  customerName?: string;
  shotUrl?: string;
  onViewShot: (url: string) => void;
  onCancel?: (entry: EntryRecord) => void;
}) {
  const cancelled = entry.status === "cancelled";
  const isCredit = entry.type === "credit";
  return (
    <li data-entry={entry.id} data-entry-type={entry.type} className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${cancelled ? "text-muted line-through" : ""}`}>
          {customerName ? `${customerName} · ` : ""}
          {isCredit ? "Credit" : "Payment"}
          {entry.kind === "opening" ? " (opening balance)" : ""}
        </p>
        <p className="text-sm text-muted">
          {formatDate(entry.date)}
          {entry.note ? ` · ${entry.note}` : ""}
        </p>
        {cancelled && <p className="text-xs text-muted">Cancelled{entry.cancelReason ? ` · ${entry.cancelReason}` : ""}</p>}
        {!cancelled && onCancel && (
          <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-muted underline" onClick={() => onCancel(entry)}>
            Cancel this entry
          </button>
        )}
      </div>
      {shotUrl && (
        <button type="button" onClick={() => onViewShot(shotUrl)} className="shrink-0" aria-label="View payment screenshot">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob from the browser database */}
          <img
            data-shot={entry.id}
            src={shotUrl}
            alt={`Payment screenshot for ₹${formatIndianRupees(entry.amountPaise)} on ${formatDate(entry.date)}`}
            className="h-12 w-12 rounded-lg border border-line object-cover"
          />
        </button>
      )}
      <p className={`tnum shrink-0 text-base font-bold ${cancelled ? "text-muted line-through" : isCredit ? "text-due" : "text-paid"}`}>
        {isCredit ? "+" : "−"} ₹{formatIndianRupees(entry.amountPaise)}
      </p>
    </li>
  );
}

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
      <main className="mx-auto w-full max-w-[720px] px-4 py-8">
        <h1 className="text-2xl font-bold">HISAAB</h1>
        <p className="mt-3 text-base text-due">{loadError}</p>
      </main>
    );
  }

  if (!state || !view || !effective) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-4 py-8" aria-busy="true">
        <h1 className="text-2xl font-bold">HISAAB</h1>
        <p className="mt-3 text-base text-muted">Opening your ledger…</p>
      </main>
    );
  }

  const { settings, shotUrls } = state;
  const close = () => setSheet({ kind: "none" });
  const viewShot = (url: string) => setSheet({ kind: "shot", url });

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
        text: outcome.mode === "demo-replace" ? `Sample data was replaced by your import. ${summary}` : `Import complete. ${summary}`,
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

  async function undoImport(snapshot: LedgerSnapshot) {
    await repo.restoreSnapshot(snapshot);
    await reload();
    setImportResult({ tone: "ok", text: "Import undone. Your ledger is as it was before.", rejected: [], warnings: [] });
  }

  async function clearSample() {
    if (!window.confirm("Remove the sample customers and start your own ledger?")) return;
    await repo.clearSampleData();
    await reload();
  }

  const sheetCustomer =
    sheet.kind === "entry" || sheet.kind === "detail" ? (view.byId.get(sheet.customerId) ?? null) : null;

  return (
    <>
      <header className="bg-brand text-white">
        <div className="mx-auto flex w-full max-w-[720px] items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xl font-bold leading-tight">HISAAB</p>
            <p className="truncate text-sm opacity-90">{settings.shopName}</p>
          </div>
        </div>
      </header>

      <main id="ledger" className="mx-auto w-full max-w-[720px] flex-1 px-4 pb-10">
        {effective.overridden && (
          <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-muted ring-1 ring-line">
            Showing as if today is {formatDate(effective.today)}.
          </p>
        )}
        {settings.isDemoData && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-line">
            <p className="text-sm text-muted">Sample data, for a quick look.</p>
            <button type="button" onClick={clearSample} className="min-h-11 shrink-0 text-sm font-bold text-brand underline">
              Clear sample data
            </button>
          </div>
        )}

        <section aria-label="Total to collect" className="mt-3 rounded-2xl bg-white p-4 ring-1 ring-line">
          <p className="text-sm font-semibold text-muted">Total to collect</p>
          <p id="total-outstanding" className="tnum mt-1 text-4xl font-extrabold text-due">
            Rs {formatIndianRupees(view.total)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {state.customers.length} {state.customers.length === 1 ? "customer" : "customers"} · {view.withDues} with dues
          </p>
        </section>

        <section aria-label="Customers" className="mt-4">
          <div className="flex gap-2">
            <label htmlFor="customer-search" className="sr-only">
              Search name or phone
            </label>
            <input
              id="customer-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="button"
              onClick={() => setSheet({ kind: "add-customer" })}
              className="min-h-12 shrink-0 rounded-xl bg-brand px-4 text-base font-bold text-white"
            >
              + Customer
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <label htmlFor="customer-sort" className="text-muted">
              Show first
            </label>
            <select
              id="customer-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value === "due" ? "due" : "newest")}
              className="min-h-11 rounded-lg border border-line bg-white px-2 font-semibold"
            >
              <option value="newest">Newest customers</option>
              <option value="due">Highest dues</option>
            </select>
          </div>

          {state.customers.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-white p-6 text-center ring-1 ring-line">
              <p className="text-base font-semibold">No customers yet.</p>
              <p className="mt-1 text-sm text-muted">Add your first customer to start your ledger.</p>
            </div>
          ) : view.rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No customer matches “{search}”.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {view.rows.map((customer) => {
                const balance = view.balances.get(customer.id) ?? 0;
                const remindUrl = buildWhatsAppUrl(customer.phone, {
                  customerName: customer.name,
                  shopName: settings.shopName,
                  balancePaise: balance,
                  language: settings.reminderLanguage,
                  tone: settings.reminderTone,
                });
                return (
                  <li key={customer.id} data-customer={customer.phone} className="rounded-2xl bg-white p-3 ring-1 ring-line">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSheet({ kind: "detail", customerId: customer.id })}
                        className="min-h-11 min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-base font-bold">{customer.name}</span>
                        <span className="tnum block text-sm text-muted">{customer.phone}</span>
                      </button>
                      <p className="shrink-0 text-right">
                        <span
                          className={`tnum text-xl font-extrabold ${balance > 0 ? "text-due" : balance < 0 ? "text-paid" : "text-muted"}`}
                        >
                          <span aria-hidden="true">₹ </span>
                          <span data-balance>{formatPlainRupees(balance)}</span>
                        </span>
                        <span className="block text-xs font-semibold text-muted">
                          {balance > 0 ? "Due" : balance < 0 ? "Advance" : "Nothing due"}
                        </span>
                      </p>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSheet({ kind: "entry", customerId: customer.id, type: "credit" })}
                        className="min-h-11 flex-1 rounded-xl border-2 border-due px-2 text-sm font-bold text-due"
                      >
                        Credit
                      </button>
                      <button
                        type="button"
                        onClick={() => setSheet({ kind: "entry", customerId: customer.id, type: "payment" })}
                        className="min-h-11 flex-1 rounded-xl border-2 border-paid px-2 text-sm font-bold text-paid"
                      >
                        Payment
                      </button>
                      {remindUrl && (
                        <a
                          data-remind={customer.phone}
                          href={remindUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-paid px-2 text-sm font-bold text-white"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {view.recent.length > 0 && (
          <section aria-label="Recent entries" className="mt-6">
            <h2 className="text-base font-bold">Recent entries</h2>
            <ul className="mt-1 divide-y divide-line rounded-2xl bg-white px-3 ring-1 ring-line">
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

        <section aria-label="Bring in data" className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-line">
          <h2 className="text-base font-bold">Bring in data</h2>
          <p className="mt-1 text-sm text-muted">
            Paste a ledger file (JSON) and press Import. New customers and entries are added. Anything already in your ledger
            is skipped, and you can undo the import.
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
            className="mt-2 block w-full rounded-xl border border-line bg-surface p-3 font-mono text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <button
            id="import-go"
            type="button"
            onClick={runImport}
            disabled={importBusy}
            className="mt-2 min-h-12 w-full rounded-xl bg-brand px-4 text-base font-bold text-white disabled:opacity-60"
          >
            {importBusy ? "Importing…" : "Import"}
          </button>
          {importResult && (
            <div
              role="status"
              data-import-result={importResult.tone}
              className={`mt-3 rounded-xl p-3 text-sm ${importResult.tone === "ok" ? "bg-paid/10 text-ink" : "bg-due/10 text-due"}`}
            >
              <p className="font-semibold">{importResult.text}</p>
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
                  onClick={() => undoImport(importResult.snapshot!)}
                  className="mt-2 min-h-11 font-bold text-brand underline"
                >
                  Undo this import
                </button>
              )}
            </div>
          )}
        </section>

        <p className="mt-4 text-sm text-muted">
          Your ledger is stored only in this browser on this device. It is not saved on any server and will not appear on
          another phone. Clearing browser data will erase it.
        </p>
      </main>

      {sheet.kind === "add-customer" && (
        <AddCustomerSheet
          repo={repo}
          existing={state.customers}
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
        <CustomerDetail
          customer={sheetCustomer}
          balance={view.balances.get(sheetCustomer.id) ?? 0}
          entries={state.entries.filter((e) => e.customerId === sheetCustomer.id).sort(compareNewestFirst)}
          shotUrls={shotUrls}
          onClose={close}
          onEntry={(type) => setSheet({ kind: "entry", customerId: sheetCustomer.id, type })}
          onCancel={cancelEntry}
          onViewShot={viewShot}
        />
      )}

      {sheet.kind === "shot" && (
        <Sheet title="Payment screenshot" onClose={close}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob from the browser database */}
          <img src={sheet.url} alt="Payment screenshot, full size" className="mx-auto max-h-[75dvh] w-auto rounded-lg" />
        </Sheet>
      )}

      {toast && (
        <div role="status" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-[560px] items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3 text-white shadow-lg">
          <p className="text-sm font-semibold">{toast.text}</p>
          {toast.undo && (
            <button
              type="button"
              className="pointer-events-auto min-h-11 shrink-0 px-2 text-sm font-extrabold underline"
              onClick={async () => {
                const undo = toast.undo!;
                setToast(null);
                await undo();
                setToast({ text: "Undone. The entry is cancelled." });
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

function CustomerDetail({
  customer,
  balance,
  entries,
  shotUrls,
  onClose,
  onEntry,
  onCancel,
  onViewShot,
}: {
  customer: CustomerRecord;
  balance: number;
  entries: EntryRecord[];
  shotUrls: Map<string, string>;
  onClose: () => void;
  onEntry: (type: EntryType) => void;
  onCancel: (entry: EntryRecord) => void;
  onViewShot: (url: string) => void;
}) {
  return (
    <Sheet title={customer.name} onClose={onClose}>
      <p className="tnum text-sm text-muted">{customer.phone}</p>
      <p className={`tnum mt-2 text-3xl font-extrabold ${balance > 0 ? "text-due" : balance < 0 ? "text-paid" : "text-muted"}`}>
        ₹ {formatIndianRupees(Math.abs(balance))}
      </p>
      <p className="text-sm font-semibold text-muted">{balance > 0 ? "Due" : balance < 0 ? "Advance paid by customer" : "Nothing due"}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => onEntry("credit")} className="min-h-12 flex-1 rounded-xl bg-due px-2 text-base font-bold text-white">
          Credit
        </button>
        <button type="button" onClick={() => onEntry("payment")} className="min-h-12 flex-1 rounded-xl bg-paid px-2 text-base font-bold text-white">
          Payment
        </button>
      </div>
      <h3 className="mt-4 text-base font-bold">History</h3>
      {entries.length === 0 ? (
        <p className="mt-1 text-sm text-muted">No entries yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {entries.map((entry) => (
            <EntryLine key={entry.id} entry={entry} shotUrl={shotUrls.get(entry.id)} onViewShot={onViewShot} onCancel={onCancel} />
          ))}
        </ul>
      )}
    </Sheet>
  );
}
