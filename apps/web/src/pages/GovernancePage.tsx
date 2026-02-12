import React from "react";
import { fetchGovernanceContent } from "../lib/api";

export default function GovernancePage() {
  const [content, setContent] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchGovernanceContent().then(setContent).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Governance & Credibility</h2>
        <p>Loading governance information...</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Governance & Credibility</h2>
        <p>Failed to load governance information.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Mission & Values</h2>
        <div style={{ marginTop: 16 }}>
          <h3>{content.mission?.title || "Our Mission"}</h3>
          <p>{content.mission?.content}</p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Non-Partisan Stance</h2>
        <div style={{ marginTop: 16 }}>
          <h3>{content.non_partisan?.title || "Our Stance"}</h3>
          <p>{content.non_partisan?.content}</p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Methodology</h2>
        <div style={{ marginTop: 16 }}>
          <h3>{content.methodology?.title || "Our Methodology"}</h3>
          <p>{content.methodology?.content}</p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Funding Disclosure</h2>
        <div style={{ marginTop: 16 }}>
          <h3>{content.funding?.title || "Funding"}</h3>
          <p>{content.funding?.content}</p>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Last updated: {content.funding?.last_updated_at || "N/A"}
          </p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Commitment to Transparency</h3>
        <ul>
          <li>All verification methods are published and auditable</li>
          <li>All data sources are documented with provenance</li>
          <li>Correction policies are publicly available</li>
          <li>Independent verification hooks are available</li>
        </ul>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Disclaimer</h3>
        <p style={{ fontSize: "12px", color: "#666" }}>
          This is an unofficial citizen transparency tool. We are not affiliated with the Election
          Commission of Thailand. All data is collected from publicly available sources and citizen
          observation. This tool is provided "as is" without warranty of any kind.
        </p>
      </div>
    </div>
  );
}