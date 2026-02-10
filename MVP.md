## MVP Phase Milestones (Checklist) 🧩✅

> Target: **Nationwide MP election** support (constituency + party-list), citizen-run, DDoS-resilient, evidence-first.

### Phase 0 — Project Lock & Environments (Day 0–2) ✅

* [x] Repo builds locally (web + worker) with one command
* [x] Environments defined: `dev`, `staging`, `prod`
* [x] Secrets management in place (no secrets in repo)
* [x] DB migrations run clean on empty DB
* [x] Storage (R2/S3) bucket created + access policy validated
* [x] CDN/WAF configured (rate limit + basic bot protection)
* [x] Logging enabled for API + upload pipeline (request IDs)
* [x] "Kill switch" ready (disable uploads / disable public write endpoints)

---

## Milestone 1 — Registry Seeding + Station Selector (Week 1) 🗺️ ✅

### Deliverables ✅

* [x] **Provinces / Khet / Stations** populated from ECT66(2023) baseline
* [x] Station selector UI: **Province → Khet → Subdistrict → Station**
* [x] "Unlisted station" flow (dirty baseline fallback)

### DoD (Definition of Done) ✅

* [x] Import runbook (staging + COPY + set-based upsert) exists and is repeatable
* [x] Import is idempotent (re-run doesn't duplicate rows)
* [x] Station selector responds < 300ms on typical device (client filtering ok)
* [x] Search works (station number + location keyword)
* [x] Unlisted station creates record flagged `is_verified_exist=false`

### Acceptance Specs ✅

* [x] Given province+ khet, user can list subdistricts without timeout
* [x] Given subdistrict, user can find station by station_number
* [x] If station missing, user can create "Unlisted station" and immediately proceed to upload
* [x] Duplicate prevention: same (constituency_id + subdistrict_id + station_number) returns existing station
* [x] Admin can list unverified stations for cleanup/merge

---

## Milestone 2 — Evidence Locker Upload (Week 1–2) 📸🧾 ✅

### Deliverables ✅

* [x] Upload flow supports **partial** uploads:

  * [x] Constituency sheet only
  * [x] Party-list sheet only
  * [x] Both
* [x] Two checksum fields per sheet:

  * [x] `checksum_total_valid`
  * [x] `checksum_top_candidate_votes`
* [x] Offline queue (PWA): save + retry when network returns
* [x] Public evidence page per station (photo visible + status)

### DoD ✅

* [x] EXIF stripped on ingest (GPS/device removed)
* [x] Public serves **sanitized derivative** (watermark "Unofficial")
* [x] Each sheet has independent status:

  * [x] `missing/pending/verified/rejected/disputed`
* [x] Upload endpoints protected:

  * [x] rate limits
  * [x] captcha/turnstile
* [x] Basic junk-photo filter:

  * [x] reject empty / too-dark / non-document-like images (or mark "needs retake")

### Acceptance Specs ✅

* [x] If user uploads constituency only → `status_constituency=pending`, `status_partylist=missing`
* [x] If upload fails mid-way → app retains pending payload locally and retries
* [x] Public can view evidence without login (PublicBoard + StationPage)
* [x] Public cannot see uploader identity or EXIF metadata
* [x] API returns stable identifiers for submissions + evidence URLs

---

## Milestone 3 — Reviewer Console + "Trusted 1.5" Verification (Week 2) 🧑‍💻✅

### Deliverables ✅

* [x] Reviewer login (invite-only)
* [x] Queue fetch + lock (avoid 2 reviewers on same item)
* [x] Transcription form (grid input + totals)
* [x] Auto validation:

  * [x] math consistency
  * [x] checksum match (user total vs reviewer computed)
* [x] Status transitions:

  * [x] `pending → verified`
  * [x] `pending → rejected_quality`
  * [x] `pending → rejected_mismatch`
  * [x] `pending → disputed`

### DoD ✅

* [x] Audit log for all reviewer actions (who/when/what)
* [x] Station mismatch handling:

  * [x] reviewer can correct station_id OR reject with reason
* [x] Reviewer throughput baseline:

  * [x] at least **X items/hour** on typical laptop (pick a target; e.g., 30/h)

### Acceptance Specs ✅

* [x] If reviewer sum matches checksum_total_valid AND internal math checks pass → auto `verified`
* [x] If photo illegible → `rejected_quality` with reason
* [x] If wrong station header → `rejected_mismatch` (or corrected station with audit entry)
* [x] Disputed items show in a separate queue for "senior review"

---

## Milestone 4 — Public Board + DDoS-Resilient Publishing (Week 3) 📊🛡️

### Deliverables

* [x] Static JSON snapshot generator (every 30–60 seconds)
* [x] Public dashboard:

  * [x] coverage % by province/khet
  * [x] verified totals only (default)
  * [x] toggle include preliminary/contested (optional)
* [ ] Evidence browsing:

  * [x] station page shows both sheets, each with its own status

### DoD

* [x] Public endpoints are cacheable and CDN-backed (no DB reads in hot path)
* [x] Under load, dashboard remains responsive (static JSON)
* [x] Mirrors supported (optional but recommended)

### Acceptance Specs ✅

* [x] Snapshot build completes within the interval (e.g., < 45s if every 60s)
* [x] If DB is slow/down, last snapshot still serves
* [x] Users can see "missing station" gaps clearly (not hidden)

---

## Milestone 5 — Custody + Incident Reporting UI (Week 3–4) 🧷🚨 ✅

### Deliverables ✅

* [x] `/report` page with 2 tabs:

  * [x] **Incident report** (intimidation, blocked access, missing posted form, etc.)
  * [x] **Custody event** (seal intact/broken, handoff, transport)
* [x] Evidence attachments supported (photo/video)
* [x] Public view policy:

  * [x] incidents are public OR semi-public (your choice), but **never leak reporter PII**

### DoD ✅

* [x] Incident taxonomy defined (categories + required fields)
* [x] Auto redaction options:

  * [x] face blur on public derivatives
* [x] Anti-abuse controls:

  * [x] rate limit
  * [x] report/flag content

### Acceptance Specs ✅

* [x] User can file an incident in < 60 seconds
* [x] User can log custody with seal photo + timestamp
* [x] Each station page can show linked incidents/custody events (even as a simple "count + list")

---

## Milestone 6 — Impact Simulator (MVP Minimal) (Week 4) 🎮🧠 ✅

> MVP scope: **constituency seat flip only** (party-list allocation can be v1.1).

### Deliverables ✅

* [x] Constituency-level "flip threshold" computed:

  * [x] margin between top 2 candidates (from verified data)
* [x] Sandbox UI:

  * [x] user selects stations in a constituency
  * [x] user adjusts candidate totals (local scenario)
  * [x] system shows whether winner flips + votes needed

### DoD ✅

* [x] Simulator clearly labeled "what-if" (does not alter real dataset)
* [x] Scenario links are shareable (encode diffs, not raw data)

### Acceptance Specs ✅

* [x] If user increases/decreases votes beyond margin → UI shows winner change instantly
* [x] "Worth chasing?" badge:

  * [x] High leverage if plausible delta >= margin
  * [x] Low leverage otherwise

---

## Milestone 7 — Legal Action Kit (MVP-lite) (Week 4) ⚖️📦

> MVP-lite = generate structured evidence export; full legal routing can be v1.

### Deliverables

* [x] "Export station evidence":

  * [x] PDF summary (station IDs, timestamps, status)
  * [x] ZIP with photos + hashes + audit logs (JSON)
* [x] Basic "where to file" guidance text (non-legal advice)

### DoD

* [x] Hash list included (sha256 per file)
* [x] Audit trail included (reviewer actions)
* [x] PII avoided by design

### Acceptance Specs ✅

* [x] Export is reproducible: same evidence → same hashes
* [x] Packet is readable by a journalist/lawyer without needing the app

---

## Global Non-Functional Acceptance (applies to all milestones) 🧯

* [x] **Resilience:** Public board stays up under traffic spikes (CDN + static snapshots)
* [x] **Privacy:** EXIF wiped; no uploader identity exposed
* [x] **Security:** rate limiting + bot mitigation on uploads/reports
* [x] **Integrity:** verified numbers always link to evidence photo
* [x] **Transparency:** disputed/missing stations visible (no silent failure)
* [x] **Ops:** basic monitoring + error alerts + manual admin tools