import React from "react";

export default function Simulator() {
  const [margin, setMargin] = React.useState<number>(35);
  const [delta, setDelta] = React.useState<number>(0);
  const flipped = delta >= Math.ceil(margin / 2);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Impact Sandbox (Constituency flip) 🎮</h2>
      <p style={{ marginTop: 0 }}>Quick “worth chasing?” indicator. This MVP model is constituency-only.</p>
      <hr />
      <div className="row">
        <div style={{ flex: 1, minWidth: 260 }}>
          <label>Current margin (winner − runner-up)</label>
          <input className="input" type="number" value={margin} onChange={e => setMargin(Number(e.target.value))} />
          <small>Example: margin 35 means winner leads by 35 votes.</small>
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label>Hypothetical correction (votes shifted)</label>
          <input className="input" type="number" value={delta} onChange={e => setDelta(Number(e.target.value))} />
          <small>Example: if 20 votes were misallocated, delta=20.</small>
        </div>
      </div>
      <hr />
      <div className="card">
        Status: {flipped ? <span className="badge bad">Seat could flip</span> : <span className="badge ok">Seat likely unchanged</span>}
        <p style={{ marginBottom: 0 }}>Votes needed to flip ≈ <b>{Math.ceil(margin / 2)}</b> (rule-of-thumb).</p>
      </div>
      <small>Later v1: plug real station-level data + compute exact flip thresholds per constituency.</small>
    </div>
  );
}
