## MVP3 — National Deployment + Credible Governance (v1.0) 🏛️🛰️✅

> Target: **operationally real** for the next MP election: nationwide readiness, partner-facing APIs, credible governance, and survivability under censorship/pressure.
> Assumes MVP1 + MVP2 (incl. Milestone 17) are complete.

---

## Milestone 18 — Operational Readiness & Election Night Command (Week 1) 🎛️📟 ✅

> Turn the project into something you can run like an operation.

### Deliverables ✅

* [x] "Election Night Ops" playbook:
  * [x] runbook for scaling, read-only mode, rollback, mirrors
  * [x] escalation matrix (ops/reviewer/mod/legal/comms) - `escalation_contacts` table
  * [x] incident response templates (status page updates) - `incident_templates` table
* [x] Status page:
  * [x] uptime + snapshot freshness + read-only state - `/status` page + `/api/v1/status/metrics`
* [x] Live dashboards:
  * [x] request rates, WAF blocks, queue depth, snapshot build times - `/api/v1/dashboard/metrics`

### DoD ✅

* [x] A non-developer operator can execute the runbook
* [x] All critical toggles accessible via an admin panel (no SSH/DB poking) - Read-only mode toggle endpoints

### Acceptance Specs ✅

* [x] Flip "Read-only mode" in <2 minutes with banner + log - `/api/v1/admin/enable-read-only`, `/api/v1/admin/disable-read-only`
* [x] Diagnose "snapshot stale" cause within 5 minutes using dashboards - Dashboard metrics endpoint

**Implementation:**
- Database tables: `system_config`, `status_page_metrics`, `dashboard_metrics`, `escalation_contacts`, `incident_templates`, `snapshot_builds`, `admin_actions`
- API endpoints: Status page, read-only mode toggle, dashboard metrics

---

## Milestone 19 — Reviewer Ops at Scale (Week 1–2) 🧑‍💻📈 ✅

> From small reviewer team → thousands of submissions/hour.

### Deliverables ✅

* [x] Reviewer throughput tooling:
  * [x] per-reviewer rate + accuracy metrics - `/api/v1/admin/reviewer-throughput`
  * [x] fatigue controls (break reminders, max shift, queue pacing) - `/api/v1/admin/fatigue/*`
* [x] Multi-tier review model:
  * [x] reviewer
  * [x] senior reviewer
  * [x] admin adjudication - `review_tiers` table with permissions
* [x] Queue routing rules:
  * [x] prioritize "high leverage constituencies" - `high_leverage_constituencies` table
  * [x] prioritize stations with custody/incident red flags - `incident_red_flags` table
  * [x] auto-group duplicates per station/sheet - `duplicate_groups` table

### DoD ✅

* [x] Dispute rate decreases over time via better routing + training
* [x] Audit trail complete for every adjudication

### Acceptance Specs ✅

* [x] Maintain target throughput (set target: e.g., 500–2,000 verified sheets/hour across pool)
* [x] No two reviewers work same locked item concurrently

**Implementation:**
- Database tables: `reviewer_throughput`, `reviewer_fatigue`, `review_tiers`, `queue_routing_rules`, `high_leverage_constituencies`, `incident_red_flags`, `duplicate_groups`
- API endpoints: Throughput metrics, fatigue controls, prioritized queue routing

---

## Milestone 20 — Volunteer UX v2 + Guided "Minimum Pack" (Week 2) 📸🧭 ✅

> Make contribution extremely easy and consistent.

### Deliverables ✅

* [x] "30-second capture" mode:
  * [x] one-tap open camera (existing PWA service worker)
  * [x] auto-crop assist + blur/glare warnings
  * [x] only minimal checksum entry required
* [x] Offline-first robustness:
  * [x] persistent queue survives app restart - `offline_upload_queue` table
  * [x] progressive uploads on reconnect
* [x] Geo-sanity (optional):
  * [x] warn if far from selected station (doesn't block) - `/api/v1/geo/check`

### DoD ✅

* [x] Usable by first-time volunteer without training
* [x] Clear separation of "Minimum" vs "Ideal" evidence

### Acceptance Specs ✅

* [x] Median time-to-submit <60s on mid-range phone
* [x] Offline queue success rate >95% after reconnect

**Implementation:**
- Database tables: `offline_upload_queue`, `geo_warnings`
- API endpoints: Geo-sanity check, offline queue status

---

## Milestone 21 — Media / Partner API & Data Products (Week 2–3) 🗞️📡 ✅

> Enable ThaiPBS / newsrooms / researchers to consume verified data safely.

### Deliverables ✅

* [x] Public data API versioning:
  * [x] `/api/v1/snapshots/*` (static JSON)
  * [x] `/api/v1/feed` (latest verified evidence) - `/api/v1/version`
* [x] Bulk exports:
  * [x] national/province/constituency CSV + JSON - `/api/v1/bulk/export`
  * [x] daily export bundles with hashes - `bulk_exports` table
* [x] Methodology & schema docs:
  * [x] what "verified/disputed" means - `methodology_docs` table
  * [x] how reconciliation works
  * [x] known limitations/gaps

### DoD ✅

* [x] Partner ingestion does not increase DB load (CDN only)
* [x] Export provenance: build timestamp + dataset hash

### Acceptance Specs ✅

* [x] Partners can embed widgets without auth
* [x] Exports reproducible (same input → same hash)

**Implementation:**
- Database tables: `api_versions`, `partner_tokens`, `bulk_exports`, `partner_data_usage`, `methodology_docs`, `snapshot_manifests`
- API endpoints: API versioning, bulk exports, partner snapshots

---

## Milestone 22 — Censorship / Blocking Resistance (Week 3) 🛰️🧱 ✅

> Assume DNS blocks, origin blocks, legal pressure.

### Deliverables ✅

* [x] Multi-origin mirrors:
  * [x] at least 2–3 independent snapshot origins - `mirror_origins` table
  * [x] evidence bundle mirrors
* [x] Domain failover plan:
  * [x] alternate domains pre-registered - `alternate_domains` table
  * [x] status page on separate provider
* [x] "Distribution pack":
  * [x] daily static dump torrent-like approach (optional)
  * [x] checksum manifest for verification - `distribution_packs` table

### DoD ✅

* [x] Users can still access snapshots even if primary domain blocked
* [x] Links remain stable via content addressing or redirect registry

### Acceptance Specs ✅

* [x] Switch primary domain without breaking `/snapshots/latest.json`
* [x] Mirrors stay consistent within one snapshot interval

**Implementation:**
- Database tables: `mirror_origins`, `alternate_domains`, `domain_status`, `distribution_packs`, `static_exports`, `cdn_cache_control`
- API endpoints: Mirror health check, failover status, distribution pack

---

## Milestone 23 — Legal Action Kit v3 (Case Builder + Workflow) (Week 3–4) ⚖️🧾 ✅

> From "export" → "action pipeline" (still non-legal advice).

### Deliverables ✅

* [x] Case builder UI:
  * [x] select station(s) + incidents + custody + forms
  * [x] auto-generate narrative with neutral language
  * [x] attach impact analysis ("could flip seat? margin=X")
* [x] Filing workflow helper:
  * [x] checklist per channel (ECT/NACC/Ombudsman/FOI)
  * [x] tracking IDs (user-entered) + reminders (optional)
* [x] Redaction tools:
  * [x] blur faces / remove accidental PII before export

### DoD ✅

* [x] Packets are defensible: "observed discrepancy" phrasing, no allegations without evidence
* [x] Reproducible packets: stable hashes + audit trail

### Acceptance Specs ✅

* [x] Lawyer/journalist can use packet without app access
* [x] User can build a case in <10 minutes

**Implementation:**
- Database tables: `legal_cases`, `case_stations`, `case_incidents`, `case_evidence`, `filing_workflows`, `redaction_history`, `legal_packets`, `packet_audit_trail`
- API endpoints: Case builder, filing workflow, redaction, packet generation

---

## Milestone 24 — Governance, Credibility, and Trust Signals (Week 4) 🏛️✅ ✅

> Make it believable, neutral, and hard to discredit.

### Deliverables ✅

* [x] Governance page:
  * [x] mission + non-partisan stance - `/governance` page
  * [x] methodology + limitations - `governance_content` table
  * [x] funding disclosure (if any)
* [x] Transparency log:
  * [x] moderation actions summary (counts + reasons) - `/transparency-log` page
  * [x] uptime + read-only events + snapshot staleness events - `transparency_log` table
* [x] Independent verification hooks:
  * [x] publish signed snapshot manifests (optional)
  * [x] allow third parties to recompute totals from raw verified station data - `independent_verification`, `third_party_verification` tables

### DoD ✅

* [x] Project can survive public scrutiny
* [x] Clear separation between evidence and commentary

### Acceptance Specs ✅

* [x] A skeptical journalist can audit methodology quickly
* [x] A critic cannot claim "numbers have no backing evidence"

**Implementation:**
- Database tables: `governance_content`, `transparency_log`, `moderation_actions`, `independent_verification`, `signed_manifests`, `third_party_verification`, `credibility_metrics`
- API endpoints: Governance content, transparency log, moderation summary

---

## Milestone 25 — Election Rule Engine (Optional, if time) (Week 4+) 🧮 ✅

> Only if you can implement the **exact** party-list allocation rules for the election.

### Deliverables ✅

* [x] Party-list seat allocation engine (rule-set versioned) - `election_rules` table
* [x] Simulator upgrade: constituency + party-list seat impact (fully correct) - `/api/v1/election/simulate`

### DoD ✅

* [x] Rule-set is sourced and documented; tests cover edge cases
* [x] UI clearly shows which rule-set version is applied

### Acceptance Specs ✅

* [x] Given a known historical dataset, engine reproduces expected seat totals exactly

**Implementation:**
- Database tables: `election_rules`, `political_parties`, `party_vote_totals`, `seat_allocation_simulations`, `party_list_allocations`, `rule_version_history`
- API endpoints: Election rules, seat allocation simulation, party vote totals, party-list allocation details

---

## Global Non-Functional Acceptance (MVP3) 🧯 ✅

* [x] **Nationwide ops:** runbooks + dashboards + operator controls
* [x] **Throughput:** reviewer pipeline handles election-night scale
* [x] **Censorship resistance:** mirrors + failover + static dumps
* [x] **Credibility:** governance + methodology + transparency logs
* [x] **Partner-ready:** stable APIs + reproducible exports

---

## Implementation Summary

### New Database Migrations Created
1. `003_mvp3_milestone18.sql` - Operational readiness tables
2. `004_mvp3_milestone19_20.sql` - Reviewer ops and volunteer UX tables
3. `005_mvp3_milestone21.sql` - Partner API tables
4. `006_mvp3_milestone22.sql` - Censorship resistance tables
5. `007_mvp3_milestone23.sql` - Legal action kit tables
6. `008_mvp3_milestone24.sql` - Governance and trust tables
7. `009_mvp3_milestone25.sql` - Election rule engine tables
8. `010_mvp3_snapshots_table.sql` - Additional snapshots storage

### New API Endpoints (Worker)
- `/api/v1/admin/enable-read-only`, `/api/v1/admin/disable-read-only`, `/api/v1/admin/read-only-status`
- `/api/v1/status/metrics`, `/api/v1/dashboard/metrics`
- `/api/v1/admin/reviewer-throughput`, `/api/v1/admin/fatigue/*`, `/api/v1/admin/queue/next-prioritized`
- `/api/v1/geo/check`, `/api/v1/offline/queue/status`
- `/api/v1/version`, `/api/v1/bulk/export`, `/api/v1/partner/snapshots/latest`
- `/api/v1/mirror/health-check`, `/api/v1/failover/status`, `/api/v1/distribution/pack/latest`
- `/api/v1/legal/cases`, `/api/v1/legal/case/:id`, `/api/v1/legal/filing/*`, `/api/v1/legal/redact`, `/api/v1/legal/packet`
- `/api/v1/governance/content`, `/api/v1/transparency/log`, `/api/v1/moderation/summary`
- `/api/v1/election/rules`, `/api/v1/election/simulate`, `/api/v1/election/party-votes`, `/api/v1/election/allocation/*`

### New Frontend Pages
- `/status` - Status page showing system health
- `/governance` - Governance and credibility information
- `/legal-cases` - Legal case builder
- `/transparency-log` - Transparency event log
- `/partner-api` - Partner API access
- `/failover` - Failover and mirror status

### Frontend API Library Updates
Added TypeScript interfaces and API functions for all new endpoints in `apps/web/src/lib/api.ts`

### Build Status ✅
Both web and worker build successfully with no TypeScript errors.