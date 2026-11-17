"use client";

import { useState, type FormEvent } from "react";
import { Sheet } from "@/ui/Sheet";
import { errorClass, hintClass, inputClass, labelClass, primaryButton } from "@/ui/field";
import { prepareShot } from "@/platform/image";
import { isValidIsoDate } from "@/platform/dates";
import type { CustomerRecord, EntryRecord } from "../data/db";
import { LedgerError, type LedgerRepo } from "../data/ledgerRepo";
import type { EntryType } from "../domain/balance";
import { formatIndianRupees, parseRupeesToPaise } from "../domain/money";
import { normalizePhone } from "../domain/phone";

export function AddCustomerSheet({
  repo,
  existing,
  today,
  onClose,
  onSaved,
  onOpenExisting,
}: {
  repo: LedgerRepo;
  existing: CustomerRecord[];
  today: string;
  onClose: () => void;
  onSaved: (customer: CustomerRecord) => void;
  onOpenExisting: (customer: CustomerRecord) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showOpening, setShowOpening] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingDate, setOpeningDate] = useState(today);
  const [openingNote, setOpeningNote] = useState("");
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [openingError, setOpeningError] = useState("");
  const [duplicate, setDuplicate] = useState<CustomerRecord | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setNameError("");
    setPhoneError("");
    setOpeningError("");
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

    let opening: { amountPaise: number; date: string; note?: string } | undefined;
    if (showOpening && openingAmount.trim() !== "") {
      const paise = parseRupeesToPaise(openingAmount);
      if (paise === null) {
        setOpeningError("Enter an amount more than zero.");
        bad = true;
      } else if (!isValidIsoDate(openingDate)) {
        setOpeningError("Choose a valid date.");
        bad = true;
      } else {
        opening = { amountPaise: paise, date: openingDate, note: openingNote };
      }
    }
    if (bad || !cleanPhone) return;

    const found = existing.find((c) => c.phone === cleanPhone);
    if (found) {
      setDuplicate(found);
      return;
    }
    setSaving(true);
    try {
      onSaved(await repo.addCustomer({ name: cleanName, phone: cleanPhone, opening }));
    } catch (err) {
      setPhoneError(err instanceof LedgerError ? err.message : "Could not save. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Sheet title="Add customer" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-5">
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
            placeholder="Customer name"
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
            className={`${inputClass} tnum`}
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
              <button type="button" className="font-bold underline" onClick={() => onOpenExisting(duplicate)}>
                Open
              </button>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface p-3.5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={showOpening}
              onChange={(e) => setShowOpening(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-[#0b4f43]"
            />
            <span>
              <span className="block text-sm font-semibold text-body">This customer already owes money</span>
              <span className="block text-sm text-muted">
                Carry a balance over from your notebook. It is recorded once, as an opening balance.
              </span>
            </span>
          </label>
          {showOpening && (
            <div className="mt-3 flex gap-3">
              <div className="flex-1">
                <label htmlFor="opening-amount" className={labelClass}>
                  Amount already due (₹)
                </label>
                <input
                  id="opening-amount"
                  className={`${inputClass} tnum`}
                  value={openingAmount}
                  inputMode="decimal"
                  placeholder="0"
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="opening-date" className={labelClass}>
                  Owed since
                </label>
                <input
                  id="opening-date"
                  type="date"
                  className={inputClass}
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                />
              </div>
            </div>
          )}
          {showOpening && (
            <div className="mt-3">
              <label htmlFor="opening-note" className={labelClass}>
                Note <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                id="opening-note"
                className={inputClass}
                value={openingNote}
                maxLength={80}
                placeholder="old khata book"
                onChange={(e) => setOpeningNote(e.target.value)}
              />
            </div>
          )}
          {openingError && <p className={errorClass}>{openingError}</p>}
        </div>

        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "Saving…" : "Save customer"}
        </button>
      </form>
    </Sheet>
  );
}

/** The entry form. With Payment chosen this is the payment form, and it carries the screenshot input. */
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

  const typeButton = (value: EntryType, label: string, hint: string, active: string) => (
    <button
      type="button"
      aria-pressed={type === value}
      onClick={() => setType(value)}
      className={`flex min-h-16 flex-1 flex-col items-center justify-center rounded-xl border-2 px-2 transition ${
        type === value ? active : "border-line bg-card text-body hover:bg-surface"
      }`}
    >
      <span className="text-base font-bold">{label}</span>
      <span className="text-xs">{hint}</span>
    </button>
  );

  return (
    <Sheet
      title={customer.name}
      subtitle={
        balancePaise > 0
          ? `Owes ₹${formatIndianRupees(balancePaise)}`
          : balancePaise < 0
            ? `In advance by ₹${formatIndianRupees(-balancePaise)}`
            : "Nothing due"
      }
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate className="space-y-5" data-form={type === "payment" ? "payment" : "entry"}>
        <div className="flex gap-3" role="group" aria-label="Entry type">
          {typeButton("credit", "Credit", "goods given", "border-due bg-due text-white")}
          {typeButton("payment", "Payment", "money received", "border-paid bg-paid text-white")}
        </div>

        <div>
          <label htmlFor="entry-amount" className={labelClass}>
            Amount
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted">
              ₹
            </span>
            <input
              id="entry-amount"
              className={`${inputClass} tnum min-h-16 pl-10 text-3xl font-bold`}
              value={amount}
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              placeholder="0"
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
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
              Note <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="entry-note"
              className={inputClass}
              value={note}
              maxLength={80}
              placeholder="groceries"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        {type === "payment" && (
          <div>
            <label htmlFor="shot-input" className={labelClass}>
              Payment screenshot <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="shot-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1.5 block w-full rounded-xl border border-dashed border-line bg-surface p-3 text-sm text-muted file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-card file:px-3 file:font-semibold file:text-brand"
              onChange={(e) => {
                setShotError("");
                setFile(e.target.files?.[0] ?? null);
              }}
            />
            {shotError ? <p className={errorClass}>{shotError}</p> : <p className={hintClass}>JPG, PNG or WebP, up to 5 MB.</p>}
          </div>
        )}

        {willBeAdvance && (
          <p className="rounded-xl bg-paid-soft p-3 text-sm text-body">
            This is more than the amount due. The extra will show as an advance.
          </p>
        )}
        {error && <p className={errorClass}>{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className={`flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-base font-bold text-white shadow-sm transition disabled:opacity-60 ${
            type === "payment" ? "bg-paid hover:brightness-110" : type === "credit" ? "bg-due hover:brightness-110" : "bg-muted"
          }`}
        >
          {saving
            ? "Saving…"
            : type === "payment"
              ? `Save payment${paise ? ` of ₹${formatIndianRupees(paise)}` : ""}`
              : type === "credit"
                ? `Save credit${paise ? ` of ₹${formatIndianRupees(paise)}` : ""}`
                : "Choose Credit or Payment"}
        </button>
      </form>
    </Sheet>
  );
}
