-- Milestone 25: Election Rule Engine (Optional)

-- Party-list seat allocation rule set
CREATE TABLE IF NOT EXISTS election_rules (
  id VARCHAR(50) PRIMARY KEY,  -- '2024_party_list', '2019_party_list', etc.
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  rule_type VARCHAR(50) NOT NULL,  -- 'party_list', 'constituency', 'mixed'
  config JSONB NOT NULL,  -- formula parameters
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO election_rules (id, name, description, rule_type, config) VALUES
  ('2024_party_list', '2024 Party-List Allocation', E'Thailand 2024 party-list seat allocation:\n\n1. 500 total House seats: 400 constituency + 100 party-list\n2. Party-list seats allocated by proportional representation\n3. Threshold: 5% of national valid votes or 20 constituency seats\n4. Calculate using largest remainder method', 'party_list', '{"total_party_list_seats": 100, "threshold_percent": 5, "threshold_constituency_seats": 20, "calculation_method": "largest_remainder"}')
ON CONFLICT (id) DO NOTHING;

-- Political party registry
CREATE TABLE IF NOT EXISTS political_parties (
  id VARCHAR(50) PRIMARY KEY,
  name_th TEXT NOT NULL,
  name_en TEXT,
  abbreviation VARCHAR(50),
  color VARCHAR(20),
  logo_key TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO political_parties (id, name_th, name_en, abbreviation) VALUES
  ('party_1', 'พรรครักชาติ', 'Love Thailand Party', 'รช'),
  ('party_2', 'พรรคษา', 'Thai Soul Party', 'ษ'),
  ('party_3', 'พรรคษา', 'Pheu Thai Party', 'พท')
ON CONFLICT (id) DO NOTHING;

-- Party vote totals
CREATE TABLE IF NOT EXISTS party_vote_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id VARCHAR(50) REFERENCES political_parties(id),
  election_date DATE NOT NULL,
  valid_votes INTEGER NOT NULL,
  invalid_votes INTEGER NOT NULL,
  total_votes INTEGER NOT NULL,
  constituency_seats_won INTEGER NOT NULL DEFAULT 0,
  party_list_seats_allocated INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_votes_date ON party_vote_totals (election_date, party_id);

-- Seat allocation simulation results
CREATE TABLE IF NOT EXISTS seat_allocation_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id VARCHAR(50) REFERENCES election_rules(id),
  simulation_date DATE NOT NULL,
  input_data_hash VARCHAR(255) NOT NULL,
  results JSONB NOT NULL,  -- {party_id: {constituency: N, party_list: N, total: N}}
  calculation_details JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seat_simulations_date ON seat_allocation_simulations (simulation_date, created_at DESC);

-- Party-list allocation execution log
CREATE TABLE IF NOT EXISTS party_list_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id VARCHAR(50) REFERENCES election_rules(id),
  allocation_date DATE NOT NULL,
  phase VARCHAR(50) NOT NULL,  -- 'initial', 'remainder', 'final'
  step_number INTEGER NOT NULL,
  party_id VARCHAR(50) REFERENCES political_parties(id),
  votes INTEGER NOT NULL,
  constituency_seats INTEGER NOT NULL,
  initial_party_list_seats INTEGER,
  remainder_seats INTEGER,
  total_seats INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_party_list_allocations_party ON party_list_allocations (allocation_date, party_id);

-- Election rule versioning
CREATE TABLE IF NOT EXISTS rule_version_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id VARCHAR(50) REFERENCES election_rules(id),
  version INTEGER NOT NULL,
  changes JSONB NOT NULL,  -- what changed in this version
  effective_date DATE NOT NULL,
  approved_by UUID REFERENCES reviewers(id),
  approved_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rule_version_history_rule ON rule_version_history (rule_set_id, version DESC);