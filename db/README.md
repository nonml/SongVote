# Database Setup Guide

## Database Schema

The Thai Election Evidence Layer uses PostgreSQL with the following tables:

### Core Tables

| Table | Purpose |
|-------|---------|
| `provinces` | 77 Thai provinces (id, name_th) |
| `constituencies` | Election constituencies by province (id, province_id, khet_number) |
| `stations` | Polling stations with location info |
| `submissions` | Evidence photo uploads with checksums |
| `reviewers` | Admin reviewer accounts |
| `tallies` | Transcription results from reviewers |
| `verification_log` | Audit trail of all verification actions |
| `incident_reports` | Election incident reports |
| `custody_events` | Chain of custody tracking |

## Initial Setup

### Step 1: Create Database
```bash
createdb thai_election
```

### Step 2: Run Migrations
```bash
psql thai_election -f db/migrations/001_init.sql
psql thai_election -f db/migrations/002_custody_incidents.sql
```

### Step 3: Seed Provinces (Required)
```bash
psql thai_election -f db/seeds/provinces.sql
```

### Step 4: Import ECT66 Data (Optional but Recommended)

ECT66 is the official Thai Election Commission data file. Download it from ECT and load:

```bash
# Create staging table
psql thai_election -c "CREATE UNLOGGED TABLE IF NOT EXISTS staging_units (...);"

# Import CSV (adjust path to your ECT66 file)
psql thai_election -c "\copy staging_units FROM '/path/to/ect66_units.csv' WITH (FORMAT csv, HEADER true);"

# Run import script
psql thai_election -f db/seeds/import_ect66.sql
```

## Verification

After setup, verify the data:
```sql
SELECT COUNT(*) FROM provinces;  -- Should be 77
SELECT COUNT(*) FROM constituencies;  -- Should be > 0
SELECT COUNT(*) FROM stations;  -- Should be > 0
```

## API Endpoints

The worker automatically fetches data from the database. When no data exists, it falls back to mock data.

- `/api/v1/config` - Province/Khet/Subdistrict/Station data
- `/api/v1/stats` - Coverage statistics by province
- `/api/v1/snapshot` - CDN-cacheable public snapshot