import React from "react";
import { Link } from "react-router-dom";
import { fetchConfig, fetchPublicSnapshot, type Config } from "../lib/api";

interface Submission {
  id: string;
  station_id: string;
  created_at: string;
  status_constituency: string;
  status_partylist: string;
  photo_constituency_key: string | null;
  photo_partylist_key: string | null;
  checksum_constituency_total: number | null;
  checksum_partylist_total: number | null;
  station?: {
    id: string;
    constituency_id: number;
    subdistrict_id: number | null;
    subdistrict_name: string;
    station_number: number;
    location_name: string | null;
    is_verified_exist: boolean;
  };
}

interface ReviewerState {
  currentQueueItem: Submission | null;
  queueEmpty: boolean;
  submitting: boolean;
  submittingType: "constituency" | "partylist" | null;
  scoreMap: Record<string, number>;
  action: "verify" | "reject_quality" | "reject_mismatch" | "dispute" | null;
  details: string;
  reviewerId: string;
  stationNumberInput: string;
  // Milestone 11: Reviewer confidence in transcription
  transcriptionConfidence: number;
  // Milestone 11: Dispute reason selection
  disputeReason: "checksum_mismatch" | "math_mismatch" | "station_mismatch" | "conflicting_evidence" | "other" | "";
}

export default function Review() {
  const [cfg, setCfg] = React.useState<Config | null>(null);
  const [state, setState] = React.useState<ReviewerState>({
    currentQueueItem: null,
    queueEmpty: false,
    submitting: false,
    submittingType: null,
    scoreMap: {},
    action: null,
    details: "",
    reviewerId: "reviewer_" + crypto.randomUUID().slice(0, 8),
    stationNumberInput: "",
    transcriptionConfidence: 50,
    disputeReason: "",
  });

  React.useEffect(() => {
    fetchConfig().then(setCfg);
  }, []);

  // Fetch next item from review queue
  const fetchNextItem = async () => {
    try {
      const res = await fetch(import.meta.env.VITE_API_BASE + "/api/v1/admin/queue/next");
      if (res.ok) {
        const data = await res.json();
        if (data.queue_empty) {
          setState(s => ({ ...s, queueEmpty: true, currentQueueItem: null }));
        } else {
          setState(s => ({ ...s, currentQueueItem: data.submission, queueEmpty: false }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch queue item:", e);
    }
  };

  React.useEffect(() => {
    if (!state.currentQueueItem && !state.queueEmpty) {
      fetchNextItem();
    }
  }, [state.currentQueueItem, state.queueEmpty]);

  const handleScoreChange = (key: string, value: string) => {
    const num = parseInt(value, 10);
    setState(s => ({
      ...s,
      scoreMap: { ...s.scoreMap, [key]: isNaN(num) ? 0 : num },
    }));
  };

  const getTotalValid = () => {
    const { scoreMap } = state;
    return scoreMap["total_valid"] || Object.values(scoreMap).reduce((a, b) => a + b, 0);
  };

  const handleSubmit = async () => {
    if (!state.currentQueueItem || !state.action) return;

    setState(s => ({ ...s, submitting: true }));

    const sheetType = state.submittingType || "constituency";
    const payload = {
      submission_id: state.currentQueueItem.id,
      reviewer_id: state.reviewerId,
      sheet_type: sheetType,
      confirmed_station_number: state.stationNumberInput
        ? parseInt(state.stationNumberInput, 10)
        : undefined,
      score_map: state.scoreMap,
      metadata_checks: {
        total_valid: getTotalValid(),
        checksum_match: state.currentQueueItem[`checksum_${sheetType}_total`] !== null
          ? getTotalValid() === (state.currentQueueItem as any)[`checksum_${sheetType}_total`]
          : undefined,
      },
      action: state.action,
      details: state.details || undefined,
      // Milestone 11: Add transcription confidence and dispute reason
      transcription_confidence: state.transcriptionConfidence,
      dispute_reason: state.disputeReason || undefined,
    };

    try {
      const res = await fetch(import.meta.env.VITE_API_BASE + "/api/v1/admin/tally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Submission ${data.status}! Tally ID: ${data.tally_id}`);
        setState(s => ({ ...s, submitting: false, action: null, details: "", scoreMap: {} }));
        fetchNextItem();
      } else {
        const err = await res.json();
        alert("Submit failed: " + err.error);
      }
    } catch (e: any) {
      alert("Submit error: " + e.message);
    } finally {
      setState(s => ({ ...s, submitting: false }));
    }
  };

  const item = state.currentQueueItem;
  if (!cfg) return <div className="card">Loading...</div>;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Reviewer Console 🧑‍💻</h2>
        <p style={{ marginTop: 0 }}>
          Review submitted evidence and transcribe vote counts.{" "}
          <span className="badge" style={{ fontSize: "12px" }}>
            Logged in as: {state.reviewerId}
          </span>
        </p>
        <div style={{ marginTop: 8 }}>
          <Link to="/public" className="btn secondary" style={{ marginRight: 8 }}>
            Back to Public Board
          </Link>
          <button className="btn secondary" onClick={fetchNextItem} disabled={state.submitting}>
            Next Item
          </button>
        </div>
      </div>

      {state.queueEmpty ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <h3>Queue Empty</h3>
          <p>All items reviewed. Check back later for new submissions.</p>
          <button className="btn" onClick={fetchNextItem}>Refresh Queue</button>
        </div>
      ) : !item ? (
        <div className="card">Loading queue...</div>
      ) : (
        <>
          {/* Station Info */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Station Information</h3>
            <div className="row" style={{ flexWrap: "wrap", gap: 16 }}>
              <div>
                <strong>Station:</strong> {item.station?.station_number || "N/A"}
              </div>
              <div>
                <strong>Location:</strong> {item.station?.location_name || "N/A"}
              </div>
              <div>
                <strong>Subdistrict:</strong> {item.station?.subdistrict_name || "N/A"}
              </div>
            </div>
            {item.station?.constituency_id && (
              <div style={{ marginTop: 8 }}>
                <strong>Constituency:</strong> {item.station.constituency_id}
              </div>
            )}
            <div style={{ marginTop: 8 }}>
              <label>Correct station number (if mismatch)</label>
              <input
                className="input"
                type="number"
                value={state.stationNumberInput}
                onChange={e => setState(s => ({ ...s, stationNumberInput: e.target.value }))}
                placeholder="Leave empty to keep original"
              />
            </div>
          </div>

          {/* Evidence Display */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Evidence Photos</h3>
            <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
              {item.photo_constituency_key ? (
                <div className="card" style={{ flex: "1 1 200px" }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>Constituency Sheet</div>
                  <div style={{
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: 8,
                    marginTop: 8,
                    height: 150,
                    background: "linear-gradient(135deg, #1a1d26 0%, #0b0c10 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <small style={{ color: "#666", textAlign: "center" }}>
                      [Evidence Photo Available]
                      <br />
                      <span style={{ fontSize: "10px" }}>Key: {item.photo_constituency_key}</span>
                    </small>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${item.status_constituency === "verified" ? "ok" : item.status_constituency === "pending" ? "warn" : "bad"}`}>
                      Status: {item.status_constituency}
                    </span>
                    {item.checksum_constituency_total !== null && (
                      <span className="badge" style={{ marginLeft: 8, background: "#2a2f3a" }}>
                        Checksum: {item.checksum_constituency_total}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ flex: "1 1 200px", opacity: 0.5 }}>
                  <small>Constituency: No photo</small>
                </div>
              )}

              {item.photo_partylist_key ? (
                <div className="card" style={{ flex: "1 1 200px" }}>
                  <div style={{ fontSize: "12px", color: "#666" }}>Party-list Sheet</div>
                  <div style={{
                    border: "1px solid #333",
                    borderRadius: 8,
                    padding: 8,
                    marginTop: 8,
                    height: 150,
                    background: "linear-gradient(135deg, #1a1d26 0%, #0b0c10 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    <small style={{ color: "#666", textAlign: "center" }}>
                      [Evidence Photo Available]
                      <br />
                      <span style={{ fontSize: "10px" }}>Key: {item.photo_partylist_key}</span>
                    </small>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span className={`badge ${item.status_partylist === "verified" ? "ok" : item.status_partylist === "pending" ? "warn" : "bad"}`}>
                      Status: {item.status_partylist}
                    </span>
                    {item.checksum_partylist_total !== null && (
                      <span className="badge" style={{ marginLeft: 8, background: "#2a2f3a" }}>
                        Checksum: {item.checksum_partylist_total}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card" style={{ flex: "1 1 200px", opacity: 0.5 }}>
                  <small>Party-list: No photo</small>
                </div>
              )}
            </div>
          </div>

          {/* Transcription Form */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Transcription Form</h3>
            <div className="row" style={{ gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label>Sheet type to transcribe</label>
                <select
                  className="input"
                  value={state.submittingType || "constituency"}
                  onChange={e => setState(s => ({ ...s, submittingType: e.target.value as any }))}
                >
                  <option value="constituency">Constituency</option>
                  <option value="partylist">Party-list</option>
                </select>

                <label style={{ marginTop: 12, fontWeight: "bold" }}>
                  Total Valid Votes: <span className="badge">{getTotalValid()}</span>
                </label>
              </div>
            </div>

            {/* Candidate Grid Input */}
            <div style={{ marginTop: 16 }}>
              <label>Candidate Votes (score map)</label>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: 8,
                marginTop: 8
              }}>
                <div>
                  <label>Candidate 1</label>
                  <input
                    className="input"
                    type="number"
                    value={state.scoreMap["1"] || ""}
                    onChange={e => handleScoreChange("1", e.target.value)}
                    placeholder="Votes"
                  />
                </div>
                <div>
                  <label>Candidate 2</label>
                  <input
                    className="input"
                    type="number"
                    value={state.scoreMap["2"] || ""}
                    onChange={e => handleScoreChange("2", e.target.value)}
                    placeholder="Votes"
                  />
                </div>
                <div>
                  <label>Candidate 3</label>
                  <input
                    className="input"
                    type="number"
                    value={state.scoreMap["3"] || ""}
                    onChange={e => handleScoreChange("3", e.target.value)}
                    placeholder="Votes"
                  />
                </div>
                <div>
                  <label>Candidate 4</label>
                  <input
                    className="input"
                    type="number"
                    value={state.scoreMap["4"] || ""}
                    onChange={e => handleScoreChange("4", e.target.value)}
                    placeholder="Votes"
                  />
                </div>
                <div>
                  <label>Candidate 5</label>
                  <input
                    className="input"
                    type="number"
                    value={state.scoreMap["5"] || ""}
                    onChange={e => handleScoreChange("5", e.target.value)}
                    placeholder="Votes"
                  />
                </div>
                <div>
                  <label>Invalid</label>
                  <input
                    className="input"
                    type="number"
                    value={state.scoreMap["invalid"] || ""}
                    onChange={e => handleScoreChange("invalid", e.target.value)}
                    placeholder="Count"
                  />
                </div>
                <div>
                  <label>No Vote</label>
                  <input
                    className="input"
                    type="number"
                    value={state.scoreMap["no_vote"] || ""}
                    onChange={e => handleScoreChange("no_vote", e.target.value)}
                    placeholder="Count"
                  />
                </div>
              </div>
            </div>

            {/* Transcription Confidence (Milestone 11) */}
            <div style={{ marginTop: 16 }}>
              <label>Transcription Confidence (Milestone 11)</label>
              <input
                className="input"
                type="range"
                min={0}
                max={100}
                value={state.transcriptionConfidence}
                onChange={e => setState(s => ({ ...s, transcriptionConfidence: Number(e.target.value) }))}
              />
              <div style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
                Confidence: {state.transcriptionConfidence}%
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: 16 }}>
              <label>Transcription notes (optional)</label>
              <textarea
                className="input"
                rows={3}
                value={state.details}
                onChange={e => setState(s => ({ ...s, details: e.target.value }))}
                placeholder="Any issues with the photo? Notes about the transcription..."
              />
            </div>

            {/* Dispute Reason (Milestone 11) */}
            {state.action === "dispute" && (
              <div className="card" style={{ background: "#2a1a1a", marginTop: 12 }}>
                <label>Dispute Reason (Milestone 11)</label>
                <select
                  className="input"
                  value={state.disputeReason}
                  onChange={e => setState(s => ({ ...s, disputeReason: e.target.value as ReviewerState["disputeReason"] }))}
                  style={{ marginTop: 8 }}
                >
                  <option value="">Select a reason...</option>
                  <option value="checksum_mismatch">Checksum Mismatch</option>
                  <option value="math_mismatch">Math Inconsistency</option>
                  <option value="station_mismatch">Station Header Mismatch</option>
                  <option value="conflicting_evidence">Conflicting Evidence</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
              <button
                className="btn secondary"
                onClick={() => setState(s => ({ ...s, action: "reject_quality" }))}
                disabled={state.submitting}
              >
                Reject (Quality)
              </button>
              <button
                className="btn secondary"
                onClick={() => setState(s => ({ ...s, action: "reject_mismatch" }))}
                disabled={state.submitting}
              >
                Reject (Station Mismatch)
              </button>
              <button
                className="btn secondary"
                onClick={() => setState(s => ({ ...s, action: "dispute" }))}
                disabled={state.submitting}
              >
                Dispute
              </button>
              <button
                className="btn"
                onClick={handleSubmit}
                disabled={state.submitting || !state.submittingType}
              >
                Submit Verification
              </button>
            </div>
            <small style={{ color: "#666", marginTop: 8 }}>
              Auto-verified if reviewer total matches upload checksum
            </small>
          </div>
        </>
      )}
    </div>
  );
}