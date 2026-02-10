import React from "react";
import StationSelector from "../components/StationSelector";
import UnlistedStationModal from "../components/UnlistedStationModal";
import { fetchConfig, submitIncident, submitCustody, type Config, type Station } from "../lib/api";

export default function Capture() {
  const [cfg, setCfg] = React.useState<Config | null>(null);
  const [station, setStation] = React.useState<Station | null>(null);
  const [unlistedCtx, setUnlistedCtx] = React.useState<any>(null);
  const [unlistedOpen, setUnlistedOpen] = React.useState(false);

  // Upload state
  const [uploading, setUploading] = React.useState(false);
  const [uploadMsg, setUploadMsg] = React.useState<string | null>(null);
  const [uploadErr, setUploadErr] = React.useState<string | null>(null);
  const [ constituencyPhoto, setConstituencyPhoto ] = React.useState<File | null>(null);
  const [ partylistPhoto, setPartylistPhoto ] = React.useState<File | null>(null);
  const [ constituencyChecksum, setConstituencyChecksum ] = React.useState<string>("");
  const [ partylistChecksum, setPartylistChecksum ] = React.useState<string>("");

  React.useEffect(() => { fetchConfig().then(setCfg); }, []);

  return (
    <div style={{ display:"grid", gap: 12 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Capture Results (S.S. 5/18) 📸</h2>
        <p style={{ marginTop: 0 }}>Capture the posted S.S. 5/18 forms after counting. Do not cross barriers. Do not interfere.</p>
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
            <h3 style={{ marginTop: 0 }}>Upload (MVP stub)</h3>
            <p style={{ marginTop: 0 }}>This scaffold includes the UI. Wire it to your presigned upload endpoint next.</p>

            <div className="row">
              <div style={{ flex: 1, minWidth: 240 }}>
                <label>Constituency sheet photo</label>
                <input className="input" type="file" accept="image/*" />
                <div className="row" style={{ marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label>Checksum: total valid votes</label>
                    <input className="input" placeholder="e.g., 534" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Checksum: top candidate votes</label>
                    <input className="input" placeholder="e.g., 289" />
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 240 }}>
                <label>Party-list sheet photo</label>
                <input className="input" type="file" accept="image/*" />
                <div className="row" style={{ marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label>Checksum: total valid votes</label>
                    <input className="input" placeholder="e.g., 534" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Checksum: top party votes</label>
                    <input className="input" placeholder="e.g., 201" />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label>Upload Status</label>
              <div className="row" style={{ alignItems: "center", gap: 10, marginTop: 8 }}>
                {uploading ? (
                  <span className="badge warn">Uploading...</span>
                ) : uploadMsg ? (
                  <span className="badge ok">{uploadMsg}</span>
                ) : uploadErr ? (
                  <span className="badge bad">{uploadErr}</span>
                ) : (
                  <span className="badge">Ready</span>
                )}
              </div>
              {uploadMsg || uploadErr ? (
                <button className="btn secondary" style={{ marginTop: 8 }} onClick={() => { setUploadMsg(null); setUploadErr(null); }}>Clear</button>
              ) : null}
            </div>

            <div style={{ marginTop: 12, display:"flex", justifyContent:"space-between", gap: 12, flexWrap:"wrap" }}>
              <small>Selected station: {station ? `#${station.station_number} · ${station.location_name ?? ""}` : "None"}</small>
              <button className="btn" disabled={!station || uploading} onClick={async () => {
                if (!station) return;
                setUploadErr(null); setUploadMsg(null); setUploading(true);
                try {
                  const payload: any = { station_id: station.id };
                  if (constituencyPhoto) {
                    // In MVP, we'll just track metadata (real upload would need presigned URL)
                    payload.photo_constituency_key = `user-upload-${Date.now()}`;
                    payload.checksum_constituency_total = constituencyChecksum ? Number(constituencyChecksum) : undefined;
                  }
                  if (partylistPhoto) {
                    payload.photo_partylist_key = `user-upload-${Date.now()}`;
                    payload.checksum_partylist_total = partylistChecksum ? Number(partylistChecksum) : undefined;
                  }
                  // Call the worker API (in real app, this would be to presigned upload + metadata)
                  alert("Upload would be triggered here.\nIn production: send files to R2 with presigned URL, then record metadata in DB.");
                  setUploadMsg("Upload queued (MVP demo)");
                } catch (e: any) {
                  setUploadErr(e?.message ?? "Upload failed");
                } finally {
                  setUploading(false);
                }
              }}>Submit</button>
            </div>
          </div>

          <UnlistedStationModal
            open={unlistedOpen}
            ctx={unlistedCtx}
            onClose={() => setUnlistedOpen(false)}
            onCreated={(station_id) => alert(`Created station: ${station_id} (refresh config to select it)`)}
          />
        </>
      )}
    </div>
  );
}
