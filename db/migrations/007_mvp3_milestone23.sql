-- Milestone 23: Legal Action Kit v3 (Case Builder + Workflow)

-- Case builder data model
CREATE TABLE IF NOT EXISTS legal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_title VARCHAR(255) NOT NULL,
  case_description TEXT,
  case_type VARCHAR(50) NOT NULL,  -- 'petition', 'complaint', 'challenge', 'report'
  status VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 'draft', 'ready', 'filed', 'archived'
  created_by UUID REFERENCES reviewers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_at TIMESTAMPTZ DEFAULT NOW(),
  filed_at TIMESTAMPTZ,
  impact_analysis JSONB,  -- impact assessment data
  tags TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_legal_cases_status ON legal_cases (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_cases_created_by ON legal_cases (created_by);

-- Case station associations
CREATE TABLE IF NOT EXISTS case_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES legal_cases(id) ON DELETE CASCADE,
  station_id TEXT REFERENCES stations(id),
  notes TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_stations_case ON case_stations (case_id);
CREATE INDEX IF NOT EXISTS idx_case_stations_station ON case_stations (station_id);

-- Case incidents and custody events
CREATE TABLE IF NOT EXISTS case_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES legal_cases(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incident_reports(id),
  relevance_score DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_incidents_case ON case_incidents (case_id);

-- Case evidence (tallies, verifications)
CREATE TABLE IF NOT EXISTS case_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES legal_cases(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES submissions(id),
  evidence_type VARCHAR(50) NOT NULL,  -- 'tally', 'verification', 'photo', 'disputed'
  analysis_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_evidence_case ON case_evidence (case_id);

-- Filing workflow helper
CREATE TABLE IF NOT EXISTS filing_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES legal_cases(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,  -- 'ECT', 'NACC', 'Ombudsman', 'FOI', 'court'
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'drafting', 'reviewing', 'filed', 'acknowledged', 'responded'
  tracking_id VARCHAR(100),
  filing_date TIMESTAMPTZ,
  response_received_at TIMESTAMPTZ,
  next_action VARCHAR(100),
  next_action_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_filing_workflows_status ON filing_workflows (status, case_id);
CREATE INDEX IF NOT EXISTS idx_filing_workflows_tracking ON filing_workflows (tracking_id);

-- Redaction history for evidence
CREATE TABLE IF NOT EXISTS redaction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_photo_key TEXT NOT NULL,
  redacted_photo_key TEXT NOT NULL,
  redaction_type VARCHAR(50) NOT NULL,  -- 'blur_face', 'blur_license_plate', 'remove_text', 'crop'
  coordinates JSONB,  -- bounding boxes
  redacted_by UUID REFERENCES reviewers(id),
  redacted_at TIMESTAMPTZ DEFAULT NOW(),
  original_hash VARCHAR(255),
  redacted_hash VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_redaction_history_original ON redaction_history (original_photo_key, redacted_at DESC);

-- Legal packet generation
CREATE TABLE IF NOT EXISTS legal_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES legal_cases(id) ON DELETE CASCADE,
  packet_version INTEGER NOT NULL DEFAULT 1,
  packet_type VARCHAR(50) NOT NULL,  -- 'pdf', 'zip_bundle', 'json'
  file_url TEXT,
  file_hash VARCHAR(255),
  includes_redacted BOOLEAN DEFAULT FALSE,
  generated_by UUID REFERENCES reviewers(id),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_packets_case ON legal_packets (case_id, packet_version DESC);

-- Packet audit trail (for reproducibility)
CREATE TABLE IF NOT EXISTS packet_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packet_id UUID REFERENCES legal_packets(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,  -- 'add_station', 'remove_evidence', 'generate'
  actor_id UUID REFERENCES reviewers(id),
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packet_audit_trail_packet ON packet_audit_trail (packet_id, created_at DESC);