# Problem Statement — BursaBridge AI

**AI Civic Assistant for NG-CDF Bursaries · Theme: Government Accountability**

## Background

The National Government Constituencies Development Fund (NG-CDF) is the main
public financing channel for secondary and tertiary education support in
Kenya. During the 2023/2024 financial year, approximately **1.8 million
learners** depended on NG-CDF bursaries. Yet Kenya's 2026 Auditor General
report found that **282 of 290 constituencies** still process applications
entirely manually, and flagged **KSh 1.97 billion** disbursed across 39
constituencies with no vetting records.

For a rural family, applying is a physical obstacle course. Our primary
research with a guardian in Gichungo sub-location, **Ol Kalou Constituency
(Nyandarua County)**, documented the lived process: travel to a cyber café to
print forms, walk to a chief's office that opens twice a week for stamping,
deliver documents to the CDF office, then wait **over a month with no
feedback** before travelling again to collect a cheque — if one was awarded
at all. Communications Authority / KNBS data shows only **~25% of rural
Kenyans use the internet**, so the handful of web portals that exist do not
reach these families.

## The Problem

Low-income parents and guardians in rural Kenyan constituencies **cannot
access timely NG-CDF bursary information** — when applications open, whether
their child is eligible, which documents are required, and what happened to a
submitted application. This is an **access problem**, not an allocation
problem: the fund exists, but the information pipeline to the people it
serves is broken. The downstream cost is measurable — missed application
windows, stale and unpresented cheques flagged by the Auditor General, wasted
travel costs a low-income household cannot absorb, and ultimately students
dropping out of school for lack of fees they were entitled to.

## Target User

**Persona:** Mama Wanjiru, 54, a smallholder farmer in Gichungo
sub-location, Ol Kalou, and guardian to two secondary-school students.

- **Device:** a basic feature phone; she uses USSD daily for M-Pesa.
- **Language:** Kiswahili first; limited written English.
- **Connectivity:** no data bundle most of the month; nearest cyber café is a matatu ride away.
- **Daily reality:** learns about bursaries by word of mouth at church, often after the deadline; has no way to check whether last term's application went through except travelling to the CDF office.

Students studying outside their home counties are a secondary beneficiary:
the parent applies and tracks locally while the student stays in session.

## Current Alternatives & Their Shortcomings

| Alternative | What it does | Why it falls short for our user |
|---|---|---|
| Constituency web portals (e.g. Mwala CDF) | Online application form | Requires smartphone, internet, digital literacy; exists in only ~5 constituencies |
| NG-CDF Board website (ngcdf.go.ke) | Policy documents, office contacts | Desktop-oriented, English-only, no alerts, no per-constituency deadlines, no status tracking |
| Chief's barazas / churches / social media | Word-of-mouth announcements | Irregular, easy to miss, no detail on documents or eligibility, nothing about status |
| Physical CDF office visits | Forms, submission, follow-up | Long, repeated, costly travel; office hours; a month of silence after submission |

**The gap:** no channel exists that (a) works on a basic phone without
internet, (b) proactively alerts families when their constituency's bursary
opens, (c) answers eligibility/document questions in Kiswahili or English,
and (d) reports application status without a trip to the CDF office.

## Our Approach

**BursaBridge AI** — *your bridge to NG-CDF bursary information* — is an AI
civic assistant delivered on the channels our user already has:

1. **Ask** — a parent asks a question via web chat (smartphone users) or a `*123#` USSD menu (feature phones). An AI module (DeepSeek LLM over a per-constituency knowledge base — RAG) answers with the constituency's actual deadlines, eligibility guidance, and required-document checklists, in Kiswahili or English.
2. **Alert** — the parent opts into SMS reminders; the system notifies them before their constituency's application window opens and before it closes.
3. **Track** — the parent checks application status ("Received → Review in progress → Ready for collection") by USSD or chat, reflecting the committee's workflow.

**Scope decision (from Phase 2 feedback):** we deliberately solve the
**access** problem only. The AI never scores, ranks, or recommends
applicants — the constituency committee retains full decision-making
authority. The constituency's role is to publish windows, requirements, and
status updates into the system; BursaBridge is the last-mile delivery layer
between that information and the citizen.

## Impact Hypothesis

If rural families receive alerts and answers on the phones they already own,
then: fewer eligible students miss application windows; families stop paying
for speculative trips to cyber cafés and CDF offices; unclaimed and stale
cheques decline because applicants know when to collect; and committees face
fewer walk-in status queries. Democratically, the tool narrows the
information asymmetry between citizens and government — equal access to
public information regardless of geography, device, or income, with
transparency through status tracking. That is government accountability in
practice.

---

*Part of the Mozilla Foundation × KamiLimu Democracy & AI Hackathon — July 4th, 2026*
