## MVP Phase Milestones (Checklist) 🧩✅

> Target: **Nationwide MP election** support (constituency + party-list), citizen-run, DDoS-resilient, evidence-first.

### Phase 0 — Project Lock & Environments (Day 0–2)

* [ ] Repo builds locally (web + worker) with one command
* [ ] Environments defined: `dev`, `staging`, `prod`
* [ ] Secrets management in place (no secrets in repo)
* [ ] DB migrations run clean on empty DB
* [ ] Storage (R2/S3) bucket created + access policy validated
* [ ] CDN/WAF configured (rate limit + basic bot protection)
* [ ] Logging enabled for API + upload pipeline (request IDs)
* [ ] “Kill switch” ready (disable uploads / disable public write endpoints)

---

## Milestone 1 — Registry Seeding + Station Selector (Week 1) 🗺️

### Deliverables

* [ ] **Provinces / Khet / Stations** populated from ECT66(2023) baseline
* [ ] Station selector UI: **Province → Khet → Subdistrict → Station**
* [ ] “Unlisted station” flow (dirty baseline fallback)

### DoD (Definition of Done)

* [ ] Import runbook (staging + COPY + set-based upsert) exists and is repeatable
* [ ] Import is idempotent (re-run doesn’t duplicate rows)
* [ ] Station selector responds < 300ms on typical device (client filtering ok)
* [ ] Search works (station number + location keyword)
* [ ] Unlisted station creates record flagged `is_verified_exist=false`

### Acceptance Specs ✅

* [ ] Given province+ khet, user can list subdistricts without timeout
* [ ] Given subdistrict, user can find station by station_number
* [ ] If station missing, user can create “Unlisted station” and immediately proceed to upload
* [ ] Duplicate prevention: same (constituency_id + subdistrict_id + station_number) returns existing station
* [ ] Admin can list unverified stations for cleanup/merge

---

## Milestone 2 — Evidence Locker Upload (Week 1–2) 📸🧾

### Deliverables

* [ ] Upload flow supports **partial** uploads:

  * [ ] Constituency sheet only
  * [ ] Party-list sheet only
  * [ ] Both
* [ ] Two checksum fields per sheet:

  * [ ] `checksum_total_valid`
  * [ ] `checksum_top_candidate_votes`
* [ ] Offline queue (PWA): save + retry when network returns
* [ ] Public evidence page per station (photo visible + status)

### DoD

* [ ] EXIF stripped on ingest (GPS/device removed)
* [ ] Public serves **sanitized derivative** (watermark “Unofficial”)
* [ ] Each sheet has independent status:

  * [ ] `missing/pending/verified/rejected/disputed`
* [ ] Upload endpoints protected:

  * [ ] rate limits
  * [ ] captcha/turnstile
* [ ] Basic junk-photo filter:

  * [ ] reject empty / too-dark / non-document-like images (or mark “needs retake”)

### Acceptance Specs ✅

* [ ] If user uploads constituency only → `status_constituency=pending`, `status_partylist=missing`
* [ ] If upload fails mid-way → app retains pending payload locally and retries
* [ ] Public can view evidence without login
* [ ] Public cannot see uploader identity or EXIF metadata
* [ ] API returns stable identifiers for submissions + evidence URLs

---

## Milestone 3 — Reviewer Console + “Trusted 1.5” Verification (Week 2) 🧑‍💻✅

### Deliverables

* [ ] Reviewer login (invite-only)
* [ ] Queue fetch + lock (avoid 2 reviewers on same item)
* [ ] Transcription form (grid input + totals)
* [ ] Auto validation:

  * [ ] math consistency
  * [ ] checksum match (user total vs reviewer computed)
* [ ] Status transitions:

  * [ ] `pending → verified`
  * [ ] `pending → rejected_quality`
  * [ ] `pending → rejected_mismatch`
  * [ ] `pending → disputed`

### DoD

* [ ] Audit log for all reviewer actions (who/when/what)
* [ ] Station mismatch handling:

  * [ ] reviewer can correct station_id OR reject with reason
* [ ] Reviewer throughput baseline:

  * [ ] at least **X items/hour** on typical laptop (pick a target; e.g., 30/h)

### Acceptance Specs ✅

* [ ] If reviewer sum matches checksum_total_valid AND internal math checks pass → auto `verified`
* [ ] If photo illegible → `rejected_quality` with reason
* [ ] If wrong station header → `rejected_mismatch` (or corrected station with audit entry)
* [ ] Disputed items show in a separate queue for “senior review”

---

## Milestone 4 — Public Board + DDoS-Resilient Publishing (Week 3) 📊🛡️

### Deliverables

* [ ] Static JSON snapshot generator (every 30–60 seconds)
* [ ] Public dashboard:

  * [ ] coverage % by province/khet
  * [ ] verified totals only (default)
  * [ ] toggle include preliminary/contested (optional)
* [ ] Evidence browsing:

  * [ ] station page shows both sheets, each with its own status

### DoD

* [ ] Public endpoints are cacheable and CDN-backed (no DB reads in hot path)
* [ ] Under load, dashboard remains responsive (static JSON)
* [ ] Mirrors supported (optional but recommended)

### Acceptance Specs ✅

* [ ] Snapshot build completes within the interval (e.g., < 45s if every 60s)
* [ ] If DB is slow/down, last snapshot still serves
* [ ] Users can see “missing station” gaps clearly (not hidden)

---

## Milestone 5 — Custody + Incident Reporting UI (Week 3–4) 🧷🚨

### Deliverables

* [ ] `/report` page with 2 tabs:

  * [ ] **Incident report** (intimidation, blocked access, missing posted form, etc.)
  * [ ] **Custody event** (seal intact/broken, handoff, transport)
* [ ] Evidence attachments supported (photo/video)
* [ ] Public view policy:

  * [ ] incidents are public OR semi-public (your choice), but **never leak reporter PII**

### DoD

* [ ] Incident taxonomy defined (categories + required fields)
* [ ] Auto redaction options:

  * [ ] face blur on public derivatives
* [ ] Anti-abuse controls:

  * [ ] rate limit
  * [ ] report/flag content

### Acceptance Specs ✅

* [ ] User can file an incident in < 60 seconds
* [ ] User can log custody with seal photo + timestamp
* [ ] Each station page can show linked incidents/custody events (even as a simple “count + list”)

---

## Milestone 6 — Impact Simulator (MVP Minimal) (Week 4) 🎮🧠

> MVP scope: **constituency seat flip only** (party-list allocation can be v1.1).

### Deliverables

* [ ] Constituency-level “flip threshold” computed:

  * [ ] margin between top 2 candidates (from verified data)
* [ ] Sandbox UI:

  * [ ] user selects stations in a constituency
  * [ ] user adjusts candidate totals (local scenario)
  * [ ] system shows whether winner flips + votes needed

### DoD

* [ ] Simulator clearly labeled “what-if” (does not alter real dataset)
* [ ] Scenario links are shareable (encode diffs, not raw data)

### Acceptance Specs ✅

* [ ] If user increases/decreases votes beyond margin → UI shows winner change instantly
* [ ] “Worth chasing?” badge:

  * [ ] High leverage if plausible delta >= margin
  * [ ] Low leverage otherwise

---

## Milestone 7 — Legal Action Kit (MVP-lite) (Week 4) ⚖️📦

> MVP-lite = generate structured evidence export; full legal routing can be v1.

### Deliverables

* [ ] “Export station evidence”:

  * [ ] PDF summary (station IDs, timestamps, status)
  * [ ] ZIP with photos + hashes + audit logs (JSON)
* [ ] Basic “where to file” guidance text (non-legal advice)

### DoD

* [ ] Hash list included (sha256 per file)
* [ ] Audit trail included (reviewer actions)
* [ ] PII avoided by design

### Acceptance Specs ✅

* [ ] Export is reproducible: same evidence → same hashes
* [ ] Packet is readable by a journalist/lawyer without needing the app

---

## Global Non-Functional Acceptance (applies to all milestones) 🧯

* [ ] **Resilience:** Public board stays up under traffic spikes (CDN + static snapshots)
* [ ] **Privacy:** EXIF wiped; no uploader identity exposed
* [ ] **Security:** rate limiting + bot mitigation on uploads/reports
* [ ] **Integrity:** verified numbers always link to evidence photo
* [ ] **Transparency:** disputed/missing stations visible (no silent failure)
* [ ] **Ops:** basic monitoring + error alerts + manual admin tools

If you tell me your intended infra (Cloudflare-only vs AWS/Supabase mix) and a rough reviewer count (e.g., 50 / 200 / 1,000), I’ll add **capacity DoDs** (expected throughput + coverage targets) as checkboxes too.
