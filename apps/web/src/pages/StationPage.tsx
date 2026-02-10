import React from "react";
import { useParams } from "react-router-dom";
import { fetchStationEvidence, fetchLegalKit } from "../lib/api";

export default function StationPage() {
  const { stationId } = useParams<{ stationId: string }>();
  const [evidence, setEvidence] = React.useState<any>(null);
  const [legalKit, setLegalKit] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

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
    // Also fetch legal kit
    fetchLegalKit(stationId).then((kit) => setLegalKit(kit));
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

      {/* Legal Kit Export */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Legal Kit Export ⚖️</h3>
        <p style={{ fontSize: "14px", marginTop: 0 }}>
          Download structured evidence for legal action. Includes station info, all evidence photos,
          verification tallies, incident reports, custody events, and audit logs with SHA-256 hashes.
        </p>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" disabled={exporting || !legalKit} onClick={exportLegalKit}>
            {exporting ? "Generating..." : "Download JSON Evidence"}
          </button>
          <button className="btn secondary" disabled={!legalKit} onClick={exportZip}>
            {exporting ? "Compressing..." : "Download ZIP (Photos + JSON)"}
          </button>
        </div>
        {legalKit && (
          <div style={{ marginTop: 12, fontSize: "12px", color: "#666" }}>
            <strong>Generated:</strong> {legalKit.generated_at}<br />
            <strong>Station:</strong> {legalKit.station_info?.station_number} - {legalKit.station_info?.location_name}<br />
            <strong>Submissions:</strong> {legalKit.submissions?.length || 0}<br />
            <strong>Incidents:</strong> {legalKit.incidents?.length || 0}<br />
            <strong>Custody Events:</strong> {legalKit.custody_events?.length || 0}
          </div>
        )}
      </div>
    </div>
  );

  // Export functions
  function exportLegalKit() {
    if (!legalKit) return;
    setExporting(true);
    const jsonStr = JSON.stringify(legalKit, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-${legalKit.station_info?.station_number}-${legalKit.station_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  async function exportZip() {
    if (!legalKit) return;
    setExporting(true);
    try {
      // Import JSZip dynamically to avoid bundling issues
      const JSZip = await import("jszip");
      const zip = new JSZip.default();

      // Add station info JSON
      zip.file("station_info.json", JSON.stringify(legalKit.station_info, null, 2));

      // Add submissions JSON
      zip.file("submissions.json", JSON.stringify(legalKit.submissions, null, 2));

      // Add incidents JSON
      zip.file("incidents.json", JSON.stringify(legalKit.incidents, null, 2));

      // Add custody events JSON
      zip.file("custody_events.json", JSON.stringify(legalKit.custody_events, null, 2));

      // Add verification logs JSON
      zip.file("verification_logs.json", JSON.stringify(legalKit.verification_logs, null, 2));

      // Add photo hashes JSON
      zip.file("photo_hashes.json", JSON.stringify(legalKit.photo_hashes, null, 2));

      // Add "where to file" guidance text
      const guidanceText = `THAI ELECTION EVIDENCE LEGAL KIT
============================

This packet contains evidence collected for station ${legalKit.station_info?.station_number}
located at ${legalKit.station_info?.location_name}.

WHERE TO FILE:
1. Election Commission (ECT) - Original complaint filing
2. Office of the Attorney General - Criminal investigation
3. Local District Office - Preliminary report
4. Media outlets - Public transparency (redacted)

NEXT STEPS:
1. Review all evidence in this packet
2. Complete the "Evidence Index" spreadsheet
3. File formal complaints with supporting documentation
4. Follow up with authorities for investigation status

DISCLAIMER: This is citizen-collected evidence. For legal admissibility,
ensure chain-of-custody documentation is maintained.

Generated: ${legalKit.generated_at}
Station ID: ${legalKit.station_info?.station_id}
`;

      zip.file("WHERE_TO_FILE.txt", guidanceText);

      // Generate and download ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evidence-kit-${legalKit.station_info?.station_number}-${legalKit.station_id}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Failed to create ZIP: " + e.message);
    } finally {
      setExporting(false);
    }
  }
}