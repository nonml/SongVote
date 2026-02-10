import React from "react";
import StationSelector from "../components/StationSelector";
import UnlistedStationModal from "../components/UnlistedStationModal";
import { fetchConfig, submitCustody, submitIncident, type Config, type Station } from "../lib/api";

type Tab = "incident" | "custody";

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

export default function Report() {
  const [cfg, setCfg] = React.useState<Config | null>(null);
  const [station, setStation] = React.useState<Station | null>(null);
  const [tab, setTab] = React.useState<Tab>("incident");

  const [unlistedCtx, setUnlistedCtx] = React.useState<any>(null);
  const [unlistedOpen, setUnlistedOpen] = React.useState(false);

  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [incidentType, setIncidentType] = React.useState<string>(INCIDENT_TYPES[0]);
  const [incidentTime, setIncidentTime] = React.useState<string>("");
  const [incidentDesc, setIncidentDesc] = React.useState<string>("");

  const [custodyType, setCustodyType] = React.useState<string>(CUSTODY_EVENT_TYPES[0]);
  const [custodyTime, setCustodyTime] = React.useState<string>("");
  const [boxId, setBoxId] = React.useState<string>("");
  const [sealId, setSealId] = React.useState<string>("");
  const [custodyNotes, setCustodyNotes] = React.useState<string>("");

  React.useEffect(() => { fetchConfig().then(setCfg); }, []);

  async function submit() {
    setErr(null); setMsg(null);
    if (!station) { setErr("Select a station first."); return; }
    setBusy(true);
    try {
      const payloadBase = {
        station_id: station.id,
        constituency_id: station.constituency_id,
        subdistrict_id: station.subdistrict_id,
        station_number: station.station_number
      };

      if (tab === "incident") {
        const r = await submitIncident({
          ...payloadBase,
          incident_type: incidentType,
          occurred_at: incidentTime ? new Date(incidentTime).toISOString() : null,
          description: incidentDesc || null,
          media_keys: []
        });
        setMsg(`Incident submitted ✅ id=${r.id ?? "ok"}`);
      } else {
        const r = await submitCustody({
          ...payloadBase,
          event_type: custodyType,
          occurred_at: custodyTime ? new Date(custodyTime).toISOString() : null,
          box_id: boxId || null,
          seal_id: sealId || null,
          notes: custodyNotes || null,
          media_keys: []
        });
        setMsg(`Custody event submitted ✅ id=${r.id ?? "ok"}`);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display:"grid", gap: 12 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Report (Incidents & Custody) 🧾</h2>
        <p style={{ marginTop: 0 }}>
          Use this if observation is obstructed, posted forms are missing/removed, or you observe ballot box/seal anomalies.
          Keep it factual.
        </p>
        <div className="row">
          <button className={`btn ${tab==="incident" ? "" : "secondary"}`} onClick={() => setTab("incident")}>Incident</button>
          <button className={`btn ${tab==="custody" ? "" : "secondary"}`} onClick={() => setTab("custody")}>Custody</button>
        </div>
      </div>

      {!cfg ? <div className="card">Loading config…</div> : (
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
                  {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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

                <small>Tip: If safe, capture the posted board area showing it's missing/obstructed. Avoid faces.</small>
              </>
            ) : (
              <>
                <label>Custody event type</label>
                <select className="input" value={custodyType} onChange={e => setCustodyType(e.target.value)}>
                  {CUSTODY_EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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

                <small>Tip: Photo the seal/box ID before and after handoff if safe.</small>
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
