import React from "react";
import { fetchTransparencyLog } from "../lib/api";

export default function TransparencyLog() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterType, setFilterType] = React.useState("");
  const [filterSeverity, setFilterSeverity] = React.useState("");

  React.useEffect(() => {
    const fetchLogs = async () => {
      try {
        const result = await fetchTransparencyLog(filterType || undefined, filterSeverity || undefined as any);
        setLogs(result);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [filterType, filterSeverity]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#d73a49";
      case "high":
        return "#d29922";
      case "warning":
        return "#d29922";
      case "medium":
        return "#b3b8c4";
      default:
        return "#2ea043";
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Transparency Log</h2>
        <p>Loading transparency log...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Transparency Log</h2>
        <p>System events affecting operations and governance.</p>
      </div>

      {/* Filters */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Filters</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: 8 }}
          >
            <option value="">All Event Types</option>
            <option value="read_only_enabled">Read-Only Enabled</option>
            <option value="read_only_disabled">Read-Only Disabled</option>
            <option value="snapshot_stale">Snapshot Stale</option>
            <option value="moderation_action">Moderation Action</option>
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            style={{ padding: 8 }}
          >
            <option value="">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Logs List */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Log Entries</h3>
        {logs.length === 0 ? (
          <p>No log entries found.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {logs.map((log) => (
              <div
                key={log.id}
                className="card"
                style={{ background: "#12141a", borderLeft: `4px solid ${getSeverityColor(log.severity)}` }}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{log.event_type}</strong>
                    <span className="badge" style={{ marginLeft: 8, background: getSeverityColor(log.severity) }}>
                      {log.severity.toUpperCase()}
                    </span>
                  </div>
                  <small>{new Date(log.logged_at).toLocaleString()}</small>
                </div>
                <p style={{ marginTop: 8 }}>{log.details}</p>
                {log.affected_count > 0 && (
                  <p style={{ fontSize: "12px", color: "#666" }}>
                    Affected: {log.affected_count} items
                  </p>
                )}
                {log.action_taken && (
                  <p style={{ fontSize: "12px", color: "#2ea043" }}>
                    Action: {log.action_taken}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>About this Log</h3>
        <ul>
          <li>Records all governance-affecting system events</li>
          <li>Includes read-only mode toggles, snapshot issues, moderation actions</li>
          <li>Available for public audit and transparency verification</li>
        </ul>
      </div>
    </div>
  );
}