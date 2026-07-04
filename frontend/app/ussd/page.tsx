"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

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

  async function gateway(text: string) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/ussd`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: "SIM_1", phone: "+254712345678", text }),
      });
      const raw = await res.text();
      setLog((l) => [...l, { req: JSON.stringify({ text }), res: raw.slice(0, 60) + (raw.length > 60 ? "…" : "") }]);
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
    <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col lg:flex-row gap-10 items-start justify-center">
      {/* ------------------------------------------- left: explainer */}
      <div className="w-full lg:w-60 shrink-0 pt-4">
        <h1 className="text-2xl font-bold text-gray-900">
          USSD Interface <span className="text-green-700">(Feature Phone)</span>
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Dial <span className="font-mono font-bold">*123#</span> and press{" "}
          <span className="text-green-700 font-semibold">Call</span>. Works exactly like an
          M-Pesa session — numbered menus, no internet, no smartphone.
        </p>
        <ol className="mt-4 space-y-2 text-xs text-gray-500 list-decimal list-inside">
          <li>Dial *123#</li>
          <li>Choose an option (e.g. 1 = Upcoming Deadlines)</li>
          <li>Select constituency</li>
          <li>Get response · 0 goes back</li>
        </ol>
        <p className="mt-4 rounded-lg bg-green-50 border border-green-200 p-3 text-[11px] text-green-900">
          🟡 The telco gateway is simulated in the browser, but every keypress hits{" "}
          <span className="font-mono">POST /api/ussd</span> with the same request a real
          gateway (Africa&apos;s Talking) sends, and the backend replies with the real{" "}
          <span className="font-mono">CON/END</span> USSD protocol.
        </p>
      </div>

      {/* ------------------------------------------- centre: feature phone */}
      <div className="w-72 shrink-0 rounded-[2rem] bg-gray-900 p-4 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-gray-700" />
        {/* screen */}
        <div className="rounded-lg bg-[#cfe3c4] p-3 font-mono text-[13px] leading-snug text-gray-900 min-h-52 flex flex-col">
          {screen === null ? (
            <>
              <div className="text-[10px] text-gray-600">BursaBridge · Kenya 📶</div>
              <div className="flex-1 flex items-center justify-center text-xl tracking-widest">
                {dial || <span className="text-gray-500 text-sm">Dial *123#</span>}
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 whitespace-pre-wrap">{screen}</div>
              {inSession && (
                <input
                  autoFocus
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && call()}
                  placeholder="Reply…"
                  className="mt-2 w-full rounded border border-gray-500 bg-white/70 px-2 py-1 text-sm outline-none"
                />
              )}
              {ended && (
                <div className="mt-2 text-center text-[11px] text-gray-600">— Session ended —</div>
              )}
            </>
          )}
        </div>
        {/* call / end */}
        <div className="mt-3 flex justify-between px-2">
          <button
            onClick={call}
            disabled={busy}
            className="flex h-10 w-14 items-center justify-center rounded-lg bg-green-600 text-white text-lg disabled:opacity-50"
            aria-label="Call / Send"
          >
            {busy ? "…" : "📞"}
          </button>
          <button
            onClick={() => {
              if (screen === null) setDial((d) => d.slice(0, -1));
              else setReply((r) => r.slice(0, -1));
            }}
            className="flex h-10 w-14 items-center justify-center rounded-lg bg-gray-700 text-white text-sm"
            aria-label="Delete"
          >
            ⌫
          </button>
          <button
            onClick={hangUp}
            className="flex h-10 w-14 items-center justify-center rounded-lg bg-red-600 text-white text-lg"
            aria-label="End call"
          >
            📴
          </button>
        </div>
        {/* keypad */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {KEYS.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className="rounded-lg bg-gray-800 py-2.5 text-white text-lg font-medium hover:bg-gray-700 active:bg-gray-600"
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------- right: options + gateway log */}
      <div className="w-full lg:w-72 shrink-0 pt-4 space-y-5">
        <div className="rounded-xl bg-white border border-gray-200 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-2">USSD OPTIONS OVERVIEW</h2>
          {[
            ["📅", "1 Upcoming Deadlines", "Opening & closing dates"],
            ["📄", "2 Required Documents", "Everything you need to apply"],
            ["🔎", "3 Check Application Status", "Where your application is"],
            ["❓", "4 FAQs", "Answers to common questions"],
            ["📞", "5 Contact Office", "Location & phone numbers"],
            ["🌍", "6 Language", "English / Kiswahili"],
          ].map(([icon, title, sub]) => (
            <div key={title} className="flex items-start gap-2 py-1.5">
              <span>{icon}</span>
              <div>
                <div className="text-xs font-semibold text-gray-800">{title}</div>
                <div className="text-[11px] text-gray-500">{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-gray-900 p-4">
          <h2 className="text-xs font-bold text-green-400 mb-2">
            GATEWAY LOG — what a telco would exchange
          </h2>
          <div className="space-y-1.5 font-mono text-[10px] max-h-48 overflow-y-auto">
            {log.length === 0 && <p className="text-gray-500">Waiting for a session…</p>}
            {log.map((e, i) => (
              <div key={i}>
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
