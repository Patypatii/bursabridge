"use client";

import { useState } from "react";
import {
  Calendar,
  Delete,
  FileText,
  Globe,
  HelpCircle,
  Phone,
  PhoneCall,
  PhoneOff,
  Search,
  Signal,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const NUMERIC_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const ALPHA_ROWS = ["1234567890", "QWERTYUIOP", "ASDFGHJKL-", "ZXCVBNM"];

const OPTIONS = [
  [Calendar, "1 Upcoming Deadlines", "Opening & closing dates"],
  [FileText, "2 Required Documents", "Everything you need to apply"],
  [Search, "3 Check Application Status", "Where your application is"],
  [HelpCircle, "4 FAQs", "Answers to common questions"],
  [Phone, "5 Contact Office", "Location & phone numbers"],
  [Globe, "6 Language", "English / Kiswahili"],
] as const;

const SMS_PREVIEWS = [
  "Hello! This is a reminder from BursaBridge. Ol-Kalou NG-CDF bursary applications open on 12 July 2026. For help, dial *123#",
  "BursaBridge update: Ref OKL-2026-0142 is Review in Progress. Estimated completion: 6 days.",
] as const;

type LogEntry = { req: string; res: string };

export default function UssdPage() {
  const [dial, setDial] = useState("");
  const [screen, setScreen] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [parts, setParts] = useState<string[]>([]);
  const [reply, setReply] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const inSession = screen !== null && !ended;
  // The keypad adapts: steps that accept letters (ref numbers) show a full keyboard
  const expectsText = inSession && /ref number|kumbukumbu/i.test(screen ?? "");

  async function gateway(text: string) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/ussd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: "SIM_1", phone: "+254712345678", text }),
      });
      const raw = await res.text();
      setLog((l) => [
        ...l,
        { req: JSON.stringify({ text }), res: raw.slice(0, 60) + (raw.length > 60 ? "…" : "") },
      ]);
      setEnded(raw.startsWith("END"));
      setScreen(raw.replace(/^(CON|END)\s/, ""));
    } catch {
      setScreen("Network error.\nIs the backend running on port 8000?");
      setEnded(true);
    } finally {
      setBusy(false);
    }
  }

  function press(key: string) {
    if (inSession) setReply((r) => r + key);
    else if (screen === null) setDial((d) => d + key);
  }

  function call() {
    if (busy) return;
    if (screen === null) {
      if (dial === "*123#") gateway("");
      else {
        setScreen("Invalid USSD code.\nTry *123#");
        setEnded(true);
      }
    } else if (inSession && reply.trim() !== "") {
      const next = [...parts, reply.trim()];
      setParts(next);
      setReply("");
      gateway(next.join("*"));
    }
  }

  function hangUp() {
    setDial("");
    setScreen(null);
    setEnded(false);
    setParts([]);
    setReply("");
  }

  return (
    <div className="flex w-full flex-col items-center gap-5 px-4 py-3 lg:h-[calc(100vh-5.5rem)] lg:flex-row lg:items-stretch lg:justify-center lg:gap-4 xl:px-6">
      {/* ------------------------------------------- left: explainer (fills left space) */}
      <div className="flex w-full max-w-sm flex-col justify-center gap-5 lg:max-w-none lg:basis-[15%] lg:overflow-y-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 xl:text-3xl">
            USSD Interface <span className="text-green-700">(Feature Phone)</span>
          </h1>
          <p className="mt-3 text-sm text-gray-600 xl:text-base">
            Dial <span className="font-mono font-bold">*123#</span> and press{" "}
            <span className="font-semibold text-green-700">Call</span>. Works exactly like an
            M-Pesa session — numbered menus, no internet, no smartphone.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-bold text-gray-500">TRY THIS FLOW</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-gray-600">
            <li>
              Dial <span className="font-mono font-semibold">*123#</span> and press Call
            </li>
            <li>
              Reply <span className="font-mono font-semibold">1</span> — Upcoming Deadlines
            </li>
            <li>
              Reply <span className="font-mono font-semibold">1</span> — Ol-Kalou
            </li>
            <li>
              Get the dates · <span className="font-mono font-semibold">0</span> goes back
            </li>
          </ol>
          <p className="mt-3 text-xs text-gray-500">
            Status check: reply <span className="font-mono">3</span>, then{" "}
            <span className="font-mono">OKL-2026-0142</span> — the keypad adapts to letters for
            this step.
          </p>
        </div>
        <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-900">
          The telco gateway is simulated in the browser (mocked), but every keypress hits{" "}
          <span className="font-mono">POST /api/ussd</span> with the same request a real gateway
          (Africa&apos;s Talking) sends, and the backend replies with the real{" "}
          <span className="font-mono">CON/END</span> USSD protocol.
        </p>
      </div>

      {/* ------------------------------------------- centre: full-height feature phone */}
      <div className="flex h-[calc(100vh-5.5rem)] min-h-140 w-full max-w-full shrink-0 flex-col rounded-4xl bg-gray-900 p-4 shadow-2xl lg:basis-[70%]">
        <div className="mx-auto mb-3 h-1.5 w-16 shrink-0 rounded-full bg-gray-700" />
        {/* screen */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg bg-[#cfe3c4] p-4 font-mono text-[15px] leading-relaxed text-gray-900">
          {screen === null ? (
            <>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                BursaBridge · Kenya <Signal size={11} />
              </div>
              <div className="flex flex-1 items-center justify-center text-2xl tracking-widest">
                {dial || <span className="text-base text-gray-500">Dial *123#</span>}
              </div>
            </>
          ) : (
            <>
              <div key={screen} className="anim-fade-up flex-1 overflow-y-auto whitespace-pre-wrap">
                {screen}
              </div>
              {inSession && (
                <input
                  autoFocus
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && call()}
                  placeholder="Reply…"
                  className="mt-2 w-full shrink-0 rounded border border-gray-500 bg-white/70 px-2 py-1.5 text-sm outline-none"
                />
              )}
              {ended && (
                <div className="anim-fade-up mt-2 shrink-0 text-center text-xs text-gray-600">
                  — Session ended —
                </div>
              )}
            </>
          )}
        </div>
        {/* call / delete / end */}
        <div className="mt-4 flex shrink-0 justify-between px-2">
          <button
            onClick={call}
            disabled={busy}
            className="flex h-12 w-16 items-center justify-center rounded-xl bg-green-600 text-white disabled:opacity-50"
            aria-label="Call / Send"
          >
            {busy ? "…" : <PhoneCall size={22} />}
          </button>
          <button
            onClick={() => {
              if (screen === null) setDial((d) => d.slice(0, -1));
              else setReply((r) => r.slice(0, -1));
            }}
            className="flex h-12 w-16 items-center justify-center rounded-xl bg-gray-700 text-white"
            aria-label="Delete"
          >
            <Delete size={20} />
          </button>
          <button
            onClick={hangUp}
            className="flex h-12 w-16 items-center justify-center rounded-xl bg-red-600 text-white"
            aria-label="End call"
          >
            <PhoneOff size={22} />
          </button>
        </div>
        {/* keypad — adapts to the step: numeric menus vs alphanumeric ref entry */}
        {expectsText ? (
          <div className="anim-fade-up mt-3 shrink-0 space-y-1.5">
            {ALPHA_ROWS.map((row) => (
              <div key={row} className="flex justify-center gap-1">
                {row.split("").map((k) => (
                  <button
                    key={k}
                    onClick={() => press(k)}
                    className="h-10 min-w-0 flex-1 rounded-md bg-gray-800 text-sm font-medium text-white hover:bg-gray-700 active:bg-gray-600"
                  >
                    {k}
                  </button>
                ))}
              </div>
            ))}
            <p className="text-center text-[10px] text-gray-500">
              Keyboard adapted — this step accepts letters
            </p>
          </div>
        ) : (
          <div className="mt-3 grid shrink-0 grid-cols-3 gap-2">
            {NUMERIC_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => press(k)}
                className="rounded-xl bg-gray-800 py-3 text-xl font-medium text-white hover:bg-gray-700 active:bg-gray-600"
              >
                {k}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------- right: options + gateway log (fills right space) */}
      <div className="flex w-full max-w-sm flex-col justify-center gap-5 lg:h-full lg:max-w-none lg:basis-[15%] lg:overflow-y-auto">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold text-gray-800">USSD OPTIONS OVERVIEW</h2>
          {OPTIONS.map(([Icon, title, sub]) => (
            <div key={title} className="flex items-start gap-2.5 py-1.5">
              <Icon size={15} className="mt-0.5 shrink-0 text-green-700" />
              <div>
                <div className="text-xs font-semibold text-gray-800">{title}</div>
                <div className="text-[11px] text-gray-500">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-bold text-green-800">SMS PREVIEWS</h2>
          <div className="space-y-2">
            {SMS_PREVIEWS.map((message, i) => (
              <div
                key={message}
                className="anim-fade-up rounded-2xl rounded-bl-sm border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700"
              >
                {message}
                <div className="mt-1 text-[10px] text-gray-400">
                  {i === 0 ? "deadline reminder" : "status update"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex min-h-48 flex-col rounded-xl bg-gray-900 p-4 lg:flex-1">
          <h2 className="mb-2 shrink-0 text-xs font-bold text-green-400">
            GATEWAY LOG — what a telco would exchange
          </h2>
          <div className="flex-1 space-y-1.5 overflow-y-auto font-mono text-[10px]">
            {log.length === 0 && <p className="text-gray-500">Waiting for a session…</p>}
            {log.map((e, i) => (
              <div key={i} className="anim-fade-up">
                <div className="text-amber-300">→ POST /api/ussd {e.req}</div>
                <div className="text-green-300">← {e.res}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
