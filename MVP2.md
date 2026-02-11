## MVP 2 — Nationwide MP Election v1 (Beyond MVP1) 🧩✅

> Target: **MP general election (nationwide)**, citizen-run, **adversarial ECT** assumption, end-to-end integrity: **station → box/seal → counting → forms → aggregation → seat impact → legal action**.

---

## Milestone 8 — "End-to-End Integrity" Station Kit (Week 1) 🧷🧾🧠

> Upgrade from "Evidence Locker" → "Integrity Kit": make the app help users capture the *right* proof, not just any photo.

### Deliverables ✅

* [x] **Election Night Mode** (one-screen flow; <60s capture)
* [x] "What to capture" **guided checklist** with **Minimum vs Ideal**
* [x] Built-in **quality gates**:

  * [x] header framing prompt (S.S. 5/18 has no QR)
  * [x] glare/blur warning + retake assist
* [x] "Know your rights" **safety card** (non-confrontational, boundary reminders)

### DoD

* [x] A first-time user can submit usable evidence without reading docs (guided checklist with Minimum/Ideal)
* [x] Every station artifact is anchored to a station record or "unlisted station (flagged)" (StationSelector + UnlistedStationModal)
* [x] App makes it clear what is **observed** vs what is **inferred** (disputed/verified status labels, audit trail)

### Acceptance Specs

* [x] If user only has 30 seconds → they can still submit “Minimum Pack”
* [x] If user has time → they can submit “Ideal Pack” (with custody + process)
* [x] Retake prompts reduce junk images rate (track metric)

---

## Milestone 9 — Custody Chain v1.1 (Week 1–2) 🧷📦

> Not full logistics control—just **observable checkpoints** that deter swapping.

### Deliverables ✅

* [x] Custody event types standardized:

  * [x] seal intact (pre-open)
  * [x] seal applied (post-close)
  * [x] handoff/transport observed
  * [x] seal broken / mismatch
* [x] **Seal/Box ID capture** UX (photo + typed ID + confidence)
* [x] Station page shows **custody timeline** (gaps visible)

### DoD

* [x] Custody events are append-only + hashed (validation in worker, append-only DB)
* [x] No reporter PII shown publicly (Supabase views exclude IP/session, EXIF wipe)
* [x] Duplicate detection for obvious spam (rate limiting, station-based throttles)

### Acceptance Specs

* [x] A custody event can be filed in <30 seconds
* [x] A seal mismatch auto-flags station as “High Risk” (not “fraud”)

---

## Milestone 10 — Counting Process Evidence (Week 2) 🧮📋

> Users must be able to document *how* invalid/void/no-vote were handled.

### Deliverables ✅

* [x] "Process checklist" on station timeline:

  * [x] count start/end time
  * [x] public visibility
  * [x] objections / interruptions
  * [x] any restricted access or missing posted forms
* [x] Optional "micro-evidence" attachments:

  * [x] tally board photo
  * [x] invalid/blank/no-vote pile photo
* [x] Incident taxonomy tightened for election-day realities

### DoD

* [x] Checklists are short and non-accusatory (standardized event types)
* [x] UI never encourages confrontation; focuses on documenting facts (safety card, non-confrontational language)

### Acceptance Specs

* [x] User can file a process report in <60 seconds
* [x] Stations with “missing posted form” become a visible public gap

---

## Milestone 11 — Advanced Verification & Dispute Resolution (Week 2–3) 🧑‍⚖️✅

> MVP1 has "Trusted 1.5"; MVP2 adds dispute triage and credibility scoring.

### Deliverables ✅

* [x] **Senior review queue** with structured reasons:

  * [x] checksum mismatch
  * [x] math mismatch
  * [x] station header mismatch
  * [x] suspected duplicate / conflicting evidence
* [x] Evidence conflict handling:

  * [x] multiple photos per sheet per station supported cleanly
  * [x] choose "best evidence" + keep others attached
* [x] Reviewer reputation model (lightweight):

  * [x] track accuracy vs later consensus

### DoD

* [x] Every status change has reason + audit record (verification_log, tally actions)
* [x] Disputed stations remain visible publicly (no silent dropping, public board shows dispute flags)

### Acceptance Specs

* [x] A disputed case can be resolved without admin DB edits
* [x] Conflicting submissions are not overwritten; they are linked + compared

---

## Milestone 12 — Aggregation Integrity v2 (Week 3) 🧮🛡️

> Make aggregation itself auditable and reproducible.

### Deliverables ✅

* [x] Snapshot generator publishes:

  * [x] verified totals
  * [x] disputed totals (separate channel)
  * [x] coverage statistics
  * [x] provenance metadata (build time, counts, version)
* [x] **Deterministic exports** (same input → same output hash)
* [x] Public "methodology" page (what verified means)

### DoD

* [x] Public board is still CDN/static-first (no DB hot path - snapshots served from CDN)
* [x] Snapshots include "data version" + "schema version" (snapshot_version: 2.0.0, schema documented)

### Acceptance Specs

* [x] Anyone can recompute constituency totals from exported station JSON (deterministic exports)
* [x] If snapshot job fails, last known good snapshot remains served (static file fallback)

---

## Milestone 13 — "Worth Chasing?" Prioritization Engine (Week 3–4) 🎯🧠

> Users shouldn't chase random stations; the app tells them what matters.

### Deliverables ✅

* [x] Constituency-level metrics:

  * [x] margin between top 2
  * [x] votes needed to flip
  * [x] reporting completeness % (verified)
* [x] Station risk signals:

  * [x] seal mismatch observed
  * [x] missing posted form
  * [x] checksum mismatch
  * [x] abnormal invalid/no-vote ratios (outlier detection)
* [x] Output labels:

  * [x] **High leverage / Medium / Low**
  * [x] "Why this matters" explanation (plain language)

### DoD

* [x] Labels are conservative (avoid defamation); use “observed risk” language
* [x] Always show uncertainty based on coverage % and dispute rate

### Acceptance Specs

* [x] User sees: “If fixed, can flip seat? yes/no”
* [x] User sees: “Best stations to investigate first” list

---

## Milestone 14 — Impact Simulator v2 (Week 4) 🎮📊

> MVP1: constituency flip only. MVP2: multi-station scenarios + shareable narratives.

### Deliverables ✅

* [x] Scenario builder:

  * [x] select multiple stations
  * [x] adjust candidate totals + invalid/no-vote
  * [x] lock to evidence-backed constraints (optional)
* [x] Scenario sharing:

  * [x] share link that encodes diffs
  * [x] generates a "scenario report" page
* [x] Optional: party-list totals exploration (NO seat allocation unless rule engine is implemented)

### DoD

* [x] Simulator clearly separated from real dataset
* [x] No misleading “official outcome changed” language

### Acceptance Specs

* [x] Changing totals beyond margin flips winner instantly
* [x] Scenario report is readable without the app account

---

## Milestone 15 — Legal Action Kit v2 (Week 4) ⚖️📦

> Move from "export" → "case-building" (still non-legal advice).

### Deliverables ✅

* [x] Case templates by allegation type:

  * [x] results form mismatch
  * [x] custody/seal mismatch
  * [x] blocked observation / missing posted form
  * [x] abnormal invalid/blank/no-vote pattern
* [x] Evidence packet includes:

  * [x] station identifiers + timestamps
  * [x] all related artifacts (forms + incidents + custody)
  * [x] hashes + audit trail + status meanings
  * [x] impact summary ("could flip seat? margin = X")
* [x] "Where to file" routing (text + links; configurable)

### DoD

* [x] PII is excluded by default
* [x] Language is factual and defensible (“observed discrepancy”)

### Acceptance Specs

* [x] Journalist/lawyer can understand packet without needing the app
* [x] Same evidence produces same hash list (reproducible)

---

## Milestone 16 — Trust, Safety, and Anti-Takedown (Cross-cutting, Week 1–4) 🧯🔒

> Assume harassment, spam, takedowns, and traffic spikes.

### Deliverables ✅

* [x] Stronger anti-abuse:

  * [x] throttles by IP/session
  * [x] shadow-ban junk uploaders (risk-based scoring)
  * [x] moderation queue for public incidents (threat logs)
* [x] Multi-mirror strategy:

  * [x] static snapshot mirrored to multiple origins
  * [x] export bundles mirrored
* [x] "Kill switch" expanded:

  * [x] disable uploads
  * [x] keep read-only evidence serving
* [x] Transparency log:

  * [x] publish uptime + snapshot timestamps

### DoD

* [x] Public read access remains even under partial outage (kill switch read-only mode)
* [x] Moderation actions are logged (threat_logs, review actions)

### Acceptance Specs

* [x] Under attack mode: uploads may pause, but evidence browsing stays up
* [x] Mirrors can be switched without breaking links (stable IDs)

---

## Milestone 17 — Security & Resilience Hardening (MVP2) 🛡️🧯

> Target: withstand **traffic spikes + active adversaries** (DDoS, spam/poisoning, takedowns), protect reporter privacy, and keep public read access up even when writes must be disabled.

### Deliverables ✅

* [x] **Threat Model** documented (assets, adversaries, attack surfaces, mitigations)
* [x] **Static-first public delivery** finalized (snapshots → object storage → CDN)
* [x] **Write-path hardening** (2-phase upload + queue processing + strict WAF/rate limits)
* [x] **DB security** (RLS policies + public-safe views + audit trails)
* [x] **Crypto boundaries** defined (TLS, at-rest, optional field encryption, key management)
* [x] **AuthZ model** locked (public/anon upload/reviewer/admin separation + 2FA recommendation)
* [x] **Evidence integrity** (hashing + append-only action logs + deterministic exports)
* [x] **Privacy + takedown** workflow (EXIF wipe, optional face blur, moderation queue)
* [x] **Kill switch + incident response** playbook + monitoring/alerts
* [x] **Load testing** results and SLOs (reads + writes)

---

### Scope Details (What “Done” means)

#### A) Threat Model (Required) ✅

* [x] Threat model includes:

  * [x] DDoS / traffic spikes
  * [x] data poisoning / junk uploads / wrong-station spam
  * [x] reviewer compromise / stolen credentials
  * [x] data exfiltration (IP/session/reporter metadata)
  * [x] takedown/flagging abuse + legal pressure scenarios
  * [x] supply-chain & secret leakage risks (CI/CD)

**DoD** ✅

* [x] Mapped controls to each threat (prevention + detection + response)
* [x] Explicit statement of what the system **cannot guarantee** (see: [`apps/web/src/lib/security.ts`](apps/web/src/lib/security.ts))

---

#### B) Public Scaling & DDoS Resilience (Read Path) ✅

* [x] Public dashboard uses **static JSON snapshots only** (no DB in hot path)
* [x] Snapshot layout published to object storage:

  * [x] `national.json`
  * [x] `province/{id}.json`
  * [x] `constituency/{id}.json`
  * [x] `coverage.json`
  * [x] `latest.json` pointer (short TTL)
* [x] CDN caching configured:

  * [x] long TTL for versioned snapshots
  * [x] short TTL for `latest.json` (30–60s)

**DoD** ✅

* [x] Public endpoints remain responsive under load via CDN cache
* [x] If DB is slow/down, last snapshot still serves

**Acceptance Specs ✅**

* [x] Snapshot build completes faster than interval (e.g., <45s for 60s cadence)
* [x] Public board continues serving with **0 DB reads** during traffic spikes

---

#### C) Write-Path Hardening (Upload/Report Path)

* [x] Upload is **two-phase**:

  * [x] `presign` → pre-signed URL (object storage)
  * [x] client uploads directly (bypasses API bottleneck)
  * [x] `finalize` records metadata + checksums
* [x] Processing is async:

  * [x] object storage event → queue → worker for EXIF wipe + derivative creation
* [x] WAF rules for write endpoints:

  * [x] strict rate limit per IP/session
  * [x] captcha/turnstile on write only
  * [x] endpoint-specific throttles (upload vs report vs unlisted station)

**DoD** ✅

* [x] Abusive clients can’t saturate DB/API (queue absorbs spikes)
* [x] Shadow-ban option exists for repeat junk uploaders

**Acceptance Specs ✅**

* [x] Under attack, system can enter **Read-only mode** without downtime
* [x] Upload/reports degrade gracefully (queue/backpressure), not crash

---

#### D) Database Security (Supabase/Postgres) 🧱

* [x] Row Level Security (RLS) policies implemented:

  * [x] public read access only via **public-safe views**
  * [x] raw tables (IP/session/internal) not publicly readable
  * [x] reviewer queue readable only by reviewer role
  * [x] admin moderation tables admin-only
* [x] Views strategy:

  * [x] `public_stations`, `public_submissions`, `public_incidents`, `public_custody_events`
  * [x] exclude: IP, session identifiers, raw metadata
* [x] Audit tables/logging:

  * [x] reviewer actions (who/when/what)
  * [x] admin moderation (takedown/ban/merge)
  * [x] station merge actions (if any)

**DoD** ✅

* [x] A compromised public token cannot read sensitive tables/columns
* [x] All moderation/verification actions are traceable

**Acceptance Specs ✅**

* [x] Public API can only query views; direct table access fails by policy
* [x] Reviewer can only access assigned/locked queue items

---

#### E) Encryption & Key Management 🔐

* [x] In-transit:

  * [x] TLS everywhere + HSTS enabled
* [x] At-rest:

  * [x] object storage encryption enabled (provider SSE)
  * [x] DB encryption confirmed by provider
* [x] Application-level encryption policy (explicit decision):

  * [x] either **store no sensitive reporter data**, or
  * [x] encrypt sensitive fields at app level (reporter contact, if ever used)
* [x] Secrets management:

  * [x] secrets only in platform secret store (never in repo)
  * [x] key rotation plan documented (service keys, signing keys)

**DoD** ✅

* [x] No secrets in git history; CI blocks accidental secret commits
* [x] Rotation steps tested in staging

**Acceptance Specs ✅**

* [x] Key rotation does not break public reads or snapshot builds
* [x] Access keys are least-privileged (separate roles for read/write/admin)

---

#### F) AuthN/AuthZ Separation 🔑

* [x] Public users: read without login
* [x] Uploaders:

  * [x] anonymous session token (non-PII)
  * [x] per-session quotas
* [x] Reviewers:

  * [x] invite-only
  * [x] 2FA recommended or enforced (decision documented)
  * [x] item locking with TTL (avoid double review)
* [x] Admin:

  * [x] separate role + separate routes + separate secrets

**DoD** ✅

* [x] Reviewer compromise blast radius limited (no admin privileges)
* [x] Public cannot access reviewer queues or raw data

**Acceptance Specs ✅**

* [x] Unauthorized access to `/admin/*` APIs fails reliably
* [x] Queue lock prevents 2 reviewers editing same item concurrently

---

#### G) Evidence Integrity & Reproducibility 🧾

* [x] Hashing:

  * [x] SHA-256 for original (private)
  * [x] SHA-256 for public derivative
  * [x] hash list included in export packets
* [x] Append-only audit log for:

  * [x] status transitions
  * [x] reviewer edits
  * [x] dispute resolutions
* [x] Deterministic exports:

  * [x] same evidence → same hashes
  * [x] consistent ordering in ZIP/JSON/PDF generation

**DoD** ✅

* [x] "Verified" numbers can be traced to photo + reviewer log + hash (audit trail in verification_log, photo hashes computed)

**Acceptance Specs ✅**

* [x] Export packet is reproducible and independently checkable (deterministic JSON exports with SHA-256 hashes)

---

#### H) Privacy, Moderation, and Anti-Takedown 🕵️‍♂️

* [x] EXIF wipe on ingest (required)
* [x] Optional face blur on public derivatives (toggle/configurable)
* [x] Public report button → moderation queue
* [x] Moderation actions logged (who/when/why)
* [x] Mirror strategy for snapshots + evidence (at least 2 origins recommended)

**DoD** ✅

* [x] Reporter/uploader identity never appears publicly (Supabase views exclude IP/session, EXIF wipe in worker)
* [x] Coordinated false reporting can't silently remove core evidence (review required - threat logging, moderation queue)

**Acceptance Specs ✅**

* [x] Takedown requests don't remove originals without logged admin action (threat_logs for moderation actions)
* [x] Mirrors continue serving if primary origin is blocked (multiple CDN origin strategy, static snapshots)

---

#### I) Kill Switch + Incident Response 🚨

* [x] Kill switch modes:

  * [x] disable uploads
  * [x] disable incident reports
  * [x] keep read-only evidence browsing
  * [x] freeze snapshot generation (if compromised)
* [x] Monitoring + alerts:

  * [x] error rate (API/worker)
  * [x] queue depth / lag
  * [x] snapshot freshness (last built time)
  * [x] WAF blocks / rate limit triggers
* [x] Incident response runbook (staging-tested)

**DoD** ✅

* [x] Team can flip to read-only mode in <5 minutes
* [x] Status banner displayed to users when degraded

**Acceptance Specs ✅**

* [x] Under attack: reads remain up, writes gracefully paused, transparency preserved

---

#### J) Load Testing & SLOs 📈

* [x] Define SLOs:

  * [x] public board availability target
  * [x] snapshot freshness target
  * [x] write-path acceptance under burst
* [x] Load test scenarios:

  * [x] 10k+ concurrent viewers (cached)
  * [x] upload bursts (e.g., 1k/min) with queue/backpressure
  * [x] bot spam attempts on report/upload endpoints
* [x] Results documented + mitigations implemented

**DoD** ✅

* [x] System meets SLOs in staging
* [x] Known bottlenecks documented + fallback plan exists

**Acceptance Specs ✅**

* [x] Under peak simulation, public remains responsive and snapshots keep updating within target window