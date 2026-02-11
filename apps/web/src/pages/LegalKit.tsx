import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchPublicSnapshot, type PublicSnapshot, type StationSummary } from "../lib/api";

// Case templates for common election issues
const CASE_TEMPLATES = [
  {
    id: "checksum_mismatch",
    title: "Checksum Mismatch Complaint",
    category: "math",
    description: "For stations where upload checksums don't match reviewer tallies",
    priority: "High",
  },
  {
    id: "station_mismatch",
    title: "Station Header Mismatch",
    category: "procedure",
    description: "For stations where the S.S. 5/18 header doesn't match location",
    priority: "Medium",
  },
  {
    id: "seal_broken",
    title: "Seal Broken or Mismatch Complaint",
    category: "custody",
    description: "For custody chain issues with seal integrity",
    priority: "High",
  },
  {
    id: "form_missing",
    title: "Missing/Removed Posted Form",
    category: "access",
    description: "For incidents where S.S. 5/18 form was not posted or removed",
    priority: "High",
  },
  {
    id: "counting_obstructed",
    title: "Counting Obstruction Complaint",
    category: "access",
    description: "For incidents where observation was obstructed during counting",
    priority: "Medium",
  },
  {
    id: "math_inconsistency",
    title: "Mathematical Inconsistency",
    category: "math",
    description: "For vote totals that don't add up correctly",
    priority: "High",
  },
];

// File locations guidance
const FILE_LOCATIONS = [
  {
    name: "Election Commission (ECT)",
    address: "1, Rama I Road, Pathum Wan, Bangkok 10330",
    type: "primary",
    description: "Primary filing location for election complaints",
  },
  {
    name: "Office of the Attorney General",
    address: "219, Rama I Road, Pathum Wan, Bangkok 10330",
    type: "secondary",
    description: "For criminal investigation of election fraud",
  },
  {
    name: "Local District Office",
    address: "Varies by district",
    type: "secondary",
    description: "Preliminary report filing location",
  },
];

export default function LegalKit() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = React.useState<PublicSnapshot | null>(null);
  const [selectedStations, setSelectedStations] = React.useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string>("");

  React.useEffect(() => {
    fetchPublicSnapshot().then(setSnapshot);
  }, []);

  const stations = snapshot?.stations || [];

  const handleToggleStation = (id: string) => {
    if (selectedStations.includes(id)) {
      setSelectedStations(prev => prev.filter(sid => sid !== id));
    } else {
      setSelectedStations(prev => [...prev, id]);
    }
  };

  const getStationSummary = (stationId: string): StationSummary | undefined => {
    return stations.find(s => s.station_id === stationId);
  };

  const getSelectedStationsDetails = () => {
    return selectedStations.map(id => getStationSummary(id)).filter(Boolean);
  };

  const generateCaseTemplate = (templateId: string) => {
    const details = getSelectedStationsDetails();
    const stationCount = details.length;

    let templateText = `THAI ELECTION EVIDENCE - LEGAL KIT
=================================

Template: ${CASE_TEMPLATES.find(t => t.id === templateId)?.title || templateId}
Generated: ${new Date().toISOString()}
Station Count: ${stationCount}

`;

    if (stationCount > 0) {
      templateText += "\nSTATIONS INVOLVED:\n";
      templateText += "=================\n\n";
      details.forEach((s, i) => {
        templateText += `${i + 1}. Station #${s?.station_number} - ${s?.location_name}\n`;
        templateText += `   Constituency: ${s?.constituency_id}\n`;
        templateText += `   Subdistrict: ${s?.subdistrict_name}\n`;
        templateText += `   Status: C:${s?.submissions[0]?.status_constituency} | P:${s?.submissions[0]?.status_partylist}\n\n`;
      });
    }

    templateText += "\nEVIDENCE SUMMARY:\n";
    templateText += "=================\n";
    templateText += "- Evidence photos available\n";
    templateText += "- Verification tallies recorded\n";
    templateText += "- Custody chain documented\n";
    templateText += "- Incident reports attached\n\n";

    templateText += "\nWHY THIS MATTERS:\n";
    templateText += "=================\n";
    templateText += CASE_TEMPLATES.find(t => t.id === templateId)?.description || "";
    templateText += "\n\n";

    templateText += "\nWHERE TO FILE:\n";
    templateText += "==============\n";
    FILE_LOCATIONS.forEach(loc => {
      templateText += `${loc.name}\n`;
      templateText += `${loc.address}\n`;
      templateText += `Type: ${loc.type.toUpperCase()}\n`;
      templateText += `Purpose: ${loc.description}\n\n`;
    });

    templateText += "\nNEXT STEPS:\n";
    templateText += "===========\n";
    templateText += "1. Review all evidence in this packet\n";
    templateText += "2. Complete the 'Evidence Index' spreadsheet\n";
    templateText += "3. File formal complaints with supporting documentation\n";
    templateText += "4. Follow up with authorities for investigation status\n\n";

    templateText += "\nDISCLAIMER:\n";
    templateText += "===========\n";
    templateText += "This is citizen-collected evidence. For legal admissibility,\n";
    templateText += "ensure chain-of-custody documentation is maintained.\n";
    templateText += "Not affiliated with the Election Commission of Thailand.\n";

    return templateText;
  };

  const handleExportTemplate = () => {
    if (!selectedTemplate) {
      alert("Please select a case template first.");
      return;
    }
    if (selectedStations.length === 0) {
      alert("Please select at least one station.");
      return;
    }

    const templateText = generateCaseTemplate(selectedTemplate);
    const blob = new Blob([templateText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `legal-case-${selectedTemplate}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCasePriorityColor = (priority: string) => {
    if (priority === "High") return "bad";
    if (priority === "Medium") return "warn";
    return "ok";
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Legal Action Kit v2 ⚖️</h2>
        <p style={{ marginTop: 0 }}>
          Build legal evidence packets with case templates. Multi-station case builder.
        </p>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn secondary" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      {/* Case Template Selection */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Select Case Template</h3>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
          Choose the type of legal complaint to file based on the issues found.
        </p>

        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {CASE_TEMPLATES.map(template => (
            <div
              key={template.id}
              className={`card ${selectedTemplate === template.id ? "secondary" : ""}`}
              style={{
                background: selectedTemplate === template.id ? "#1a2a3a" : "#1a1d26",
                cursor: "pointer",
              }}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{template.title}</strong>
                  <span
                    className={`badge ${getCasePriorityColor(template.priority)}`}
                    style={{ marginLeft: 8, fontSize: "10px" }}
                  >
                    {template.priority} Priority
                  </span>
                </div>
                <small style={{ color: "#666" }}>{template.category}</small>
              </div>
              <p style={{ fontSize: "13px", color: "#b3b8c4", marginTop: 4, marginBottom: 0 }}>
                {template.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Station Selection */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Select Stations</h3>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
          Choose stations to include in your legal case. Multiple stations can be grouped.
        </p>

        <div style={{ maxHeight: 300, overflowY: "auto", marginTop: 12 }}>
          {stations.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#666" }}>Loading stations...</p>
          ) : (
            stations.map(station => (
              <div key={station.station_id} style={{ padding: 8, borderBottom: "1px solid #2a2f3a" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={selectedStations.includes(station.station_id)}
                    onChange={() => handleToggleStation(station.station_id)}
                  />
                  <div style={{ flex: 1 }}>
                    <span>Station #{station.station_number}</span>
                    {station.location_name && (
                      <span style={{ color: "#666", fontSize: "12px", marginLeft: 8 }}>
                        {station.location_name}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {station.submissions.some(s => s.status_constituency === "verified") && (
                      <span className="badge ok" style={{ fontSize: "10px" }}>V</span>
                    )}
                    {station.submissions.some(s => s.status_constituency === "disputed") && (
                      <span className="badge bad" style={{ fontSize: "10px" }}>D</span>
                    )}
                  </div>
                </label>
              </div>
            ))
          )}
        </div>

        <div style={{ fontSize: "12px", marginTop: 8 }}>
          Selected: <strong>{selectedStations.length}</strong> station(s)
        </div>
      </div>

      {/* Action Buttons */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Generate Legal Packet</h3>
        <div style={{ marginTop: 12 }}>
          <button
            className="btn"
            disabled={!selectedTemplate || selectedStations.length === 0}
            onClick={handleExportTemplate}
          >
            Generate Text Template
          </button>
          <button
            className="btn secondary"
            disabled={!selectedTemplate || selectedStations.length === 0}
            style={{ marginLeft: 8 }}
          >
            Generate ZIP Package
          </button>
        </div>

        <p style={{ fontSize: "12px", color: "#666", marginTop: 8 }}>
          Generated templates include: station details, evidence references, file locations,
          and step-by-step guidance for filing complaints.
        </p>
      </div>

      {/* Station Summary */}
      {selectedStations.length > 0 && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Case Summary</h3>
          <div style={{ fontSize: "12px", color: "#666", marginTop: 8 }}>
            <p>
              <strong>Template:</strong> {CASE_TEMPLATES.find(t => t.id === selectedTemplate)?.title || "None"}
            </p>
            <p>
              <strong>Stations:</strong> {selectedStations.length}
            </p>
            <p>
              <strong>Evidence Photos:</strong> {selectedStations.reduce((acc, id) => {
                const station = getStationSummary(id);
                return acc + (station?.submissions.reduce((subAcc, sub) => {
                  return subAcc + (sub.has_constituency_photo ? 1 : 0) + (sub.has_partylist_photo ? 1 : 0);
                }, 0) || 0);
              }, 0)} total
            </p>
            <p>
              <strong>Verified Tallies:</strong> {selectedStations.reduce((acc, id) => {
                const station = getStationSummary(id);
                return acc + (station?.submissions.reduce((subAcc, sub) => {
                  return subAcc + (sub.status_constituency === "verified" ? 1 : 0) + (sub.status_partylist === "verified" ? 1 : 0);
                }, 0) || 0);
              }, 0)} total
            </p>
          </div>
        </div>
      )}

      {/* File Locations Info */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Where to File</h3>
        <p style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
          Legal complaints should be filed at multiple locations for maximum impact.
        </p>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {FILE_LOCATIONS.map(loc => (
            <div key={loc.name} className="card" style={{ background: "#1a1d26" }}>
              <div style={{ fontWeight: "bold" }}>{loc.name}</div>
              <div style={{ fontSize: "12px", color: "#b3b8c4" }}>{loc.address}</div>
              <div style={{ fontSize: "10px", color: "#666", marginTop: 4 }}>
                {loc.type.toUpperCase()} - {loc.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimers */}
      <div className="card" style={{ background: "#2a1a1a" }}>
        <h3 style={{ marginTop: 0 }}>Legal Disclaimer</h3>
        <p style={{ fontSize: "12px", color: "#b3b8c4", marginTop: 0 }}>
          This legal kit template is provided for informational purposes only.
          It is not intended to constitute legal advice. Consult with qualified
          legal counsel before filing any formal complaints.
        </p>
        <p style={{ fontSize: "12px", color: "#b3b8c4", marginTop: 8 }}>
          This is an unofficial citizen transparency tool. Not affiliated with,
          endorsed by, or officially connected to the Election Commission of Thailand.
        </p>
      </div>
    </div>
  );
}