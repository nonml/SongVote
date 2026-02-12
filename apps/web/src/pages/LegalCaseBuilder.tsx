import React from "react";
import { fetchLegalCases, createLegalCase, addStationToCase } from "../lib/api";

export default function LegalCaseBuilder() {
  const [cases, setCases] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newCaseTitle, setNewCaseTitle] = React.useState("");
  const [newCaseType, setNewCaseType] = React.useState("petition");
  const [newCaseDescription, setNewCaseDescription] = React.useState("");
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [selectedCase, setSelectedCase] = React.useState<any | null>(null);
  const [selectedStation, setSelectedStation] = React.useState("");

  React.useEffect(() => {
    fetchLegalCases().then(setCases).finally(() => setLoading(false));
  }, []);

  const handleCreateCase = async () => {
    if (!newCaseTitle) return;

    try {
      const result = await createLegalCase({
        case_title: newCaseTitle,
        case_type: newCaseType,
        case_description: newCaseDescription
      });
      if (result.case_id) {
        setCases((prev) => [
          {
            id: result.case_id,
            case_title: newCaseTitle,
            case_type: newCaseType,
            status: "draft",
            created_at: new Date().toISOString()
          },
          ...prev
        ]);
        setNewCaseTitle("");
        setNewCaseDescription("");
        setShowCreateForm(false);
      }
    } catch (err) {
      alert("Failed to create case: " + err);
    }
  };

  const handleAddStation = async () => {
    if (!selectedCase || !selectedStation) return;

    try {
      const result = await addStationToCase(selectedCase.id, selectedStation);
      alert("Station added successfully!");
      setSelectedStation("");
    } catch (err) {
      alert("Failed to add station: " + err);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Legal Case Builder</h2>
        <p>Loading cases...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Legal Case Builder</h2>
        <p>Create and manage legal cases with evidence bundles.</p>
      </div>

      {/* Create Case Form */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create New Case</h3>
        <div style={{ display: "grid", gap: 8, maxWidth: 500 }}>
          <input
            type="text"
            placeholder="Case title"
            value={newCaseTitle}
            onChange={(e) => setNewCaseTitle(e.target.value)}
            style={{ padding: 8 }}
          />
          <select
            value={newCaseType}
            onChange={(e) => setNewCaseType(e.target.value)}
            style={{ padding: 8 }}
          >
            <option value="petition">Petition</option>
            <option value="complaint">Complaint</option>
            <option value="challenge">Challenge</option>
            <option value="report">Report</option>
          </select>
          <textarea
            placeholder="Case description"
            value={newCaseDescription}
            onChange={(e) => setNewCaseDescription(e.target.value)}
            rows={3}
            style={{ padding: 8 }}
          />
          <button onClick={handleCreateCase} className="btn primary" style={{ padding: "8px 16px" }}>
            Create Case
          </button>
        </div>
      </div>

      {/* Cases List */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Existing Cases</h3>
        {cases.length === 0 ? (
          <p>No cases created yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="card"
                style={{ background: "#12141a", padding: 12 }}
              >
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{caseItem.case_title}</strong>
                    <span className="badge" style={{ marginLeft: 8 }}>
                      {caseItem.case_type}
                    </span>
                    <span className={`badge ${caseItem.status === "draft" ? "warn" : "ok"}`} style={{ marginLeft: 8 }}>
                      {caseItem.status}
                    </span>
                  </div>
                  <small>{new Date(caseItem.created_at).toLocaleDateString()}</small>
                </div>
                <p style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
                  {caseItem.case_description || "No description"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Case Management */}
      {selectedCase && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Manage Case: {selectedCase.case_title}</h3>
          <div style={{ display: "grid", gap: 8, maxWidth: 500 }}>
            <input
              type="text"
              placeholder="Station ID to add"
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value)}
              style={{ padding: 8 }}
            />
            <button onClick={handleAddStation} className="btn primary" style={{ padding: "8px 16px" }}>
              Add Station
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>About Legal Cases</h3>
        <ul>
          <li>Create cases to organize evidence for legal filing</li>
          <li>Add stations with related incidents and custody events</li>
          <li>Generate packets for filing with ECT, NACC, or Ombudsman</li>
          <li>All actions are logged in the audit trail</li>
        </ul>
      </div>
    </div>
  );
}