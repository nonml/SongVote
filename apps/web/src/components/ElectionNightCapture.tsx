import React from "react";
import StationSelector from "./StationSelector";
import UnlistedStationModal from "./UnlistedStationModal";
import { fetchConfig, submitEvidence, submitIncident, submitCustody, isOnline, addToOfflineQueue, type Config, type Station, type PresignedUploadResponse } from "../lib/api";

// Minimum vs Ideal capture packs
const MINIMUM_PACK_ITEMS = [
  { id: "ss5_18_header", label: "S.S. 5/18 header visible", required: true },
  { id: "total_valid", label: "Total valid votes visible", required: true },
  { id: "top_candidate", label: "Top candidate votes visible", required: true },
] as const;

const IDEAL_PACK_ITEMS = [
  ...MINIMUM_PACK_ITEMS,
  { id: "full_sheet", label: "Complete sheet photo (no crops)", required: true },
  { id: "no_glare", label: "No glare/overexposure", required: false },
  { id: "clear_text", label: "Text is readable (no blur)", required: false },
  { id: "station_watermark", label: "Watermark photo (Unofficial)", required: false },
] as const;

// Quality check state
interface QualityCheck {
  id: string;
  checked: boolean;
  needsRetake: boolean;
}

// Helper function to safely get checkbox checked value
function getCheckboxChecked(e: React.ChangeEvent<HTMLInputElement>): boolean {
  return e.target.checked;
}

export default function ElectionNightCapture() {
  const [cfg, setCfg] = React.useState<Config | null>(null);
  const [station, setStation] = React.useState<Station | null>(null);
  const [unlistedCtx, setUnlistedCtx] = React.useState<{ constituency_id: number; subdistrict_id: number | null; subdistrict_name: string; station_number: number } | null>(null);
  const [unlistedOpen, setUnlistedOpen] = React.useState(false);

  // Upload state
  const [uploading, setUploading] = React.useState(false);
  const [uploadMsg, setUploadMsg] = React.useState<string | null>(null);
  const [uploadErr, setUploadErr] = React.useState<string | null>(null);
  const [constituencyPhoto, setConstituencyPhoto] = React.useState<File | null>(null);
  const [partylistPhoto, setPartylistPhoto] = React.useState<File | null>(null);

  // Quality checks
  const [qualityChecks, setQualityChecks] = React.useState<Record<string, boolean>>({});
  const [hasGlare, setHasGlare] = React.useState(false);
  const [hasBlur, setHasBlur] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);

  // Mode: "quick" (<30s) or "complete" (<60s)
  const [captureMode, setCaptureMode] = React.useState<"quick" | "complete">("quick");

  React.useEffect(() => { fetchConfig().then(setCfg); }, []);

  // Check if minimum pack is complete
  const minimumComplete = React.useMemo(() => {
    if (captureMode !== "quick") return true;
    const requiredIds = MINIMUM_PACK_ITEMS.filter(i => i.required).map(i => i.id);
    return requiredIds.every(id => qualityChecks[id]);
  }, [captureMode, qualityChecks]);

  // Check if ideal pack is complete
  const idealComplete = React.useMemo(() => {
    if (captureMode !== "complete") return true;
    const requiredIds = IDEAL_PACK_ITEMS.filter(i => i.required).map(i => i.id);
    return requiredIds.every(id => qualityChecks[id]);
  }, [captureMode, qualityChecks]);

  // Upload a photo to R2
  async function uploadPhoto(file: File, uploadType: "evidence" | "incident" | "custody"): Promise<PresignedUploadResponse> {
    const presigned = await fetch(`${
      import.meta.env.VITE_API_BASE || ""
    }/api/v1/storage/presigned?filename=${encodeURIComponent(file.name)}&type=${encodeURIComponent(file.type)}&upload_type=${encodeURIComponent(uploadType)}`);
    if (!presigned.ok) throw new Error("Failed to get presigned URL");
    const data = await presigned.json();

    const response = await fetch(data.url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file
    });
    if (!response.ok) throw new Error("Photo upload failed");

    return data;
  }

  async function handleSubmit() {
    setUploadErr(null); setUploadMsg(null); setUploading(true);

    try {
      if (!station) throw new Error("Select a station first");

      const payload: Parameters<typeof submitEvidence>[0] = { station_id: station.id };
      let photoKeys: { constituency?: string; partylist?: string } = {};

      // Upload photos if provided
      if (constituencyPhoto) {
        const result = await uploadPhoto(constituencyPhoto, "evidence");
        payload.photo_constituency_key = result.key;
        photoKeys.constituency = result.key;
      }
      if (partylistPhoto) {
        const result = await uploadPhoto(partylistPhoto, "evidence");
        payload.photo_partylist_key = result.key;
        photoKeys.partylist = result.key;
      }

      // Check if online or offline
      if (isOnline()) {
        await submitEvidence(payload);
        setUploadMsg(`Evidence ${captureMode === "quick" ? "minimum pack" : "ideal pack"} submitted!`);
      } else {
        const queueItem = {
          id: crypto.randomUUID(),
          type: "evidence" as const,
          payload,
          timestamp: Date.now()
        };
        addToOfflineQueue(queueItem);
        setUploadMsg("Saved for offline upload");
      }
    } catch (e: unknown) {
      setUploadErr(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Election Night Capture 📸</h2>
        <p style={{ marginTop: 0 }}>
          Capture the posted S.S. 5/18 forms after counting. Do not cross barriers. Do not interfere.
        </p>

        {/* Mode selector */}
        <div className="row" style={{ marginTop: 12 }}>
          <button
            className={`btn ${captureMode === "quick" ? "" : "secondary"}`}
            onClick={() => setCaptureMode("quick")}
            disabled={uploading || !!constituencyPhoto || !!partylistPhoto}
          >
            Quick Pack (&lt;60s)
          </button>
          <button
            className={`btn ${captureMode === "complete" ? "" : "secondary"}`}
            onClick={() => setCaptureMode("complete")}
            disabled={uploading || !!constituencyPhoto || !!partylistPhoto}
          >
            Complete Pack (&lt;2min)
          </button>
        </div>

        {/* Safety card */}
        <div className="card" style={{ marginTop: 12, backgroundColor: "#f0f7ff" }}>
          <h3 style={{ marginTop: 0, fontSize: "14px" }}>Know your rights 🛡️</h3>
          <ul style={{ marginTop: 0, fontSize: "13px", paddingLeft: "20px" }}>
            <li>You can photograph the posted form from a safe distance.</li>
            <li>Do NOT cross restricted barriers or interfere with counting.</li>
            <li>If threatened or obstructed, leave and report later.</li>
            <li>Keep descriptions factual. Avoid naming private individuals publicly.</li>
          </ul>
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

          {/* What to capture checklist */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>
              {captureMode === "quick" ? "Minimum Pack Requirements" : "Ideal Pack Checklist"}
            </h3>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {(captureMode === "quick" ? MINIMUM_PACK_ITEMS : IDEAL_PACK_ITEMS).map(item => (
                <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!qualityChecks[item.id]}
                    onChange={e => setQualityChecks(prev => ({ ...prev, [item.id]: getCheckboxChecked(e) }))}
                  />
                  <span>{item.label}</span>
                  {item.required && <span className="badge" style={{ fontSize: "10px", background: "#2a2f3a" }}>required</span>}
                </label>
              ))}
            </div>

            {/* Quality warnings */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontWeight: "bold", fontSize: "12px" }}>Photo quality warning:</label>
              <div className="row" style={{ marginTop: 8, flexWrap: "wrap", gap: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "13px" }}>
                  <input type="checkbox" checked={hasGlare} onChange={e => setHasGlare(getCheckboxChecked(e))} />
                  Glare / Overexposure
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "13px" }}>
                  <input type="checkbox" checked={hasBlur} onChange={e => setHasBlur(getCheckboxChecked(e))} />
                  Blur / Focus issue
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "13px" }}>
                  <input type="checkbox" checked={isDark} onChange={e => setIsDark(getCheckboxChecked(e))} />
                  Too dark
                </label>
              </div>
              {(hasGlare || hasBlur || isDark) && (
                <div className="card" style={{ marginTop: 8, backgroundColor: "#fff3cd" }}>
                  <small style={{ color: "#856404" }}>
                    Warning: Photo has quality issues. Consider retaking if safe to do so.
                  </small>
                </div>
              )}
            </div>
          </div>

          {/* Photo upload area */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Upload Photos</h3>
            <p style={{ marginTop: 0, fontSize: "12px", color: "#666" }}>
              {captureMode === "quick"
                ? "At minimum, capture the S.S. 5/18 header + total valid votes."
                : "Capture both sheets with good quality for complete evidence."}
            </p>

            <div className="row" style={{ gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label>Constituency sheet photo</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setConstituencyPhoto(f);
                      // Auto-check header visible for quick mode
                      if (captureMode === "quick") {
                        setQualityChecks(prev => ({ ...prev, "ss5_18_header": true }));
                      }
                    }
                  }}
                />
                {constituencyPhoto && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="badge ok">Selected: {constituencyPhoto.name}</span>
                    <button type="button" className="btn secondary" onClick={() => setConstituencyPhoto(null)}>Remove</button>
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label>Party-list sheet photo</label>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setPartylistPhoto(f);
                  }}
                />
                {partylistPhoto && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="badge ok">Selected: {partylistPhoto.name}</span>
                    <button type="button" className="btn secondary" onClick={() => setPartylistPhoto(null)}>Remove</button>
                  </div>
                )}
              </div>
            </div>

            {/* Checksum inputs */}
            <div className="row" style={{ marginTop: 12, gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label>Checksum: total valid votes (optional)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g., 534"
                  disabled={uploading || !constituencyPhoto}
                  onChange={e => {
                    // Auto-check total valid when checksum entered
                    if (captureMode === "quick") {
                      setQualityChecks(prev => ({ ...prev, "total_valid": !!e.target.value }));
                    }
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Checksum: top candidate votes (optional)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g., 289"
                  disabled={uploading || !constituencyPhoto}
                  onChange={e => {
                    if (captureMode === "quick") {
                      setQualityChecks(prev => ({ ...prev, "top_candidate": !!e.target.value }));
                    }
                  }}
                />
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

            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <small>Selected station: {station ? `#${station.station_number} · ${station.location_name ?? ""}` : "None"}</small>
              {!isOnline() && <span className="badge warn">Offline</span>}
              <button
                className="btn"
                disabled={!station || uploading || (captureMode === "quick" && !minimumComplete)}
                onClick={handleSubmit}
              >
                Submit {captureMode === "quick" ? "Minimum Pack" : "Complete Pack"}
              </button>
            </div>
            <small style={{ color: "#666", marginTop: 4 }}>
              {captureMode === "quick"
                ? "If safe, you can complete the ideal pack after quick submission."
                : "Your evidence helps verify election results! Photos will be watermarked as 'Unofficial'."}
            </small>
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