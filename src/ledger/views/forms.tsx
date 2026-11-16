"use client";

import { useState, type FormEvent } from "react";
import { Sheet } from "@/ui/Sheet";
import { prepareShot } from "@/platform/image";
import type { CustomerRecord, EntryRecord } from "../data/db";
import { LedgerError, type LedgerRepo } from "../data/ledgerRepo";
import type { EntryType } from "../domain/balance";
import { isValidIsoDate } from "@/platform/dates";
import { formatIndianRupees, parseRupeesToPaise } from "../domain/money";
import { normalizePhone } from "../domain/phone";

const inputClass =
  "mt-1 block min-h-12 w-full rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const labelClass = "block text-sm font-semibold text-ink";
const errorClass = "mt-1 text-sm font-medium text-due";

export function AddCustomerSheet({
  repo,
  existing,
  onClose,
  onSaved,
  onOpenExisting,
}: {
  repo: LedgerRepo;
  existing: CustomerRecord[];
  onClose: () => void;
  onSaved: (customer: CustomerRecord) => void;
  onOpenExisting: (customer: CustomerRecord) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [duplicate, setDuplicate] = useState<CustomerRecord | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setNameError("");
    setPhoneError("");
    setDuplicate(null);
    const cleanName = name.trim();
    const cleanPhone = normalizePhone(phone);
    let bad = false;
    if (cleanName.length < 1 || cleanName.length > 60) {
      setNameError("Enter the customer's name.");
      bad = true;
    }
    if (!cleanPhone) {
      setPhoneError("Enter a 10-digit mobile number starting with 6, 7, 8 or 9.");
      bad = true;
    }
    if (bad || !cleanPhone) return;
    const found = existing.find((c) => c.phone === cleanPhone);
    if (found) {
      setDuplicate(found);
      return;
    }
    setSaving(true);
    try {
      onSaved(await repo.addCustomer({ name: cleanName, phone: cleanPhone }));
    } catch (err) {
      setPhoneError(err instanceof LedgerError ? err.message : "Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Sheet title="Add customer" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label htmlFor="customer-name" className={labelClass}>
            Name
          </label>
          <input
            id="customer-name"
            className={inputClass}
            value={name}
            maxLength={60}
            autoComplete="off"
            autoFocus
            onChange={(e) => setName(e.target.value)}
            aria-invalid={nameError !== ""}
          />
          {nameError && <p className={errorClass}>{nameError}</p>}
        </div>
        <div>
          <label htmlFor="customer-phone" className={labelClass}>
            Mobile number
          </label>
          <input
            id="customer-phone"
            className={inputClass}
            value={phone}
            inputMode="tel"
            autoComplete="off"
            placeholder="10-digit number"
            onChange={(e) => setPhone(e.target.value)}
            aria-invalid={phoneError !== ""}
          />
          {phoneError && <p className={errorClass}>{phoneError}</p>}
          {duplicate && (
            <p className={errorClass}>
              This number is already in your ledger as {duplicate.name}.{" "}
              <button type="button" className="underline" onClick={() => onOpenExisting(duplicate)}>
                Open
              </button>
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="min-h-12 w-full rounded-xl bg-brand px-4 text-base font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save customer"}
        </button>
      </form>
    </Sheet>
  );
}

/** The entry form. With "Payment" selected this is the payment form and carries the screenshot input. */
export function EntrySheet({
  repo,
  customer,
  balancePaise,
  initialType,
  today,
  onClose,
  onSaved,
}: {
  repo: LedgerRepo;
  customer: CustomerRecord;
  balancePaise: number;
  initialType: EntryType | null;
  today: string;
  onClose: () => void;
  onSaved: (entry: EntryRecord) => void;
}) {
  const [type, setType] = useState<EntryType | null>(initialType);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [shotError, setShotError] = useState("");
  const [saving, setSaving] = useState(false);

  const paise = parseRupeesToPaise(amount);
  const willBeAdvance = type === "payment" && paise !== null && paise > Math.max(balancePaise, 0);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    setShotError("");
    if (!type) return setError("Choose Credit or Payment.");
    if (paise === null) return setError("Enter an amount more than zero.");
    if (!isValidIsoDate(date)) return setError("Choose a valid date.");
    setSaving(true);
    try {
      let shot: { blob: Blob; mimeType: string } | undefined;
      if (type === "payment" && file) {
        const prepared = await prepareShot(file);
        if (!prepared.ok) {
          setShotError(`${prepared.error} You can also save without a photo.`);
          setFile(null);
          setSaving(false);
          return;
        }
        shot = { blob: prepared.blob, mimeType: prepared.mimeType };
      }
      onSaved(await repo.addEntry({ customerId: customer.id, type, amountPaise: paise, date, note, shot }));
    } catch (err) {
      setError(err instanceof LedgerError ? err.message : "Could not save. Free up space or try again.");
      setSaving(false);
    }
  }

  const typeButton = (value: EntryType, label: string, active: string) => (
    <button
      type="button"
      aria-pressed={type === value}
      onClick={() => setType(value)}
      className={`min-h-12 flex-1 rounded-xl border-2 px-3 text-base font-bold ${
        type === value ? active : "border-line bg-white text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Sheet title={customer.name} onClose={onClose}>
      <p className="mb-3 text-sm text-muted">
        {balancePaise > 0
          ? `Owes ₹${formatIndianRupees(balancePaise)}`
          : balancePaise < 0
            ? `Advance of ₹${formatIndianRupees(-balancePaise)}`
            : "Nothing due"}
      </p>
      <form onSubmit={submit} noValidate className="space-y-4" data-form={type === "payment" ? "payment" : "entry"}>
        <div className="flex gap-2" role="group" aria-label="Entry type">
          {typeButton("credit", "Credit given", "border-due bg-due text-white")}
          {typeButton("payment", "Payment received", "border-paid bg-paid text-white")}
        </div>
        <div>
          <label htmlFor="entry-amount" className={labelClass}>
            Amount (₹)
          </label>
          <input
            id="entry-amount"
            className={`${inputClass} tnum text-2xl font-bold`}
            value={amount}
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="entry-date" className={labelClass}>
              Date
            </label>
            <input id="entry-date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex-1">
            <label htmlFor="entry-note" className={labelClass}>
              Note (optional)
            </label>
            <input id="entry-note" className={inputClass} value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        {type === "payment" && (
          <div>
            <label htmlFor="shot-input" className={labelClass}>
              Payment screenshot (optional)
            </label>
            <input
              id="shot-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-surface file:px-3 file:font-semibold"
              onChange={(e) => {
                setShotError("");
                setFile(e.target.files?.[0] ?? null);
              }}
            />
            {shotError && <p className={errorClass}>{shotError}</p>}
          </div>
        )}
        {willBeAdvance && (
          <p className="rounded-lg bg-surface p-2 text-sm text-muted">
            This is more than the amount due. The extra will show as an advance.
          </p>
        )}
        {error && <p className={errorClass}>{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className={`min-h-12 w-full rounded-xl px-4 text-base font-bold text-white disabled:opacity-60 ${
            type === "payment" ? "bg-paid" : type === "credit" ? "bg-due" : "bg-muted"
          }`}
        >
          {saving
            ? "Saving…"
            : type === "payment"
              ? `Save payment${paise ? ` of ₹${formatIndianRupees(paise)}` : ""}`
              : type === "credit"
                ? `Save credit${paise ? ` of ₹${formatIndianRupees(paise)}` : ""}`
                : "Save"}
        </button>
      </form>
    </Sheet>
  );
}
