export type Province = { id: number; name_th: string };
export type Constituency = { id: number; province_id: number; khet_number: number };
export type Station = {
  id: string;
  constituency_id: number;
  subdistrict_id: number | null;
  subdistrict_name: string;
  station_number: number;
  location_name?: string | null;
  is_verified_exist: boolean;
};
export type Config = {
  provinces: Province[];
  constituencies: Constituency[];
  subdistricts: { constituency_id: number; subdistrict_id: number; subdistrict_name: string }[];
  stations: Station[];
};

const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function fetchConfig(): Promise<Config> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/config`, { cache: "no-store" });
    if (!res.ok) throw new Error("config fetch failed");
    return await res.json();
  } catch {
    const mod = await import("../mock/config.json");
    return mod.default as Config;
  }
}

export async function createUnlistedStation(payload: {
  constituency_id: number;
  subdistrict_id: number | null;
  subdistrict_name: string;
  station_number: number;
  location_name?: string;
}): Promise<{ station_id: string; created: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/station/suggest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("station suggest failed");
  return await res.json();
}

export async function submitIncident(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/incident/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("incident report failed");
  return await res.json();
}

export async function submitCustody(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/custody/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("custody event failed");
  return await res.json();
}
