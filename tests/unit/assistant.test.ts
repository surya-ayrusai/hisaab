import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { detectLanguage } from "@/demo/domain/language";
import {
  answerQuestion,
  detectIntent,
  formatAge,
  parseRequestedWhen,
  ticketAgeMinutes,
  ticketPriority,
} from "@/demo/domain/assistant";
import { DEFAULT_KNOWLEDGE } from "@/demo/domain/knowledge";
import { DemoDb } from "@/demo/data/db";
import { DemoRepo } from "@/demo/data/demoRepo";

const TODAY = "2026-11-15";
const DEVANAGARI = /[ऀ-ॿ]/;
const TELUGU = /[ఀ-౿]/;

describe("language detection", () => {
  it("uses the script when there is one", () => {
    expect(detectLanguage("क्लिनिक का समय क्या है?")).toBe("hi");
    expect(detectLanguage("క్లినిక్ సమయం ఏమిటి?")).toBe("te");
    expect(detectLanguage("What are your timings?")).toBe("en");
  });
  it("recognises romanised Hindi and Telugu", () => {
    expect(detectLanguage("clinic ka samay kab khulta hai")).toBe("hi");
    expect(detectLanguage("clinic samayam eppudu")).toBe("te");
    expect(detectLanguage("where are you located")).toBe("en");
  });
});

describe("intent detection", () => {
  it("picks the right intent in three languages", () => {
    expect(detectIntent("What are your clinic timings?")).toBe("timings");
    expect(detectIntent("क्लिनिक का समय क्या है?")).toBe("timings");
    expect(detectIntent("క్లినిక్ సమయం ఏమిటి?")).toBe("timings");
    expect(detectIntent("Where is the clinic?")).toBe("address");
    expect(detectIntent("How much is the consultation fee?")).toBe("fees");
    expect(detectIntent("Which doctors are available?")).toBe("doctors");
    expect(detectIntent("Do you do blood tests?")).toBe("services");
    expect(detectIntent("What is your phone number?")).toBe("phone");
    expect(detectIntent("Hello")).toBe("greeting");
    expect(detectIntent("I want to talk to someone")).toBe("human");
    expect(detectIntent("Do you have parking for a lorry?")).toBe("unknown");
  });
  it("puts emergency and booking ahead of everything else", () => {
    expect(detectIntent("I want an appointment tomorrow at 5 pm")).toBe("booking");
    expect(detectIntent("chest pain, is the doctor available right now?")).toBe("emergency");
    expect(detectIntent("मुझे कल अपॉइंटमेंट चाहिए")).toBe("booking");
    expect(detectIntent("మా నాన్నకు అత్యవసరం")).toBe("emergency");
  });
});

describe("booking time", () => {
  it("reads tomorrow, today, weekdays and explicit dates", () => {
    expect(parseRequestedWhen("appointment tomorrow at 5 pm", TODAY)).toEqual({ date: "2026-11-16", time: "17:00" });
    expect(parseRequestedWhen("book today 10:30 am", TODAY)).toEqual({ date: "2026-11-15", time: "10:30" });
    expect(parseRequestedWhen("appointment on 2026-12-01", TODAY).date).toBe("2026-12-01");
    // 15 Nov 2026 is a Sunday, so the next Monday is the 16th.
    expect(parseRequestedWhen("book an appointment on monday", TODAY).date).toBe("2026-11-16");
  });
  it("reads Hindi and Telugu words for tomorrow", () => {
    expect(parseRequestedWhen("मुझे कल अपॉइंटमेंट चाहिए", TODAY).date).toBe("2026-11-16");
    expect(parseRequestedWhen("repu appointment kavali", TODAY).date).toBe("2026-11-16");
  });
  it("leaves the time out when none was given", () => {
    expect(parseRequestedWhen("I want an appointment", TODAY)).toEqual({});
    expect(parseRequestedWhen("appointment tomorrow", TODAY)).toEqual({ date: "2026-11-16" });
  });
});

describe("answering", () => {
  it("answers from the knowledge base in the language asked", () => {
    const en = answerQuestion("What are your timings?", DEFAULT_KNOWLEDGE, 1, TODAY);
    expect(en.status).toBe("answered");
    expect(en.text).toContain(DEFAULT_KNOWLEDGE.timings.en);

    const hi = answerQuestion("क्लिनिक का समय क्या है?", DEFAULT_KNOWLEDGE, 2, TODAY);
    expect(hi.lang).toBe("hi");
    expect(hi.text).toContain(DEFAULT_KNOWLEDGE.timings.hi);
    expect(DEVANAGARI.test(hi.text)).toBe(true);

    const te = answerQuestion("క్లినిక్ సమయం ఏమిటి?", DEFAULT_KNOWLEDGE, 3, TODAY);
    expect(te.lang).toBe("te");
    expect(TELUGU.test(te.text)).toBe(true);
  });

  it("uses edited knowledge immediately", () => {
    const edited = { ...DEFAULT_KNOWLEDGE, timings: { ...DEFAULT_KNOWLEDGE.timings, en: "Open 24 hours, every day." } };
    expect(answerQuestion("timings?", edited, 1, TODAY).text).toContain("Open 24 hours, every day.");
  });

  it("sets the status the contract expects", () => {
    expect(answerQuestion("What are your timings?", DEFAULT_KNOWLEDGE, 1, TODAY).status).toBe("answered");
    expect(answerQuestion("I want an appointment tomorrow", DEFAULT_KNOWLEDGE, 2, TODAY).status).toBe("needs human");
    expect(answerQuestion("Do you have lorry parking?", DEFAULT_KNOWLEDGE, 3, TODAY).status).toBe("needs human");
    expect(answerQuestion("emergency, chest pain", DEFAULT_KNOWLEDGE, 4, TODAY).status).toBe("urgent");
  });

  it("names the ticket number and the clinic phone where it should", () => {
    const booking = answerQuestion("appointment tomorrow at 5 pm", DEFAULT_KNOWLEDGE, 7, TODAY);
    expect(booking.text).toContain("7");
    expect(booking.text).toContain("2026-11-16 17:00");
    expect(answerQuestion("emergency", DEFAULT_KNOWLEDGE, 8, TODAY).text).toContain(DEFAULT_KNOWLEDGE.phone.en);
  });

  it("gives the same answer every time, with no AI service", () => {
    const once = answerQuestion("What are your fees?", DEFAULT_KNOWLEDGE, 1, TODAY);
    const twice = answerQuestion("What are your fees?", DEFAULT_KNOWLEDGE, 1, TODAY);
    expect(once).toEqual(twice);
  });
});

describe("priority and ageing", () => {
  it("raises a waiting request after an hour and keeps urgent at the top", () => {
    expect(ticketPriority("urgent", 0)).toBe("urgent");
    expect(ticketPriority("needs human", 10)).toBe("normal");
    expect(ticketPriority("needs human", 60)).toBe("high");
    expect(ticketPriority("answered", 5000)).toBe("normal");
    expect(ticketPriority("closed", 5000)).toBe("normal");
  });
  it("reports age in plain words", () => {
    const now = Date.parse("2026-11-15T12:00:00.000Z");
    expect(ticketAgeMinutes("2026-11-15T11:30:00.000Z", now)).toBe(30);
    expect(formatAge(0)).toBe("just now");
    expect(formatAge(30)).toBe("30 min old");
    expect(formatAge(90)).toBe("1 hour old");
    expect(formatAge(60 * 50)).toBe("2 days old");
  });
});

describe("assistant storage", () => {
  let repo: DemoRepo;
  let counter = 0;

  beforeEach(async () => {
    repo = new DemoRepo(new DemoDb(`test-demo-${++counter}`));
    await repo.seedIfEmpty();
  });

  it("seeds clinic information, quick replies and sample tickets once", async () => {
    expect(await repo.listKnowledge()).toHaveLength(6);
    expect((await repo.listQuickReplies()).length).toBeGreaterThan(0);
    const tickets = await repo.listTickets();
    expect(tickets.map((t) => t.status).sort()).toEqual(["closed", "needs human", "urgent"]);
    await repo.seedIfEmpty();
    expect(await repo.listTickets()).toHaveLength(3);
  });

  it("opens a numbered ticket per question and records both messages", async () => {
    const { ticket, answer } = await repo.ask("What are your timings?", TODAY);
    expect(ticket.number).toBe(4);
    expect(ticket.status).toBe("answered");
    expect(answer.intent).toBe("timings");
    const messages = await repo.listMessages();
    expect(messages.map((m) => m.from)).toEqual(["visitor", "bot"]);
  });

  it("answers with the latest saved clinic information", async () => {
    const saved = await repo.saveKnowledge("fees", "en", "Consultation is now Rs 600.");
    expect(saved.version).toBe(2);
    const { answer } = await repo.ask("how much is the fee?", TODAY);
    expect(answer.text).toContain("Rs 600");
  });

  it("refuses an empty question or an empty knowledge edit", async () => {
    await expect(repo.ask("   ", TODAY)).rejects.toThrow();
    await expect(repo.saveKnowledge("fees", "en", "  ")).rejects.toThrow();
  });

  it("replies to one ticket only and marks that ticket answered", async () => {
    const first = (await repo.ask("I want an appointment tomorrow", TODAY)).ticket;
    const second = (await repo.ask("Do you have lorry parking?", TODAY)).ticket;
    expect(first.status).toBe("needs human");
    await repo.replyToTicket(second.id, "Yes, there is parking behind the building.");
    const tickets = await repo.listTickets();
    expect(tickets.find((t) => t.id === second.id)!.status).toBe("answered");
    expect(tickets.find((t) => t.id === first.id)!.status).toBe("needs human");
    const staff = (await repo.listMessages()).filter((m) => m.from === "staff");
    expect(staff).toHaveLength(1);
    expect(staff[0].ticketId).toBe(second.id);
  });

  it("closes a ticket and keeps everything after reopening the database", async () => {
    const { ticket } = await repo.ask("emergency, chest pain", TODAY);
    expect(ticket.status).toBe("urgent");
    await repo.setTicketStatus(ticket.id, "closed");
    const name = repo.db.name;
    repo.db.close();
    const reopened = new DemoRepo(new DemoDb(name));
    expect((await reopened.listTickets()).find((t) => t.id === ticket.id)!.status).toBe("closed");
  });
});
