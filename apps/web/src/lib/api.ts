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

// Public snapshot types
export interface SubmissionSummary {
  submission_id: string;
  created_at: string;
  status_constituency: "missing" | "pending" | "verified" | "rejected" | "disputed";
  status_partylist: "missing" | "pending" | "verified" | "rejected" | "disputed";
  has_constituency_photo: boolean;
  has_partylist_photo: boolean;
  checksums: {
    constituency: number | null;
    partylist: number | null;
  };
  verified_tallies: {
    constituency: number | null;
    partylist: number | null;
  };
}

export interface StationSummary {
  station_id: string;
  station_number: number;
  location_name: string | null;
  constituency_id: number;
  subdistrict_name: string;
  submissions: SubmissionSummary[];
}

export interface ProvinceStats {
  province_id: number;
  province_name: string;
  total_stations: number;
  verified_stations: number;
  coverage_percent: number;
}

export interface SnapshotMetadata {
  // Deterministic fields (same input = same output for hashing)
  snapshot_version: string;
  total_stations: number;
  verified_submissions: number;
  pending_review: number;
  disputed_count: number;
  verified_constituency_tallies: number;
  verified_partylist_tallies: number;
  rejected_submissions: number;
  // Metadata (may vary between runs)
  generated_at: string;
  last_updated: string | null;
  provenance: {
    build_time: string;
    runtime_version: string;
    database_version?: string;
  };
  coverage_statistics: {
    total_percent: number;
    verified_constituency_percent: number;
    verified_partylist_percent: number;
  };
}

export interface PublicSnapshot {
  metadata: SnapshotMetadata;
  provinces: Province[];
  constituencies: Constituency[];
  stations: StationSummary[];
  province_stats: ProvinceStats[];
  last_verified_at: string | null;
}

// Evidence types
export interface StationEvidence {
  station_id: string;
  submissions: SubmissionSummary[];
  incidents: IncidentResponse[];
  custody_events: CustodyEventResponse[];
}

export interface IncidentResponse {
  id: string;
  incident_type: string;
  occurred_at: string | null;
  description: string | null;
  media_keys: string[];
  created_at: string;
}

export interface CustodyEventResponse {
  id: string;
  event_type: string;
  occurred_at: string | null;
  box_id: string | null;
  seal_id: string | null;
  notes: string | null;
  media_keys: string[];
  created_at: string;
}

export interface LegalKit {
  station_info: {
    station_id: string;
    station_number: number;
    location_name: string | null;
    constituency_id: number;
    subdistrict_id: number | null;
    subdistrict_name: string;
  };
  submissions: SubmissionSummary[];
  incidents: IncidentResponse[];
  custody_events: CustodyEventResponse[];
  verification_logs: {
    tally_id: string;
    reviewer_id: string;
    sheet_type: string;
    status: string;
    created_at: string;
  }[];
  photo_hashes: {
    key: string;
    hash: string;
  }[];
  generated_at: string;
}

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

export interface IncidentPayload {
  incident_type: string;
  occurred_at: string | null;
  description: string | null;
  media_keys: string[];
  station_id: string;
  constituency_id: number;
  subdistrict_id: number | null;
  station_number: number;
}

export interface CustodyPayload {
  event_type: string;
  occurred_at: string | null;
  box_id: string | null;
  seal_id: string | null;
  notes: string | null;
  media_keys: string[];
  station_id: string;
  constituency_id: number;
  subdistrict_id: number | null;
  station_number: number;
}

export async function submitIncident(payload: IncidentPayload): Promise<{ id?: string }> {
  const res = await fetch(`${API_BASE}/api/v1/incident/report`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("incident report failed");
  return await res.json();
}

export async function submitCustody(payload: CustodyPayload): Promise<{ id?: string }> {
  const res = await fetch(`${API_BASE}/api/v1/custody/event`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("custody event failed");
  return await res.json();
}

export async function fetchPublicSnapshot(includePreliminary = false): Promise<PublicSnapshot> {
  try {
    const url = `${API_BASE}/api/v1/snapshot${includePreliminary ? "?include_preliminary=true" : ""}`;
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("snapshot fetch failed");
    return await res.json();
  } catch {
    // Return mock data for development
    return {
      metadata: {
        generated_at: new Date().toISOString(),
        snapshot_version: "1.0.0",
        last_updated: "1970-01-01T00:00:00.000Z",
        total_stations: 0,
        verified_submissions: 0,
        pending_review: 0,
        disputed_count: 0,
        verified_constituency_tallies: 0,
        verified_partylist_tallies: 0,
        rejected_submissions: 0,
        provenance: {
          build_time: "1970-01-01T00:00:00.000Z",
          runtime_version: "1.0.0",
          database_version: "v1"
        },
        coverage_statistics: {
          total_percent: 0,
          verified_constituency_percent: 0,
          verified_partylist_percent: 0
        }
      },
      provinces: [],
      constituencies: [],
      stations: [],
      province_stats: [],
      last_verified_at: null
    };
  }
}

export async function fetchStationEvidence(stationId: string): Promise<StationEvidence> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/station/${encodeURIComponent(stationId)}/evidence`);
    if (!res.ok) throw new Error("station evidence fetch failed");
    return await res.json();
  } catch {
    // Return mock data for development
    return {
      station_id: stationId,
      submissions: [],
      incidents: [],
      custody_events: []
    };
  }
}

export interface PresignedUploadResponse {
  url: string;
  key: string;
  fields: Record<string, string>;
  fileType: string;
}

export async function fetchPresignedUpload(filename: string, type: string = "image/jpeg", uploadType: string = "evidence"): Promise<PresignedUploadResponse> {
  try {
    const url = `${API_BASE}/api/v1/storage/presigned?filename=${encodeURIComponent(filename)}&type=${encodeURIComponent(type)}&upload_type=${encodeURIComponent(uploadType)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("presigned URL fetch failed");
    return await res.json();
  } catch {
    return {
      url: "",
      key: "",
      fields: {},
      fileType: type
    };
  }
}

export async function fetchLegalKit(stationId: string): Promise<LegalKit | null> {
  try {
    const url = `${API_BASE}/api/v1/legal-kit/${encodeURIComponent(stationId)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("legal kit fetch failed");
    return await res.json();
  } catch {
    return null;
  }
}

export async function submitEvidence(payload: {
  station_id: string;
  photo_constituency_key?: string;
  photo_partylist_key?: string;
  checksum_constituency_total?: number;
  checksum_partylist_total?: number;
  user_session_id?: string;
  captcha_token?: string;
}): Promise<{ submission_id: string | null; status: string }> {
  const res = await fetch(`${API_BASE}/api/v1/evidence/upload`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("evidence upload failed");
  return await res.json();
}

// Offline Queue support
// Check if user is online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Queue for offline submissions
export interface OfflineItem {
  id: string;
  type: "evidence" | "incident" | "custody" | "process";
  payload: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_STORAGE_KEY = "evidence_offline_queue";

// Get current queue from localStorage
export function getOfflineQueue(): OfflineItem[] {
  try {
    const data = localStorage.getItem(QUEUE_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Add item to queue
export function addToOfflineQueue(item: OfflineItem): void {
  try {
    const queue = getOfflineQueue();
    queue.push(item);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to add to offline queue:", e);
  }
}

// Remove item from queue after successful sync
export function removeFromQueue(id: string): void {
  try {
    const queue = getOfflineQueue();
    const filtered = queue.filter((item) => item.id !== id);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to remove from queue:", e);
  }
}

// Clear queue
export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear queue:", e);
  }
}

// Sync queue to server
export async function syncOfflineQueue(): Promise<{ success: number; failed: number }> {
  const queue = getOfflineQueue();
  let success = 0;
  let failed = 0;
  const failedItems: OfflineItem[] = [];

  for (const item of queue) {
    try {
      await submitOfflineItem(item);
      success++;
    } catch (e) {
      failed++;
      failedItems.push(item);
    }
  }

  // Keep failed items in queue
  if (failed > 0) {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(failedItems));
  } else {
    clearOfflineQueue();
  }

  return { success, failed };
}

// Submit a single offline item
async function submitOfflineItem(item: OfflineItem): Promise<void> {
  const url = `${API_BASE}/api/v1/${item.type === "evidence" ? "evidence/upload" : item.type === "incident" ? "incident/report" : item.type === "custody" ? "custody/event" : "process/report"}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(item.payload),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}