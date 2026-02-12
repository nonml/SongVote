import React from "react";
import { fetchPartnerSnapshots, createBulkExport, fetchApiVersion } from "../lib/api";

export default function PartnerAPI() {
  const [snapshots, setSnapshots] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [token, setToken] = React.useState("");
  const [exportType, setExportType] = React.useState<"national" | "province" | "constituency">("national");
  const [exportFormat, setExportFormat] = React.useState<"json" | "csv">("json");
  const [exportResult, setExportResult] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const version = await fetchApiVersion();
        console.log("API Version:", version);
        const result = await fetchPartnerSnapshots(token || undefined);
        setSnapshots(result.snapshots || []);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleExport = async () => {
    try {
      const result = await createBulkExport(exportType, exportFormat);
      setExportResult(result);
    } catch (err) {
      alert("Export failed: " + err);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Partner API</h2>
        <p>Loading partner data...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Partner API Access</h2>
        <p>Access verified election data for media, researchers, and partners.</p>
      </div>

      {/* API Version Info */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>API Information</h3>
        <p>Current Version: v1</p>
        <p>
          All endpoints are documented at /api/v1/* with stable schemas. Versioning follows
          semantic versioning principles.
        </p>
      </div>

      {/* Partner Token Input */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Partner Authentication</h3>
        <p>Enter your partner token to access partner endpoints.</p>
        <div style={{ display: "flex", gap: 8, maxWidth: 500 }}>
          <input
            type="text"
            placeholder="Partner token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            style={{ flex: 1, padding: 8 }}
          />
          <button onClick={() => setLoading(true)} className="btn secondary" style={{ padding: "8px 16px" }}>
            Fetch
          </button>
        </div>
      </div>

      {/* Snapshots */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Latest Snapshots</h3>
        {snapshots.length === 0 ? (
          <p>No snapshots available.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {snapshots.map((snapshot) => (
              <div key={snapshot.id} className="card" style={{ background: "#12141a", padding: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>Snapshot v{snapshot.snapshot_version}</strong>
                    <span className="badge" style={{ marginLeft: 8 }}>ID: {snapshot.snapshot_id}</span>
                  </div>
                  <small>{new Date(snapshot.published_at).toLocaleString()}</small>
                </div>
                <p style={{ fontSize: "12px", color: "#666" }}>
                  Hash: {snapshot.data_hash.slice(0, 16)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Export */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Bulk Export</h3>
        <div style={{ display: "grid", gap: 8, maxWidth: 500 }}>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value as any)}
            style={{ padding: 8 }}
          >
            <option value="national">National</option>
            <option value="province">Province</option>
            <option value="constituency">Constituency</option>
          </select>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            style={{ padding: 8 }}
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
          <button onClick={handleExport} className="btn primary" style={{ padding: "8px 16px" }}>
            Generate Export
          </button>
        </div>

        {exportResult && (
          <div style={{ marginTop: 16, padding: 16, background: "#f6f8fa", borderRadius: 6 }}>
            <h4 style={{ marginTop: 0 }}>Export Generated</h4>
            <p>Export ID: {exportResult.export_id}</p>
            <p>Hash: {exportResult.provenance.dataset_hash}</p>
            <p>Timestamp: {exportResult.provenance.build_timestamp}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Usage Guidelines</h3>
        <ul>
          <li>Use CDN-cacheable endpoints for static data</li>
          <li>Respect rate limits (1000 requests/hour for partners)</li>
          <li>Include partner token in X-Partner-Token header</li>
          <li>Report issues through official channels only</li>
        </ul>
      </div>
    </div>
  );
}