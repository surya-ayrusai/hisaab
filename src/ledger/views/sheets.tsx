"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { Sheet } from "@/ui/Sheet";
import { errorClass, hintClass, inputClass, labelClass, primaryButton, secondaryButton } from "@/ui/field";
import { ClockIcon, DownloadIcon, PrintIcon, WhatsAppIcon } from "@/ui/icons";
import type { CustomerRecord, EntryRecord, SettingsRecord } from "../data/db";
import type { LedgerRepo, LedgerSnapshot } from "../data/ledgerRepo";
import { syncLink, type SyncStatus } from "../data/sync";
import { compareNewestFirst, customerBalance, type EntryType } from "../domain/balance";
import { AGE_BANDS, openCreditsByCustomer, summariseOpenCredits, type AgeBand } from "../domain/ageing";
import { formatIndianRupees } from "../domain/money";
import { buildReminderMessage, buildWhatsAppUrl, type ReminderTone } from "../domain/reminder";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

const BAND_LABEL: Record<AgeBand, string> = {
  "0-7": "0 to 7 days",
  "8-15": "8 to 15 days",
  "16-30": "16 to 30 days",
  "31-60": "31 to 60 days",
  "60+": "More than 60 days",
};

function Money({ paise, tone }: { paise: number; tone: "due" | "paid" | "plain" }) {
  const colour = tone === "due" ? "text-due" : tone === "paid" ? "text-paid" : "text-ink";
  return (
    <span className={`tnum font-bold ${colour}`}>
      ₹{formatIndianRupees(Math.abs(paise))}
    </span>
  );
}

export function EntryLine({
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
    <li data-entry={entry.id} data-entry-type={entry.type} className="flex items-start gap-3 py-3.5">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          cancelled ? "bg-hairline text-muted" : isCredit ? "bg-due-soft text-due" : "bg-paid-soft text-paid"
        }`}
      >
        {isCredit ? "+" : "−"}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${cancelled ? "text-muted line-through" : "text-ink"}`}>
          {customerName ? `${customerName} · ` : ""}
          {isCredit ? "Credit" : "Payment"}
          {entry.kind === "opening" ? " · opening balance" : ""}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {formatDate(entry.date)}
          {entry.note ? ` · ${entry.note}` : ""}
        </p>
        {cancelled && (
          <p className="mt-0.5 text-xs font-medium text-muted">
            Cancelled{entry.cancelReason ? ` · ${entry.cancelReason}` : ""}
          </p>
        )}
        {!cancelled && onCancel && (
          <button
            type="button"
            className="mt-1 min-h-11 text-xs font-semibold text-muted underline underline-offset-2 hover:text-due"
            onClick={() => onCancel(entry)}
          >
            Cancel this entry
          </button>
        )}
      </div>
      {shotUrl && (
        <button type="button" onClick={() => onViewShot(shotUrl)} className="shrink-0" aria-label="View payment screenshot">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob from the browser's own database */}
          <img
            data-shot={entry.id}
            src={shotUrl}
            alt={`Payment screenshot for ₹${formatIndianRupees(entry.amountPaise)} on ${formatDate(entry.date)}`}
            className="h-11 w-11 rounded-lg object-cover ring-1 ring-line"
          />
        </button>
      )}
      <p className={`shrink-0 text-base ${cancelled ? "text-muted line-through" : ""}`}>
        <Money paise={entry.amountPaise} tone={cancelled ? "plain" : isCredit ? "due" : "paid"} />
      </p>
    </li>
  );
}

export function CustomerDetailSheet({
  customer,
  balance,
  entries,
  settings,
  shotUrls,
  onClose,
  onEntry,
  onCancel,
  onViewShot,
  onStatement,
}: {
  customer: CustomerRecord;
  balance: number;
  entries: EntryRecord[];
  settings: SettingsRecord;
  shotUrls: Map<string, string>;
  onClose: () => void;
  onEntry: (type: EntryType) => void;
  onCancel: (entry: EntryRecord) => void;
  onViewShot: (url: string) => void;
  onStatement: () => void;
}) {
  const active = entries.filter((e) => e.status === "active");
  const credits = active.filter((e) => e.type === "credit").reduce((sum, e) => sum + e.amountPaise, 0);
  const payments = active.filter((e) => e.type === "payment").reduce((sum, e) => sum + e.amountPaise, 0);
  const remindUrl = buildWhatsAppUrl(customer.phone, {
    customerName: customer.name,
    shopName: settings.shopName,
    balancePaise: balance,
    tone: settings.reminderTone,
  });

  return (
    <Sheet title={customer.name} subtitle={customer.phone} onClose={onClose}>
      <div className="rounded-2xl bg-surface p-4 text-center">
        <p className="text-sm font-semibold text-muted">
          {balance > 0 ? "Amount due" : balance < 0 ? "Advance paid by customer" : "Nothing due"}
        </p>
        <p className={`display-amount mt-1 ${balance > 0 ? "text-due" : balance < 0 ? "text-paid" : "text-ink"}`}>
          ₹{formatIndianRupees(Math.abs(balance))}
        </p>
        <div className="mt-3 flex justify-center gap-6 text-sm">
          <span className="text-muted">
            Credit given <Money paise={credits} tone="plain" />
          </span>
          <span className="text-muted">
            Received <Money paise={payments} tone="plain" />
          </span>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => onEntry("credit")}
          className="min-h-12 flex-1 rounded-xl bg-due px-3 text-base font-bold text-white shadow-sm"
        >
          Credit
        </button>
        <button
          type="button"
          onClick={() => onEntry("payment")}
          className="min-h-12 flex-1 rounded-xl bg-paid px-3 text-base font-bold text-white shadow-sm"
        >
          Payment
        </button>
      </div>
      <div className="mt-3 flex gap-3">
        {remindUrl && (
          <a
            href={remindUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${secondaryButton} flex-1 text-paid`}
          >
            <WhatsAppIcon className="h-5 w-5" />
            Remind
          </a>
        )}
        <button type="button" onClick={onStatement} className={`${secondaryButton} flex-1`}>
          <PrintIcon className="h-5 w-5" />
          Statement
        </button>
      </div>

      <h3 className="mt-6 text-base font-bold">History</h3>
      {entries.length === 0 ? (
        <p className={hintClass}>No entries yet.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {entries.map((entry) => (
            <EntryLine
              key={entry.id}
              entry={entry}
              shotUrl={shotUrls.get(entry.id)}
              onViewShot={onViewShot}
              onCancel={onCancel}
            />
          ))}
        </ul>
      )}
    </Sheet>
  );
}

export function AgeingSheet({
  customers,
  entries,
  today,
  onClose,
  onOpenCustomer,
}: {
  customers: CustomerRecord[];
  entries: EntryRecord[];
  today: string;
  onClose: () => void;
  onOpenCustomer: (customer: CustomerRecord) => void;
}) {
  // One pass over the book gives both the band totals and the per-customer list.
  // Computing them separately did the same grouping and allocation twice, which
  // cost six seconds on a 50,000-entry ledger.
  const { summary, oldest } = useMemo(() => {
    const byCustomer = openCreditsByCustomer(entries, today);
    return {
      summary: summariseOpenCredits(byCustomer),
      oldest: customers
        .map((customer) => {
          const open = byCustomer.get(customer.id) ?? [];
          let due = 0;
          for (const credit of open) due += credit.remainingPaise;
          return { customer, due, days: open[0]?.ageDays ?? 0, since: open[0]?.date };
        })
        .filter((row) => row.due > 0)
        .sort((a, b) => b.days - a.days || b.due - a.due),
    };
  }, [customers, entries, today]);
  const total = AGE_BANDS.reduce((sum, band) => sum + summary[band], 0);

  return (
    <Sheet title="How old are the dues" subtitle={`As on ${formatDate(today)}`} onClose={onClose}>
      <p className={hintClass}>
        Each payment is counted against the oldest credit first, so what is left here is the credit that has actually
        been waiting longest. This is a working view, not a certified accounting report.
      </p>

      <div className="mt-4 space-y-2">
        {AGE_BANDS.map((band) => {
          const amount = summary[band];
          const share = total === 0 ? 0 : Math.round((amount / total) * 100);
          return (
            <div key={band} data-band={band} className="rounded-xl border border-line bg-card p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-body">{BAND_LABEL[band]}</span>
                <Money paise={amount} tone={amount > 0 ? "due" : "plain"} />
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-hairline">
                <div
                  className={`h-full rounded-full ${band === "60+" ? "bg-due" : band === "31-60" ? "bg-gold" : "bg-brand"}`}
                  style={{ width: `${share}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-baseline justify-between rounded-xl bg-surface px-3 py-2.5">
        <span className="text-sm font-bold">Total outstanding</span>
        <span data-ageing-total className="tnum text-lg font-bold text-due">
          ₹{formatIndianRupees(total)}
        </span>
      </div>

      <h3 className="mt-6 text-base font-bold">Chase these first</h3>
      {oldest.length === 0 ? (
        <p className={hintClass}>Nothing is outstanding.</p>
      ) : (
        <ul className="mt-2 divide-y divide-hairline">
          {oldest.slice(0, 10).map(({ customer, due, days, since }) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onOpenCustomer(customer)}
                className="flex w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{customer.name}</span>
                  <span className="flex items-center gap-1 text-sm text-muted">
                    <ClockIcon className="h-4 w-4" />
                    {days} {days === 1 ? "day" : "days"}
                    {since ? ` · since ${formatDate(since)}` : ""}
                  </span>
                </span>
                <Money paise={due} tone="due" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

export function StatementSheet({
  customer,
  entries,
  settings,
  today,
  onClose,
}: {
  customer: CustomerRecord;
  entries: EntryRecord[];
  settings: SettingsRecord;
  today: string;
  onClose: () => void;
}) {
  const active = useMemo(
    () => entries.filter((e) => e.status === "active").sort((a, b) => -compareNewestFirst(a, b)),
    [entries],
  );
  const earliest = active[0]?.date ?? today;
  const [from, setFrom] = useState(earliest);
  const [to, setTo] = useState(today);

  const inRange = active.filter((e) => e.date >= from && e.date <= to);
  const opening = customerBalance(active.filter((e) => e.date < from));
  const lines = inRange.reduce<{ entry: EntryRecord; running: number }[]>((acc, entry) => {
    const previous = acc.length === 0 ? opening : acc[acc.length - 1].running;
    const delta = entry.type === "credit" ? entry.amountPaise : -entry.amountPaise;
    acc.push({ entry, running: previous + delta });
    return acc;
  }, []);
  const closing = lines.length === 0 ? opening : lines[lines.length - 1].running;
  const totalCredit = inRange.filter((e) => e.type === "credit").reduce((s, e) => s + e.amountPaise, 0);
  const totalPaid = inRange.filter((e) => e.type === "payment").reduce((s, e) => s + e.amountPaise, 0);

  return (
    <Sheet title="Statement" subtitle={customer.name} onClose={onClose} wide printable>
      <div className="no-print flex flex-wrap items-end gap-3">
        <div className="min-w-32 flex-1">
          <label htmlFor="statement-from" className={labelClass}>
            From
          </label>
          <input id="statement-from" type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="min-w-32 flex-1">
          <label htmlFor="statement-to" className={labelClass}>
            To
          </label>
          <input id="statement-to" type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="button" onClick={() => window.print()} className={`${secondaryButton} shrink-0`}>
          <PrintIcon className="h-5 w-5" />
          Print or save as PDF
        </button>
      </div>

      <div data-statement className="mt-4 rounded-2xl border border-line p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline pb-4">
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight">{settings.shopName}</p>
            <p className="text-sm text-muted">Account statement</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{customer.name}</p>
            <p className="tnum text-muted">{customer.phone}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          {formatDate(from)} to {formatDate(to)}
        </p>

        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-muted">
              <th scope="col" className="py-2 font-semibold">Date</th>
              <th scope="col" className="py-2 font-semibold">Details</th>
              <th scope="col" className="py-2 text-right font-semibold">Credit</th>
              <th scope="col" className="py-2 text-right font-semibold">Paid</th>
              <th scope="col" className="py-2 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-hairline">
              <td className="py-2 text-muted">{formatDate(from)}</td>
              <td className="py-2 font-semibold">Opening balance</td>
              <td />
              <td />
              <td className="tnum py-2 text-right font-semibold">₹{formatIndianRupees(opening)}</td>
            </tr>
            {lines.map(({ entry, running: bal }) => (
              <tr key={entry.id} className="border-b border-hairline">
                <td className="tnum py-2 whitespace-nowrap text-muted">{formatDate(entry.date)}</td>
                <td className="py-2">{entry.note || (entry.type === "credit" ? "Goods given" : "Payment received")}</td>
                <td className="tnum py-2 text-right text-due">
                  {entry.type === "credit" ? formatIndianRupees(entry.amountPaise) : ""}
                </td>
                <td className="tnum py-2 text-right text-paid">
                  {entry.type === "payment" ? formatIndianRupees(entry.amountPaise) : ""}
                </td>
                <td className="tnum py-2 text-right">₹{formatIndianRupees(bal)}</td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr className="border-b border-hairline">
                <td colSpan={5} className="py-3 text-center text-muted">
                  No entries in this period.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="py-3 font-bold">Closing balance</td>
              <td className="tnum py-3 text-right font-semibold text-due">{formatIndianRupees(totalCredit)}</td>
              <td className="tnum py-3 text-right font-semibold text-paid">{formatIndianRupees(totalPaid)}</td>
              <td data-statement-closing className="tnum py-3 text-right text-base font-bold">
                ₹{formatIndianRupees(closing)}
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-4 flex items-center gap-1.5 border-t border-hairline pt-3 text-xs text-muted">
          <span className="wordmark text-[11px] text-brand">HISAAB</span>
          <span>· kept on the shopkeeper&apos;s device</span>
        </p>
        <p className="mt-2 text-xs text-muted">
          {closing > 0
            ? `${customer.name} owes ₹${formatIndianRupees(closing)} as on ${formatDate(to)}.`
            : closing < 0
              ? `${customer.name} is in advance by ₹${formatIndianRupees(-closing)} as on ${formatDate(to)}.`
              : `Nothing is due as on ${formatDate(to)}.`}
        </p>
      </div>
    </Sheet>
  );
}

const TONES: { value: ReminderTone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "polite", label: "Polite" },
  { value: "formal", label: "Formal" },
];

/** Turning sync on, and the link that carries a ledger to another device. */
function SyncPanel({
  available,
  status,
  shopId,
  onStart,
  onStop,
  onPullNow,
}: {
  available: boolean;
  status: SyncStatus;
  shopId: string | null;
  onStart: () => Promise<string>;
  onStop: () => void;
  onPullNow: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = shopId && typeof window !== "undefined" ? syncLink(shopId, window.location.origin) : "";

  if (!available) {
    return (
      <div className="rounded-2xl border border-line p-4">
        <h3 className="text-base font-bold">Sync across my devices</h3>
        <p className={hintClass}>Sync is not configured for this deployment.</p>
      </div>
    );
  }

  return (
    <div data-sync-panel className="rounded-2xl border border-line p-4">
      <h3 className="text-base font-bold">Sync across my devices</h3>
      {!shopId ? (
        <>
          <p className={hintClass}>
            Turn this on to get a link that opens the same ledger on your phone and your computer. Changes on one show
            up on the other.
          </p>
          <button
            type="button"
            data-sync-start
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onStart();
              } finally {
                setBusy(false);
              }
            }}
            className={`${secondaryButton} mt-3 w-full`}
          >
            {busy ? "Turning on…" : "Turn on sync"}
          </button>
        </>
      ) : (
        <>
          <p className={hintClass}>Open this link on your other device. It is the same ledger.</p>
          <input
            data-sync-link
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className={`${inputClass} font-mono text-sm`}
            aria-label="Sync link"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopied(false);
                }
              }}
              className={`${secondaryButton} flex-1`}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onPullNow();
                } finally {
                  setBusy(false);
                }
              }}
              className={`${secondaryButton} flex-1`}
            >
              Sync now
            </button>
          </div>
          <button
            type="button"
            onClick={onStop}
            className="mt-2 min-h-11 w-full rounded-xl border border-line px-3 text-sm font-bold text-muted hover:bg-surface"
          >
            Stop syncing on this device
          </button>
        </>
      )}
      {status.kind === "error" && <p className={errorClass}>{status.message}</p>}
      {status.kind === "synced" && shopId && <p className="mt-2 text-sm font-semibold text-paid">Up to date.</p>}
      <p className="mt-3 text-xs text-muted">
        Anyone with this link can see and change the ledger, so treat it like a key. Payment screenshots stay on the
        device that took them and do not travel. If the same customer is edited on two devices at once, the last change
        wins.
      </p>
    </div>
  );
}

export function SettingsSheet({
  repo,
  settings,
  customerCount,
  onClose,
  onChanged,
  onRestored,
  sync,
}: {
  repo: LedgerRepo;
  settings: SettingsRecord;
  customerCount: number;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onRestored: (message: string, snapshot: LedgerSnapshot) => void;
  sync: {
    available: boolean;
    status: SyncStatus;
    shopId: string | null;
    start: () => Promise<string>;
    stop: () => void;
    pullNow: () => Promise<void>;
  };
}) {
  const [shopName, setShopName] = useState(settings.shopName);
  const [tone, setTone] = useState<ReminderTone>(settings.reminderTone);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<{ text: string; summary: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const preview = buildReminderMessage({
    customerName: "Ravi Kumar",
    shopName: shopName.trim() || settings.shopName,
    balancePaise: 67000,
    tone,
  });

  async function save(patch: { shopName?: string; reminderTone?: ReminderTone }) {
    setError("");
    const name = (patch.shopName ?? shopName).trim();
    if (name.length < 1 || name.length > 60) {
      setError("Enter a shop name.");
      return;
    }
    await repo.saveSettings({ shopName: name, reminderTone: patch.reminderTone ?? tone });
    await onChanged();
    setNote("Saved.");
  }

  async function download() {
    const text = await repo.exportBackup();
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `hisaab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNote("Backup downloaded.");
  }

  async function chooseRestore(file: File) {
    setError("");
    setNote("");
    setConfirmed(false);
    const text = await file.text();
    const plan = await repo.planImport(text);
    if (!plan.ok) {
      setPending(null);
      setError(plan.error);
      return;
    }
    if (plan.customersToCreate.length === 0) {
      setPending(null);
      setError("This file has no customers that can be restored.");
      return;
    }
    setPending({
      text,
      summary: `${plan.customersToCreate.length} customers and ${plan.entriesToAdd.length} entries${
        plan.rejected.length > 0 ? `, ${plan.rejected.length} rows rejected` : ""
      }`,
    });
  }

  async function doRestore() {
    if (!pending || !confirmed) return;
    const plan = await repo.planImport(pending.text);
    if (!plan.ok) {
      setError(plan.error);
      return;
    }
    const outcome = await repo.applyReplace(plan);
    setPending(null);
    setConfirmed(false);
    if (fileRef.current) fileRef.current.value = "";
    onRestored(`Restored ${outcome.created} customers and ${outcome.added} entries from the backup.`, outcome.snapshot);
  }

  async function eraseAll() {
    if (!window.confirm(`Erase all ${customerCount} customers and every entry? Download a backup first if you need one.`)) return;
    const snapshot = await repo.eraseAll();
    onRestored("Everything was erased.", snapshot);
  }

  return (
    <Sheet title="Settings and data" onClose={onClose}>
      <div className="space-y-6">
        <div>
          <label htmlFor="shop-name" className={labelClass}>
            Shop name
          </label>
          <input
            id="shop-name"
            className={inputClass}
            value={shopName}
            maxLength={60}
            onChange={(e) => setShopName(e.target.value)}
            onBlur={() => shopName.trim() !== settings.shopName && save({ shopName })}
          />
          <p className={hintClass}>Used on reminders and statements.</p>
        </div>

        <div>
          <span className={labelClass}>Reminder tone</span>
          <div className="mt-1.5 flex gap-2">
            {TONES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={tone === option.value}
                onClick={() => {
                  setTone(option.value);
                  save({ reminderTone: option.value });
                }}
                className={`min-h-11 flex-1 rounded-xl border-2 px-2 text-sm font-semibold transition ${
                  tone === option.value ? "border-brand bg-brand-soft text-brand" : "border-line bg-card text-body"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p data-reminder-preview className="mt-2 rounded-xl bg-surface p-3 text-sm text-body">
            {preview}
          </p>
        </div>

        <SyncPanel
          available={sync.available}
          status={sync.status}
          shopId={sync.shopId}
          onStart={sync.start}
          onStop={sync.stop}
          onPullNow={sync.pullNow}
        />

        <div className="rounded-2xl border border-line p-4">
          <h3 className="text-base font-bold">Your data</h3>
          <p className={hintClass}>
            {sync.shopId
              ? "This ledger syncs to the shops you have the link for. A backup file is still worth keeping."
              : "Your ledger is stored only in this browser, on this device. It is not on any server and will not appear on another phone. Clearing browser data erases it, so keep a backup."}
          </p>
          <div className="mt-3 space-y-2">
            <button type="button" onClick={download} className={`${secondaryButton} w-full`}>
              <DownloadIcon className="h-5 w-5" />
              Download backup
            </button>
            <div>
              <label htmlFor="restore-input" className={`${secondaryButton} w-full cursor-pointer`}>
                Restore from backup
              </label>
              <input
                id="restore-input"
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) chooseRestore(file);
                }}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">Backups hold customers and entries. Payment screenshots are not included.</p>

          {pending && (
            <div data-restore-preview className="mt-3 rounded-xl border border-gold bg-gold-soft p-3">
              <p className="text-sm font-bold">This will replace everything in your ledger.</p>
              <p className="mt-1 text-sm text-body">
                The backup holds {pending.summary}. Your current {customerCount} customers and all their entries will be
                removed. You can undo this straight afterwards.
              </p>
              <label className="mt-2 flex items-start gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  data-restore-confirm
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-[#b42318]"
                />
                I understand my current ledger will be replaced.
              </label>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  data-restore-go
                  disabled={!confirmed}
                  onClick={doRestore}
                  className="min-h-11 flex-1 rounded-xl bg-due px-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  Replace my ledger
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPending(null);
                    setConfirmed(false);
                  }}
                  className={secondaryButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={eraseAll}
            className="mt-3 min-h-11 w-full rounded-xl border border-due/30 px-3 text-sm font-bold text-due hover:bg-due-soft"
          >
            Erase all data
          </button>
        </div>

        {error && <p className={errorClass}>{error}</p>}
        {note && !error && <p className="text-sm font-semibold text-paid">{note}</p>}
      </div>
    </Sheet>
  );
}

export function ShotSheet({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <Sheet title="Payment screenshot" onClose={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob from the browser's own database */}
      <img src={url} alt="Payment screenshot, full size" className="mx-auto max-h-[70dvh] w-auto rounded-xl" />
    </Sheet>
  );
}

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-0.5 text-base font-bold text-white">{children}</p>
    </div>
  );
}

export { primaryButton, secondaryButton };
