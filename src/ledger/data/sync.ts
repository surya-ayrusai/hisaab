"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CustomerRecord, EntryRecord, SettingsRecord } from "./db";
import type { LedgerRepo, LedgerSnapshot } from "./ledgerRepo";

/**
 * Cross-device sync.
 *
 * A shop is one unguessable uuid. Open the same `?shop=<uuid>` link on another
 * device and it is the same ledger. Without that parameter nothing here runs
 * and the app is browser-local exactly as before, which is what keeps the
 * automated tester in its own sandbox.
 *
 * Deliberate limits, recorded in docs/12:
 *  - Last write wins. This is for one shopkeeper's own devices, not for two
 *    people editing the same customer at the same moment.
 *  - Payment screenshots do not travel. They are blobs that stay on the device
 *    that took them.
 *  - Whoever holds the link holds the ledger. There are no accounts yet.
 */

const URL_KEY = "shop";

export interface RemoteLedger {
  shopName: string;
  customers: CustomerRecord[];
  entries: EntryRecord[];
}

export type SyncStatus =
  | { kind: "off" }
  | { kind: "working" }
  | { kind: "synced"; at: string }
  | { kind: "error"; message: string };

let client: SupabaseClient | null = null;

function config(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return url && key ? { url, key } : null;
}

export function isSyncConfigured(): boolean {
  return config() !== null;
}

function getClient(): SupabaseClient {
  const settings = config();
  if (!settings) throw new Error("Sync is not configured for this deployment.");
  client ??= createClient(settings.url, settings.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** The shop uuid in the page URL, if there is a valid one. */
export function shopIdFromSearch(search: string): string | null {
  const value = new URLSearchParams(search).get(URL_KEY);
  if (!value) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null;
}

/** The link to open on another device. */
export function syncLink(shopId: string, origin: string): string {
  return `${origin.replace(/\/$/, "")}/?${URL_KEY}=${shopId}`;
}

export async function createShop(name: string): Promise<string> {
  const { data, error } = await getClient().rpc("hisaab_create_shop", { p_name: name });
  if (error) throw new Error(describe(error.message));
  if (typeof data !== "string") throw new Error("The shop could not be created.");
  return data;
}

/** The stored ledger for a shop, or null when the uuid is not recognised. */
export async function pull(shopId: string): Promise<RemoteLedger | null> {
  const { data, error } = await getClient().rpc("hisaab_pull", { p_shop: shopId });
  if (error) throw new Error(describe(error.message));
  if (!data) return null;

  const payload = data as {
    shop: { name: string };
    customers: Array<Record<string, unknown>>;
    entries: Array<Record<string, unknown>>;
  };
  const now = new Date().toISOString();
  return {
    shopName: payload.shop?.name ?? "My Shop",
    customers: (payload.customers ?? []).map((c, index) => ({
      id: String(c.id),
      phone: String(c.phone),
      name: String(c.name),
      notes: String(c.notes ?? ""),
      seq: Number(c.seq ?? index + 1),
      createdAt: iso(c.createdAt, now),
      updatedAt: now,
    })),
    entries: (payload.entries ?? []).map((e) => ({
      id: String(e.id),
      customerId: String(e.customerId),
      type: e.type === "payment" ? "payment" : "credit",
      kind: e.kind === "opening" ? "opening" : "normal",
      amountPaise: Number(e.amountPaise),
      date: String(e.date).slice(0, 10),
      note: String(e.note ?? ""),
      status: e.status === "cancelled" ? "cancelled" : "active",
      cancelReason: e.cancelReason ? String(e.cancelReason) : undefined,
      source: e.source === "manual" || e.source === "demo" ? e.source : "import",
      importKey: String(e.importKey ?? ""),
      createdAt: iso(e.createdAt, now),
    })),
  };
}

export async function push(shopId: string, shopName: string, snapshot: LedgerSnapshot): Promise<string> {
  const { data, error } = await getClient().rpc("hisaab_push", {
    p_shop: shopId,
    p_name: shopName,
    p_customers: snapshot.customers.map((c) => ({
      id: c.id,
      phone: c.phone,
      name: c.name,
      notes: c.notes,
      seq: c.seq,
      createdAt: c.createdAt,
    })),
    p_entries: snapshot.entries.map((e) => ({
      id: e.id,
      customerId: e.customerId,
      type: e.type,
      kind: e.kind,
      amountPaise: e.amountPaise,
      date: e.date,
      note: e.note,
      status: e.status,
      cancelReason: e.cancelReason ?? "",
      source: e.source,
      importKey: e.importKey,
      createdAt: e.createdAt,
    })),
  });
  if (error) throw new Error(describe(error.message));
  return typeof data === "string" ? data : new Date().toISOString();
}

/** Puts a pulled ledger into this browser, replacing whatever was here. */
export async function applyRemote(repo: LedgerRepo, remote: RemoteLedger): Promise<void> {
  const settings = await repo.getSettings();
  const next: SettingsRecord = {
    ...settings,
    shopName: remote.shopName,
    isDemoData: false,
    updatedAt: new Date().toISOString(),
  };
  await repo.restoreSnapshot({ customers: remote.customers, entries: remote.entries, settings: next });
}

function iso(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? fallback : new Date(parsed).toISOString();
}

/** Turns a transport or database error into something a shopkeeper can act on. */
function describe(message: string): string {
  const text = message.toLowerCase();
  if (text.includes("unknown shop")) return "That sync link is not recognised. Check the link, or start sync again.";
  if (text.includes("failed to fetch") || text.includes("networkerror")) {
    return "No connection. Your ledger is safe on this device and will sync when you are back online.";
  }
  if (text.includes("could not find the function") || text.includes("does not exist")) {
    return "Sync is not set up on the server yet. Run supabase/schema.sql in the Supabase SQL editor.";
  }
  return `Sync failed: ${message}`;
}
