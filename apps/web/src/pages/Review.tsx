import React from "react";

export default function Review() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Reviewer Console (MVP stub) ✅</h2>
      <p style={{ marginTop: 0 }}>
        Wire this to your worker endpoints: <span className="badge">GET /api/v1/admin/queue/next</span> and <span className="badge">POST /api/v1/admin/tally</span>.
      </p>
      <hr />
      <div className="row">
        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <h3 style={{ marginTop: 0 }}>Evidence</h3>
          <div style={{ border: "1px dashed #2a2f3a", borderRadius: 12, padding: 12 }}>
            <small>Image preview placeholder</small>
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 280 }}>
          <h3 style={{ marginTop: 0 }}>Transcription</h3>
          <label>Sheet type</label>
          <select className="input">
            <option value="constituency">Constituency</option>
            <option value="partylist">Party-list</option>
          </select>
          <label style={{ marginTop: 8, display:"block" }}>Score map (JSON)</label>
          <textarea className="input" rows={10} defaultValue={'{ "1": 300, "2": 50, "invalid": 5, "no_vote": 10 }'} />
          <div style={{ display:"flex", gap: 10, justifyContent:"flex-end", marginTop: 10 }}>
            <button className="btn secondary">Reject (quality)</button>
            <button className="btn">Verify</button>
          </div>
        </div>
      </div>
      <small>Trusted 1.5: verification passes when reviewer math reconciles and matches user checksum.</small>
    </div>
  );
}
