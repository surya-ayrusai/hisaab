"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import sampleShop from "../data/sample-shop.json";
import { LedgerDb, type CustomerRecord, type EntryRecord, type SettingsRecord } from "../data/db";
import { LedgerRepo } from "../data/ledgerRepo";
import {
  applyRemote,
  createShop,
  isSyncConfigured,
  pull,
  push,
  shopIdFromSearch,
  type SyncStatus,
} from "../data/sync";

export interface LedgerState {
  customers: CustomerRecord[];
  entries: EntryRecord[];
  settings: SettingsRecord;
  /** entry id -> object URL of its saved payment screenshot */
  shotUrls: Map<string, string>;
}

let sharedRepo: LedgerRepo | null = null;
let seeding: Promise<unknown> | null = null;

function getRepo(): LedgerRepo {
  if (!sharedRepo) sharedRepo = new LedgerRepo(new LedgerDb());
  return sharedRepo;
}

/** How long to wait after the last change before sending the ledger up. */
const PUSH_DELAY_MS = 1200;

/** Loads the ledger from the browser database and reloads it after every change. */
export function useLedger() {
  const [state, setState] = useState<LedgerState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sync, setSync] = useState<SyncStatus>({ kind: "off" });
  const [shopId, setShopId] = useState<string | null>(null);
  const urlsRef = useRef<Map<string, string>>(new Map());
  const shopRef = useRef<string | null>(null);
  const liveRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  /** Sends the whole ledger up, a moment after the last change. */
  const pushSoon = useCallback(() => {
    if (!shopRef.current || !liveRef.current) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      const id = shopRef.current;
      if (!id) return;
      setSync({ kind: "working" });
      try {
        const repo = getRepo();
        const [snapshot, settings] = await Promise.all([repo.snapshot(), repo.getSettings()]);
        const at = await push(id, settings.shopName, snapshot);
        setSync({ kind: "synced", at });
      } catch (err) {
        setSync({ kind: "error", message: err instanceof Error ? err.message : "Sync failed." });
      }
    }, PUSH_DELAY_MS);
  }, []);

  const reload = useCallback(async () => {
    const repo = getRepo();
    const [customers, entries, settings, shots] = await Promise.all([
      repo.listCustomers(),
      repo.listEntries(),
      repo.getSettings(),
      repo.listShots(),
    ]);
    const next = new Map<string, string>();
    for (const shot of shots) {
      next.set(shot.entryId, urlsRef.current.get(shot.entryId) ?? URL.createObjectURL(shot.blob));
    }
    for (const [entryId, url] of urlsRef.current) {
      if (!next.has(entryId)) URL.revokeObjectURL(url);
    }
    urlsRef.current = next;
    setState({ customers, entries, settings, shotUrls: next });
    pushSoon();
  }, [pushSoon]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = shopIdFromSearch(window.location.search);
      const syncing = Boolean(id) && isSyncConfigured();
      shopRef.current = syncing ? id : null;
      if (!cancelled) setShopId(shopRef.current);

      try {
        if (syncing && id) {
          setSync({ kind: "working" });
          try {
            const remote = await pull(id);
            if (cancelled) return;
            if (remote) {
              await applyRemote(getRepo(), remote);
              setSync({ kind: "synced", at: new Date().toISOString() });
            } else {
              setSync({ kind: "error", message: "That sync link is not recognised. Check the link, or start sync again." });
            }
          } catch (err) {
            // A ledger already pulled onto this device stays usable offline.
            if (!cancelled) setSync({ kind: "error", message: err instanceof Error ? err.message : "Sync failed." });
          }
        } else {
          // One seeding attempt per page load, even if this effect runs twice.
          seeding ??= getRepo().seedDemoIfEmpty(JSON.stringify(sampleShop));
          await seeding;
        }
        if (!cancelled) await reload();
        // Only now may a change trigger a push, so opening the page never
        // sends the ledger straight back up.
        liveRef.current = true;
      } catch {
        if (!cancelled) {
          setLoadError("Your ledger could not be opened in this browser. Private browsing may block storage.");
        }
      }
    })();
    return () => {
      cancelled = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [reload]);

  /** Creates a shop, sends this device's ledger up, and puts the id in the URL. */
  const startSync = useCallback(async (): Promise<string> => {
    const repo = getRepo();
    const settings = await repo.getSettings();
    setSync({ kind: "working" });
    try {
      const id = await createShop(settings.shopName);
      const snapshot = await repo.snapshot();
      const at = await push(id, settings.shopName, snapshot);
      shopRef.current = id;
      liveRef.current = true;
      setShopId(id);
      setSync({ kind: "synced", at });
      const url = new URL(window.location.href);
      url.searchParams.set("shop", id);
      window.history.replaceState(null, "", url.toString());
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync could not be started.";
      setSync({ kind: "error", message });
      throw new Error(message);
    }
  }, []);

  /** Leaves the ledger on this device but stops sending changes up. */
  const stopSync = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    shopRef.current = null;
    setShopId(null);
    setSync({ kind: "off" });
    const url = new URL(window.location.href);
    url.searchParams.delete("shop");
    window.history.replaceState(null, "", url.toString());
  }, []);

  /** Fetches the stored ledger again, for the Sync now button. */
  const pullNow = useCallback(async () => {
    const id = shopRef.current;
    if (!id) return;
    setSync({ kind: "working" });
    try {
      const remote = await pull(id);
      if (!remote) throw new Error("That sync link is not recognised.");
      await applyRemote(getRepo(), remote);
      liveRef.current = false;
      await reload();
      liveRef.current = true;
      setSync({ kind: "synced", at: new Date().toISOString() });
    } catch (err) {
      setSync({ kind: "error", message: err instanceof Error ? err.message : "Sync failed." });
    }
  }, [reload]);

  return { state, loadError, reload, repo: getRepo(), sync, shopId, startSync, stopSync, pullNow, syncAvailable: isSyncConfigured() };
}
