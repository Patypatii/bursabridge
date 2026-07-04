"""
BursaBridge AI — backend API.

FastAPI app exposing the AI module (DeepSeek RAG-lite over a mock NG-CDF
knowledge base), the USSD protocol endpoint, reminders, and status lookup.

Built during the Mozilla Foundation x KamiLimu Democracy & AI Hackathon,
July 4th, 2026.
"""

import json
import os
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
MOCK_MODE = os.getenv("MOCK_MODE", "false").lower() == "true"

DATA_DIR = Path(__file__).parent / "data"
CONSTITUENCIES: dict = {
    c["id"]: c
    for c in json.loads((DATA_DIR / "constituencies.json").read_text(encoding="utf-8"))
}
APPLICATIONS: dict = {
    a["ref_no"]: a
    for a in json.loads((DATA_DIR / "applications.json").read_text(encoding="utf-8"))
}

# In-memory stores (persistence is a post-hackathon item, see docs/architecture.md)
REMINDERS: list[dict] = []
OUTBOX: list[dict] = []

STAGE_LABELS = {
    "received": "Application Received",
    "review_in_progress": "Review in Progress",
    "ready_for_collection": "Ready for Collection",
    "collected": "Collected",
}

app = FastAPI(title="BursaBridge API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class HistoryItem(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    channel: str = "web"
    session_id: str = ""
    language: str = "en"  # "en" | "sw"
    constituency: str = "ol-kalou"
    text: str
    history: list[HistoryItem] = []


class UssdRequest(BaseModel):
    session_id: str
    phone: str
    text: str  # accumulated keypresses, e.g. "" -> "1" -> "1*1"


class RemindRequest(BaseModel):
    phone: str
    constituency: str
    event: str = "window_opens"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fmt_date(iso: str) -> str:
    return datetime.fromisoformat(iso).strftime("%d %B %Y").lstrip("0")


def strip_markdown(text: str) -> str:
    """LLM output goes to chat bubbles and SMS - plain text only."""
    text = re.sub(r"[*_`#]+", "", text)
    return re.sub(r"^\s*-\s+", "• ", text, flags=re.M)


def detect_constituency(text: str, fallback: str) -> dict:
    lowered = text.lower()
    for record in CONSTITUENCIES.values():
        if record["name"].lower() in lowered or record["id"] in lowered:
            return record
    return CONSTITUENCIES.get(fallback, CONSTITUENCIES["ol-kalou"])


def detect_intent(text: str) -> str:
    lowered = text.lower()
    if re.search(
        r"\b(hello|hi|hey|habari|jambo|mambo|niaje|salama|sasa|karibu|asante"
        r"|thanks|thank you|good (morning|afternoon|evening)|help|menu|start)\b",
        lowered,
    ) and not re.search(
        r"\b(document|require|need|nyaraka|papers|deadline|open|close|status|track|ref"
        r"|eligib|qualify|contact|office|where|when|lini|wapi)\b",
        lowered,
    ):
        return "greeting"
    checks = [
        ("status", ["status", "hali", "track", "application went", "ref"]),
        ("deadline_query", ["open", "close", "deadline", "when", "lini", "date", "apply by"]),
        ("documents", ["document", "require", "need", "nyaraka", "stahili gani", "papers", "carry"]),
        ("eligibility", ["eligib", "qualify", "stahiki", "who can", "orphan"]),
        ("contact", ["contact", "office", "ofisi", "phone", "where", "wapi"]),
    ]
    for intent, keywords in checks:
        if any(k in lowered for k in keywords):
            return intent
    return "faq"


def kb_answer(record: dict, intent: str, language: str) -> str:
    """Template answer straight from the knowledge base (MOCK_MODE / fallback)."""
    name = record["name"]
    opens = fmt_date(record["bursary_window"]["opens"])
    closes = fmt_date(record["bursary_window"]["closes"])
    docs = ", ".join(record["required_documents"])
    office = record["office"]
    sw = language == "sw"
    if intent == "greeting":
        return (
            "Karibu! Mimi ni BursaBridge, msaidizi wako wa bursary ya NG-CDF. "
            "Niulize kuhusu tarehe za maombi, nyaraka zinazohitajika, ustahiki, "
            "mawasiliano ya ofisi, au hali ya maombi yako."
            if sw
            else "Hello! I'm BursaBridge, your NG-CDF bursary assistant. Ask me "
            "about application deadlines, required documents, eligibility, "
            "office contacts, or checking your application status."
        )
    if intent == "deadline_query":
        return (
            f"Maombi ya bursary ya NG-CDF {name} yanafunguliwa tarehe {opens} na kufungwa tarehe {closes}."
            if sw
            else f"{name} NG-CDF bursary applications open on {opens} and close on {closes}."
        )
    if intent == "documents":
        return (
            f"Nyaraka zinazohitajika kwa bursary ya {name}: {docs}."
            if sw
            else f"Required documents for the {name} bursary: {docs}."
        )
    if intent == "eligibility":
        return record["eligibility_notes"]
    if intent == "contact":
        return (
            f"Ofisi ya NG-CDF {name}: {office['location']}. Simu: {office['phone']}. Saa: {office['hours']}."
            if sw
            else f"{name} NG-CDF office: {office['location']}. Phone: {office['phone']}. Hours: {office['hours']}."
        )
    faq = record["faqs"][0]
    return f"{faq['q']} {faq['a']}"


def deepseek_answer(
    record: dict, question: str, language: str, history: list[HistoryItem]
) -> str | None:
    """Grounded DeepSeek call. Returns None on any failure so callers fall back."""
    if MOCK_MODE or not DEEPSEEK_API_KEY:
        return None
    try:
        from openai import OpenAI

        client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)
        reply_lang = "Kiswahili" if language == "sw" else "English"
        system = (
            "You are BursaBridge, a friendly civic assistant helping Kenyan "
            "parents and guardians access NG-CDF bursary information. You help "
            "with: application windows and deadlines, required documents, "
            "eligibility guidance, CDF office contacts, and how to check "
            "application status. Ground every factual claim in the constituency "
            "record JSON below; if something is not in the record, say you don't "
            "have that information and suggest the CDF office. If the user "
            "greets you or makes small talk, reply warmly in one or two "
            "sentences and mention what you can help with - do NOT recite "
            f"deadlines or documents unless asked. Reply in {reply_lang}, in "
            "under 80 words. Write plain sentences only - no markdown, no "
            "asterisks, no bullet points, no headings. "
            "Never advise on who deserves funding - committees decide allocations.\n\n"
            f"Constituency record:\n{json.dumps(record)}"
        )
        past = [
            {"role": h.role, "content": h.content}
            for h in history[-8:]
            if h.role in ("user", "assistant") and h.content.strip()
        ]
        response = client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": system},
                *past,
                {"role": "user", "content": question},
            ],
            temperature=0.3,
            max_tokens=300,
            timeout=30,
        )
        return strip_markdown(response.choices[0].message.content.strip())
    except Exception as exc:  # network down, bad key, rate limit - demo must not break
        print(f"[BursaBridge] DeepSeek call failed, falling back to KB: {exc}")
        return None


# ---------------------------------------------------------------------------
# Web chat — the AI module entry point
# ---------------------------------------------------------------------------

# Only factual bursary questions get the documents/deadline card;
# greetings and small talk get a plain conversational answer.
DETAIL_INTENTS = {"deadline_query", "documents", "eligibility"}


@app.post("/api/chat")
def chat(req: ChatRequest):
    record = detect_constituency(req.text, req.constituency)
    intent = detect_intent(req.text)

    answer = deepseek_answer(record, req.text, req.language, req.history)
    source = "deepseek+kb"
    if answer is None:
        answer = kb_answer(record, intent, req.language)
        source = "kb_only (MOCK_MODE)" if MOCK_MODE else "kb_only (fallback)"

    show_details = intent in DETAIL_INTENTS
    return {
        "session_id": req.session_id or uuid.uuid4().hex[:6],
        "intent": intent,
        "answer": answer,
        "details": {
            "constituency": record["name"],
            "opens": record["bursary_window"]["opens"],
            "closes": record["bursary_window"]["closes"],
            "required_documents": record["required_documents"],
        }
        if show_details
        else None,
        "source": source,
        "actions": ["notify_me", "check_status"] if show_details else [],
        "language": req.language,
    }


@app.get("/api/bursaries")
def bursaries():
    """List every constituency's bursary window with a computed live status."""
    today = datetime.now().date()
    items = []
    for c in CONSTITUENCIES.values():
        opens = datetime.fromisoformat(c["bursary_window"]["opens"]).date()
        closes = datetime.fromisoformat(c["bursary_window"]["closes"]).date()
        if today < opens:
            status_, days = "upcoming", (opens - today).days
        elif today <= closes:
            status_, days = "open", (closes - today).days
        else:
            status_, days = "closed", 0
        items.append(
            {
                "id": c["id"],
                "name": c["name"],
                "county": c["county"],
                "opens": c["bursary_window"]["opens"],
                "closes": c["bursary_window"]["closes"],
                "status": status_,
                "days": days,
                "required_documents": c["required_documents"],
                "eligibility_notes": c["eligibility_notes"],
                "office": c["office"],
            }
        )
    order = {"open": 0, "upcoming": 1, "closed": 2}
    items.sort(key=lambda x: (order[x["status"]], x["opens"]))
    return {"bursaries": items}


# ---------------------------------------------------------------------------
# USSD — same request/response cycle a telco gateway would drive
# ---------------------------------------------------------------------------

MAIN_MENU = (
    "CON Welcome to BursaBridge\n"
    "Select an option:\n"
    "1. Upcoming Deadlines\n"
    "2. Required Documents\n"
    "3. Check Application Status\n"
    "4. FAQs\n"
    "5. Contact Office\n"
    "6. Language"
)

CONSTITUENCY_MENU = (
    "CON Select Constituency:\n"
    "1. Ol-Kalou\n"
    "2. Mwala\n"
    "3. Garissa Township\n"
    "4. Kieni\n"
    "5. Mathira\n"
    "0. Back"
)

CONSTITUENCY_ORDER = ["ol-kalou", "mwala", "garissa-township", "kieni", "mathira"]


def resolve_path(text: str) -> list[str]:
    """Collapse '0' (back) entries out of the accumulated USSD path."""
    stack: list[str] = []
    for part in [p for p in text.split("*") if p != ""]:
        if part == "0":
            if stack:
                stack.pop()
        else:
            stack.append(part)
    return stack


def pick_constituency(digit: str) -> dict | None:
    try:
        return CONSTITUENCIES[CONSTITUENCY_ORDER[int(digit) - 1]]
    except (ValueError, IndexError):
        return None


@app.post("/api/ussd", response_class=PlainTextResponse)
def ussd(req: UssdRequest) -> str:
    path = resolve_path(req.text)

    if not path:
        return MAIN_MENU

    choice = path[0]

    if choice in ("1", "2", "5"):  # deadlines / documents / contact -> constituency first
        if len(path) == 1:
            return CONSTITUENCY_MENU
        record = pick_constituency(path[1])
        if record is None:
            return "END Invalid choice. Dial *123# to try again."
        opens = fmt_date(record["bursary_window"]["opens"])
        closes = fmt_date(record["bursary_window"]["closes"])
        if choice == "1":
            return (
                f"CON {record['name']}\n"
                f"Applications Open:\n{opens}\n"
                f"Applications Close:\n{closes}\n"
                "0. Back"
            )
        if choice == "2":
            docs = "\n".join(f"- {d}" for d in record["required_documents"])
            return f"CON {record['name']} Required Documents:\n{docs}\n0. Back"
        office = record["office"]
        return (
            f"CON {record['name']} CDF Office:\n{office['location']}\n"
            f"Tel: {office['phone']}\n{office['hours']}\n0. Back"
        )

    if choice == "3":  # application status
        if len(path) == 1:
            return "CON Enter your application ref number\n(e.g. OKL-2026-0142):"
        ref = path[1].strip().upper()
        record = APPLICATIONS.get(ref)
        if record is None:
            return "END No application found for that ref number. Check the ref on your submission slip or contact your CDF office."
        return (
            f"END Ref: {record['ref_no']}\n"
            f"Status: {STAGE_LABELS[record['stage']]}\n"
            f"Est. completion: {record['estimated_completion_days']} days\n"
            f"{record['public_note']}"
        )

    if choice == "4":  # FAQs
        if len(path) == 1:
            return CONSTITUENCY_MENU
        record = pick_constituency(path[1])
        if record is None:
            return "END Invalid choice. Dial *123# to try again."
        faq = record["faqs"][0]
        return f"CON {record['name']} FAQ:\nQ: {faq['q']}\nA: {faq['a']}\n0. Back"

    if choice == "6":  # language
        if len(path) == 1:
            return "CON Choose language / Chagua lugha:\n1. English\n2. Kiswahili\n0. Back"
        if path[1] == "2":
            return "END Lugha imewekwa: Kiswahili. Piga *123# tena."
        return "END Language set to English. Dial *123# again."

    return "END Invalid choice. Dial *123# to try again."


# ---------------------------------------------------------------------------
# Reminders + mocked SMS outbox
# ---------------------------------------------------------------------------

@app.post("/api/remind")
def remind(req: RemindRequest):
    record = CONSTITUENCIES.get(req.constituency)
    if record is None:
        raise HTTPException(status_code=404, detail="Unknown constituency")

    opens = datetime.fromisoformat(record["bursary_window"]["opens"])
    reminder = {
        "id": f"rem_{len(REMINDERS) + 1:03d}",
        "phone": req.phone,
        "constituency": record["id"],
        "event": req.event,
        "send_at": (opens - timedelta(days=2)).isoformat(),
        "channel": "sms",
        "status": "queued",
        "message": (
            "Hello! This is a reminder from BursaBridge. "
            f"{record['name']} NG-CDF bursary applications open on "
            f"{fmt_date(record['bursary_window']['opens'])}. For help, dial *123#"
        ),
    }
    REMINDERS.append(reminder)
    # Real deployment: queued dispatch via Africa's Talking. Demo: render now.
    OUTBOX.append(reminder)
    return {
        "ok": True,
        "reminder": reminder,
        "confirmation": "Reminder set! You will receive an SMS 2 days before applications open.",
    }


@app.get("/api/outbox")
def outbox():
    return {"messages": OUTBOX}


# ---------------------------------------------------------------------------
# Application status
# ---------------------------------------------------------------------------

@app.get("/api/status/{ref_no}")
def status(ref_no: str):
    record = APPLICATIONS.get(ref_no.strip().upper())
    if record is None:
        raise HTTPException(status_code=404, detail="No application found for that ref number")
    return {**record, "stage_label": STAGE_LABELS[record["stage"]]}


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "mock_mode": MOCK_MODE,
        "model": DEEPSEEK_MODEL,
        "constituencies": list(CONSTITUENCIES),
    }
