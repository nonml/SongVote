import React from "react";

export default function Home() {
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Thai Election Evidence Layer</h2>
      <p style={{ marginTop: 0 }}>
        Evidence-first parallel record for the next MP general election: capture posted <b>S.S. 5/18</b> forms, verify,
        aggregate, and document incidents & chain-of-custody issues.
      </p>
      <hr />
      <div className="row">
        <div className="card" style={{ flex: 1, minWidth: 240 }}>
          <h3 style={{ marginTop: 0 }}>Use it on election night 📸</h3>
          <ul>
            <li>Capture S.S. 5/18 (constituency + party-list)</li>
            <li>Enter checksums (total valid + top score)</li>
            <li>Submit (or queue offline)</li>
          </ul>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 240 }}>
          <h3 style={{ marginTop: 0 }}>Report issues 🧾</h3>
          <ul>
            <li>Counting obstructed / intimidation</li>
            <li>Missing or removed posted forms</li>
            <li>Seal/box custody anomalies</li>
          </ul>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 240 }}>
          <h3 style={{ marginTop: 0 }}>Understand impact 🎮</h3>
          <ul>
            <li>See if a station correction could flip a seat</li>
            <li>“Votes needed” threshold</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
