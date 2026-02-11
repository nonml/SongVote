import React from "react";
import { useSearchParams } from "react-router-dom";

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

export default function ScenarioReport() {
  const [searchParams] = useSearchParams();

  const { margin, delta, stations } = React.useMemo(
    () => decodeUrlState(searchParams),
    [searchParams]
  );

  const flipped = delta >= Math.ceil(margin / 2);
  const worthChasing = delta >= Math.ceil(margin / 2);
  const votesNeeded = Math.ceil(margin / 2);

  // Generate scenario report
  const reportData = React.useMemo(() => ({
    title: "Election Impact Scenario Report",
    generatedAt: new Date().toISOString(),
    scenarioSummary: {
      currentMargin: margin,
      votesToShiftPerStation: delta,
      stationsAffected: stations.length,
      scenarioType: stations.length > 0 ? "multi-station" : "single-station",
    },
    analysis: {
      votesNeededToFlip: votesNeeded,
      isFlipped: flipped,
      isWorthChasing: worthChasing,
      leverageLevel: worthChasing ? "HIGH" : "LOW",
    },
    stationsList: stations,
    legalConsiderations: [
      "This is a hypothetical scenario analysis.",
      "No real election data has been altered.",
      "Results should not be presented as official outcomes.",
      "For legal action, verify actual evidence at the station level.",
    ],
  }), [margin, delta, stations, flipped, worthChasing, votesNeeded]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Scenario Report 📊</h2>
        <p style={{ marginTop: 0, fontSize: "12px", color: "#666" }}>
          Generated: {new Date(reportData.generatedAt).toLocaleString("th-TH")}
        </p>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn secondary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
          <button className="btn secondary" onClick={() => window.history.back()}>
            Back to Simulator
          </button>
        </div>
      </div>

      {/* Scenario Summary */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Scenario Summary</h3>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Scenario Type:</span>
            <span className="badge" style={{ background: "#2a2f3a" }}>
              {reportData.scenarioSummary.scenarioType}
            </span>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Current Winner Margin:</span>
            <span className="badge" style={{ background: "#2a2f3a" }}>
              {reportData.scenarioSummary.currentMargin} votes
            </span>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Hypothetical Correction:</span>
            <span className="badge" style={{ background: "#2a2f3a" }}>
              +{reportData.scenarioSummary.votesToShiftPerStation} votes per station
            </span>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span>Stations Affected:</span>
            <span className="badge" style={{ background: "#2a2f3a" }}>
              {reportData.scenarioSummary.stationsAffected} station(s)
            </span>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Analysis Results</h3>
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div style={{ textAlign: "center", padding: 16, background: flipped ? "#581a1a" : "#0a3d0a", borderRadius: 8 }}>
            <div style={{ fontSize: "14px", color: "#b3b8c4", marginBottom: 8 }}>
              SEAT FLIP OUTCOME
            </div>
            {flipped ? (
              <span className="badge bad" style={{ fontSize: "24px", fontWeight: "bold" }}>
                SEAT COULD FLIP!
              </span>
            ) : (
              <span className="badge ok" style={{ fontSize: "24px", fontWeight: "bold" }}>
                SEAT UNCHANGED
              </span>
            )}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>Votes Needed to Flip:</span>
              <span className="badge" style={{ background: "#2a2f3a" }}>{votesNeeded}</span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>Delta vs Threshold:</span>
              <span className={`badge ${worthChasing ? "warn" : "ok"}`}>
                {worthChasing ? "PASSES THRESHOLD" : "BELOW THRESHOLD"}
              </span>
            </div>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>Worth Investigating?</span>
              <span className={`badge ${worthChasing ? "warn" : "ok"}`}>
                {worthChasing ? "HIGH LEVERAGE" : "LOW LEVERAGE"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stations List */}
      {stations.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Affected Stations</h3>
          <div style={{ marginTop: 12 }}>
            <p style={{ fontSize: "12px", color: "#666", marginBottom: 8 }}>
              The following stations are included in this scenario:
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {stations.map((stationId, index) => (
                <div key={stationId} className="card" style={{ background: "#1a1d26", padding: 12 }}>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <strong>Station #{index + 1}</strong>
                    <span className="badge" style={{ fontSize: "10px", background: "#2a2f3a" }}>
                      ID: {stationId.slice(0, 8)}...
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#b3b8c4", marginTop: 4, marginBottom: 0 }}>
                    This station's vote counts are being modified in this hypothetical scenario.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legal Considerations */}
      <div className="card" style={{ background: "#2a1a1a" }}>
        <h3 style={{ marginTop: 0 }}>Legal Considerations</h3>
        <ul style={{ marginTop: 0, paddingLeft: "20px" }}>
          {reportData.legalConsiderations.map((item, index) => (
            <li key={index} style={{ fontSize: "12px", color: "#b3b8c4", marginBottom: 4 }}>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="card" style={{ background: "#1a1a1a" }}>
        <h3 style={{ marginTop: 0 }}>Disclaimer</h3>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 0 }}>
          This report is generated from a hypothetical scenario builder for educational
          and organizational purposes only. It does not represent official election results
          and should not be presented as such.
        </p>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 8 }}>
          Use this tool to understand election dynamics and plan investigation strategies.
          For actual legal action, refer to the verified evidence at the station level.
        </p>
      </div>
    </div>
  );
}