import React from "react";
import { fetchStatusMetrics, type StatusMetrics } from "../lib/api";

export default function StatusPage() {
  const [metrics, setMetrics] = React.useState<StatusMetrics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchStatusMetrics();
        setMetrics(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number | boolean | string): string => {
    if (typeof value === "boolean") {
      return value ? "#d73a49" : "#2ea043";
    }
    if (typeof value === "number") {
      if (value === 0) return "#2ea043";
      if (value < 100) return "#d29922";
      return "#d73a49";
    }
    return "#b3b8c4";
  };

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Status Page</h2>
        <p>Loading system status...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Status Page</h2>
        <p style={{ color: "#d73a49" }}>Failed to load status: {error || "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>System Status</h2>
        <div className="row" style={{ marginTop: 12 }}>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: metrics.uptime > 99 ? "#2ea043" : "#d73a49"
              }}
            >
              {metrics.uptime}%
            </div>
            <small>System Uptime</small>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: metrics.snapshot_freshness_seconds < 60 ? "#2ea043" : "#d29922"
              }}
            >
              {metrics.snapshot_freshness_seconds}s
            </div>
            <small>Snapshot Freshness</small>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: getStatusColor(metrics.read_only_mode)
              }}
            >
              {metrics.read_only_mode ? "READ-ONLY" : "ACTIVE"}
            </div>
            <small>Operation Mode</small>
          </div>
          <div className="card" style={{ flex: 1, minWidth: 180 }}>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: getStatusColor(metrics.queue_depth)
              }}
            >
              {metrics.queue_depth}
            </div>
            <small>Review Queue</small>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Coverage Overview</h3>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <div className="card" style={{ flex: "1 1 200px", minWidth: 200 }}>
            <div style={{ fontWeight: "bold" }}>Verified Stations</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2ea043" }}>
              {metrics.verified_stations.toLocaleString()}
            </div>
            <small>Stations with verified evidence</small>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Read-Only Mode</h3>
        <p>
          {metrics.read_only_mode
            ? "The system is in read-only mode. No new evidence submissions will be processed."
            : "The system is accepting new evidence submissions."}
        </p>
        {metrics.read_only_mode && (
          <div style={{ background: "#f6f8fa", padding: 12, borderRadius: 6 }}>
            <small style={{ color: "#d73a49" }}>
              <strong>Warning:</strong> Read-only mode was enabled for operational reasons. Please
              check the transparency log for details.
            </small>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>About this page</h3>
        <p>
          This status page provides real-time visibility into system operations. Data is updated
          every 30 seconds.
        </p>
        <ul>
          <li><strong>Uptime:</strong> System availability percentage</li>
          <li><strong>Snapshot Freshness:</strong> Time since last snapshot update</li>
          <li><strong>Operation Mode:</strong> Normal vs read-only mode</li>
          <li><strong>Review Queue:</strong> Pending submissions awaiting review</li>
        </ul>
      </div>
    </div>
  );
}