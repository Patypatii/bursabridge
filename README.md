# BursaBridge AI — Your Bridge to NG-CDF Bursary Information

> Built during the **Democracy & AI Hackathon** — July 4th, 2026
> Hosted by **Mozilla Foundation** & **KamiLimu**
>
> *This work is part of a Hackathon hosted by the Mozilla Foundation and KamiLimu on Democracy and AI, held on July 4th, 2026.*

**BursaBridge** helps rural Kenyan families get accurate NG-CDF bursary
information, track their applications, and receive reminders — **from any
phone**: Web, USSD (`*123#`), and SMS, in English and Kiswahili.

---

## Repository Naming

For ease of identification by the organisers, the repository is named after
the project submitted in our Phase 2 problem statement:

**https://github.com/Patypatii/bursabridge** — `bursabridge` (Team BursaBridge · Patrick & Faith · Kirinyaga University)

---

## Team

| Name | Role | GitHub |
|------|------|--------|
| Patrick Wambugu | Backend & AI integration | [@Patypatii](https://github.com/Patypatii) |
| Faith Njoroge | Frontend, research & demo | <!-- TODO: add handle --> |

**Team Name:** BursaBridge
**University:** Kirinyaga University
**Theme:** Government Accountability

---

## Problem & User

### Problem Statement

> Low-income parents and guardians in rural Kenyan constituencies cannot
> access NG-CDF bursary services on time. Kenya's 2026 Auditor General report
> found 282 of 290 constituencies still process bursary applications manually.
> Families travel to cyber cafés to print forms, queue at a chief's office
> that opens twice a week, submit papers at the CDF office, and then wait
> over a month with **no way to learn deadlines, requirements, or application
> status** — while only ~25% of rural Kenyans use the internet (Communications
> Authority). This is an **access and information problem**, and it leads to
> missed bursaries, stale/unpresented cheques, and children out of school.

### Target User

| Dimension | Detail |
|-----------|--------|
| **Primary user** | A low-income parent/guardian in a rural constituency (e.g. Ol-Kalou, Nyandarua) applying for an NG-CDF bursary for their child |
| **Device** | Basic feature phone (USSD/SMS); some have entry-level smartphones |
| **Tech comfort** | Comfortable with calls, SMS and M-Pesa-style USSD menus; not with web portals |
| **Language** | Kiswahili first, English second |
| **Current workflow** | Hears about bursaries at church/baraza → cyber café to print → chief's office for stamping → CDF office to submit → waits 30+ days with zero feedback |

### The Specific Gap

1. **What's already there:** A handful of constituency portals (e.g. Mwala CDF) and the NG-CDF Board website.
2. **Why it falls short:** They require a smartphone, internet and digital literacy; none send alerts when bursaries open, none work over SMS/USSD, and none answer applicants' questions in Kiswahili.
3. **The gap we fill:** An AI civic assistant that answers bursary questions (deadlines, required documents, eligibility guidance), sends SMS reminders, and reports application status — reachable from a **basic phone via `*123#` USSD/SMS** and from a simple web chat. **The constituency committee keeps full decision-making power; the AI only improves access to information.**

### Why It Matters

> Public services should be equally accessible regardless of where someone
> lives, what phone they own, or whether they can afford data. When bursary
> information only reaches connected, urban families, public funds stop
> reaching the students who need them most — the Auditor General flagged
> KSh 1.97 billion disbursed with no vetting records. Closing this information
> gap restores a democratic feedback loop: equal access to public information,
> transparency through status tracking, and reduced information asymmetry
> between citizens and government.

📄 Full one-pager: [docs/problem-statement.md](docs/problem-statement.md)
🏗️ Architecture & data schema: [docs/architecture.md](docs/architecture.md)
🎬 Demo storyboard: [docs/demo-script.md](docs/demo-script.md)

---

## What the Demo Shows (Input → AI → Output)

1. **Input** — a parent asks a question in the web chat ("When does Ol-Kalou bursary open?") or dials `*123#` on a simulated feature phone.
2. **AI module** — the FastAPI backend retrieves the relevant constituency record from a mock NG-CDF knowledge base and sends it, with the question, to the **DeepSeek LLM** (RAG-lite). A `MOCK_MODE` fallback answers from the knowledge base alone if the API is unreachable.
3. **Output** — the answer returns **on the same channel it came from**: the web chat shows deadlines + required documents + **Notify Me / Check Status** buttons (Notify Me queues a mocked SMS reminder), and the USSD simulator shows deadlines, documents, and application status.

SMS delivery and the telco USSD gateway are **mocked on-screen** today (see the built/mocked table in [docs/architecture.md](docs/architecture.md)); everything runs on localhost as required.

---

## Run Instructions

The project is split into two apps that run side by side on localhost:

| App | Stack | Port |
|-----|-------|------|
| `backend/` | Python · FastAPI · DeepSeek | http://localhost:8000 |
| `frontend/` | Next.js · TypeScript · Tailwind | http://localhost:3000 |

### Prerequisites

- Python 3.10+
- Node.js 18+ (with npm)
- A DeepSeek API key (provided by the organisers)

### 1 — Backend (terminal 1)

```bash
git clone https://github.com/Patypatii/bursabridge.git
cd bursabridge/backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env            # Windows: copy .env.example .env
# Edit .env and paste your DeepSeek API key (never commit .env)

uvicorn main:app --reload --port 8000
```

### 2 — Frontend (terminal 2)

```bash
cd bursabridge/frontend
npm install
npm run dev
```

Open **http://localhost:3000** — the web chat and the USSD simulator
(`*123#`) are both there.

> **No API key / no internet?** Set `MOCK_MODE=true` in `backend/.env` — the
> backend answers directly from the mock knowledge base so the demo never breaks.

---

## 📁 Project Structure

```
.
├── README.md                     ← You are here
├── docs/
│   ├── problem-statement.md      ← Problem & user one-pager
│   ├── architecture.md           ← End-to-end diagram, data schemas, built vs mocked vs later
│   └── demo-script.md            ← 20–30s demo storyboard + talking points
├── backend/                      ← Python FastAPI API (port 8000)
│   ├── main.py                   ← Endpoints + AI module (DeepSeek RAG-lite + MOCK_MODE)
│   ├── requirements.txt
│   ├── .env.example              ← Template for secrets (real key lives in untracked .env)
│   └── data/
│       ├── constituencies.json   ← Mock NG-CDF knowledge base (5 constituencies)
│       └── applications.json     ← Mock application status records
├── frontend/                     ← Next.js UI (port 3000)
│   └── app/
│       ├── page.tsx              ← Web chat interface
│       └── ussd/page.tsx         ← Feature-phone USSD simulator (*123#)
├── .gitignore
└── LICENSE
```

---

## Approach & Architecture

```
 Parent / Guardian            Next.js UI (:3000)          FastAPI (:8000)              CLOUD
┌────────────────┐      ┌───────────────────────┐    ┌─────────────────────┐    ┌──────────────┐
│ Web chat  (📱) │─────►│  /        web chat    │───►│  AI MODULE:         │───►│ DeepSeek LLM │
│ USSD sim  (☎️) │◄─────│  /ussd    simulator   │◄───│  intent → retrieve  │◄───│  (API call)  │
└────────────────┘      └───────────────────────┘    │  KB record → prompt │    └──────────────┘
   same channel                                      │  LLM → format       │
   in and out                                        │  + reminders → SMS outbox (mocked)
                                                     │  + status lookup → mock JSON
                                                     └─────────────────────┘
```

Full diagram, core input/output object schemas, and the **built today / mocked today / built later** matrix are in [docs/architecture.md](docs/architecture.md).

---

## Responsible Computing

- **Inclusive access:** works on any phone — USSD, SMS, and Web; the web chat is a convenience, not a requirement.
- **Local & simple:** designed for rural Kenya, in English and Kiswahili.
- **Transparent:** clear information and status tracking improve accountability. **No AI allocation decisions** — the AI never scores or ranks applicants; committees decide.
- **Your data, your control:** we only collect what is necessary (a phone number + constituency for reminders), never share it without consent, and comply with Kenya's Data Protection Act, 2019.

---

## License

MIT © Team BursaBridge, 2026
