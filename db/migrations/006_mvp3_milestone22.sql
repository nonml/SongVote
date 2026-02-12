-- Milestone 22: Censorship / Blocking Resistance

-- Multi-origin mirror configuration
CREATE TABLE IF NOT EXISTS mirror_origins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  origin_url TEXT NOT NULL,
  origin_type VARCHAR(50) NOT NULL,  -- 'snapshot', 'evidence_bundle'
  region VARCHAR(50),  -- 'asia', 'europe', 'us'
  is_active BOOLEAN DEFAULT TRUE,
  health_status VARCHAR(20) DEFAULT 'unknown',  -- 'healthy', 'degraded', 'unreachable'
  last_health_check TIMESTAMPTZ,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mirror_origins_active ON mirror_origins (is_active, region);

-- Alternate domain registry for failover
CREATE TABLE IF NOT EXISTS alternate_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name VARCHAR(255) NOT NULL UNIQUE,
  primary_domain BOOLEAN DEFAULT FALSE,
  failover_priority INTEGER NOT NULL DEFAULT 10,  -- lower = higher priority
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'active', 'standby', 'deactivated'
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  dns_provider VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_alternate_domains_priority ON alternate_domains (failover_priority);

-- Domain status tracking
CREATE TABLE IF NOT EXISTS domain_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL,  -- 'accessible', 'blocked', 'slow', 'unreachable'
  last_check TIMESTAMPTZ DEFAULT NOW(),
  blocked_region VARCHAR(50),
  response_time_ms INTEGER,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_domain_status_check ON domain_status (domain_name, last_check DESC);

-- Distribution pack metadata (for static dumps)
CREATE TABLE IF NOT EXISTS distribution_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_type VARCHAR(50) NOT NULL,  -- 'daily_snapshot', 'evidence_bundle', 'full_export'
  pack_version VARCHAR(20) NOT NULL,
  files JSONB NOT NULL,  -- list of files with hashes
  total_size_bytes BIGINT,
  checksum_manifest VARCHAR(255),  -- SHA-256 of the manifest
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_distribution_packs_type ON distribution_packs (pack_type, generated_at DESC);

-- Static export tracking
CREATE TABLE IF NOT EXISTS static_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  export_type VARCHAR(50) NOT NULL,  -- 'json', 'csv', 'sql_dump'
  target_scope VARCHAR(50) NOT NULL,  -- 'national', 'province', 'constituency'
  file_url TEXT,
  file_hash VARCHAR(255),
  metadata JSONB,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_static_exports_type ON static_exports (export_type, generated_at DESC);

-- CDN cache invalidation tracking
CREATE TABLE IF NOT EXISTS cdn_cache_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL,  -- 'invalidate', 'purge', 'refresh'
  target_url TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  provider VARCHAR(50),  -- 'cloudflare', 'akamai', 'fastly'
  requested_by UUID REFERENCES reviewers(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cdn_cache_control_status ON cdn_cache_control (status, requested_at DESC);