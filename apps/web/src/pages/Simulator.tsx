import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

// Decode URL state to simulator values
function decodeUrlState(searchParams: URLSearchParams): { margin: number; delta: number; stations: string[] } {
  const marginStr = searchParams.get("margin");
  const deltaStr = searchParams.get("delta");
  const stationsStr = searchParams.get("stations");

  const margin = marginStr ? parseInt(marginStr, 10) : 35;
  const delta = deltaStr ? parseInt(deltaStr, 10) : 0;
  const stations = stationsStr ? stationsStr.split(",") : [];

  return {
    margin: isNaN(margin) ? 35 : margin,
    delta: isNaN(delta) ? 0 : delta,
    stations: stations
  };
}

// Encode simulator values to URL state
function encodeUrlState(params: { margin: number; delta: number; stations: string[] }): string {
  const searchParams = new URLSearchParams();
  if (params.margin !== 35) searchParams.set("margin", params.margin.toString());
  if (params.delta !== 0) searchParams.set("delta", params.delta.toString());
  if (params.stations.length > 0) searchParams.set("stations", params.stations.join(","));
  return searchParams.toString();
}

// Station selection component for multi-station scenarios
function StationSelector({
  stations,
  selected,
  onToggle,
}: {
  stations: { id: string; number: number; location: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0, fontSize: "14px" }}>Select stations to modify</h3>
      <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 8 }}>
        {stations.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#666" }}>No stations selected</p>
        ) : (
          stations.map(station => (
            <div key={station.id} style={{ padding: 8, borderBottom: "1px solid #2a2f3a" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selected.includes(station.id)}
                  onChange={() => onToggle(station.id)}
                />
                <span>Station #{station.number}</span>
                {station.location && <span style={{ color: "#666", fontSize: "12px" }}>{station.location}</span>}
              </label>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Simulator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { margin: initialMargin, delta: initialDelta, stations: initialStations } = React.useMemo(
    () => decodeUrlState(searchParams),
    [searchParams]
  );

  const [margin, setMargin] = React.useState<number>(initialMargin);
  const [delta, setDelta] = React.useState<number>(initialDelta);
  const [stations, setStations] = React.useState<{ id: string; number: number; location: string }[]>([]);
  const [selectedStations, setSelectedStations] = React.useState<string[]>(initialStations);

  const flipped = delta >= Math.ceil(margin / 2);

  // Update URL when values change
  React.useEffect(() => {
    const state = encodeUrlState({ margin, delta, stations: selectedStations });
    const newUrl = state ? `/simulator?${state}` : `/simulator`;
    navigate(newUrl, { replace: true });
  }, [margin, delta, selectedStations, navigate]);

  const worthChasing = delta >= Math.ceil(margin / 2);

  // Mock stations for demo (in production, these would come from API)
  React.useEffect(() => {
    // Generate some mock stations based on selected
    if (initialStations.length === 0) {
      setStations([
        { id: "s1", number: 1, location: "โรงเรียนวิทยา" },
        { id: "s2", number: 2, location: "โรงเรียนอนุบาล" },
        { id: "s3", number: 3, location: "สำนักงานเขต" },
        { id: "s4", number: 4, location: "วัดพระศรี" },
        { id: "s5", number: 5, location: "ตลาดนัด" },
      ]);
    }
  }, [initialStations]);

  const toggleStation = (id: string) => {
    if (selectedStations.includes(id)) {
      setSelectedStations(prev => prev.filter(s => s !== id));
    } else {
      setSelectedStations(prev => [...prev, id]);
    }
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Impact Simulator v2 🎮</h2>
        <p style={{ marginTop: 0 }}>Multi-station "what-if" scenario builder. This simulates vote shifts across multiple stations.</p>
        <hr />
        <small>Shareable link with your scenario is available in the URL.</small>
      </div>

      {/* Multi-station selection */}
      <StationSelector
        stations={stations}
        selected={selectedStations}
        onToggle={toggleStation}
      />

      {/* Scenario inputs */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Scenario Configuration</h3>
        <div className="row" style={{ gap: 16 }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label>Current margin (winner runner-up)</label>
            <input
              className="input"
              type="number"
              value={margin}
              onChange={e => setMargin(Number(e.target.value))}
            />
            <small>Example: margin 35 means winner leads by 35 votes.</small>
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label>Hypothetical correction (votes shifted per station)</label>
            <input
              className="input"
              type="number"
              value={delta}
              onChange={e => setDelta(Number(e.target.value))}
            />
            <small>Example: if 20 votes per station were misallocated, delta=20.</small>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: "12px", color: "#666" }}>
          Selected stations: {selectedStations.length} / {stations.length}
        </div>
      </div>

      {/* Result display */}
      <div className="card">
        <div style={{ fontSize: "14px", marginBottom: 8 }}>Result:</div>
        {flipped ? (
          <span className="badge bad" style={{ fontSize: "16px" }}>Seat could flip!</span>
        ) : (
          <span className="badge ok" style={{ fontSize: "16px" }}>Seat likely unchanged</span>
        )}
        <p style={{ marginBottom: 0, marginTop: 8 }}>
          {selectedStations.length > 0
            ? `With ${selectedStations.length} station(s) modified,`
            : "For a single station,"}
          votes needed to flip ≈ <b>{Math.ceil(margin / 2)}</b> (rule-of-thumb).
        </p>
      </div>

      {/* Worth chasing badge */}
      <div className="card" style={{ marginTop: 12 }}>
        <strong>Worth chasing? </strong>
        {worthChasing ? (
          <span className="badge warn">High leverage - delta &gt;= margin</span>
        ) : (
          <span className="badge" style={{ background: "#2a2f3a" }}>Low leverage - delta below threshold</span>
        )}
      </div>

      {/* Scenario info */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Scenario Details</h3>
        <ul style={{ marginTop: 0 }}>
          <li>
            <strong>Selected stations:</strong> {selectedStations.length > 0
              ? selectedStations.map(s => {
                  const station = stations.find(st => st.id === s);
                  return station ? `#${station.number}` : s;
                }).join(", ")
              : "None (single station mode)"}
          </li>
          <li><strong>Votes to shift:</strong> {delta} per station</li>
          <li><strong>Current margin:</strong> {margin}</li>
        </ul>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={() => {
              const state = encodeUrlState({ margin, delta, stations: selectedStations });
              window.open(`/simulator/report?${state}`, "_blank");
            }}
            disabled={selectedStations.length === 0}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}