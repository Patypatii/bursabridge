# Demo Script — BursaBridge AI (20–30 seconds)

> Screen-recorded video with voice-over, embedded in the slide deck.
> The 20–30s counts inside the 3-minute pitch, so every second is scripted.
> **Story: Input → AI → Output, on the same channel, twice (web + USSD).**

## Storyboard

| Time | Screen | Action | Voice-over (say this) |
|------|--------|--------|------------------------|
| 0–6s | Web chat (phone frame, localhost:3000) | Type **"When does Ol-Kalou bursary open?"** → Send | "A parent asks BursaBridge about their constituency's bursary…" |
| 6–10s | Processing animation | `Understanding your question → Checking constituency data → Retrieving information → Preparing answer…` | "…the question goes to our AI module, grounded on constituency data." |
| 10–16s | AI reply card | **"Ol-Kalou NG-CDF bursary applications open on 12 July 2026"** + Required Documents: ✔ Admission Letter ✔ Fee Structure ✔ Chief Recommendation ✔ National ID (Guardian), plus **[Notify Me] [Check Status]** buttons | "It answers with real deadlines and the exact documents needed." |
| 16–20s | Click **Notify Me** → reminder confirmation + SMS outbox panel | Green check: *"Reminder set! You'll receive an SMS 2 days before applications open."* SMS renders: *"Hello! This is a reminder from BursaBridge. Ol-Kalou NG-CDF bursary applications open on 12 July 2026. For help, dial \*123#"* | "Families get SMS reminders — no internet needed." |
| 20–27s | Switch to USSD simulator (`/ussd`) | Dial `*123#` → menu → press **1** (Upcoming Deadlines) → press **1** (Ol-Kalou) → screen: *"Ol-Kalou — Applications Open: 12 July 2026, Applications Close: 25 July 2026"* | "And the same assistant works on a basic feature phone, over USSD." |
| 27–30s | Hold on USSD screen | — | "Equal access to public information — whatever phone you own." |

## How we demo USSD without a telco

The `/ussd` page is a **feature-phone simulator in the browser**: an
on-screen keypad where the user dials `*123#`, then navigates numbered menus
exactly like an M-Pesa session. Every keypress posts to the backend's
`POST /api/ussd` endpoint using the **same request format a real USSD gateway
(Africa's Talking) sends** (`session_id`, `phone`, accumulated `text` like
`"1*1"`), and the backend answers with the real USSD protocol (`CON …` /
`END …`). So the demo line for judges is:

> "This is the exact request/response cycle a Safaricom user would trigger —
> the only simulated piece is the telco gateway, because the hackathon
> requires everything on localhost. Going live is registering a service code
> and pointing it at this same endpoint."

Recording tip: keep the chat phone and the USSD phone side by side in one
browser window (or two tabs sized as phones) so the channel switch at 20s is
a single click, not a fumble.

## USSD Menu (as shown in the demo — matches the design mockup)

```
Welcome to BursaBridge
1. Upcoming Deadlines
2. Required Documents
3. Check Application Status
4. FAQs
5. Contact Office
6. Language
```

Selecting 1–3 first asks **Select Constituency: 1. Ol-Kalou 2. Mwala
3. Garissa Township 4. Kieni 5. Mathira**, then answers. `0` goes back.

> ⚠️ Deliberately **no "Apply for Bursary" option** — applications stay with
> the official process. We solve access to information, not submission, so
> the demo never raises identity/verification/committee-integration scope
> questions. The committee **admin dashboard is designed but cut from this
> demo** (see architecture matrix ⏩) to keep the story on citizen access.

## Status screen (if judges ask / backup clip)

```
Ref: OKL-2026-0142
Status: Review in Progress
Estimated completion: 7 days
```

Shows government workflow transparency — the AI reports the stage, it never
decides the outcome.

## Recording checklist

- [ ] Backend running (`uvicorn main:app --port 8000`) and frontend (`npm run dev`) before recording
- [ ] `MOCK_MODE=false` and one successful DeepSeek round-trip tested **before** recording (fallback: flip to `true`, demo still works)
- [ ] Browser at 100% zoom, no bookmarks bar; both phone frames visible
- [ ] Record at 1080p (OBS or Xbox Game Bar `Win+Alt+R`), crop to the app window
- [ ] Both teammates speak in the voice-over (judges check both contributed)
- [ ] Script the typed question in advance so typing is fast

## One-line closer for the pitch

> "Public services should be equally accessible regardless of where you live,
> what phone you own, or whether you can afford data. BursaBridge is the
> bridge between NG-CDF bursary information and every phone in the
> constituency — and the committee keeps every decision."

---

*Part of the Mozilla Foundation × KamiLimu Democracy & AI Hackathon — July 4th, 2026*
