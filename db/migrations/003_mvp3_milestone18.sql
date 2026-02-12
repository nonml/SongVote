-- Milestone 18: Operational Readiness & Election Night Command
-- Add missing threat_logs table and new MVP3 tables

CREATE TABLE IF NOT EXISTS threat_logs (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  source_ip TEXT,
  target TEXT,
  details TEXT,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threats_type_severity ON threat_logs (type, severity);
CREATE INDEX IF NOT EXISTS idx_threats_time ON threat_logs (created_at DESC);

-- Status and configuration table for operational toggles
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  last_updated_by UUID REFERENCES reviewers(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Read-only mode toggle (Milestone 18)
INSERT INTO system_config (key, value) VALUES
  ('read_only_mode', 'false'),
  ('snapshot_interval_seconds', '60'),
  ('queue_pacing_enabled', 'false')
ON CONFLICT (key) DO NOTHING;

-- Status page metrics tracking
CREATE TABLE IF NOT EXISTS status_page_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_name VARCHAR(100) NOT NULL,
  metric_value DOUBLE PRECISION NOT NULL,
  tags JSONB,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_metrics_name_time ON status_page_metrics (metric_name, recorded_at DESC);

-- Live dashboard metrics (request rates, WAF blocks, queue depth, snapshot build times)
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL,  -- 'request_rate', 'waf_blocks', 'queue_depth', 'snapshot_build_time'
  metric_value DOUBLE PRECISION NOT NULL,
  dimensions JSONB,  -- province, station_type, etc.
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_type_time ON dashboard_metrics (metric_type, recorded_at DESC);

-- Escalation matrix configuration
CREATE TABLE IF NOT EXISTS escalation_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR(50) NOT NULL,  -- 'ops', 'reviewer', 'mod', 'legal', 'comms'
  name TEXT,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident response templates
CREATE TABLE IF NOT EXISTS incident_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type VARCHAR(50) NOT NULL,  -- 'ddos', 'tampering', 'dispute', 'status_update'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Snapshot build history for dashboards
CREATE TABLE IF NOT EXISTS snapshot_builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_duration_ms INTEGER NOT NULL,
  stations_count INTEGER NOT NULL,
  submissions_count INTEGER NOT NULL,
  verified_count INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL,  -- 'success', 'failed', 'warning'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshot_builds_time ON snapshot_builds (created_at DESC);

-- Admin panel action log (for audit trail of toggles)
CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES reviewers(id),
  action_type VARCHAR(100) NOT NULL,  -- 'toggle_read_only', 'scale_up', 'rollback'
  target_config_key VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_time ON admin_actions (created_at DESC);