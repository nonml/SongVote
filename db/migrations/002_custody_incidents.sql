CREATE TABLE IF NOT EXISTS incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT REFERENCES stations(id),
  submission_id UUID REFERENCES submissions(id),
  incident_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  description TEXT,
  media_keys JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT incident_type_nonempty CHECK (length(trim(incident_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_incidents_station_time
  ON incident_reports (station_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS custody_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT REFERENCES stations(id),
  submission_id UUID REFERENCES submissions(id),
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  box_id TEXT,
  seal_id TEXT,
  notes TEXT,
  media_keys JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT custody_event_type_nonempty CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_custody_station_time
  ON custody_events (station_id, occurred_at DESC);
