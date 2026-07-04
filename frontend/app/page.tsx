"use client";

import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const CONSTITUENCIES = [
  ["ol-kalou", "Ol-Kalou"],
  ["mwala", "Mwala"],
  ["garissa-township", "Garissa Township"],
  ["kieni", "Kieni"],
  ["mathira", "Mathira"],
] as const;

const STEPS = [
  "Understanding your question",
  "Checking constituency data",
  "Retrieving information",
  "Preparing answer…",
];

type Details = {
  constituency: string;
  opens: string;
  closes: string;
  required_documents: string[];
};

type StatusData = {
  ref_no: string;
  stage_label: string;
  estimated_completion_days: number;
  public_note: string;
};

type Sms = { message: string };

type Msg =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "processing"; revealed: number }
  | { kind: "answer"; text: string; details: Details; source: string }
  | { kind: "notify-form" }
  | { kind: "reminder-set"; phone: string }
  | { kind: "status-form" }
  | { kind: "status"; data: StatusData }
  | { kind: "error"; text: string };

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { kind: "assistant", text: "Hello! How can we help you today? / Karibu BursaBridge!" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [constituency, setConstituency] = useState<string>("ol-kalou");
  const [language, setLanguage] = useState<"en" | "sw">("en");
  const [phone, setPhone] = useState("0712 345 678");
  const [ref, setRef] = useState("OKL-2026-0142");
  const [outbox, setOutbox] = useState<Sms[]>([]);
  const [lastSource, setLastSource] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      body: JSON.stringify({ channel: "web", language, constituency, text }),
    });

    try {
      for (let i = 2; i <= STEPS.length; i++) {
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
        details: data.details,
        source: data.source,
      });
    } catch {
      replaceProcessing({
        kind: "error",
        text: "Could not reach the BursaBridge API. Is the backend running on port 8000?",
      });
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
      push({ kind: "error", text: "Could not create the reminder. Is the backend running?" });
    }
  }

  async function checkStatus() {
    try {
      const res = await fetch(`${API}/api/status/${encodeURIComponent(ref.trim())}`);
      if (res.status === 404) {
        push({ kind: "error", text: "No application found for that ref number." });
        return;
      }
      if (!res.ok) throw new Error();
      push({ kind: "status", data: await res.json() });
    } catch {
      push({ kind: "error", text: "Could not reach the BursaBridge API. Is the backend running?" });
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col lg:flex-row gap-10 items-start justify-center">
      {/* ------------------------------------------------ left: intro */}
      <div className="w-full lg:w-56 shrink-0 pt-4">
        <h1 className="text-2xl font-bold text-gray-900 leading-snug">
          Your bridge to <span className="text-green-700">NG-CDF bursary</span> information.
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Get accurate information, track your application, and receive reminders — from any
          phone.
        </p>
        <div className="mt-5 space-y-3">
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
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
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
        {lastSource && (
          <p className="mt-5 text-[11px] text-gray-400">
            AI module:{" "}
            <span className="font-mono text-green-700">{lastSource}</span>
            <br />
            DeepSeek · RAG over constituency data
          </p>
        )}
      </div>

      {/* ------------------------------------------------ centre: phone with chat */}
      <div className="w-90 shrink-0 rounded-[2.5rem] border-10 border-gray-900 bg-white shadow-2xl overflow-hidden flex flex-col h-165">
        <div className="flex items-center justify-between px-5 pt-2 text-[10px] text-gray-500">
          <span>9:04</span>
          <span>▂▄▆ 📶 🔋</span>
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <span className="text-sm font-bold">
            <span className="text-gray-900">Bursa</span>
            <span className="text-green-700">Bridge</span>
          </span>
          <span className="text-gray-400">☰</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
          {messages.map((m, i) => {
            switch (m.kind) {
              case "user":
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-green-700 px-3 py-2 text-sm text-white">
                      {m.text}
                    </div>
                  </div>
                );
              case "assistant":
                return (
                  <div key={i} className="flex">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white border border-gray-200 px-3 py-2 text-sm text-gray-800">
                      {m.text}
                    </div>
                  </div>
                );
              case "processing":
                return (
                  <div key={i} className="flex">
                    <div className="w-[85%] rounded-2xl bg-white border border-gray-200 px-3 py-3 text-xs text-gray-600 space-y-2">
                      <div className="font-semibold text-gray-700">Processing your question…</div>
                      {STEPS.slice(0, m.revealed).map((s, j) => (
                        <div key={s} className="flex items-center gap-2">
                          {j < m.revealed - 1 || m.revealed === STEPS.length ? (
                            <span className="text-green-600">✔</span>
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
                  <div key={i} className="flex">
                    <div className="w-[88%] rounded-2xl bg-white border border-gray-200 p-3 text-sm text-gray-800 space-y-2">
                      <p className="font-semibold">{m.text}</p>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">
                          Required Documents:
                        </p>
                        {m.details.required_documents.map((d) => (
                          <div key={d} className="flex items-center gap-2 text-xs py-0.5">
                            <span className="h-2 w-2 rounded-full bg-green-600" />
                            {d}
                          </div>
                        ))}
                        <p className="mt-1 text-[11px] text-gray-400">
                          Window: {fmtDate(m.details.opens)} – {fmtDate(m.details.closes)}
                        </p>
                      </div>
                      <button
                        onClick={() => push({ kind: "notify-form" })}
                        className="w-full rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800"
                      >
                        🔔 Notify Me
                      </button>
                      <button
                        onClick={() => push({ kind: "status-form" })}
                        className="w-full rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        🔎 Check Status
                      </button>
                    </div>
                  </div>
                );
              case "notify-form":
                return (
                  <div key={i} className="flex">
                    <div className="w-[88%] rounded-2xl bg-white border border-gray-200 p-3 text-sm space-y-2">
                      <p className="text-xs font-semibold text-gray-600">
                        Where should we send the SMS reminder?
                      </p>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <button
                        onClick={setReminder}
                        className="w-full rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800"
                      >
                        Set Reminder
                      </button>
                    </div>
                  </div>
                );
              case "reminder-set":
                return (
                  <div key={i} className="flex">
                    <div className="w-[88%] rounded-2xl bg-white border border-gray-200 p-4 text-center space-y-1">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white text-xl">
                        ✓
                      </div>
                      <p className="text-sm font-bold text-gray-800">Reminder set!</p>
                      <p className="text-xs text-gray-500">
                        You will receive an SMS 2 days before applications open.
                      </p>
                      <p className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        Phone: {m.phone}
                      </p>
                    </div>
                  </div>
                );
              case "status-form":
                return (
                  <div key={i} className="flex">
                    <div className="w-[88%] rounded-2xl bg-white border border-gray-200 p-3 text-sm space-y-2">
                      <p className="text-xs font-semibold text-gray-600">
                        Enter your application ref number:
                      </p>
                      <input
                        value={ref}
                        onChange={(e) => setRef(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
                      />
                      <button
                        onClick={checkStatus}
                        className="w-full rounded-lg bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-800"
                      >
                        Check Status
                      </button>
                    </div>
                  </div>
                );
              case "status":
                return (
                  <div key={i} className="flex">
                    <div className="w-[88%] rounded-2xl bg-white border border-gray-200 p-3 text-sm space-y-1">
                      <p className="font-mono text-xs text-gray-500">{m.data.ref_no}</p>
                      <p className="font-bold text-green-700">{m.data.stage_label}</p>
                      {m.data.estimated_completion_days > 0 && (
                        <p className="text-xs text-gray-600">
                          Estimated completion: {m.data.estimated_completion_days} days
                        </p>
                      )}
                      <p className="text-xs text-gray-500">{m.data.public_note}</p>
                    </div>
                  </div>
                );
              case "error":
                return (
                  <div key={i} className="flex">
                    <div className="w-[85%] rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
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
            placeholder="Type your question…"
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm outline-none focus:border-green-600"
          />
          <button
            onClick={send}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-green-700 text-white disabled:opacity-50"
            aria-label="Send"
          >
            ➤
          </button>
        </div>
      </div>

      {/* ------------------------------------------------ right: SMS outbox */}
      <div className="w-full lg:w-72 shrink-0 pt-4">
        <h2 className="text-sm font-bold text-green-800 mb-3">SAMPLE SMS RECEIVED 🟡 (mocked)</h2>
        <div className="rounded-[1.8rem] border-8 border-gray-900 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-sm">
              👤
            </span>
            <span className="text-sm font-semibold text-gray-800">BursaBridge</span>
          </div>
          <div className="min-h-55 space-y-2 bg-gray-50 p-3">
            {outbox.length === 0 && (
              <p className="pt-16 text-center text-xs text-gray-400">
                Press “Notify Me” in the chat —<br /> the SMS that would be sent
                <br /> appears here.
              </p>
            )}
            {outbox.map((s, i) => (
              <div
                key={i}
                className="rounded-2xl rounded-bl-sm bg-white border border-gray-200 p-3 text-xs text-gray-700"
              >
                {s.message}
                <div className="mt-1 text-[10px] text-gray-400">9:00 AM</div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-gray-400">
          Real SMS delivery via Africa&apos;s Talking is on the roadmap — the hackathon demo
          renders the exact message the gateway would send.
        </p>
      </div>
    </div>
  );
}
