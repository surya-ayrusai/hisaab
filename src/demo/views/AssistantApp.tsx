"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { resolveEffectiveDate } from "@/platform/dates";
import { DemoDb, type KnowledgeRecord, type MessageRecord, type QuickReplyRecord, type TicketRecord } from "../data/db";
import { DemoRepo } from "../data/demoRepo";
import { formatAge, ticketAgeMinutes, ticketPriority, type TicketStatus } from "../domain/assistant";
import { KNOWLEDGE_LABELS, type KnowledgeKey } from "../domain/knowledge";
import type { Lang } from "../domain/language";

const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
];

const STATUS_RANK: Record<TicketStatus, number> = { urgent: 0, "needs human": 1, answered: 2, closed: 3 };

const STATUS_STYLE: Record<TicketStatus, string> = {
  urgent: "bg-due text-white",
  "needs human": "bg-amber-500 text-white",
  answered: "bg-paid text-white",
  closed: "bg-line text-muted",
};

let sharedRepo: DemoRepo | null = null;
let seeding: Promise<void> | null = null;
/** Guards the ?q= question so a re-render can never ask it twice. */
let askedFromUrl = false;

function getRepo(): DemoRepo {
  if (!sharedRepo) sharedRepo = new DemoRepo(new DemoDb());
  return sharedRepo;
}

export function AssistantApp() {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReplyRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [staffDrafts, setStaffDrafts] = useState<Record<string, string>>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [savedNote, setSavedNote] = useState("");
  /** Starts at 0 so the prerendered page holds no clock value; the effect below sets it on mount. */
  const [now, setNow] = useState(0);
  const sectionRef = useRef<HTMLElement | null>(null);

  const reload = useCallback(async () => {
    const repo = getRepo();
    const [messageRows, ticketRows, knowledgeRows, quickRows] = await Promise.all([
      repo.listMessages(),
      repo.listTickets(),
      repo.listKnowledge(),
      repo.listQuickReplies(),
    ]);
    setMessages(messageRows);
    setTickets(ticketRows);
    setKnowledge(knowledgeRows);
    setQuickReplies(quickRows);
  }, []);

  /** Returns true when the question was answered, so the caller can clear its own input. */
  const ask = useCallback(
    async (question: string): Promise<boolean> => {
      const text = question.trim();
      if (text === "") return false;
      setBusy(true);
      try {
        const { today } = resolveEffectiveDate(window.location.search);
        await getRepo().ask(text, today);
        await reload();
        return true;
      } catch {
        setFailed(true);
        return false;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        seeding ??= getRepo().seedIfEmpty();
        await seeding;
        if (cancelled) return;
        await reload();
        if (cancelled) return;
        setReady(true);
        const fromUrl = new URLSearchParams(window.location.search).get("q");
        if (fromUrl && fromUrl.trim() !== "" && !askedFromUrl) {
          askedFromUrl = true;
          await ask(fromUrl);
          sectionRef.current?.scrollIntoView({ block: "start" });
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ask, reload]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock is an external value read after mount
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const sortedTickets = useMemo(
    () =>
      [...tickets].sort((a, b) => {
        const rank = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (rank !== 0) return rank;
        return a.createdAt < b.createdAt ? 1 : -1;
      }),
    [tickets],
  );

  const staffRepliesByTicket = useMemo(() => {
    const map = new Map<string, MessageRecord[]>();
    for (const message of messages) {
      if (message.from !== "staff" || !message.ticketId) continue;
      const list = map.get(message.ticketId);
      if (list) list.push(message);
      else map.set(message.ticketId, [message]);
    }
    return map;
  }, [messages]);

  async function sendStaffReply(ticketId: string) {
    const text = (staffDrafts[ticketId] ?? "").trim();
    if (text === "") return;
    await getRepo().replyToTicket(ticketId, text);
    setStaffDrafts((current) => ({ ...current, [ticketId]: "" }));
    await reload();
  }

  async function closeTicket(ticketId: string) {
    await getRepo().setTicketStatus(ticketId, "closed");
    await reload();
  }

  async function saveKnowledge(key: KnowledgeKey, lang: Lang, text: string) {
    try {
      const saved = await getRepo().saveKnowledge(key, lang, text);
      await reload();
      setSavedNote(`${KNOWLEDGE_LABELS[key]} saved — version ${saved.version}`);
    } catch (err) {
      setSavedNote(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <section
      ref={sectionRef}
      id="assistant"
      aria-label="ayrus AI Assistant"
      className="border-t-4 border-brand bg-white"
    >
      <div className="mx-auto w-full max-w-[720px] px-4 py-6">
        <h2 className="text-xl font-bold">ayrus AI Assistant</h2>
        <p className="mt-1 text-sm text-muted">
          A separate demonstration module: a clinic front desk that answers common questions and turns requests into
          tickets. It runs entirely in this browser, with no AI service and no key. It shares no data with the ledger
          above.
        </p>

        {failed && (
          <p className="mt-3 rounded-lg bg-due/10 p-3 text-sm font-semibold text-due">
            The assistant could not use storage in this browser. Private browsing may block it.
          </p>
        )}

        <div className="mt-4 rounded-2xl bg-surface p-3 ring-1 ring-line">
          <h3 className="text-base font-bold">Chat</h3>
          <div
            id="chat-log"
            aria-live="polite"
            aria-busy={busy}
            className="mt-2 max-h-80 space-y-2 overflow-y-auto"
          >
            {!ready && <p className="text-sm text-muted">Loading the assistant…</p>}
            {ready && messages.length === 0 && (
              <p className="text-sm text-muted">
                Ask about timings, address, fees, doctors or services, or ask for an appointment. You can write in
                English, Hindi or Telugu.
              </p>
            )}
            {messages.map((message) =>
              message.from === "bot" ? (
                <p
                  key={message.id}
                  className="bot-msg max-w-[85%] rounded-xl rounded-tl-sm bg-white p-3 text-sm ring-1 ring-line"
                  lang={message.lang}
                >
                  {message.text}
                </p>
              ) : (
                <p
                  key={message.id}
                  className={`max-w-[85%] rounded-xl p-3 text-sm ${
                    message.from === "staff" ? "bg-paid/10 ring-1 ring-paid/40" : "ml-auto rounded-tr-sm bg-brand text-white"
                  }`}
                  lang={message.lang}
                >
                  {message.from === "staff" && <span className="block text-xs font-bold">Staff</span>}
                  {message.text}
                </p>
              ),
            )}
          </div>

          {quickReplies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply.id}
                  type="button"
                  data-quick-reply={reply.id}
                  disabled={busy}
                  onClick={() => ask(reply.question)}
                  className="min-h-11 rounded-full border border-brand px-3 text-sm font-semibold text-brand disabled:opacity-60"
                >
                  {reply.label}
                </button>
              ))}
            </div>
          )}

          <form
            className="mt-3 flex gap-2"
            onSubmit={async (e: FormEvent) => {
              e.preventDefault();
              if (busy) return;
              const asked = draft;
              if (await ask(asked)) setDraft((current) => (current === asked ? "" : current));
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Your question
            </label>
            <input
              id="chat-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoComplete="off"
              placeholder="Type your question"
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
            <button
              id="chat-send"
              type="submit"
              disabled={busy}
              className="min-h-12 shrink-0 rounded-xl bg-brand px-4 text-base font-bold text-white disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>

        <div className="mt-4">
          <h3 className="text-base font-bold">Ticket queue</h3>
          <p className="mt-1 text-sm text-muted">
            Every question opens a ticket. Staff reply here; the reply marks that ticket answered.
          </p>
          <ul id="ticket-queue" className="mt-2 space-y-3">
            {sortedTickets.length === 0 && <li className="text-sm text-muted">No tickets yet.</li>}
            {sortedTickets.map((ticket) => {
              const age = ticketAgeMinutes(ticket.createdAt, now);
              const priority = ticketPriority(ticket.status, age);
              const replies = staffRepliesByTicket.get(ticket.id) ?? [];
              return (
                <li
                  key={ticket.id}
                  data-ticket={ticket.id}
                  data-status={ticket.status}
                  data-priority={priority}
                  className="rounded-2xl bg-surface p-3 ring-1 ring-line"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold">Ticket #{ticket.number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[ticket.status]}`}>
                      {ticket.status}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-muted ring-1 ring-line">
                      {priority} priority
                    </span>
                    <span className="text-xs text-muted">{formatAge(age)}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold" lang={ticket.lang}>
                    {ticket.question}
                  </p>
                  {(ticket.requestedDate || ticket.requestedTime) && (
                    <p className="mt-1 text-xs font-semibold text-brand">
                      Requested: {[ticket.requestedDate, ticket.requestedTime].filter(Boolean).join(" ")}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted" lang={ticket.lang}>
                    Assistant: {ticket.botReply}
                  </p>
                  {replies.map((reply) => (
                    <p key={reply.id} className="mt-1 rounded-lg bg-paid/10 p-2 text-sm" lang={reply.lang}>
                      Staff: {reply.text}
                    </p>
                  ))}
                  <div className="mt-2">
                    <label htmlFor="staff-reply" className="sr-only">
                      Staff reply to ticket {ticket.number}
                    </label>
                    <textarea
                      id="staff-reply"
                      data-staff-reply={ticket.id}
                      rows={2}
                      value={staffDrafts[ticket.id] ?? ""}
                      onChange={(e) => setStaffDrafts((current) => ({ ...current, [ticket.id]: e.target.value }))}
                      placeholder="Reply to this ticket"
                      className="block w-full rounded-xl border border-line bg-white p-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        id="staff-send"
                        type="button"
                        data-staff-send={ticket.id}
                        onClick={() => sendStaffReply(ticket.id)}
                        className="min-h-11 flex-1 rounded-xl bg-brand px-3 text-sm font-bold text-white"
                      >
                        Send reply
                      </button>
                      {ticket.status !== "closed" && (
                        <button
                          type="button"
                          data-close-ticket={ticket.id}
                          onClick={() => closeTicket(ticket.id)}
                          className="min-h-11 rounded-xl border border-line bg-white px-3 text-sm font-semibold text-muted"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 rounded-2xl bg-surface p-3 ring-1 ring-line">
          <button
            type="button"
            aria-expanded={editorOpen}
            onClick={() => setEditorOpen((open) => !open)}
            className="min-h-11 w-full text-left text-base font-bold"
          >
            Clinic information {editorOpen ? "▲" : "▼"}
          </button>
          {editorOpen && (
            <div className="mt-2 space-y-4">
              <p className="text-sm text-muted">
                Staff can edit these details. The next answer uses the saved text straight away.
              </p>
              {savedNote && (
                <p role="status" data-knowledge-note className="rounded-lg bg-paid/10 p-2 text-sm font-semibold">
                  {savedNote}
                </p>
              )}
              {knowledge
                .slice()
                .sort((a, b) => a.key.localeCompare(b.key))
                .map((item) => (
                  <div key={item.key} data-knowledge={item.key} className="rounded-xl bg-white p-3 ring-1 ring-line">
                    <p className="text-sm font-bold">
                      {KNOWLEDGE_LABELS[item.key]}{" "}
                      <span className="font-normal text-muted">· version {item.version}</span>
                    </p>
                    {LANGS.map(({ code, label }) => (
                      <div key={code} className="mt-2">
                        <label htmlFor={`knowledge-${item.key}-${code}`} className="text-xs font-semibold text-muted">
                          {label}
                        </label>
                        <textarea
                          id={`knowledge-${item.key}-${code}`}
                          data-knowledge-input={`${item.key}-${code}`}
                          rows={2}
                          defaultValue={item.text[code]}
                          lang={code}
                          className="mt-1 block w-full rounded-lg border border-line p-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
                          onBlur={(e) => {
                            if (e.target.value.trim() !== item.text[code].trim()) {
                              saveKnowledge(item.key, code, e.target.value);
                            }
                          }}
                        />
                      </div>
                    ))}
                    <p className="mt-1 text-xs text-muted">Changes save when you leave the box.</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
