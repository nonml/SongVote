-- Milestone 21: Media / Partner API & Data Products

-- API versioning and partner access tracking
CREATE TABLE IF NOT EXISTS api_versions (
  id VARCHAR(20) PRIMARY KEY,  -- 'v1', 'v2'
  description TEXT,
  release_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  deprecated_at TIMESTAMPTZ
);

INSERT INTO api_versions (id, description, release_date) VALUES
  ('v1', 'Initial stable API version', NOW()),
  ('v2', 'Next generation with enhanced features', NULL)
ON CONFLICT (id) DO NOTHING;

-- Partner API access tokens
CREATE TABLE IF NOT EXISTS partner_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name VARCHAR(100) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  allowed_endpoints TEXT[],  -- array of allowed API endpoints
  rate_limit_per_hour INTEGER DEFAULT 1000,
  data_limits JSONB,  -- province filters, date ranges, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES reviewers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_partner_tokens_active ON partner_tokens (is_active);

-- Bulk export tracking
CREATE TABLE IF NOT EXISTS bulk_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type VARCHAR(50) NOT NULL,  -- 'national', 'province', 'constituency', 'daily_bundle'
  format VARCHAR(20) NOT NULL,  -- 'csv', 'json'
  filters JSONB,  -- province_ids, date ranges, etc.
  file_url TEXT,
  file_hash VARCHAR(255),  -- SHA-256 hash for verification
  row_count INTEGER,
  build_duration_ms INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'building', 'ready', 'failed'
  error_message TEXT,
  requested_by UUID REFERENCES reviewers(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bulk_exports_status ON bulk_exports (status, requested_at DESC);

-- Partner data consumption logs
CREATE TABLE IF NOT EXISTS partner_data_usage (
  id BIGSERIAL PRIMARY KEY,
  partner_token_id UUID REFERENCES partner_tokens(id),
  endpoint VARCHAR(100) NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  total_rows_returned INTEGER NOT NULL DEFAULT 0,
  response_time_ms DOUBLE PRECISION,
  date_bucket DATE NOT NULL,  -- for daily aggregation
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_usage_date ON partner_data_usage (partner_token_id, date_bucket DESC);

-- Methodology documentation storage
CREATE TABLE IF NOT EXISTS methodology_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section VARCHAR(100) NOT NULL,  -- 'verified_disputed', 'reconciliation', 'limitations', 'gaps'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version VARCHAR(20) DEFAULT '1.0',
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO methodology_docs (section, title, content, version) VALUES
  ('verified_disputed', 'What "Verified" and "Disputed" Mean', E'To be marked "verified", a submission must:\n\n1. Have valid photo evidence of the S.S. 5/18 form\n2. Have a checksum that matches OR be verified by a reviewer\n3. Pass all integrity checks\n\nA "disputed" status means:\n\n1. The evidence cannot be verified\n2. There is conflicting evidence from multiple sources\n3. The data appears to be incomplete or corrupted', '1.0'),
  ('reconciliation', 'How Reconciliation Works', E'Our reconciliation process:\n\n1. Multiple observers can submit evidence for the same station\n2. The system tracks all submissions with their checksums\n3. Reviewers compare submissions and identify discrepancies\n4. Consensus is reached when multiple verified submissions align', '1.0'),
  ('limitations', 'Known Limitations and Gaps', E'This transparency tool has important limitations:\n\n1. Coverage is not 100% - not all stations have observers\n2. Evidence quality varies based on observer capability\n3. Some stations may have no or limited evidence\n4. Disputed stations remain marked until resolved', '1.0')
ON CONFLICT (section) DO NOTHING;

-- Snapshot manifest for independent verification
CREATE TABLE IF NOT EXISTS snapshot_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id VARCHAR(50) NOT NULL UNIQUE,
  snapshot_version VARCHAR(20) NOT NULL,
  data_hash VARCHAR(255) NOT NULL,  -- hash of the verified station data
  signature TEXT,  -- optional cryptographic signature
  published_at TIMESTAMPTZ DEFAULT NOW(),
  source_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_snapshot_manifest_time ON snapshot_manifests (published_at DESC);