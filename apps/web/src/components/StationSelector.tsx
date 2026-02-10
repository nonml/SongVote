import React from "react";
import type { Config, Station } from "../lib/api";

type Props = {
  cfg: Config;
  value?: Station | null;
  onChange: (station: Station | null) => void;
  onNeedUnlisted?: (ctx: { constituency_id: number; subdistrict_id: number | null; subdistrict_name: string }) => void;
};

export default function StationSelector({ cfg, value, onChange, onNeedUnlisted }: Props) {
  const [provinceId, setProvinceId] = React.useState<number | "">("");
  const [constituencyId, setConstituencyId] = React.useState<number | "">("");
  const [subdistrictId, setSubdistrictId] = React.useState<number | "">("");
  const [stationId, setStationId] = React.useState<string>("");

  const constituencies = React.useMemo(() => (!provinceId ? [] : cfg.constituencies.filter(c => c.province_id === provinceId)), [cfg, provinceId]);
  const subdistricts = React.useMemo(() => (!constituencyId ? [] : cfg.subdistricts.filter(s => s.constituency_id === constituencyId)), [cfg, constituencyId]);

  const stations = React.useMemo(() => {
    if (!constituencyId) return [];
    let xs = cfg.stations.filter(s => s.constituency_id === constituencyId);
    if (subdistrictId) xs = xs.filter(s => s.subdistrict_id === subdistrictId);
    return xs.sort((a,b) => a.station_number - b.station_number);
  }, [cfg, constituencyId, subdistrictId]);

  React.useEffect(() => {
    if (!value) return;
    const prov = cfg.constituencies.find(c => c.id === value.constituency_id)?.province_id ?? "";
    setProvinceId(prov);
    setConstituencyId(value.constituency_id);
    setSubdistrictId((value.subdistrict_id ?? "") as any);
    setStationId(value.id);
  }, [value, cfg]);

  function setStationById(id: string) {
    setStationId(id);
    onChange(cfg.stations.find(s => s.id === id) ?? null);
  }

  return (
    <div className="card">
      <div className="row">
        <div style={{ flex: 1, minWidth: 180 }}>
          <label>Province</label>
          <select className="input" value={provinceId} onChange={e => {
            const v = e.target.value ? Number(e.target.value) : "";
            setProvinceId(v); setConstituencyId(""); setSubdistrictId(""); setStationId(""); onChange(null);
          }}>
            <option value="">Select…</option>
            {cfg.provinces.map(p => <option key={p.id} value={p.id}>{p.name_th}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <label>Constituency (Khet)</label>
          <select className="input" value={constituencyId} onChange={e => {
            const v = e.target.value ? Number(e.target.value) : "";
            setConstituencyId(v); setSubdistrictId(""); setStationId(""); onChange(null);
          }} disabled={!provinceId}>
            <option value="">Select…</option>
            {constituencies.map(c => <option key={c.id} value={c.id}>Khet {c.khet_number}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label>Subdistrict (Tambon)</label>
          <select className="input" value={subdistrictId} onChange={e => {
            const v = e.target.value ? Number(e.target.value) : "";
            setSubdistrictId(v); setStationId(""); onChange(null);
          }} disabled={!constituencyId}>
            <option value="">All / Select…</option>
            {subdistricts.map(s => <option key={`${s.subdistrict_id}-${s.subdistrict_name}`} value={s.subdistrict_id}>{s.subdistrict_name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label>Station</label>
        <select className="input" value={stationId} onChange={e => setStationById(e.target.value)} disabled={!constituencyId}>
          <option value="">Select…</option>
          {stations.map(s => <option key={s.id} value={s.id}>หน่วย {s.station_number} — {s.location_name ?? "N/A"}</option>)}
        </select>

        {constituencyId ? (
          <div style={{ marginTop: 10, display:"flex", justifyContent:"space-between", gap: 10, flexWrap:"wrap" }}>
            <small>Can’t find your station? Use “Unlisted Station”.</small>
            <button className="btn secondary" onClick={() => {
              if (!onNeedUnlisted) return;
              const sd = subdistricts.find(x => x.subdistrict_id === subdistrictId) ?? subdistricts[0];
              onNeedUnlisted({
                constituency_id: constituencyId as number,
                subdistrict_id: subdistrictId ? (subdistrictId as number) : (sd?.subdistrict_id ?? null),
                subdistrict_name: sd?.subdistrict_name ?? "UNKNOWN",
              });
            }}>+ Unlisted Station</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
