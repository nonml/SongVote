-- Milestone 19: Reviewer Ops at Scale
-- Milestone 20: Volunteer UX v2 enhancements

-- Reviewer throughput tracking
CREATE TABLE IF NOT EXISTS reviewer_throughput (
  id BIGSERIAL PRIMARY KEY,
  reviewer_id UUID REFERENCES reviewers(id),
  period_start TIMESTAMPTZ NOT NULL,  -- hour slot
  sheets_reviewed INTEGER NOT NULL DEFAULT 0,
  auto_verified_count INTEGER NOT NULL DEFAULT 0,
  corrected_count INTEGER NOT NULL DEFAULT 0,
  dispute_rate DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_throughput_reviewer_period ON reviewer_throughput (reviewer_id, period_start DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_throughput_reviewer_period_unique ON reviewer_throughput (reviewer_id, period_start);

-- Reviewer fatigue controls tracking
CREATE TABLE IF NOT EXISTS reviewer_fatigue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES reviewers(id),
  shift_start TIMESTAMPTZ NOT NULL,
  shift_end TIMESTAMPTZ,
  total_reviewed INTEGER NOT NULL DEFAULT 0,
  breaks_taken INTEGER NOT NULL DEFAULT 0,
  last_break_at TIMESTAMPTZ,
  fatigue_score DOUBLE PRECISION DEFAULT 0,  -- 0-100 based on duration/quantity
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fatigue_reviewer_active ON reviewer_fatigue (reviewer_id, is_active);

-- Multi-tier review model
CREATE TABLE IF NOT EXISTS review_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,  -- 'reviewer', 'senior_reviewer', 'admin_adjudicator'
  level INTEGER NOT NULL UNIQUE,  -- 1, 2, 3
  permissions JSONB NOT NULL,  -- what actions each tier can perform
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO review_tiers (name, level, permissions) VALUES
  ('reviewer', 1, '{"can_verify": true, "can_reject": true, "can_dispute": true, "can_adjudicate": false, "can_view_full_audit": false}'),
  ('senior_reviewer', 2, '{"can_verify": true, "can_reject": true, "can_dispute": true, "can_adjudicate": true, "can_view_full_audit": true, "can_override": false}'),
  ('admin_adjudicator', 3, '{"can_verify": true, "can_reject": true, "can_dispute": true, "can_adjudicate": true, "can_view_full_audit": true, "can_override": true}')
ON CONFLICT DO NOTHING;

-- Queue routing rules
CREATE TABLE IF NOT EXISTS queue_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  priority INTEGER NOT NULL,  -- lower = higher priority
  rule_type VARCHAR(50) NOT NULL,  -- 'high_leverage_constituency', 'incident_flag', 'duplicate_group', 'all'
  rule_config JSONB NOT NULL,  -- constituency_ids, station_ids, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- High leverage constituencies (for priority routing)
CREATE TABLE IF NOT EXISTS high_leverage_constituencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_id INT REFERENCES constituencies(id),
  district_name TEXT,
  margin_percent DOUBLE PRECISION,  -- close margin = higher leverage
  total_stations INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leverage_constituency ON high_leverage_constituencies (constituency_id);

-- Station incident red flags for priority routing
CREATE TABLE IF NOT EXISTS incident_red_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT REFERENCES stations(id),
  flag_type VARCHAR(50) NOT NULL,  -- 'custody_break', 'equipment_issue', 'voter_intimidation', etc.
  severity VARCHAR(20) NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_red_flags_station_active ON incident_red_flags (station_id, is_active);

-- Duplicate group tracking
CREATE TABLE IF NOT EXISTS duplicate_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key VARCHAR(255) NOT NULL,  -- station_id + sheet_type hash
  station_id TEXT REFERENCES stations(id),
  sheet_type VARCHAR(20) NOT NULL,
  member_submissions UUID[] DEFAULT '{}',  -- array of submission IDs
  primary_submission UUID REFERENCES submissions(id),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_duplicate_groups_station ON duplicate_groups (station_id, sheet_type);

-- Offline queue persistence (Milestone 20)
CREATE TABLE IF NOT EXISTS offline_upload_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_session_id TEXT,
  station_id TEXT,
  photo_constituency_key TEXT,
  photo_partylist_key TEXT,
  checksum_constituency_total INT,
  checksum_partylist_total INT,
  upload_attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'syncing', 'success', 'failed'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_upload_queue (sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_offline_queue_session ON offline_upload_queue (user_session_id);

-- Geo-sanity warning tracking (Milestone 20)
CREATE TABLE IF NOT EXISTS geo_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT REFERENCES stations(id),
  user_location_lat DOUBLE PRECISION,
  user_location_lon DOUBLE PRECISION,
  station_location_lat DOUBLE PRECISION,
  station_location_lon DOUBLE PRECISION,
  distance_meters DOUBLE PRECISION,
  warning_type VARCHAR(50) NOT NULL,  -- 'far_from_station', 'impossible_distance'
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_warnings_station ON geo_warnings (station_id, created_at);