import React from "react";
import { Link } from "react-router-dom";

export default function Methodology() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Methodology & Verification Process</h2>
        <p style={{ marginTop: 0 }}>
          Understanding how election data is verified and made trustworthy.
        </p>
        <div style={{ marginTop: 8 }}>
          <Link to="/public" className="btn secondary">
            Back to Public Board
          </Link>
        </div>
      </div>

      {/* Verification Levels */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Verification Levels</h3>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <div className="card" style={{ background: "#0a3d0a" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#2ea043" }}>
              <span className="badge ok">Verified</span> - Final
            </div>
            <p style={{ marginTop: 8, fontSize: "13px", margin: 0 }}>
              Transcribed by at least two independent reviewers with matching totals.
              Evidence photo is available. Results are considered reliable.
            </p>
          </div>

          <div className="card" style={{ background: "#3d3d0a" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#d29922" }}>
              <span className="badge warn">Pending</span> - Awaiting Review
            </div>
            <p style={{ marginTop: 8, fontSize: "13px", margin: 0 }}>
              Evidence photo uploaded but not yet reviewed. May have checksum but lacks
              human verification. Check back for updates.
            </p>
          </div>

          <div className="card" style={{ background: "#3d0a0a" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#d73a49" }}>
              <span className="badge bad">Disputed</span> - Requires Investigation
            </div>
            <p style={{ marginTop: 8, fontSize: "13px", margin: 0 }}>
              Reviewer identified a problem: checksum mismatch, station header error,
              or conflicting evidence. Needs further investigation before finalization.
            </p>
          </div>

          <div className="card" style={{ background: "#3d1a0a" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#ffab70" }}>
              <span className="badge">Rejected</span> - Low Quality
            </div>
            <p style={{ marginTop: 8, fontSize: "13px", margin: 0 }}>
              Photo quality insufficient for transcription (blur, glare, dark, cropped).
              Not suitable for verification. May be re-submitted if clearer evidence appears.
            </p>
          </div>

          <div className="card" style={{ background: "#1a1a1a" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#8b949e" }}>
              <span className="badge">Missing</span> - No Evidence
            </div>
            <p style={{ marginTop: 8, fontSize: "13px", margin: 0 }}>
              No evidence photo uploaded for this station. May become available later.
            </p>
          </div>
        </div>
      </div>

      {/* The Verification Process */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>The Verification Process</h3>
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>Step 1</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: 4 }}>
              Citizen Observers Upload Evidence
            </div>
            <p style={{ fontSize: "13px", color: "#b3b8c4", marginTop: 4, margin: 0 }}>
              After counting concludes, observers photograph the posted S.S. 5/18 form
              and upload it with checksums (total valid votes, candidate totals).
            </p>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>Step 2</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: 4 }}>
              Automatic Checksum Validation
            </div>
            <p style={{ fontSize: "13px", color: "#b3b8c4", marginTop: 4, margin: 0 }}>
              System validates that uploaded totals match candidate sum. Flags any
              discrepancies for reviewer attention.
            </p>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>Step 3</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: 4 }}>
              Independent Reviewer Transcription
            </div>
            <p style={{ fontSize: "13px", color: "#b3b8c4", marginTop: 4, margin: 0 }}>
              Trained reviewers independently transcribe vote counts from photos.
              Multiple reviewers must agree before a result is marked "verified".
            </p>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>Step 4</div>
            <div style={{ fontSize: "14px", fontWeight: "bold", marginTop: 4 }}>
              Dispute Resolution
            </div>
            <p style={{ fontSize: "13px", color: "#b3b8c4", marginTop: 4, margin: 0 }}>
              When reviewers disagree or identify issues, submissions are flagged as
              "disputed" for senior review, requiring investigation before resolution.
            </p>
          </div>
        </div>
      </div>

      {/* Data Integrity */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Data Integrity Controls</h3>
        <ul style={{ marginTop: 12 }}>
          <li>
            <strong>Immutable Evidence:</strong> Photos are stored with hash verification.
            Any modification would be detected.
          </li>
          <li>
            <strong>Review Audit Trail:</strong> Every verification decision is logged with
            reviewer ID and timestamp (anonymous for privacy).
          </li>
          <li>
            <strong>Deterministic Exports:</strong> Snapshot generation produces identical
            output for identical input, enabling verification.
          </li>
          <li>
            <strong>Public Transparency:</strong> All disputed and rejected submissions
            remain visible (no silent failures).
          </li>
        </ul>
      </div>

      {/* Coverage Statistics */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Coverage Statistics</h3>
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          <div className="card" style={{ background: "#1a1d26" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Verified Submissions</span>
              <span style={{ fontWeight: "bold" }} className="badge ok">
                Target: 100%
              </span>
            </div>
            <small style={{ color: "#666" }}>
              Percentage of stations with at least one verified transcription.
            </small>
          </div>
          <div className="card" style={{ background: "#1a1d26" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Pending Review</span>
              <span style={{ fontWeight: "bold" }} className="badge warn">
                Target: &lt;5%
              </span>
            </div>
            <small style={{ color: "#666" }}>
              Submissions awaiting first review. High pending rate indicates coverage gaps.
            </small>
          </div>
          <div className="card" style={{ background: "#1a1d26" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Disputed Rate</span>
              <span style={{ fontWeight: "bold" }} className="badge bad">
                Target: &lt;2%
              </span>
            </div>
            <small style={{ color: "#666" }}>
              Percentage of submissions requiring investigation. High rates warrant review.
            </small>
          </div>
        </div>
      </div>

      {/* System Guarantees and Limitations */}
      <div className="card" style={{ background: "#1a2a1a" }}>
        <h3 style={{ marginTop: 0 }}>System Guarantees & Limitations</h3>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 0 }}>
          This system implements technical controls to protect evidence integrity and
          reporter privacy. However, certain outcomes cannot be guaranteed.
        </p>
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <div>
            <strong style={{ color: "#2ea043" }}>What We CAN Guarantee:</strong>
            <ul style={{ marginTop: 4, paddingLeft: "20px", fontSize: "12px", color: "#b3b8c4", margin: 0 }}>
              <li>Evidence integrity through cryptographic hashing (SHA-256/512)</li>
              <li>Append-only audit trail for all verification actions</li>
              <li>Anonymous reporter identity (no public PII exposure)</li>
              <li>Tamper-proof submission tracking via unique station anchors</li>
              <li>Deterministic snapshot generation (reproducible output)</li>
              <li>Public read access even under partial service degradation</li>
            </ul>
          </div>
          <div>
            <strong style={{ color: "#d73a49" }}>What We CANNOT Guarantee:</strong>
            <ul style={{ marginTop: 4, paddingLeft: "20px", fontSize: "12px", color: "#b3b8c4", margin: 0 }}>
              <li><strong>Full custody chain coverage:</strong> Depends on reporter participation. Some stations may have no evidence.</li>
              <li><strong>100% accuracy of public tallies:</strong> Depends on review consensus. Disputed submissions remain flagged.</li>
              <li><strong>Protection against station-level malicious actors:</strong> If someone controls the station itself, evidence could be fabricated.</li>
              <li><strong>Guaranteed seat outcome:</strong> Election results require official certification. This is a transparency tool.</li>
              <li><strong>Legal admissibility:</strong> Requires chain-of-custody documentation beyond this tool's scope.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legacy Disclaimer */}
      <div className="card" style={{ background: "#2a1a1a" }}>
        <h3 style={{ marginTop: 0 }}>Disclaimer</h3>
        <p style={{ fontSize: "12px", color: "#b3b8c4", marginTop: 0 }}>
          This is an unofficial citizen transparency tool. Data is collected from
          publicly observed election results and verified by independent citizen
          reviewers. This tool is not affiliated with, endorsed by, or officially
          connected to the Election Commission of Thailand.
        </p>
        <p style={{ fontSize: "12px", color: "#b3b8c4", marginTop: 8 }}>
          While we strive for accuracy, there may be errors in transcription or
          verification. Official results from the Election Commission should be
          considered the authoritative source once certified.
        </p>
      </div>
    </div>
  );
}