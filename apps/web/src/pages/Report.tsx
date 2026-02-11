import React from "react";
import StationSelector from "../components/StationSelector";
import UnlistedStationModal from "../components/UnlistedStationModal";
import { fetchConfig, submitCustody, submitIncident, fetchPresignedUpload, isOnline, addToOfflineQueue, type Config, type Station } from "../lib/api";

type Tab = "incident" | "custody" | "process";

const INCIDENT_TYPES = [
  "counting_obstructed",
  "intimidation_harassment",
  "form_not_posted_or_removed",
  "invalid_ballot_handling_suspect",
  "other"
] as const;

const CUSTODY_EVENT_TYPES = [
  "seal_intact_before_open",
  "seal_applied_after_close",
  "handoff_transport",
  "received_at_center",
  "seal_broken_or_mismatch",
  "other"
] as const;

// Counting process checklist items (Milestone 10)
const COUNTING_PROCESS_ITEMS = [
  { id: "count_start_time", label: "Count start time recorded", type: "datetime" },
  { id: "count_end_time", label: "Count end time recorded", type: "datetime" },
  { id: "public_visibility", label: "Count was publicly visible", type: "boolean" },
  { id: "objections_raised", label: "Objections were raised", type: "boolean" },
  { id: "interruptions", label: "Count was interrupted", type: "boolean" },
  { id: "missing_forms", label: "Missing posted forms observed", type: "boolean" },
  { id: "invalid_pile_photo", label: "Invalid/blank/no-vote pile photo", type: "photo" },
] as const;

export default function Report() {
  const [cfg, setCfg] = React.useState<Config | null>(null);
  const [station, setStation] = React.useState<Station | null>(null);
  const [tab, setTab] = React.useState<Tab>("incident");

  const [unlistedCtx, setUnlistedCtx] = React.useState<any>(null);
  const [unlistedOpen, setUnlistedOpen] = React.useState(false);

  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Incident state
  const [incidentType, setIncidentType] = React.useState<string>(INCIDENT_TYPES[0]);
  const [incidentTime, setIncidentTime] = React.useState<string>("");
  const [incidentDesc, setIncidentDesc] = React.useState<string>("");

  // Custody state
  const [custodyType, setCustodyType] = React.useState<string>(CUSTODY_EVENT_TYPES[0]);
  const [custodyTime, setCustodyTime] = React.useState<string>("");
  const [boxId, setBoxId] = React.useState<string>("");
  const [sealId, setSealId] = React.useState<string>("");
  const [custodyNotes, setCustodyNotes] = React.useState<string>("");
  const [custodyConfidence, setCustodyConfidence] = React.useState<number>(50);

  // Counting process state (Milestone 10)
  const [processItems, setProcessItems] = React.useState<Record<string, any>>({});
  const [processNotes, setProcessNotes] = React.useState<string>("");
  const [processPhoto, setProcessPhoto] = React.useState<File | null>(null);

  // Image upload state
  const [incidentPhoto, setIncidentPhoto] = React.useState<File | null>(null);
  const [custodyPhoto, setCustodyPhoto] = React.useState<File | null>(null);

  React.useEffect(() => { fetchConfig().then(setCfg); }, []);

  // Upload a photo to R2 and return the key
  async function uploadPhoto(file: File, type: "incident" | "custody" | "process"): Promise<string> {
    const presigned = await fetch(`${
      import.meta.env.VITE_API_BASE || ""
    }/api/v1/storage/presigned?filename=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.type)}&upload_type=${encodeURIComponent(type)}`);
    if (!presigned.ok) throw new Error("Failed to get presigned URL");
    const data = await presigned.json();

    const response = await fetch(data.url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    });
    if (!response.ok) throw new Error("Photo upload failed");
    return data.key;
  }

  async function submit() {
    setErr(null); setMsg(null);
    if (!station) { setErr("Select a station first."); return; }
    setBusy(true);
    try {
      let mediaKeys: string[] = [];

      // Upload photo if provided
      let photoToUpload: File | null = null;
      if (tab === "incident") {
        photoToUpload = incidentPhoto;
      } else if (tab === "custody") {
        photoToUpload = custodyPhoto;
      } else if (tab === "process" && processPhoto) {
        photoToUpload = processPhoto;
        const processKey = await uploadPhoto(processPhoto, "process");
        mediaKeys = [processKey];
      }

      if (photoToUpload && !mediaKeys.length) {
        const key = await uploadPhoto(photoToUpload, tab);
        mediaKeys = [key];
      }

      const payloadBase = {
        station_id: station.id,
        constituency_id: station.constituency_id,
        subdistrict_id: station.subdistrict_id,
        station_number: station.station_number
      };

      let payload: any;
      let endpoint: string;

      if (tab === "incident") {
        payload = {
          ...payloadBase,
          incident_type: incidentType,
          occurred_at: incidentTime ? new Date(incidentTime).toISOString() : null,
          description: incidentDesc || null,
          media_keys: mediaKeys
        };
        endpoint = "incident/report";
      } else if (tab === "custody") {
        payload = {
          ...payloadBase,
          event_type: custodyType,
          occurred_at: custodyTime ? new Date(custodyTime).toISOString() : null,
          box_id: boxId || null,
          seal_id: sealId || null,
          notes: custodyNotes || null,
          confidence: custodyConfidence,
          media_keys: mediaKeys
        };
        endpoint = "custody/event";
      } else {
        // Counting process
        payload = {
          ...payloadBase,
          process_items: processItems,
          notes: processNotes || null,
          media_keys: mediaKeys
        };
        endpoint = "process/report";
      }

      // Check if online or offline
      if (isOnline()) {
        const r = await fetch(`${import.meta.env.VITE_API_BASE || ""}/api/v1/${endpoint}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("Request failed");
        const result = await r.json();
        setMsg(`${tab === "incident" ? "Incident" : tab === "custody" ? "Custody" : "Process"} submitted ✅ id=${result.id ?? "ok"}`);
      } else {
        const queueItemType = tab === "incident" ? "incident" : tab === "custody" ? "custody" : "process";
        const queueItem = {
          id: crypto.randomUUID(),
          type: queueItemType as "incident" | "custody" | "process",
          payload,
          timestamp: Date.now()
        };
        addToOfflineQueue(queueItem);
        setMsg(`${tab === "incident" ? "Incident" : tab === "custody" ? "Custody" : "Process"} saved for offline upload`);
      }

      // Clear photo state
      if (tab === "incident") setIncidentPhoto(null);
      else if (tab === "custody") setCustodyPhoto(null);
      else setProcessPhoto(null);
    } catch (e: any) {
      setErr(e?.message ?? "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display:"grid", gap: 12 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Report (Incidents, Custody & Process) 🧾</h2>
        <p style={{ marginTop: 0 }}>
          Use this if observation is obstructed, posted forms are missing/removed,
          or you observe ballot box/seal anomalies. Document the counting process.
        </p>
        <div className="row">
          <button className={`btn ${tab==="incident" ? "" : "secondary"}`} onClick={() => setTab("incident")}>Incident</button>
          <button className={`btn ${tab==="custody" ? "" : "secondary"}`} onClick={() => setTab("custody")}>Custody</button>
          <button className={`btn ${tab==="process" ? "" : "secondary"}`} onClick={() => setTab("process")}>Process</button>
        </div>
      </div>

      {!cfg ? <div className="card">Loading config...</div> : (
        <>
          <StationSelector
            cfg={cfg}
            value={station}
            onChange={setStation}
            onNeedUnlisted={(ctx) => { setUnlistedCtx(ctx); setUnlistedOpen(true); }}
          />

          <div className="card">
            <div className="row" style={{ justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <strong>Selected station:</strong>{" "}
                {station ? <span className="badge ok">หน่วย {station.station_number}</span> : <span className="badge warn">none</span>}
              </div>
              <small className="badge">No PII · Evidence-first</small>
            </div>
            <hr />

            {tab === "incident" ? (
              <>
                <label>Incident type</label>
                <select className="input" value={incidentType} onChange={e => setIncidentType(e.target.value)}>
                  {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>

                <div className="row" style={{ marginTop: 10 }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <label>When (optional)</label>
                    <input className="input" type="datetime-local" value={incidentTime} onChange={e => setIncidentTime(e.target.value)} />
                  </div>
                  <div style={{ flex: 2, minWidth: 260 }}>
                    <label>Details</label>
                    <textarea className="input" rows={5} value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)}
                      placeholder="What happened? What evidence exists? Avoid naming private individuals publicly." />
                  </div>
                </div>

                <div className="card" style={{ marginTop: 10 }}>
                  <label>Photo evidence (optional)</label>
                  <input className="input" type="file" accept="image/*" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setIncidentPhoto(f);
                  }} />
                  {incidentPhoto && <div style={{ marginTop: 8, display:"flex", alignItems:"center", gap: 8 }}>
                    <span className="badge ok">Selected: {incidentPhoto.name}</span>
                    <button type="button" className="btn secondary" onClick={() => setIncidentPhoto(null)}>Remove</button>
                  </div>}
                </div>

                <small>Tip: If safe, capture the posted board area showing it's missing/obstructed. Avoid faces.</small>
              </>
            ) : tab === "custody" ? (
              <>
                <label>Custody event type</label>
                <select className="input" value={custodyType} onChange={e => setCustodyType(e.target.value)}>
                  {CUSTODY_EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>

                <div className="row" style={{ marginTop: 10 }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <label>Box ID (optional)</label>
                    <input className="input" value={boxId} onChange={e => setBoxId(e.target.value)} placeholder="as seen on the box" />
                  </div>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <label>Seal ID (optional)</label>
                    <input className="input" value={sealId} onChange={e => setSealId(e.target.value)} placeholder="as seen on the seal" />
                  </div>
                </div>

                <div className="row" style={{ marginTop: 10 }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <label>When (optional)</label>
                    <input className="input" type="datetime-local" value={custodyTime} onChange={e => setCustodyTime(e.target.value)} />
                  </div>
                  <div style={{ flex: 2, minWidth: 260 }}>
                    <label>Notes</label>
                    <textarea className="input" rows={5} value={custodyNotes} onChange={e => setCustodyNotes(e.target.value)}
                      placeholder="Seal intact? Any mismatch? Where was the handoff? Keep factual." />
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <label>Confidence in seal/box ID (optional)</label>
                  <input
                    className="input"
                    type="range"
                    min={0}
                    max={100}
                    value={custodyConfidence}
                    onChange={e => setCustodyConfidence(Number(e.target.value))}
                  />
                  <div style={{ fontSize: "12px", color: "#666", marginTop: 4 }}>
                    Confidence: {custodyConfidence}%
                  </div>
                </div>

                <div className="card" style={{ marginTop: 10 }}>
                  <label>Photo evidence (optional)</label>
                  <input className="input" type="file" accept="image/*" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setCustodyPhoto(f);
                  }} />
                  {custodyPhoto && <div style={{ marginTop: 8, display:"flex", alignItems:"center", gap: 8 }}>
                    <span className="badge ok">Selected: {custodyPhoto.name}</span>
                    <button type="button" className="btn secondary" onClick={() => setCustodyPhoto(null)}>Remove</button>
                  </div>}
                </div>

                <small>Tip: Photo the seal/box ID before and after handoff if safe.</small>
              </>
            ) : (
              <>
                <label>Counting Process Checklist</label>
                <p style={{ fontSize: "12px", color: "#666", marginTop: 0 }}>
                  Document how the counting process unfolded. Keep it factual.
                </p>

                <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                  {COUNTING_PROCESS_ITEMS.map(item => (
                    <div key={item.id} className="card" style={{ background: "#1a1d26" }}>
                      <label style={{ fontWeight: "bold", fontSize: "14px" }}>{item.label}</label>
                      {item.type === "boolean" ? (
                        <div style={{ marginTop: 8 }}>
                          <label style={{ marginRight: 12 }}>
                            <input
                              type="checkbox"
                              checked={!!processItems[item.id]}
                              onChange={e => setProcessItems(prev => ({ ...prev, [item.id]: e.target.checked }))}
                            />
                            Yes
                          </label>
                        </div>
                      ) : item.type === "datetime" ? (
                        <input
                          className="input"
                          type="datetime-local"
                          value={processItems[item.id] || ""}
                          onChange={e => setProcessItems(prev => ({ ...prev, [item.id]: e.target.value }))}
                          style={{ marginTop: 8 }}
                        />
                      ) : item.type === "photo" ? (
                        <>
                          <input
                            className="input"
                            type="file"
                            accept="image/*"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) setProcessPhoto(f);
                            }}
                            style={{ marginTop: 8 }}
                          />
                          {processPhoto && (
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                              <span className="badge ok">Selected: {processPhoto.name}</span>
                              <button type="button" className="btn secondary" onClick={() => setProcessPhoto(null)}>Remove</button>
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  ))}

                  <div className="card" style={{ background: "#1a1d26" }}>
                    <label>Additional notes (optional)</label>
                    <textarea
                      className="input"
                      rows={4}
                      value={processNotes}
                      onChange={e => setProcessNotes(e.target.value)}
                      placeholder="Any interruptions? Objections? Restricted access? Keep factual."
                      style={{ marginTop: 8 }}
                    />
                  </div>
                </div>

                <small>Tip: Document count start/end times, public visibility, and any objections raised.</small>
              </>
            )}

            {err ? <p style={{ color:"#ffb4b4" }}>{err}</p> : null}
            {msg ? <p style={{ color:"#b6ffb6" }}>{msg}</p> : null}

            <div style={{ display:"flex", gap: 10, justifyContent:"flex-end", marginTop: 10 }}>
              <button className="btn secondary" onClick={() => { setErr(null); setMsg(null); }}>Clear</button>
              <button className="btn" disabled={busy || !station} onClick={submit}>Submit</button>
            </div>

            <hr />
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Know your boundaries 🛡️</h3>
              <ul style={{ marginTop: 0 }}>
                <li>Do not cross restricted barriers.</li>
                <li>Do not interfere with officials or counting.</li>
                <li>If threatened, leave and report later.</li>
                <li>Keep descriptions factual; avoid naming private individuals publicly.</li>
              </ul>
            </div>
          </div>

          <UnlistedStationModal
            open={unlistedOpen}
            ctx={unlistedCtx}
            onClose={() => setUnlistedOpen(false)}
            onCreated={(station_id) => alert(`Created station: ${station_id}. Refresh config to select it.`)}
          />
        </>
      )}
    </div>
  );
}