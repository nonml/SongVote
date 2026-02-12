-- Additional table for snapshots storage

CREATE TABLE IF NOT EXISTS snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id VARCHAR(50) NOT NULL UNIQUE,
  snapshot_version VARCHAR(20) NOT NULL,
  metadata JSONB NOT NULL,
  provinces JSONB,
  constituencies JSONB,
  stations JSONB,
  province_stats JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_id ON snapshots (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_time ON snapshots (generated_at DESC);