"use client";

import { useEffect, useRef, useState } from "react";
import {
  BatteryFull,
  Bell,
  Check,
  Eye,
  FileSearch,
  Inbox,
  Landmark,
  Lock,
  Menu,
  PartyPopper,
  Search,
  Send,
  Shield,
  Signal,
  Smartphone,
  Star,
  User,
  Users,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const CONSTITUENCIES = [
  ["ol-kalou", "Ol-Kalou"],
  ["mwala", "Mwala"],
  ["garissa-township", "Garissa Township"],
  ["kieni", "Kieni"],
  ["mathira", "Mathira"],
] as const;

const SAMPLE_REFS = ["OKL-2026-0142", "OKL-2026-0089", "MWL-2026-0057", "MTH-2026-0011"];

/* ------------------------------- i18n strings ------------------------------- */

const STRINGS = {
  en: {
    greeting: "Hello! How can we help you today?",
    placeholder: "Type your question…",
    processing: "Processing your question…",
    steps: [
      "Understanding your question",
      "Checking constituency data",
      "Retrieving information",
      "Preparing answer…",
    ],
    requiredDocs: "Required Documents:",
    window: "Window",
    notifyMe: "Notify Me",
    checkStatus: "Check Status",
    smsPrompt: "Where should we send the SMS reminder?",
    setReminder: "Set Reminder",
    reminderSet: "Reminder set!",
    reminderNote: "You will receive an SMS 2 days before applications open.",
    phone: "Phone",
    refPrompt: "Enter your application ref number:",
    estCompletion: "Estimated completion",
    days: "days",
    stages: {
      received: "Application Received",
      review_in_progress: "Review in Progress",
      ready_for_collection: "Ready for Collection",
      collected: "Collected",
    } as Record<string, string>,
    apiError: "Could not reach the BursaBridge API. Is the backend running on port 8000?",
    remindError: "Could not create the reminder. Is the backend running?",
    notFound: "No application found for that ref number.",
  },
  sw: {
    greeting: "Karibu BursaBridge! Tunaweza kukusaidiaje leo?",
    placeholder: "Andika swali lako…",
    processing: "Tunashughulikia swali lako…",
    steps: [
      "Kuelewa swali lako",
      "Kuangalia data ya eneo bunge",
      "Kupata taarifa",
      "Kuandaa jibu…",
    ],
    requiredDocs: "Nyaraka Zinazohitajika:",
    window: "Kipindi",
    notifyMe: "Nijulishe",
    checkStatus: "Angalia Hali",
    smsPrompt: "Tutume SMS ya kikumbusho kwa nambari gani?",
    setReminder: "Weka Kikumbusho",
    reminderSet: "Kikumbusho kimewekwa!",
    reminderNote: "Utapokea SMS siku 2 kabla ya maombi kufunguliwa.",
    phone: "Simu",
    refPrompt: "Weka nambari ya kumbukumbu ya maombi:",
    estCompletion: "Inakadiriwa kukamilika baada ya",
    days: "siku",
    stages: {
      received: "Maombi Yamepokelewa",
      review_in_progress: "Yanakaguliwa",
      ready_for_collection: "Tayari Kuchukuliwa",
      collected: "Yamechukuliwa",
    } as Record<string, string>,
    apiError: "Imeshindikana kufikia BursaBridge API. Je, backend inafanya kazi kwenye port 8000?",
    remindError: "Imeshindikana kuweka kikumbusho. Je, backend inafanya kazi?",
    notFound: "Hakuna maombi yaliyopatikana kwa nambari hiyo.",
  },
};

type Lang = keyof typeof STRINGS;

const STAGES = [
  { id: "received", Icon: Inbox },
  { id: "review_in_progress", Icon: FileSearch },
  { id: "ready_for_collection", Icon: Landmark },
  { id: "collected", Icon: PartyPopper },
];

const VALUES = [
  [Lock, "Secure & Private", "Data Protection Act, 2019"],
  [Users, "Inclusive Access", "USSD, SMS & Web for everyone"],
  [Eye, "Transparent", "Status tracking = accountability"],
  [Smartphone, "Local & Simple", "English na Kiswahili"],
  [Shield, "Your Data, Your Control", "Only what is necessary"],
  [Star, "Our Mission", "Equal access to public opportunities"],
] as const;

/* --------------------------------- types --------------------------------- */

type Details = {
  constituency: string;
  opens: string;
  closes: string;
  required_documents: string[];
};

type StatusData = {
  ref_no: string;
  stage: string;
  stage_label: string;
  estimated_completion_days: number;
  public_note: string;
};

type Sms = { message: string };

type Msg =
  | { kind: "user"; text: string }
  | { kind: "processing"; revealed: number }
  | { kind: "answer"; text: string; details: Details | null; source: string }
  | { kind: "notify-form" }
  | { kind: "reminder-set"; phone: string }
  | { kind: "status-form" }
  | { kind: "status"; data: StatusData }
  | { kind: "error"; text: string };

const fmtDate = (iso: string, lang: Lang) =>
  new Date(iso + "T00:00:00").toLocaleDateString(lang === "sw" ? "sw-KE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const toApiHistory = (items: Msg[]) =>
  items
    .flatMap((m) => {
      if (m.kind === "user") return [{ role: "user", content: m.text }];
      if (m.kind === "answer") return [{ role: "assistant", content: m.text }];
      return [];
    })
    .slice(-8);

/* ---------------- animated status tracker (one screen per stage) ---------------- */

function StatusCard({ data, lang }: { data: StatusData; lang: Lang }) {
  const t = STRINGS[lang];
  const current = Math.max(
    0,
    STAGES.findIndex((s) => s.id === data.stage)
  );
  const HeadIcon = STAGES[current].Icon;
  return (
    <div className="w-[88%] rounded-2xl bg-white border border-gray-200 p-4 space-y-3">
      <div className="text-center space-y-1">
        <div className="anim-pop anim-pulse-ring mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <HeadIcon size={28} />
        </div>
        <p className="font-mono text-[11px] text-gray-400">{data.ref_no}</p>
        <p className="text-base font-bold text-green-700">
          {t.stages[data.stage] ?? data.stage_label}
        </p>
        {data.estimated_completion_days > 0 && (
          <p className="text-[11px] text-gray-500">
            {t.estCompletion}: {data.estimated_completion_days} {t.days}
          </p>
        )}
      </div>

      <div className="px-1">
        {STAGES.map((s, j) => {
          const done = j < current;
          const active = j === current;
          const StepIcon = s.Icon;
          return (
            <div key={s.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`anim-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? "bg-green-600 text-white"
                      : active
                        ? "anim-pulse-ring bg-green-700 text-white"
                        : "border-2 border-gray-200 bg-white text-gray-300"
                  }`}
                  style={{ animationDelay: `${j * 0.25}s` }}
                >
                  {done ? <Check size={15} /> : <StepIcon size={15} />}
                </div>
                {j < STAGES.length - 1 && (
                  <div className="relative my-0.5 h-5 w-1 overflow-hidden rounded bg-gray-200">
                    {done && (
                      <div
                        className="anim-grow-down absolute inset-0 bg-green-600"
                        style={{ animationDelay: `${j * 0.25 + 0.2}s` }}
                      />
                    )}
                  </div>
                )}
              </div>
              <p
                className={`pt-1.5 text-xs ${
                  active
                    ? "font-bold text-green-700"
                    : done
                      ? "font-medium text-gray-700"
                      : "text-gray-400"
                }`}
              >
                {t.stages[s.id]}
              </p>
            </div>
          );
        })}
      </div>

      <p
        className="anim-fade-up rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] text-gray-500"
        style={{ animationDelay: `${current * 0.25 + 0.3}s` }}
      >
        {data.public_note}
      </p>
    </div>
  );
}

/* -------------------------------------- page -------------------------------------- */

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [constituency, setConstituency] = useState<string>("ol-kalou");
  const [language, setLanguage] = useState<Lang>("en");
  const [phone, setPhone] = useState("0712 345 678");
  const [ref, setRef] = useState("OKL-2026-0142");
  const [outbox, setOutbox] = useState<Sms[]>([]);
  const [lastSource, setLastSource] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const t = STRINGS[language];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const push = (m: Msg) => setMessages((prev) => [...prev, m]);
  const replaceProcessing = (m: Msg) =>
    setMessages((prev) => prev.map((x) => (x.kind === "processing" ? m : x)));

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    push({ kind: "user", text });
    push({ kind: "processing", revealed: 1 });

    const request = fetch(`${API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "web",
        language,
        constituency,
        text,
        history: toApiHistory(messages),
      }),
    });

    try {
      for (let i = 2; i <= t.steps.length; i++) {
        await sleep(500);
        setMessages((prev) =>
          prev.map((x) => (x.kind === "processing" ? { ...x, revealed: i } : x))
        );
      }
      const res = await request;
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setLastSource(data.source);
      replaceProcessing({
        kind: "answer",
        text: data.answer,
        details: data.details ?? null,
        source: data.source,
      });
    } catch {
      replaceProcessing({ kind: "error", text: t.apiError });
    } finally {
      setBusy(false);
    }
  }

  async function setReminder() {
    try {
      const res = await fetch(`${API}/api/remind`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, constituency, event: "window_opens" }),
      });
      if (!res.ok) throw new Error();
      push({ kind: "reminder-set", phone });
      const box = await fetch(`${API}/api/outbox`).then((r) => r.json());
      setOutbox(box.messages);
    } catch {
      push({ kind: "error", text: t.remindError });
    }
  }

  async function checkStatus(refNo?: string) {
    const lookup = (refNo ?? ref).trim();
    try {
      const res = await fetch(`${API}/api/status/${encodeURIComponent(lookup)}`);
      if (res.status === 404) {
        push({ kind: "error", text: t.notFound });
        return;
      }
      if (!res.ok) throw new Error();
      push({ kind: "status", data: await res.json() });
    } catch {
      push({ kind: "error", text: t.apiError });
    }
  }

  return (
    <div className="flex w-full flex-col items-center gap-6 px-6 py-3 lg:h-[calc(100vh-5.5rem)] lg:flex-row lg:items-stretch lg:justify-center xl:gap-10 xl:px-12">
      {/* ------------------------------------------------ left: intro (fills left space) */}
      <div className="flex w-full max-w-sm flex-col justify-center gap-4 lg:max-w-none lg:flex-1">
        <div>
          <h1 className="text-2xl font-bold leading-snug text-gray-900 xl:text-3xl">
            Your bridge to <span className="text-green-700">NG-CDF bursary</span> information.
          </h1>
          <p className="mt-2 text-sm text-gray-600 xl:text-base">
            Get accurate information, track your application, and receive reminders — from any
            phone.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
          <label className="block text-xs font-semibold text-gray-500">CONSTITUENCY</label>
          <select
            value={constituency}
            onChange={(e) => setConstituency(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {CONSTITUENCIES.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <label className="block text-xs font-semibold text-gray-500">LANGUAGE / LUGHA</label>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 text-sm">
            {(["en", "sw"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`flex-1 py-2 font-medium ${
                  language === l ? "bg-green-700 text-white" : "bg-white text-gray-600"
                }`}
              >
                {l === "en" ? "English" : "Kiswahili"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-bold text-gray-500">HOW IT WORKS</h2>
          {[
            ["1", "Ask", "Question from web chat or *123# USSD"],
            ["2", "AI Module", "DeepSeek LLM grounded on constituency data (RAG)"],
            ["3", "Answer", "Same channel back — plus SMS reminders"],
          ].map(([n, title, sub]) => (
            <div key={n} className="flex items-start gap-3 py-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-700 text-xs font-bold text-white">
                {n}
              </span>
              <div>
                <div className="text-sm font-semibold text-gray-800">{title}</div>
                <div className="text-xs text-gray-500">{sub}</div>
              </div>
            </div>
          ))}
          {lastSource && (
            <p className="mt-2 border-t border-gray-100 pt-2 text-[11px] text-gray-400">
              Last answer: <span className="font-mono text-green-700">{lastSource}</span>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {VALUES.map(([Icon, title, sub]) => (
              <div key={title} className="flex items-start gap-2">
                <Icon size={14} className="mt-0.5 shrink-0 text-green-700" />
                <div>
                  <div className="text-[11px] font-semibold text-gray-800">{title}</div>
                  <div className="text-[10px] text-gray-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-gray-100 pt-2 text-center text-[10px] text-gray-400">
            Part of the Mozilla Foundation × KamiLimu Democracy & AI Hackathon — July 4th, 2026
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ centre: full-height phone */}
      <div className="flex h-[calc(100vh-5.5rem)] min-h-140 w-100 max-w-full shrink-0 flex-col overflow-hidden rounded-[2.5rem] border-10 border-gray-900 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-2 text-[10px] text-gray-500">
          <span>9:04</span>
          <span className="flex items-center gap-1.5">
            <Signal size={11} />
            <BatteryFull size={13} />
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
          <span className="text-sm font-bold">
            <span className="text-gray-900">Bursa</span>
            <span className="text-green-700">Bridge</span>
          </span>
          <Menu size={16} className="text-gray-400" />
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-3">
          {/* greeting follows the selected language */}
          <div className="flex">
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
              {t.greeting}
            </div>
          </div>
          {messages.map((m, i) => {
            switch (m.kind) {
              case "user":
                return (
                  <div key={i} className="anim-fade-up flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-green-700 px-3 py-2 text-sm text-white">
                      {m.text}
                    </div>
                  </div>
                );
              case "processing":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <div className="w-[85%] space-y-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-xs text-gray-600">
                      <div className="font-semibold text-gray-700">{t.processing}</div>
                      {t.steps.slice(0, m.revealed).map((s, j) => (
                        <div key={s} className="anim-fade-up flex items-center gap-2">
                          {j < m.revealed - 1 || m.revealed === t.steps.length ? (
                            <Check size={13} className="anim-pop text-green-600" />
                          ) : (
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                          )}
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              case "answer":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <div
                      className={`space-y-2 rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-800 ${
                        m.details ? "w-[88%]" : "max-w-[85%] rounded-bl-sm"
                      }`}
                    >
                      <p className="font-semibold">{m.text}</p>
                      {m.details && (
                        <>
                      <div>
                        <p className="mb-1 text-xs font-semibold text-gray-500">
                          {t.requiredDocs}
                        </p>
                        {m.details.required_documents.map((d, j) => (
                          <div
                            key={d}
                            className="anim-fade-up flex items-center gap-2 py-0.5 text-xs"
                            style={{ animationDelay: `${j * 0.12}s` }}
                          >
                            <span className="h-2 w-2 rounded-full bg-green-600" />
                            {d}
                          </div>
                        ))}
                        <p className="mt-1 text-[11px] text-gray-400">
                          {t.window}: {fmtDate(m.details.opens, language)} –{" "}
                          {fmtDate(m.details.closes, language)}
                        </p>
                      </div>
                      <button
                        onClick={() => push({ kind: "notify-form" })}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800"
                      >
                        <Bell size={15} /> {t.notifyMe}
                      </button>
                      <button
                        onClick={() => push({ kind: "status-form" })}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Search size={15} /> {t.checkStatus}
                      </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              case "notify-form":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <div className="w-[88%] space-y-2 rounded-2xl border border-gray-200 bg-white p-3 text-sm">
                      <p className="text-xs font-semibold text-gray-600">{t.smsPrompt}</p>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        onClick={setReminder}
                        className="w-full rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800"
                      >
                        {t.setReminder}
                      </button>
                    </div>
                  </div>
                );
              case "reminder-set":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <div className="w-[88%] space-y-1 rounded-2xl border border-gray-200 bg-white p-4 text-center">
                      <div className="anim-pop anim-pulse-ring mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white">
                        <Check size={24} />
                      </div>
                      <p className="text-sm font-bold text-gray-800">{t.reminderSet}</p>
                      <p className="text-xs text-gray-500">{t.reminderNote}</p>
                      <p className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        {t.phone}: {m.phone}
                      </p>
                    </div>
                  </div>
                );
              case "status-form":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <div className="w-[88%] space-y-2 rounded-2xl border border-gray-200 bg-white p-3 text-sm">
                      <p className="text-xs font-semibold text-gray-600">{t.refPrompt}</p>
                      <input
                        value={ref}
                        onChange={(e) => setRef(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                      />
                      <div className="flex flex-wrap gap-1">
                        {SAMPLE_REFS.map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setRef(r);
                              checkStatus(r);
                            }}
                            className="rounded-full border border-gray-200 px-2 py-0.5 font-mono text-[10px] text-gray-500 hover:border-green-600 hover:text-green-700"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => checkStatus()}
                        className="w-full rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800"
                      >
                        {t.checkStatus}
                      </button>
                    </div>
                  </div>
                );
              case "status":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <StatusCard data={m.data} lang={language} />
                  </div>
                );
              case "error":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <div className="w-[85%] rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {m.text}
                    </div>
                  </div>
                );
            }
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-gray-100 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t.placeholder}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-green-600"
          />
          <button
            onClick={send}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-green-700 text-white disabled:opacity-50"
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ right: SMS outbox (fills right space) */}
      <div className="flex w-full max-w-sm flex-col justify-center lg:max-w-none lg:flex-1">
        <div className="mx-auto flex h-full max-h-[calc(100vh-5.5rem)] w-full max-w-xs flex-col lg:max-w-sm">
          <h2 className="mb-3 text-sm font-bold text-green-800">
            SAMPLE SMS RECEIVED <span className="font-normal text-gray-400">(mocked)</span>
          </h2>
          <div className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-[1.8rem] border-8 border-gray-900 bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-700">
                <User size={14} />
              </span>
              <span className="text-sm font-semibold text-gray-800">BursaBridge</span>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50 p-3">
              {outbox.length === 0 && (
                <p className="pt-16 text-center text-xs text-gray-400">
                  Press “{t.notifyMe}” in the chat —<br /> the SMS that would be sent
                  <br /> appears here.
                </p>
              )}
              {outbox.map((s, i) => (
                <div
                  key={i}
                  className="anim-fade-up rounded-2xl rounded-bl-sm border border-gray-200 bg-white p-3 text-xs text-gray-700"
                >
                  {s.message}
                  <div className="mt-1 text-[10px] text-gray-400">9:00 AM</div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            Real SMS delivery via Africa&apos;s Talking is on the roadmap — the demo renders the
            exact message the gateway would send.
          </p>
        </div>
      </div>
    </div>
  );
}
