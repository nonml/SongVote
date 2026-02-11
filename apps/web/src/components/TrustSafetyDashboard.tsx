import React from "react";
import {
  calculateUserRiskScore,
  shouldTakeAction,
  DEFAULT_MIRRORS,
  getBestMirror,
  getMirrorSyncStatus,
  type AbuseReport,
  type MirrorNode,
} from "../lib/trustSafety";

interface TrustSafetyProps {
  userSubmissions?: Array<{ created_at: string; station_id: string }>;
  custodyEvents?: Array<{ created_at: string; event_type: string }>;
  incidents?: Array<{ created_at: string; incident_type: string }>;
  abuseReports?: AbuseReport[];
  onReportAbuse?: (report: AbuseReport) => void;
}

export default function TrustSafetyDashboard({
  userSubmissions = [],
  custodyEvents = [],
  incidents = [],
  abuseReports = [],
  onReportAbuse,
}: TrustSafetyProps) {
  // Calculate user risk score
  const riskScore = calculateUserRiskScore(userSubmissions, custodyEvents, incidents);
  const actionInfo = shouldTakeAction(riskScore);

  // Mirror status
  const mirrorStatus = getMirrorSyncStatus(DEFAULT_MIRRORS);
  const bestMirror = getBestMirror(DEFAULT_MIRRORS);

  // Risk level badge color
  const getRiskBadgeColor = (score: number) => {
    if (score >= 70) return "bad";
    if (score >= 50) return "warn";
    if (score >= 30) return "ok";
    return "ok";
  };

  const riskLabel = riskScore >= 70 ? "Critical" : riskScore >= 50 ? "Elevated" : riskScore >= 30 ? "Elevated (Low)" : "Normal";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Trust & Safety Dashboard</h2>
        <p style={{ marginTop: 0, fontSize: "12px", color: "#666" }}>
          Anti-abuse monitoring and multi-mirror system status
        </p>
      </div>

      {/* User Risk Assessment */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>User Risk Assessment</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 999,
                background: riskScore >= 70 ? "#581a1a" : riskScore >= 50 ? "#584a1a" : "#0a3d0a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: "bold",
                color: "#fff",
              }}
            >
              {riskScore}%
            </div>
            <small style={{ display: "block", marginTop: 8, color: "#666" }}>Risk Score</small>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>
              Risk Level: <span className={`badge ${getRiskBadgeColor(riskScore)}`}>{riskLabel}</span>
            </div>
            <p style={{ fontSize: "12px", color: "#b3b8c4", marginTop: 8, marginBottom: 0 }}>
              Based on submission frequency, station diversity, and report patterns.
            </p>
            {actionInfo.needsReview && (
              <div
                className="card"
                style={{ marginTop: 8, background: riskScore >= 50 ? "#2a1a1a" : "#1a2a1a" }}
              >
                <div style={{ fontSize: "12px", fontWeight: "bold" }}>
                  {riskScore >= 50 ? "Review Required" : "Monitor Activity"}
                </div>
                <p style={{ fontSize: "12px", color: "#b3b8c4", marginTop: 4, marginBottom: 0 }}>
                  {riskScore >= 70
                    ? "High-risk activity detected. Temporary block recommended."
                    : "Unusual activity pattern. Continue monitoring."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Risk breakdown */}
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          <div className="card" style={{ background: "#1a1d26" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Submissions (last hour)</span>
              <span className="badge">{userSubmissions.length}</span>
            </div>
            <small style={{ color: "#666", fontSize: "10px" }}>
              Threshold: {actionInfo.needsBlock ? "Exceeded" : "Within limit"}
            </small>
          </div>
          <div className="card" style={{ background: "#1a1d26" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Unique Stations</span>
              <span className="badge">{new Set(userSubmissions.map(s => s.station_id)).size}</span>
            </div>
            <small style={{ color: "#666", fontSize: "10px" }}>
              Suspicious if many stations with few submissions
            </small>
          </div>
          <div className="card" style={{ background: "#1a1d26" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Custody/Incident Reports</span>
              <span className="badge">{custodyEvents.length + incidents.length}</span>
            </div>
            <small style={{ color: "#666", fontSize: "10px" }}>
              High counts may indicate trolling
            </small>
          </div>
        </div>
      </div>

      {/* Multi-Mirror Status */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Multi-Mirror System Status</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12 }}>
          <div
            style={{
              textAlign: "center",
              padding: "12px 16px",
              background:
                mirrorStatus.overallHealth === "healthy"
                  ? "#0a3d0a"
                  : mirrorStatus.overallHealth === "degraded"
                  ? "#584a1a"
                  : "#581a1a",
              borderRadius: 8,
              flex: 1,
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>
              {mirrorStatus.overallHealth.toUpperCase()}
            </div>
            <div style={{ fontSize: "12px", color: "#b3b8c4" }}>
              {mirrorStatus.active} / {mirrorStatus.total} mirrors active
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: "bold" }}>Best Mirror:</div>
            <div style={{ fontSize: "12px", color: "#b3b8c4" }}>
              {bestMirror ? bestMirror.region : "None available"}
            </div>
            <small style={{ color: "#666" }}>
              {bestMirror?.url}
            </small>
          </div>
        </div>

        {/* Mirror list */}
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {DEFAULT_MIRRORS.map(mirror => (
            <div key={mirror.id} className="card" style={{ background: "#1a1d26" }}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{mirror.id}</strong>
                  <span
                    className={`badge ${
                      mirror.status === "active"
                        ? "ok"
                        : mirror.status === "degraded"
                        ? "warn"
                        : "bad"
                    }`}
                    style={{ marginLeft: 8 }}
                  >
                    {mirror.status}
                  </span>
                </div>
                <small style={{ color: "#666" }}>{mirror.region}</small>
              </div>
              <div style={{ fontSize: "10px", color: "#888", marginTop: 4 }}>
                {mirror.url}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      {abuseReports.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Recent Abuse Reports</h3>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            {abuseReports.map(report => (
              <div key={report.id} className="card" style={{ background: "#1a1d26" }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span
                      className={`badge ${
                        report.status === "open"
                          ? "warn"
                          : report.status === "action_taken"
                          ? "ok"
                          : "bad"
                      }`}
                      style={{ marginRight: 8 }}
                    >
                      {report.status}
                    </span>
                    <strong>{report.type}</strong>
                  </div>
                  <small style={{ color: "#666" }}>{new Date(report.created_at).toLocaleDateString()}</small>
                </div>
                {report.content_summary && (
                  <p style={{ fontSize: "12px", color: "#b3b8c4", marginTop: 4, marginBottom: 0 }}>
                    {report.content_summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reporting Form */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Report Abuse</h3>
        <form
          onSubmit={e => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);
            const report: AbuseReport = {
              id: crypto.randomUUID(),
              type: (formData.get("type") as any) || "other",
              reporter_id: "user_" + crypto.randomUUID().slice(0, 8),
              content_summary: String(formData.get("summary") || ""),
              evidence_keys: [],
              created_at: new Date().toISOString(),
              status: "open",
            };
            if (onReportAbuse) {
              onReportAbuse(report);
              alert("Abuse report submitted");
              form.reset();
            }
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label>Report Type</label>
              <select name="type" className="input" defaultValue="other">
                <option value="spam">Spam / Repeated Submissions</option>
                <option value="trolling">Trolling / Intentional Misreporting</option>
                <option value="harassment">Harassment / Threats</option>
                <option value="misinformation">Misinformation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label>Content Summary</label>
              <textarea name="summary" className="input" rows={3} placeholder="Describe the abusive content..." />
            </div>
            <button type="submit" className="btn">
              Submit Report
            </button>
          </div>
        </form>
      </div>

      {/* Disclaimer */}
      <div className="card" style={{ background: "#1a1a1a" }}>
        <h3 style={{ marginTop: 0 }}>System Disclaimer</h3>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 0 }}>
          This Trust & Safety dashboard monitors for potential abuse patterns.
          Risk scores are calculated automatically based on activity patterns.
          Human review is recommended before taking enforcement actions.
        </p>
      </div>
    </div>
  );
}