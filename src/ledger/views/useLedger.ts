"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import sampleShop from "../data/sample-shop.json";
import { LedgerDb, type CustomerRecord, type EntryRecord, type SettingsRecord } from "../data/db";
import { LedgerRepo } from "../data/ledgerRepo";

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

/** Loads the ledger from the browser database and reloads it after every change. */
export function useLedger() {
  const [state, setState] = useState<LedgerState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const urlsRef = useRef<Map<string, string>>(new Map());

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
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // One seeding attempt per page load, even if this effect runs twice.
        seeding ??= getRepo().seedDemoIfEmpty(JSON.stringify(sampleShop));
        await seeding;
        if (!cancelled) await reload();
      } catch {
        if (!cancelled) setLoadError("Your ledger could not be opened in this browser. Private browsing may block storage.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  return { state, loadError, reload, repo: getRepo() };
}
