# Setup Guide

## Prerequisites

- Node.js 18+ (with npm or bun)
- Python 3.10+ (for CSV import scripts)
- PostgreSQL 15+ or Supabase account
- Cloudflare account (for worker deployment) OR local wrangler

## Quick Start

### 1. Install dependencies

```bash
# At project root
npm install
cd apps/web && npm install
cd ../worker && npm install
```

### 2. Configure environment variables

Copy the example files and fill in your values:

```bash
# For web app (development)
cp apps/web/.env.example apps/web/.env.development

# For worker (development)
cp apps/worker/.env.example apps/worker/.dev.vars
cp apps/worker/.env.example apps/worker/.staging.vars
cp apps/worker/.env.example apps/worker/.prod.vars
```

Or for local development without Supabase, set up SQLite with mock mode (see below).

### 3. Set up database

#### Option A: Supabase (Recommended for production)

1. Create a project at https://supabase.com
2. Copy the project URL and service role key
3. Run migrations:

```bash
# Using psql
psql <connection-string> -f db/migrations/001_init.sql
psql <connection-string> -f db/migrations/002_custody_incidents.sql
```

#### Option B: Local PostgreSQL

```bash
# Create database
createdb thai_evidence

# Run migrations
psql postgresql://localhost:5432/thai_evidence -f db/migrations/001_init.sql
psql postgresql://localhost:5432/thai_evidence -f db/migrations/002_custody_incidents.sql
```

### 4. Import station registry (ECT66 2023)

```bash
# Download ECT66 CSV from https://www.ect.go.th
# Then run:
psql <connection-string> -f db/staging_import.sql

# Or with Python helper:
python scripts/import_registry.py /path/to/ect66_units.csv
```

### 5. Run development servers

```bash
# Terminal 1: Run worker (Cloudflare Worker dev)
cd apps/worker
npm run dev

# Terminal 2: Run web app
cd apps/web
npm run dev
```

Open http://localhost:5173

## Environment Configuration

### Development (local)
- `apps/worker/.dev.vars`
- Uses mock data if no Supabase configured
- Relaxed rate limits for testing

### Staging
- `apps/worker/.staging.vars`
- Real database but limited traffic
- Stricter rate limits (50 req/60s)

### Production
- `apps/worker/.prod.vars`
- Real database and R2 storage
- Strict rate limits (1000 req/60s)
- Kill switches enabled by default

## Secrets Management

**DO NOT commit `.dev.vars`, `.staging.vars`, or `.prod.vars`** - they contain secrets!

For Cloudflare Workers deployment:

```bash
# Set secrets via Cloudflare dashboard or CLI
cloudflare secrets put SUPABASE_URL
cloudflare secrets put SUPABASE_SERVICE_ROLE_KEY
cloudflare secrets put R2_ACCESS_KEY_ID
cloudflare secrets put R2_SECRET_ACCESS_KEY
```

Or use `.wrangler/secrets.txt` (gitignored).

## Kill Switch

The system includes kill switches for emergency use:

```bash
# In .dev.vars or Cloudflare secrets
KILL_SWITCH_UPLOADS=true    # Block all uploads
KILL_SWITCH_PUBLIC_WRITE=true  # Block all public writes
```

Check status at `/api/v1/admin/kill-switch`.

## Testing

```bash
# Test web app build
cd apps/web && npm run build

# Test worker build
cd apps/worker && npm run build

# Preview worker locally
cd apps/worker && npm run dev
```

## Migration Reference

```sql
-- View current migrations
SELECT * FROM supabase_migrations ORDER BY id;

-- Rollback (if needed)
-- Use pg_dump to backup first, then restore from backup
```

## Troubleshooting

### "SUPABASE not configured" error
- Ensure `.dev.vars` has valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- Or run with mock mode (default if env vars missing)

### "Rate limit exceeded"
- Increase `RATE_LIMIT_MAX` in your env file
- For dev, set to 1000 for testing

### Migration fails with "extension already exists"
- Safe to ignore - run migrations again, they are idempotent