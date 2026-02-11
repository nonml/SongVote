import React from "react";
import { fetchPublicSnapshot, type PublicSnapshot } from "../lib/api";
import { Link } from "react-router-dom";

export default function PublicBoard() {
  const [snapshot, setSnapshot] = React.useState<PublicSnapshot | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [includePreliminary, setIncludePreliminary] = React.useState(false);

  React.useEffect(() => {
    fetchPublicSnapshot(includePreliminary).then(
      (data) => {
        setSnapshot(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, [includePreliminary]);

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Public Election Board</h2>
        <p>Loading verified election data...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Public Election Board</h2>
        <p style={{ color: "#d73a49" }}>Failed to load data: {error || "Unknown error"}</p>
        <p>This is a DDoS-resilient public dashboard. Data is served from cached snapshots.</p>
      </div>
    );
  }

  const { metadata, provinces, province_stats, stations } = snapshot;

  // Group stations by province
  const stationsByProvince = provinces.map((province) => {
    const provinceStations = stations.filter((s) => {
      // Find constituency for this station
      const stationConstituency = s; // station already has constituency_id
      return true; // For now, just show all stations
    });
    const provinceStats = province_stats.find((ps) => ps.province_id === province.id);
    return {
      province,
      stations: provinceStations,
      stats: provinceStats,
    };
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Public Election Board</h2>
        <p style={{ marginTop: 0 }}>
          Verified election evidence from citizen observers. Data is updated every 60 seconds.
        </p>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: "24px", fontWeight: "bold" }}>{metadata.total_stations}</div>
            <small>Total Stations</small>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2ea043" }}>
              {metadata.verified_submissions}
            </div>
            <small>Verified Submissions</small>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#d29922" }}>
              {metadata.pending_review}
            </div>
            <small>Pending Review</small>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#d73a49" }}>
              {metadata.disputed_count}
            </div>
            <small>Disputed</small>
          </div>
        </div>
        <p style={{ marginTop: 8, fontSize: "12px", color: "#666" }}>
          Last updated: {metadata.last_updated || "N/A"} | Generated: {metadata.generated_at}
        </p>
      </div>

      {/* Province Coverage */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Coverage by Province</h3>
        <div className="row" style={{ flexWrap: "wrap" }}>
          {province_stats.map((ps) => (
            <div className="card" key={ps.province_id} style={{ flex: "1 1 200px", minWidth: 200 }}>
              <div style={{ fontWeight: "bold" }}>{ps.province_name}</div>
              <div style={{ fontSize: "12px", color: "#b3b8c4" }}>
                {ps.verified_stations} / {ps.total_stations} stations verified
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 8,
                  background: "#22252e",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${ps.coverage_percent}%`,
                    height: "100%",
                    background: "#2ea043",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <small style={{ display: "block", marginTop: 4 }}>{ps.coverage_percent}% coverage</small>
            </div>
          ))}
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0 }}>Station Details</h3>
          <div className="row" style={{ gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={includePreliminary}
                onChange={e => setIncludePreliminary(e.target.checked)}
              />
              Include preliminary/contested
            </label>
            <small>
              Status:{" "}
              <span className="badge ok">Verified</span> |{" "}
              <span className="badge warn">Pending</span> |{" "}
              <span className="badge bad">Disputed</span>
            </small>
          </div>
        </div>
      </div>

      {/* Detailed Station List */}
      <div className="card">
        <div style={{ marginTop: 12 }}>
          {stations.map((station) => {
            // Filter submissions based on toggle
            const submissionsToShow = includePreliminary
              ? station.submissions
              : station.submissions.filter(s =>
                  s.status_constituency === "verified" || s.status_partylist === "verified"
                );
            if (submissionsToShow.length === 0) return null;

            return (
              <div
                key={station.station_id}
                className="card"
                style={{ marginBottom: 8, background: "#12141a" }}
              >
                <Link to={`/station/${station.station_id}`}>
                  <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>Station #{station.station_number}</strong>
                      {station.location_name && (
                        <small style={{ marginLeft: 8 }}>{station.location_name}</small>
                      )}
                    </div>
                    <small style={{ color: "#b3b8c4" }}>{station.subdistrict_name}</small>
                  </div>
                </Link>

                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {submissionsToShow.map((sub) => (
                    <div key={sub.submission_id} className="card" style={{ padding: "4px 8px" }}>
                      <div style={{ fontSize: "10px" }}>#{sub.submission_id.slice(-6)}</div>
                      <div style={{ fontSize: "11px" }}>
                        <span
                          className={`badge ${
                            sub.status_constituency === "verified"
                              ? "ok"
                              : sub.status_constituency === "pending"
                              ? "warn"
                              : sub.status_constituency === "disputed"
                              ? "bad"
                              : ""
                          }`}
                        >
                          C:{sub.status_constituency.substring(0, 3).toUpperCase()}
                        </span>
                        <span
                          className={`badge ${
                            sub.status_partylist === "verified"
                              ? "ok"
                              : sub.status_partylist === "pending"
                              ? "warn"
                              : sub.status_partylist === "disputed"
                              ? "bad"
                              : ""
                          }`}
                          style={{ marginLeft: 4 }}
                        >
                          P:{sub.status_partylist.substring(0, 3).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>About this data</h3>
        <ul style={{ marginTop: 0 }}>
          <li>Every verified number links to an evidence photo</li>
          <li>Disputed/missing stations are visible (no silent failures)</li>
          <li>Uploaders are not identified (privacy-first)</li>
          <li>Data is cached for DDoS resilience</li>
        </ul>
        <small>
          This is an unofficial citizen transparency tool. Not affiliated with the Election
          Commission of Thailand.
        </small>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Learn More</h3>
        <Link to="/methodology" className="btn secondary" style={{ marginTop: 8 }}>
          Read Our Methodology
        </Link>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 8 }}>
          Understanding how verification works and what "Verified" means.
        </p>
      </div>
    </div>
  );
}