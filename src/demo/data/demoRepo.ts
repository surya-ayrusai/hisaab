/** Storage for the assistant demo: knowledge, quick replies, tickets and messages. */

import {
  DEFAULT_KNOWLEDGE,
  DEFAULT_QUICK_REPLIES,
  KNOWLEDGE_KEYS,
  type KnowledgeKey,
  type KnowledgeMap,
} from "../domain/knowledge";
import { answerQuestion, type Answer, type TicketStatus } from "../domain/assistant";
import type { Lang } from "../domain/language";
import {
  DemoDb,
  newDemoId,
  type KnowledgeRecord,
  type MessageRecord,
  type QuickReplyRecord,
  type TicketRecord,
} from "./db";

export interface AskResult {
  answer: Answer;
  ticket: TicketRecord;
}

export class DemoRepo {
  constructor(public readonly db: DemoDb) {}

  /** Fills in the clinic information and quick replies the first time only. */
  async seedIfEmpty(now: Date = new Date()): Promise<void> {
    if ((await this.db.knowledge.count()) === 0) {
      const at = now.toISOString();
      await this.db.knowledge.bulkPut(
        KNOWLEDGE_KEYS.map((key) => ({ key, text: { ...DEFAULT_KNOWLEDGE[key] }, version: 1, updatedAt: at })),
      );
    }
    if ((await this.db.quickReplies.count()) === 0) {
      await this.db.quickReplies.bulkPut(
        DEFAULT_QUICK_REPLIES.map((seed, index) => ({ id: newDemoId("q"), ...seed, order: index })),
      );
    }
    if ((await this.db.tickets.count()) === 0) await this.seedSampleTickets(now);
  }

  /** A few sample tickets so every status, priority and age is visible at a glance. */
  private async seedSampleTickets(now: Date): Promise<void> {
    const minutes = (n: number) => new Date(now.getTime() - n * 60_000).toISOString();
    const samples: TicketRecord[] = [
      {
        id: newDemoId("t"),
        number: 1,
        createdAt: minutes(2 * 24 * 60),
        updatedAt: minutes(2 * 24 * 60),
        question: "Do you do blood tests on Saturday?",
        lang: "en",
        intent: "services",
        status: "closed",
        priority: "normal",
        botReply: "We offer general consultation, child health check-up, blood tests and vaccination.",
      },
      {
        id: newDemoId("t"),
        number: 2,
        createdAt: minutes(26 * 60),
        updatedAt: minutes(26 * 60),
        question: "क्या मुझे कल शाम का अपॉइंटमेंट मिल सकता है?",
        lang: "hi",
        intent: "booking",
        status: "needs human",
        priority: "high",
        requestedTime: "17:00",
        botReply: "मैंने आपका अपॉइंटमेंट अनुरोध दर्ज कर लिया है। हमारा स्टाफ जल्द ही इसकी पुष्टि करेगा।",
      },
      {
        id: newDemoId("t"),
        number: 3,
        createdAt: minutes(15),
        updatedAt: minutes(15),
        question: "మా నాన్నకు ఛాతీ నొప్పి, అత్యవసరం",
        lang: "te",
        intent: "emergency",
        status: "urgent",
        priority: "urgent",
        botReply: "ఇది అత్యవసరం అయితే, దయచేసి వెంటనే 040 2345 6789 కు కాల్ చేయండి లేదా సమీప ఆసుపత్రికి వెళ్లండి.",
      },
    ];
    await this.db.tickets.bulkPut(samples);
  }

  async knowledgeMap(): Promise<KnowledgeMap> {
    const rows = await this.db.knowledge.toArray();
    const map = {} as KnowledgeMap;
    for (const key of KNOWLEDGE_KEYS) {
      map[key] = rows.find((r) => r.key === key)?.text ?? { ...DEFAULT_KNOWLEDGE[key] };
    }
    return map;
  }

  listKnowledge(): Promise<KnowledgeRecord[]> {
    return this.db.knowledge.toArray();
  }

  /** Saves one clinic detail and bumps its version, so the next answer uses the new text. */
  async saveKnowledge(key: KnowledgeKey, lang: Lang, text: string): Promise<KnowledgeRecord> {
    const clean = text.trim().slice(0, 400);
    if (clean === "") throw new Error("Please enter some text before saving.");
    return this.db.transaction("rw", this.db.knowledge, async () => {
      const current =
        (await this.db.knowledge.get(key)) ??
        ({ key, text: { ...DEFAULT_KNOWLEDGE[key] }, version: 0, updatedAt: new Date().toISOString() } as KnowledgeRecord);
      const next: KnowledgeRecord = {
        key,
        text: { ...current.text, [lang]: clean },
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      };
      await this.db.knowledge.put(next);
      return next;
    });
  }

  listQuickReplies(): Promise<QuickReplyRecord[]> {
    return this.db.quickReplies.orderBy("order").toArray();
  }

  async saveQuickReply(id: string, label: string, question: string): Promise<void> {
    const cleanLabel = label.trim().slice(0, 40);
    const cleanQuestion = question.trim().slice(0, 160);
    if (cleanLabel === "" || cleanQuestion === "") throw new Error("A quick reply needs both a label and a question.");
    const current = await this.db.quickReplies.get(id);
    if (!current) throw new Error("Quick reply not found.");
    await this.db.quickReplies.put({ ...current, label: cleanLabel, question: cleanQuestion });
  }

  listTickets(): Promise<TicketRecord[]> {
    return this.db.tickets.toArray();
  }

  listMessages(): Promise<MessageRecord[]> {
    return this.db.messages.orderBy("seq").toArray();
  }

  /**
   * Answers a visitor's question, records the conversation and opens a ticket.
   * Knowledge is read inside the same call, so a staff edit saved a moment ago
   * is always reflected.
   */
  async ask(question: string, today: string): Promise<AskResult> {
    const clean = question.trim().slice(0, 400);
    if (clean === "") throw new Error("Please type a question.");
    const knowledge = await this.knowledgeMap();
    const tables = [this.db.tickets, this.db.messages];
    return this.db.transaction("rw", tables, async () => {
      const lastTicket = await this.db.tickets.orderBy("number").last();
      const number = (lastTicket?.number ?? 0) + 1;
      const answer = answerQuestion(clean, knowledge, number, today);
      const at = new Date().toISOString();
      const ticket: TicketRecord = {
        id: newDemoId("t"),
        number,
        createdAt: at,
        updatedAt: at,
        question: clean,
        lang: answer.lang,
        intent: answer.intent,
        status: answer.status,
        priority: answer.status === "urgent" ? "urgent" : "normal",
        requestedDate: answer.requested.date,
        requestedTime: answer.requested.time,
        botReply: answer.text,
      };
      await this.db.tickets.add(ticket);
      const seq = await this.nextSeq();
      await this.db.messages.bulkAdd([
        { id: newDemoId("m"), ticketId: ticket.id, from: "visitor", text: clean, lang: answer.lang, at, seq },
        { id: newDemoId("m"), ticketId: ticket.id, from: "bot", text: answer.text, lang: answer.lang, at, seq: seq + 1 },
      ]);
      return { answer, ticket };
    });
  }

  /** A staff reply acts on its own ticket and marks that ticket answered. */
  async replyToTicket(ticketId: string, text: string): Promise<TicketRecord> {
    const clean = text.trim().slice(0, 400);
    if (clean === "") throw new Error("Please type a reply before sending.");
    const tables = [this.db.tickets, this.db.messages];
    return this.db.transaction("rw", tables, async () => {
      const ticket = await this.db.tickets.get(ticketId);
      if (!ticket) throw new Error("Ticket not found.");
      const at = new Date().toISOString();
      await this.db.messages.add({
        id: newDemoId("m"),
        ticketId,
        from: "staff",
        text: clean,
        lang: ticket.lang,
        at,
        seq: await this.nextSeq(),
      });
      const next: TicketRecord = { ...ticket, status: "answered", updatedAt: at };
      await this.db.tickets.put(next);
      return next;
    });
  }

  async setTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const ticket = await this.db.tickets.get(ticketId);
    if (!ticket) throw new Error("Ticket not found.");
    await this.db.tickets.put({ ...ticket, status, updatedAt: new Date().toISOString() });
  }

  private async nextSeq(): Promise<number> {
    const last = await this.db.messages.orderBy("seq").last();
    return (last?.seq ?? 0) + 1;
  }
}
