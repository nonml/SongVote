-- Milestone 24: Governance, Credibility, and Trust Signals

-- Governance page content
CREATE TABLE IF NOT EXISTS governance_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section VARCHAR(100) NOT NULL UNIQUE,  -- 'mission', 'non_partisan', 'methodology', 'funding'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_by UUID REFERENCES reviewers(id)
);

INSERT INTO governance_content (section, title, content) VALUES
  ('mission', 'Our Mission', E'This project exists to provide independent election transparency through citizen observation.\n\nWe believe that transparent elections are the foundation of democracy, and that citizens have both the right and responsibility to observe and verify the electoral process.', NOW()),
  ('non_partisan', 'Non-Partisan Stance', E'We are strictly non-partisan. We do not support or oppose any political party or candidate.\n\nOur methodology is designed to be objectively verifiable, and all our data and processes are published for independent review.', NOW()),
  ('methodology', 'Methodology', E'Our verification methodology:\n\n1. Multiple observers can submit evidence for the same polling station\n2. Evidence is validated through checksums and reviewer verification\n3. Discrepancies are tracked and resolved through consensus\n4. All actions are recorded in an immutable audit trail', NOW()),
  ('funding', 'Funding Disclosure', E'This project is funded through [disclose funding sources].\n\nWe maintain editorial independence and all funding sources are publicly disclosed.', NOW())
ON CONFLICT (section) DO NOTHING;

-- Transparency log entries
CREATE TABLE IF NOT EXISTS transparency_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,  -- 'read_only_enabled', 'read_only_disabled', 'snapshot_stale', ' moderation_action'
  severity VARCHAR(20) NOT NULL,  -- 'info', 'warning', 'critical'
  details TEXT NOT NULL,
  affected_count INTEGER DEFAULT 0,
  action_taken TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transparency_log_type ON transparency_log (event_type, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_transparency_log_time ON transparency_log (logged_at DESC);

-- Moderation actions summary
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL,  -- 'reject_quality', 'reject_mismatch', 'dispute', 'block_user'
  reason TEXT,
  count INTEGER NOT NULL DEFAULT 1,
  date_bucket DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_date ON moderation_actions (date_bucket, action_type);

-- Independent verification hooks
CREATE TABLE IF NOT EXISTS independent_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_type VARCHAR(50) NOT NULL,  -- 'recompute_totals', 'verify_hash', 'audit_sample'
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'failed'
  request_details JSONB,
  result JSONB,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_independent_verification_status ON independent_verification (status, created_at DESC);

-- Signed snapshot manifests (optional, for advanced verification)
CREATE TABLE IF NOT EXISTS signed_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id VARCHAR(50) NOT NULL UNIQUE,
  snapshot_version VARCHAR(20) NOT NULL,
  data_hash VARCHAR(255) NOT NULL,
  public_key TEXT,  -- signing public key
  signature TEXT NOT NULL,
  verification_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'verified', 'invalid'
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signed_manifests_status ON signed_manifests (verification_status, published_at DESC);

-- Third-party verification request log
CREATE TABLE IF NOT EXISTS third_party_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name VARCHAR(255) NOT NULL,
  request_type VARCHAR(50) NOT NULL,  -- 'data_access', 'recompute', 'audit'
  request_details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'granted', 'denied', 'completed'
  response TEXT,
  granted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_third_party_verification_status ON third_party_verification (status, created_at DESC);

-- Credibility metrics tracking
CREATE TABLE IF NOT EXISTS credibility_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  confidence_interval JSONB,  -- {min, max, confidence}
  date_bucket DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credibility_metrics_name ON credibility_metrics (metric_name, date_bucket DESC);

-- Insert initial credibility metrics
INSERT INTO credibility_metrics (metric_name, metric_value, confidence_interval, date_bucket) VALUES
  ('coverage_percent', 0, '{"min": 0, "max": 0, "confidence": 0.95}', CURRENT_DATE),
  ('verification_rate', 0, '{"min": 0, "max": 0, "confidence": 0.95}', CURRENT_DATE),
  ('dispute_rate', 0, '{"min": 0, "max": 0, "confidence": 0.95}', CURRENT_DATE)
ON CONFLICT DO NOTHING;