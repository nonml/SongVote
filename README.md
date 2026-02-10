# ส่องโหวต (SongVote) — Thai Election Evidence Layer

Citizen-run **evidence layer** for Thailand's MP general election.
Built for the hard case: **central reporting may be opaque or compromised**.  
**Evidence-first**: capture posted **S.S. 5/18** images (constituency + party-list) → verify via "Trusted 1.5" → aggregate → explore impact → export/use for accountability.

> Not an official ECT product. This app does **not** change election law or run the official count.  
> It publishes **station-level evidence** and an independently verified parallel record.

## What this repository contains
This repo is an MVP focused on:
- **Evidence Locker**: upload and preserve S.S. 5/18 photos before they disappear
- **Verification**: reviewer workflow + reconciliation checks
- **Incidents & Custody**: report intimidation/process issues and observed seal/box events
- **Impact Sandbox**: "does this station matter?" constituency flip what-if (sandbox only)

## Modules
### 1) Capture (PWA)
- Upload **S.S. 5/18** photos for:
  - **Constituency (MP)** sheet
  - **Party-list** sheet
- "Trusted 1.5" checksums (per sheet):
  - **Total valid votes**
  - **Top candidate votes**
- Offline-friendly: queues uploads if network is unstable (best-effort MVP)

### 2) Reviewer Console
- Invite-only reviewer UI
- Transcribe full grids
- Automatic validation:
  - math reconciliation (sum parts)
  - checksum match (field user vs reviewer)
- Decoupled statuses per sheet:
  - `missing | pending | verified | disputed | rejected`

### 3) Report (NEW): Incidents + Chain-of-Custody
- Incident reporting (e.g., blocked observation, missing posted forms, intimidation)
- Custody events (observed box/seal IDs at visible checkpoints)
- These are **observations**, not guarantees of full logistics chain coverage

### 4) Impact Sandbox
- Constituency flip "what-if" simulator using live/verified data
- Helps users prioritize high-leverage stations
- Sandbox edits do **not** modify the underlying dataset

## Operational principles (why it's reliable)
- **Evidence-first**: every published number links back to a station artifact
- **Tamper-evidence**: images can be hashed; review actions are logged
- **Resilience-first**: public outputs should be served from cached/static snapshots (CDN) during peak load
- **Open evidence stance**: posted S.S. 5/18 is public information; we strip EXIF to protect contributors

## Quick start (local)
```bash
npm install
npm run dev:web
````

## Worker (optional)

```bash
npm run dev:worker
```

Create `apps/worker/.dev.vars`:

```bash
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

## Database

Run migrations in order:

* `db/migrations/001_init.sql`
* `db/migrations/002_custody_incidents.sql`

### Seed station registry (ECT66 baseline)

Use:

* `db/staging_import.sql` (COPY → set-based upsert)

Requirements:

* Your CSV headers must match the staging table columns in `staging_import.sql`
* DB encoding should be UTF-8 (Thai text)

## Status / Scope notes

* MVP supports **MP general election** evidence capture and verification.
* Referendum workflows are **out of scope** for v1.
* Party-list seat allocation math is **rule-set dependent**; the simulator currently focuses on **constituency flip impact** to avoid misleading claims.

## License / Safety

* Use responsibly. Do not interfere with election officials or cross restricted areas.
* Avoid capturing voter PII. Report and takedown tools exist for accidental sensitive content.