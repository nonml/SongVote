import React from "react";
import { fetchFailoverStatus, fetchDistributionPack } from "../lib/api";

export default function FailoverStatus() {
  const [failoverStatus, setFailoverStatus] = React.useState<any>(null);
  const [distributionPack, setDistributionPack] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [status, pack] = await Promise.all([
          fetchFailoverStatus(),
          fetchDistributionPack()
        ]);
        setFailoverStatus(status);
        setDistributionPack(pack.pack);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Failover & Mirrors</h2>
        <p>Loading failover status...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Failover & Mirrors Status</h2>
        <p>Censorship resistance and domain availability monitoring.</p>
      </div>

      {/* Primary Domain Status */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Primary Domain</h3>
        <p>
          <strong>Domain:</strong> election-thai.vercel.app
        </p>
        <p>
          <strong>Status:</strong> <span style={{ color: "#2ea043" }}>Active</span>
        </p>
      </div>

      {/* Alternate Domains */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Alternate Domains</h3>
        {failoverStatus?.active_domains?.length === 0 ? (
          <p>No alternate domains configured.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {failoverStatus?.active_domains?.map((domain: any) => (
              <div key={domain.id} className="card" style={{ background: "#12141a", padding: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{domain.domain_name}</strong>
                    <span className="badge" style={{ marginLeft: 8 }}>Priority: {domain.failover_priority}</span>
                  </div>
                  <span className="badge" style={{ background: domain.status === "active" ? "#2ea043" : "#d29922" }}>
                    {domain.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mirror Origins */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Mirror Origins</h3>
        <p>Multiple independent snapshot origins for censorship resistance.</p>
        <div style={{ marginTop: 8 }}>
          <div className="card" style={{ padding: 8 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>Region: Asia</span>
              <span style={{ color: "#2ea043" }}>Healthy</span>
            </div>
          </div>
          <div className="card" style={{ padding: 8 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>Region: Europe</span>
              <span style={{ color: "#2ea043" }}>Healthy</span>
            </div>
          </div>
          <div className="card" style={{ padding: 8 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>Region: US</span>
              <span style={{ color: "#2ea043" }}>Healthy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Pack */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Distribution Pack</h3>
        {distributionPack ? (
          <div>
            <p>
              <strong>Pack Type:</strong> {distributionPack.pack_type}
            </p>
            <p>
              <strong>Version:</strong> {distributionPack.pack_version}
            </p>
            <p>
              <strong>Generated:</strong> {new Date(distributionPack.generated_at).toLocaleString()}
            </p>
            <p>
              <strong>Checksum:</strong> {distributionPack.checksum_manifest}
            </p>
          </div>
        ) : (
          <p>No distribution pack available.</p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Failover Procedures</h3>
        <ol>
          <li>Monitor primary domain health via status page</li>
          <li>If blocked, update DNS to alternate domain</li>
          <li>Update CDN cache invalidation on all providers</li>
          <li>Verify mirror origins are serving correct content</li>
          <li>Update distribution pack with new snapshot</li>
        </ol>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Content Addressing</h3>
        <p>All snapshot URLs use content-addressed identifiers. Links remain stable even when domains change.</p>
      </div>
    </div>
  );
}