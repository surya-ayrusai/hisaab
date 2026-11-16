/**
 * Assistant demo database. Deliberately a separate IndexedDB database from the
 * ledger: clearing, importing or restoring a ledger can never touch this, and
 * this module never reads ledger data.
 */

import Dexie, { type Table } from "dexie";
import type { KnowledgeKey, KnowledgeText } from "../domain/knowledge";
import type { TicketPriority, TicketStatus } from "../domain/assistant";
import type { Lang } from "../domain/language";

export const DEMO_DB_NAME = "hisaab-demo";

export interface KnowledgeRecord {
  key: KnowledgeKey;
  text: KnowledgeText;
  version: number;
  updatedAt: string;
}

export interface QuickReplyRecord {
  id: string;
  label: string;
  question: string;
  order: number;
}

export interface TicketRecord {
  id: string;
  number: number;
  createdAt: string;
  updatedAt: string;
  question: string;
  lang: Lang;
  intent: string;
  status: TicketStatus;
  /** Stored for reference; the queue recomputes priority from status and age. */
  priority: TicketPriority;
  requestedDate?: string;
  requestedTime?: string;
  botReply: string;
}

export interface MessageRecord {
  id: string;
  ticketId?: string;
  from: "visitor" | "bot" | "staff";
  text: string;
  lang: Lang;
  at: string;
  seq: number;
}

export class DemoDb extends Dexie {
  knowledge!: Table<KnowledgeRecord, string>;
  quickReplies!: Table<QuickReplyRecord, string>;
  tickets!: Table<TicketRecord, string>;
  messages!: Table<MessageRecord, string>;

  constructor(name: string = DEMO_DB_NAME) {
    super(name);
    this.version(1).stores({
      knowledge: "key",
      quickReplies: "id, order",
      tickets: "id, number, createdAt, status",
      messages: "id, ticketId, seq",
    });
  }
}

export function newDemoId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${uuid}`;
}
