import React from "react";
import { createUnlistedStation } from "../lib/api";

export default function UnlistedStationModal(props: {
  open: boolean;
  ctx: { constituency_id: number; subdistrict_id: number | null; subdistrict_name: string } | null;
  onClose: () => void;
  onCreated: (station_id: string) => void;
}) {
  const { open, ctx, onClose, onCreated } = props;
  const [stationNumber, setStationNumber] = React.useState("");
  const [locationName, setLocationName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStationNumber(""); setLocationName(""); setErr(null);
  }, [open]);

  if (!open || !ctx) return null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div className="card" style={{ width:"min(560px, 100%)" }}>
        <h3 style={{ marginTop:0 }}>Unlisted Station</h3>
        <p style={{ marginTop:0 }}>
          Constituency ID: <span className="badge">{ctx.constituency_id}</span> · Tambon: <span className="badge">{ctx.subdistrict_name}</span>
        </p>

        <div className="row">
          <div style={{ flex:1, minWidth:180 }}>
            <label>Station Number (หน่วย)</label>
            <input className="input" value={stationNumber} onChange={e=>setStationNumber(e.target.value)} placeholder="e.g., 99" />
          </div>
          <div style={{ flex:2, minWidth:220 }}>
            <label>Location name (optional)</label>
            <input className="input" value={locationName} onChange={e=>setLocationName(e.target.value)} placeholder="e.g., โรงเรียน..." />
          </div>
        </div>

        {err ? <p style={{ color:"#ffb4b4" }}>{err}</p> : null}

        <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:12 }}>
          <button className="btn secondary" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy} onClick={async () => {
            setErr(null);
            const n = Number(stationNumber);
            if (!Number.isFinite(n) || n <= 0) { setErr("Enter a valid station number."); return; }
            setBusy(true);
            try {
              const r = await createUnlistedStation({
                constituency_id: ctx.constituency_id,
                subdistrict_id: ctx.subdistrict_id,
                subdistrict_name: ctx.subdistrict_name,
                station_number: n,
                location_name: locationName || undefined
              });
              onCreated(r.station_id);
              onClose();
            } catch (e:any) {
              setErr(e?.message ?? "Failed");
            } finally {
              setBusy(false);
            }
          }}>Create</button>
        </div>

        <small>Creates a temporary station record flagged for admin review.</small>
      </div>
    </div>
  );
}
