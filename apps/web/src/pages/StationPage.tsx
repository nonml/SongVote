import React from "react";
import { useParams } from "react-router-dom";
import { fetchStationEvidence } from "../lib/api";

export default function StationPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const [evidence, setEvidence] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!stationId) return;
    fetchStationEvidence(stationId).then(
      (data) => {
        setEvidence(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, [stationId]);

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Station #{stationId?.slice(-6)}</h2>
        <p>Loading evidence...</p>
      </div>
    );
  }

  if (error || !evidence) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Station #{stationId?.slice(-6)}</h2>
        <p style={{ color: "#d73a49" }}>Failed to load: {error || "Unknown error"}</p>
      </div>
    );
  }

  const { submissions, incidents, custody_events } = evidence;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Station #{evidence.station_id?.slice(-6)}</h2>
        <p style={{ marginTop: 0 }}>Public evidence page · No PII exposed</p>
      </div>

      {/* Submissions / Evidence */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Evidence Photos</h3>
        {submissions.length === 0 ? (
          <p>No evidence uploaded for this station yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {submissions.map((sub: any) => (
              <div key={sub.id} className="card" style={{ background: "#12141a" }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <strong>Submission #{sub.id?.slice(-6)}</strong>
                    <small style={{ marginLeft: 8, color: "#666" }}>
                      {new Date(sub.created_at).toLocaleString()}
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span
                      className={`badge ${
                        sub.status_constituency === "verified" ? "ok" : sub.status_constituency === "pending" ? "warn" : sub.status_constituency === "disputed" ? "bad" : ""
                      }`}
                    >
                      C:{sub.status_constituency.substring(0, 3).toUpperCase()}
                    </span>
                    <span
                      className={`badge ${
                        sub.status_partylist === "verified" ? "ok" : sub.status_partylist === "pending" ? "warn" : sub.status_partylist === "disputed" ? "bad" : ""
                      }`}
                    >
                      P:{sub.status_partylist.substring(0, 3).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  {sub.photo_constituency_key ? (
                    <div style={{ border: "1px solid #333", borderRadius: 8, padding: 8 }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>Constituency Sheet</div>
                      <div
                        style={{
                          marginTop: 8,
                          height: 120,
                          background: "linear-gradient(135deg, #1a1d26 0%, #0b0c10 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 4
                        }}
                      >
                        <small style={{ color: "#666" }}>
                          [Photo evidence available]
                          <br />
                          <span style={{ fontSize: "10px" }}>Key: {sub.photo_constituency_key}</span>
                        </small>
                      </div>
                    </div>
                  ) : null}
                  {sub.photo_partylist_key ? (
                    <div style={{ border: "1px solid #333", borderRadius: 8, padding: 8, marginTop: 8 }}>
                      <div style={{ fontSize: "12px", color: "#666" }}>Party-list Sheet</div>
                      <div
                        style={{
                          marginTop: 8,
                          height: 120,
                          background: "linear-gradient(135deg, #1a1d26 0%, #0b0c10 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 4
                        }}
                      >
                        <small style={{ color: "#666" }}>
                          [Photo evidence available]
                          <br />
                          <span style={{ fontSize: "10px" }}>Key: {sub.photo_partylist_key}</span>
                        </small>
                      </div>
                    </div>
                  ) : null}
                </div>

                {sub.checksum_constituency_total !== null && (
                  <div style={{ marginTop: 8, fontSize: "12px" }}>
                    <strong>Checksum (Constituency): </strong> {sub.checksum_constituency_total}
                  </div>
                )}
                {sub.checksum_partylist_total !== null && (
                  <div style={{ fontSize: "12px" }}>
                    <strong>Checksum (Party-list): </strong> {sub.checksum_partylist_total}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incidents */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Incident Reports</h3>
        {incidents.length === 0 ? (
          <p>No incident reports for this station.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {incidents.map((inc: any) => (
              <div key={inc.id} className="card" style={{ background: "#1a1d26" }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{inc.incident_type.replace(/_/g, " ")}</strong>
                  <small style={{ color: "#666" }}>{new Date(inc.created_at).toLocaleString()}</small>
                </div>
                {inc.occurred_at && (
                  <div style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
                    Occurred: {new Date(inc.occurred_at).toLocaleString()}
                  </div>
                )}
                {inc.description && (
                  <p style={{ marginTop: 8, marginBottom: 0, fontSize: "14px" }}>{inc.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custody Events */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Custody Events</h3>
        {custody_events.length === 0 ? (
          <p>No custody events recorded for this station.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {custody_events.map((ce: any) => (
              <div key={ce.id} className="card" style={{ background: "#1a1d26" }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{ce.event_type.replace(/_/g, " ")}</strong>
                  <small style={{ color: "#666" }}>{new Date(ce.created_at).toLocaleString()}</small>
                </div>
                {ce.occurred_at && (
                  <div style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
                    Occurred: {new Date(ce.occurred_at).toLocaleString()}
                  </div>
                )}
                {(ce.box_id || ce.seal_id) && (
                  <div style={{ fontSize: "12px", marginTop: 4 }}>
                    {ce.box_id && <span>Box: {ce.box_id} </span>}
                    {ce.seal_id && <span>Seal: {ce.seal_id}</span>}
                  </div>
                )}
                {ce.notes && (
                  <p style={{ marginTop: 8, marginBottom: 0, fontSize: "14px" }}>{ce.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>About this page</h3>
        <ul style={{ marginTop: 0 }}>
          <li>This is a public evidence page · No uploader identity exposed</li>
          <li>All verified numbers link to evidence photos</li>
          <li>Disputed/missing stations are visible</li>
        </ul>
      </div>
    </div>
  );
}