"use client";

import { useEffect, useRef, useState } from "react";
import {
  BatteryFull,
  Bell,
  Calendar,
  ChevronRight,
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

type Bursary = {
  id: string;
  name: string;
  county: string;
  opens: string;
  closes: string;
  status: "open" | "upcoming" | "closed";
  days: number;
  required_documents: string[];
  eligibility_notes: string;
  office: {
    location: string;
    phone: string;
    hours: string;
  };
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

const statusStyles: Record<Bursary["status"], string> = {
  open: "bg-[var(--ngcdf-green-soft)] text-[var(--ngcdf-green-dark)]",
  upcoming: "bg-amber-100 text-amber-800",
  closed: "bg-gray-100 text-gray-600",
};

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
        <div className="anim-pop anim-pulse-ring mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--ngcdf-green-soft)] text-[var(--ngcdf-green)]">
          <HeadIcon size={28} />
        </div>
        <p className="font-mono text-sm text-gray-400">{data.ref_no}</p>
        <p className="text-xl font-bold text-[var(--ngcdf-green)]">
          {t.stages[data.stage] ?? data.stage_label}
        </p>
        {data.estimated_completion_days > 0 && (
          <p className="text-base text-gray-500">
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
                  className={`anim-pop flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done
                      ? "bg-[var(--ngcdf-green)] text-white"
                      : active
                        ? "anim-pulse-ring bg-[var(--ngcdf-green-dark)] text-white"
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
                        className="anim-grow-down absolute inset-0 bg-[var(--ngcdf-green)]"
                        style={{ animationDelay: `${j * 0.25 + 0.2}s` }}
                      />
                    )}
                  </div>
                )}
              </div>
              <p
                className={`pt-1.5 text-base ${active
                    ? "font-bold text-[var(--ngcdf-green)]"
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
        className="anim-fade-up rounded-lg bg-gray-50 px-3 py-2 text-base text-gray-500"
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
  const [bursaries, setBursaries] = useState<Bursary[]>([]);
  const [bursaryError, setBursaryError] = useState(false);
  const [selectedBursaryId, setSelectedBursaryId] = useState<string | null>(null);
  const [lastSource, setLastSource] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const t = STRINGS[language];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch(`${API}/api/bursaries`)
      .then((res) => {
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setBursaries(data.bursaries ?? []);
        setBursaryError(false);
      })
      .catch(() => setBursaryError(true));
  }, []);

  const push = (m: Msg) => setMessages((prev) => [...prev, m]);
  const replaceProcessing = (m: Msg) =>
    setMessages((prev) => prev.map((x) => (x.kind === "processing" ? m : x)));

  function showBursaryDetails(bursary: Bursary) {
    setConstituency(bursary.id);
    setSelectedBursaryId(bursary.id);
    push({
      kind: "answer",
      text:
        language === "sw"
          ? `${bursary.name} inaonyesha dirisha la maombi, nyaraka, na mawasiliano hapa chini.`
          : `${bursary.name} bursary details are ready below: application window, documents, eligibility, and office contact.`,
      details: {
        constituency: bursary.name,
        opens: bursary.opens,
        closes: bursary.closes,
        required_documents: bursary.required_documents,
      },
      source: "sample_bursary_list",
    });
    setLastSource("sample_bursary_list");
  }

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

  const activeBursary = bursaries.find((b) => b.id === constituency);
  const smsPreview =
    activeBursary == null
      ? "Hello! This is a reminder from BursaBridge. Your selected NG-CDF bursary window is coming up. For help, dial *123#"
      : `Hello! This is a reminder from BursaBridge. ${activeBursary.name} NG-CDF bursary applications open on ${fmtDate(
        activeBursary.opens,
        language
      )}. For help, dial *123#`;

  return (
    <div className="flex w-full flex-col items-center gap-5 px-4 py-3 lg:h-[calc(100vh-5.5rem)] lg:flex-row lg:items-stretch lg:justify-center lg:gap-4 xl:px-6">
      {/* ------------------------------------------------ left: intro (fills left space) */}
      <div className="flex w-full max-w-sm flex-col justify-center gap-6 lg:max-w-none lg:basis-[20%] lg:overflow-y-auto">
        <div>
          <h1 className="text-4xl font-bold leading-tight text-gray-900 xl:text-5xl">
            Your bridge to <span className="text-[var(--ngcdf-green)]">NG-CDF bursary</span> information.
          </h1>
          <p className="mt-4 text-xl leading-snug text-gray-600 xl:text-2xl">
            Get accurate information, track your application, and receive reminders — from any
            phone.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          <label className="block text-lg font-semibold text-gray-500">CONSTITUENCY</label>
          <select
            value={constituency}
            onChange={(e) => setConstituency(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-xl"
          >
            {CONSTITUENCIES.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <label className="block text-lg font-semibold text-gray-500">LANGUAGE / LUGHA</label>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xl">
            {(["en", "sw"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`flex-1 py-3 font-medium ${language === l ? "bg-[var(--ngcdf-green)] text-white" : "bg-white text-gray-600"
                  }`}
              >
                {l === "en" ? "English" : "Kiswahili"}
              </button>
            ))}
          </div>
        </div>
        {/* 
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold text-gray-500">AVAILABLE BURSARIES</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
              demo data
            </span>
          </div>
          {bursaryError && (
            <p className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
              Start the backend to load bursary listings.
            </p>
          )}
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {bursaries.map((b) => {
              const selected = selectedBursaryId === b.id;
              return (
                <div key={b.id} className="rounded-lg border border-gray-200">
                  <button
                    onClick={() => showBursaryDetails(b)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <Calendar size={15} className="shrink-0 text-[var(--ngcdf-green)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-gray-800">
                        {b.name}
                      </span>
                      <span className="block text-[10px] text-gray-500">
                        {fmtDate(b.opens, language)} - {fmtDate(b.closes, language)}
                      </span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${statusStyles[b.status]}`}>
                      {b.status}
                    </span>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 text-gray-300 transition-transform ${
                        selected ? "rotate-90" : ""
                      }`}
                    />
                  </button>
                  {selected && (
                    <div className="anim-fade-up border-t border-gray-100 px-3 py-2 text-[11px] text-gray-600">
                      <p className="font-semibold text-gray-800">{b.county} County</p>
                      <p className="mt-1">{b.eligibility_notes}</p>
                      <p className="mt-2 font-semibold text-gray-800">{t.requiredDocs}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {b.required_documents.map((doc) => (
                          <span key={doc} className="rounded-full bg-[var(--ngcdf-green-soft)] px-2 py-0.5 text-[var(--ngcdf-green-dark)]">
                            {doc}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-gray-500">
                        {b.office.location} · {b.office.phone} · {b.office.hours}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
            {!bursaryError && bursaries.length === 0 && (
              <p className="rounded-lg bg-gray-50 p-2 text-xs text-gray-500">Loading bursaries...</p>
            )}
          </div>
        </div> */}

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-500">HOW IT WORKS</h2>
          {[
            ["1", "Ask", "Question from web chat or *123# USSD"],
            ["2", "AI Module", "DeepSeek LLM grounded on constituency data (RAG)"],
            ["3", "Answer", "Same channel back — plus SMS reminders"],
          ].map(([n, title, sub]) => (
            <div key={n} className="flex items-start gap-4 py-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ngcdf-green)] text-xl font-bold text-white">
                {n}
              </span>
              <div>
                <div className="text-xl font-semibold text-gray-800">{title}</div>
                <div className="text-base leading-snug text-gray-500">{sub}</div>
              </div>
            </div>
          ))}
          {lastSource && (
            <p className="mt-3 border-t border-gray-100 pt-3 text-base text-gray-400">
              Last answer: <span className="font-mono text-[var(--ngcdf-green)]">{lastSource}</span>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            {VALUES.map(([Icon, title, sub]) => (
              <div key={title} className="flex items-start gap-3">
                <Icon size={22} className="mt-1 shrink-0 text-[var(--ngcdf-green)]" />
                <div>
                  <div className="text-base font-semibold text-gray-800">{title}</div>
                  <div className="text-sm leading-snug text-gray-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-gray-100 pt-3 text-center text-sm text-gray-400">
            Part of the Mozilla Foundation × KamiLimu Democracy & AI Hackathon — July 4th, 2026
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ centre: full-height phone */}
      <div className="flex h-[calc(100vh-5.5rem)] min-h-140 w-full max-w-full shrink-0 flex-col overflow-hidden rounded-[2.5rem] border-10 border-gray-900 bg-white shadow-2xl lg:basis-[60%]">
        <div className="flex items-center justify-between px-7 pt-4 text-xl font-semibold text-gray-500">
          <span>9:04</span>
          <span className="flex items-center gap-1.5">
            <Signal size={26} />
            <BatteryFull size={30} />
          </span>
        </div>
        <div className="flex items-center justify-between border-b border-gray-100 px-7 py-5">
          <span className="text-4xl font-bold">
            <span className="text-gray-900">Bursa</span>
            <span className="text-[var(--ngcdf-green)]">Bridge</span>
          </span>
          <Menu size={34} className="text-gray-400" />
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto bg-gray-50 px-7 py-7">
          {/* greeting follows the selected language */}
          <div className="flex">
            <div className="max-w-[90%] rounded-3xl rounded-bl-sm border-2 border-gray-200 bg-white px-7 py-5 text-4xl leading-tight text-gray-900">
              {t.greeting}
            </div>
          </div>
          {messages.map((m, i) => {
            switch (m.kind) {
              case "user":
                return (
                  <div key={i} className="anim-fade-up flex justify-end">
                    <div className="max-w-[85%] rounded-3xl rounded-br-sm bg-[var(--ngcdf-green)] px-7 py-5 text-4xl leading-tight text-white">
                      {m.text}
                    </div>
                  </div>
                );
              case "processing":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <div className="w-[90%] space-y-4 rounded-3xl border-2 border-gray-200 bg-white px-7 py-6 text-3xl leading-tight text-gray-600">
                      <div className="font-semibold text-gray-700">{t.processing}</div>
                      {t.steps.slice(0, m.revealed).map((s, j) => (
                        <div key={s} className="anim-fade-up flex items-center gap-4">
                          {j < m.revealed - 1 || m.revealed === t.steps.length ? (
                            <Check size={30} className="anim-pop text-[var(--ngcdf-green)]" />
                          ) : (
                            <span className="inline-block h-7 w-7 animate-spin rounded-full border-4 border-[var(--ngcdf-green)] border-t-transparent" />
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
                      className={`space-y-5 rounded-3xl border-2 border-gray-200 bg-white p-7 text-4xl leading-tight text-gray-900 ${m.details ? "w-[92%]" : "max-w-[90%] rounded-bl-sm"
                        }`}
                    >
                      <p className="font-semibold">{m.text}</p>
                      {m.details && (
                        <>
                          <div>
                            <p className="mb-3 text-2xl font-semibold text-gray-500">
                              {t.requiredDocs}
                            </p>
                            {m.details.required_documents.map((d, j) => (
                              <div
                                key={d}
                                className="anim-fade-up flex items-center gap-4 py-2 text-2xl"
                                style={{ animationDelay: `${j * 0.12}s` }}
                              >
                                <span className="h-4 w-4 rounded-full bg-[var(--ngcdf-green)]" />
                                {d}
                              </div>
                            ))}
                            <p className="mt-3 text-xl text-gray-400">
                              {t.window}: {fmtDate(m.details.opens, language)} –{" "}
                              {fmtDate(m.details.closes, language)}
                            </p>
                          </div>
                          <button
                            onClick={() => push({ kind: "notify-form" })}
                            className="flex w-full items-center justify-center gap-4 rounded-2xl bg-[var(--ngcdf-green)] py-5 text-2xl font-semibold text-white hover:bg-[var(--ngcdf-green-dark)]"
                          >
                            <Bell size={30} /> {t.notifyMe}
                          </button>
                          <button
                            onClick={() => push({ kind: "status-form" })}
                            className="flex w-full items-center justify-center gap-4 rounded-2xl border-2 border-gray-300 py-5 text-2xl font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Search size={30} /> {t.checkStatus}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              case "notify-form":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <div className="w-[88%] space-y-3 rounded-2xl border border-gray-200 bg-white p-4 text-base">
                      <p className="text-base font-semibold text-gray-600">{t.smsPrompt}</p>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base"
                      />
                      <button
                        onClick={setReminder}
                        className="w-full rounded-lg bg-[var(--ngcdf-green)] py-3 text-base font-semibold text-white hover:bg-[var(--ngcdf-green-dark)]"
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
                      <div className="anim-pop anim-pulse-ring mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ngcdf-green)] text-white">
                        <Check size={24} />
                      </div>
                      <p className="text-lg font-bold text-gray-800">{t.reminderSet}</p>
                      <p className="text-base text-gray-500">{t.reminderNote}</p>
                      <p className="rounded-lg bg-gray-100 px-2 py-1 text-base text-gray-600">
                        {t.phone}: {m.phone}
                      </p>
                    </div>
                  </div>
                );
              case "status-form":
                return (
                  <div key={i} className="anim-fade-up flex">
                    <div className="w-[88%] space-y-3 rounded-2xl border border-gray-200 bg-white p-4 text-base">
                      <p className="text-base font-semibold text-gray-600">{t.refPrompt}</p>
                      <input
                        value={ref}
                        onChange={(e) => setRef(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-base"
                      />
                      <div className="flex flex-wrap gap-1">
                        {SAMPLE_REFS.map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              setRef(r);
                              checkStatus(r);
                            }}
                            className="rounded-full border border-gray-200 px-2 py-0.5 font-mono text-[10px] text-gray-500 hover:border-[var(--ngcdf-green)] hover:text-[var(--ngcdf-green)]"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => checkStatus()}
                        className="w-full rounded-lg bg-[var(--ngcdf-green)] py-3 text-base font-semibold text-white hover:bg-[var(--ngcdf-green-dark)]"
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
                    <div className="w-[85%] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">
                      {m.text}
                    </div>
                  </div>
                );
            }
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-4 border-t border-gray-100 p-5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t.placeholder}
            className="flex-1 rounded-full border-2 border-gray-300 px-8 py-5 text-4xl outline-none focus:border-[var(--ngcdf-green)]"
          />
          <button
            onClick={send}
            disabled={busy}
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--ngcdf-green)] text-white disabled:opacity-50"
            aria-label="Send"
          >
            <Send size={32} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ right: SMS outbox (fills right space) */}
      <div className="flex w-full max-w-sm flex-col justify-center lg:max-w-none lg:basis-[20%]">
        <div className="mx-auto flex h-full max-h-[calc(100vh-5.5rem)] w-full flex-col">
          <h2 className="mb-4 text-xl font-bold text-[var(--ngcdf-green-dark)]">
            SAMPLE SMS RECEIVED <span className="font-normal text-gray-400">(mocked)</span>
          </h2>
          <div className="flex min-h-72 flex-1 flex-col overflow-hidden rounded-[1.8rem] border-8 border-gray-900 bg-white shadow-xl">
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ngcdf-green-soft)] text-[var(--ngcdf-green)]">
                <User size={22} />
              </span>
              <span className="text-xl font-semibold text-gray-800">BursaBridge</span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50 p-4">
              {outbox.length === 0 && (
                <div className="space-y-3">
                  <p className="text-center text-base font-semibold text-gray-400">
                    SMS preview before sending
                  </p>
                  <div className="anim-fade-up rounded-2xl rounded-bl-sm border border-dashed border-[var(--ngcdf-green)] bg-white p-4 text-lg leading-snug text-gray-700">
                    {smsPreview}
                    <div className="mt-2 text-sm text-gray-400">preview</div>
                  </div>
                  <p className="text-center text-base text-gray-400">
                    Press “{t.notifyMe}” in the chat —<br /> the SMS that would be sent
                    <br /> appears here.
                  </p>
                </div>
              )}
              {outbox.map((s, i) => (
                <div
                  key={i}
                  className="anim-fade-up rounded-2xl rounded-bl-sm border border-gray-200 bg-white p-4 text-lg leading-snug text-gray-700"
                >
                  {s.message}
                  <div className="mt-2 text-sm text-gray-400">9:00 AM</div>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-base leading-snug text-gray-400">
            Real SMS delivery via Africa&apos;s Talking is on the roadmap — the demo renders the
            exact message the gateway would send.
          </p>
        </div>
      </div>
    </div>
  );
}
