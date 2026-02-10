import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

// Decode URL state to simulator values
function decodeUrlState(searchParams: URLSearchParams): { margin: number; delta: number } {
  const marginStr = searchParams.get("margin");
  const deltaStr = searchParams.get("delta");
  const margin = marginStr ? parseInt(marginStr, 10) : 35;
  const delta = deltaStr ? parseInt(deltaStr, 10) : 0;
  return { margin: isNaN(margin) ? 35 : margin, delta: isNaN(delta) ? 0 : delta };
}

// Encode simulator values to URL state
function encodeUrlState(params: { margin: number; delta: number }): string {
  const searchParams = new URLSearchParams();
  if (params.margin !== 35) searchParams.set("margin", params.margin.toString());
  if (params.delta !== 0) searchParams.set("delta", params.delta.toString());
  return searchParams.toString();
}

export default function Simulator() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { margin: initialMargin, delta: initialDelta } = React.useMemo(
    () => decodeUrlState(searchParams),
    [searchParams]
  );

  const [margin, setMargin] = React.useState<number>(initialMargin);
  const [delta, setDelta] = React.useState<number>(initialDelta);

  const flipped = delta >= Math.ceil(margin / 2);

  // Update URL when values change
  React.useEffect(() => {
    const state = encodeUrlState({ margin, delta });
    const newUrl = state ? `/simulator?${state}` : "/simulator";
    navigate(newUrl, { replace: true });
  }, [margin, delta, navigate]);

  const worthChasing = delta >= Math.ceil(margin / 2);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Impact Sandbox (Constituency flip) 🎮</h2>
      <p style={{ marginTop: 0 }}>Quick "worth chasing?" indicator. This MVP model is constituency-only.</p>
      <hr />
      <div className="row">
        <div style={{ flex: 1, minWidth: 260 }}>
          <label>Current margin (winner − runner-up)</label>
          <input
            className="input"
            type="number"
            value={margin}
            onChange={e => setMargin(Number(e.target.value))}
          />
          <small>Example: margin 35 means winner leads by 35 votes.</small>
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label>Hypothetical correction (votes shifted)</label>
          <input
            className="input"
            type="number"
            value={delta}
            onChange={e => setDelta(Number(e.target.value))}
          />
          <small>Example: if 20 votes were misallocated, delta=20.</small>
        </div>
      </div>
      <hr />
      <div className="card">
        <div style={{ fontSize: "14px", marginBottom: 8 }}>Result:</div>
        {flipped ? (
          <span className="badge bad" style={{ fontSize: "16px" }}>Seat could flip!</span>
        ) : (
          <span className="badge ok" style={{ fontSize: "16px" }}>Seat likely unchanged</span>
        )}
        <p style={{ marginBottom: 0, marginTop: 8 }}>
          Votes needed to flip ≈ <b>{Math.ceil(margin / 2)}</b> (rule-of-thumb).
        </p>
      </div>
      <div className="card" style={{ marginTop: 12 }}>
        <strong>Worth chasing? </strong>
        {worthChasing ? (
          <span className="badge warn">High leverage - delta &gt;= margin</span>
        ) : (
          <span className="badge" style={{ background: "#2a2f3a" }}>Low leverage - delta below threshold</span>
        )}
      </div>
      <small>Shareable link with your scenario is available in the URL.</small>
    </div>
  );
}