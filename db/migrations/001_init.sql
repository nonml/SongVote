CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS provinces (
  id INT PRIMARY KEY,
  name_th TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS constituencies (
  id SERIAL PRIMARY KEY,
  province_id INT REFERENCES provinces(id),
  khet_number INT NOT NULL,
  UNIQUE(province_id, khet_number)
);

CREATE TABLE IF NOT EXISTS stations (
  id TEXT PRIMARY KEY,
  constituency_id INT REFERENCES constituencies(id),
  subdistrict_id INT,
  subdistrict_name TEXT NOT NULL,
  station_number INT NOT NULL,
  location_name TEXT,
  is_verified_exist BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source_ref TEXT
);

CREATE INDEX IF NOT EXISTS idx_stations_selector
  ON stations (constituency_id, subdistrict_id, station_number);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id TEXT REFERENCES stations(id),
  user_session_id TEXT,
  ip_hash TEXT,

  photo_constituency_key TEXT,
  photo_partylist_key TEXT,

  checksum_constituency_total INT,
  checksum_partylist_total INT,

  status_constituency VARCHAR(20) DEFAULT 'missing',
  status_partylist VARCHAR(20) DEFAULT 'missing',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_at_least_one_photo
    CHECK (photo_constituency_key IS NOT NULL OR photo_partylist_key IS NOT NULL),

  CONSTRAINT submission_status_check
    CHECK (
      status_constituency IN ('missing','pending','verified','rejected','disputed')
      AND status_partylist IN ('missing','pending','verified','rejected','disputed')
    )
);

CREATE INDEX IF NOT EXISTS idx_queue_constituency
  ON submissions (created_at) WHERE status_constituency = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_partylist
  ON submissions (created_at) WHERE status_partylist = 'pending';

CREATE TABLE IF NOT EXISTS reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  display_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tallies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES reviewers(id),
  sheet_type VARCHAR(20) NOT NULL,
  confirmed_station_number INT,
  header_text JSONB,
  score_map JSONB NOT NULL,
  metadata_checks JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT tallies_sheet_type_check
    CHECK (sheet_type IN ('constituency','partylist'))
);

CREATE TABLE IF NOT EXISTS verification_log (
  id BIGSERIAL PRIMARY KEY,
  submission_id UUID,
  reviewer_id UUID,
  sheet_type VARCHAR(20),
  action TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
