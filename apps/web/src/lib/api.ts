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

// ============================================
// Milestone 18: Status Metrics Type
// ============================================

export interface StatusMetrics {
  uptime: number;
  snapshot_freshness_seconds: number;
  read_only_mode: boolean;
  queue_depth: number;
  verified_stations: number;
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

// ============================================
// Milestone 18: Operational Readiness & Election Night Command
// ============================================

export async function fetchStatusMetrics(): Promise<{
  uptime: number;
  snapshot_freshness_seconds: number;
  read_only_mode: boolean;
  queue_depth: number;
  verified_stations: number;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/status/metrics`);
    if (!res.ok) throw new Error("status metrics fetch failed");
    return await res.json();
  } catch {
    return {
      uptime: 99.9,
      snapshot_freshness_seconds: 0,
      read_only_mode: false,
      queue_depth: 0,
      verified_stations: 0
    };
  }
}

export async function enableReadOnlyMode(adminId?: string): Promise<{ message: string; read_only_mode: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/admin/enable-read-only${adminId ? `?admin_id=${encodeURIComponent(adminId)}` : ""}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("enable read-only failed");
  return await res.json();
}

export async function disableReadOnlyMode(adminId?: string): Promise<{ message: string; read_only_mode: boolean }> {
  const res = await fetch(`${API_BASE}/api/v1/admin/disable-read-only${adminId ? `?admin_id=${encodeURIComponent(adminId)}` : ""}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("disable read-only failed");
  return await res.json();
}

export async function fetchReadOnlyStatus(): Promise<{ read_only_mode: boolean; last_updated: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/admin/read-only-status`);
    if (!res.ok) throw new Error("read-only status fetch failed");
    return await res.json();
  } catch {
    return { read_only_mode: false, last_updated: null };
  }
}

// ============================================
// Milestone 19: Reviewer Ops at Scale
// ============================================

export interface ReviewerThroughput {
  reviewer_id: string;
  period_start: string;
  sheets_reviewed: number;
  auto_verified_count: number;
  corrected_count: number;
  dispute_rate: number;
}

export async function fetchReviewerThroughput(reviewerId?: string, period?: "hour" | "day" | "week"): Promise<ReviewerThroughput[]> {
  try {
    const params = new URLSearchParams();
    if (reviewerId) params.append("reviewer_id", reviewerId);
    if (period) params.append("period", period);
    const res = await fetch(`${API_BASE}/api/v1/admin/reviewer-throughput?${params.toString()}`);
    if (!res.ok) throw new Error("throughput fetch failed");
    return (await res.json()).throughput || [];
  } catch {
    return [];
  }
}

export async function startReviewerShift(reviewerId: string): Promise<{ shift_id: string | null }> {
  const res = await fetch(`${API_BASE}/api/v1/admin/fatigue/start-shift`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reviewer_id: reviewerId })
  });
  if (!res.ok) throw new Error("start shift failed");
  return await res.json();
}

export async function endReviewerShift(shiftId: string, fatigueScore?: number): Promise<{ shift_id: string | null }> {
  const res = await fetch(`${API_BASE}/api/v1/admin/fatigue/end-shift`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ shift_id: shiftId, fatigue_score: fatigueScore || 0 })
  });
  if (!res.ok) throw new Error("end shift failed");
  return await res.json();
}

export interface PrioritizedSubmission {
  submission: any;
  priority: string;
}

export async function fetchPrioritizedQueue(sheetType?: "constituency" | "partylist" | "all"): Promise<PrioritizedSubmission> {
  try {
    const params = new URLSearchParams();
    if (sheetType) params.append("sheet_type", sheetType);
    const res = await fetch(`${API_BASE}/api/v1/admin/queue/next-prioritized?${params.toString()}`);
    if (!res.ok) throw new Error("prioritized queue fetch failed");
    return await res.json();
  } catch {
    return { submission: null, priority: "" };
  }
}

// ============================================
// Milestone 20: Volunteer UX v2
// ============================================

export async function checkGeoSanity(stationId: string, userLat: number, userLon: number): Promise<{ warning: any }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/geo/check`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ station_id: stationId, user_lat: userLat, user_lon: userLon })
    });
    if (!res.ok) throw new Error("geo check failed");
    return await res.json();
  } catch {
    return { warning: null };
  }
}

export async function fetchOfflineQueueStatus(userId?: string): Promise<{
  pending_count: number;
  syncing_count: number;
  success_count: number;
  failed_count: number;
}> {
  try {
    const params = new URLSearchParams();
    if (userId) params.append("user_session_id", userId);
    const res = await fetch(`${API_BASE}/api/v1/offline/queue/status?${params.toString()}`);
    if (!res.ok) throw new Error("offline queue status fetch failed");
    return await res.json();
  } catch {
    return { pending_count: 0, syncing_count: 0, success_count: 0, failed_count: 0 };
  }
}

// ============================================
// Milestone 21: Media / Partner API
// ============================================

export async function fetchApiVersion(): Promise<{
  current_version: string;
  supported_versions: string[];
  latest: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/version`);
    if (!res.ok) throw new Error("version fetch failed");
    return await res.json();
  } catch {
    return { current_version: "v1", supported_versions: ["v1"], latest: "v1" };
  }
}

export async function createBulkExport(exportType: "national" | "province" | "constituency" | "daily_bundle", format: "csv" | "json" | "sql", provinceId?: string): Promise<{
  export_id: string | null;
  export_type: string;
  format: string;
  data: any;
  provenance: {
    build_timestamp: string;
    dataset_hash: string;
    export_id: string;
  };
}> {
  const params = new URLSearchParams({ type: exportType, format });
  if (provinceId) params.append("province_id", provinceId);
  const res = await fetch(`${API_BASE}/api/v1/bulk/export?${params.toString()}`);
  if (!res.ok) throw new Error("bulk export failed");
  return await res.json();
}

export async function fetchPartnerSnapshots(token?: string): Promise<{ snapshots: any[] }> {
  try {
    const headers: HeadersInit = {};
    if (token) headers["X-Partner-Token"] = token;
    const res = await fetch(`${API_BASE}/api/v1/partner/snapshots/latest`, { headers });
    if (!res.ok) throw new Error("partner snapshots fetch failed");
    return await res.json();
  } catch {
    return { snapshots: [] };
  }
}

// ============================================
// Milestone 22: Censorship / Blocking Resistance
// ============================================

export async function checkMirrorHealth(mirrorId: string): Promise<{ mirror: any }> {
  const res = await fetch(`${API_BASE}/api/v1/mirror/health-check`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mirror_id: mirrorId })
  });
  if (!res.ok) throw new Error("mirror health check failed");
  return await res.json();
}

export async function fetchFailoverStatus(): Promise<{
  primary_domain: string;
  active_domains: any[];
  status: string;
}> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/failover/status`);
    if (!res.ok) throw new Error("failover status fetch failed");
    return await res.json();
  } catch {
    return { primary_domain: "election-thai.vercel.app", active_domains: [], status: "operational" };
  }
}

export async function fetchDistributionPack(): Promise<{ pack: any }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/distribution/pack/latest`);
    if (!res.ok) throw new Error("distribution pack fetch failed");
    return await res.json();
  } catch {
    return { pack: null };
  }
}

// ============================================
// Milestone 23: Legal Action Kit v3
// ============================================

export interface LegalCase {
  id: string;
  case_title: string;
  case_type: string;
  status: string;
  created_at: string;
  created_by?: string;
  impact_analysis?: any;
  tags?: string[];
}

export async function fetchLegalCases(userId?: string): Promise<LegalCase[]> {
  try {
    const params = new URLSearchParams();
    if (userId) params.append("user_id", userId);
    const res = await fetch(`${API_BASE}/api/v1/legal/cases?${params.toString()}`);
    if (!res.ok) throw new Error("legal cases fetch failed");
    return (await res.json()).cases || [];
  } catch {
    return [];
  }
}

export async function createLegalCase(payload: {
  case_title: string;
  case_type: string;
  case_description?: string;
  created_by?: string;
  tags?: string[];
  impact_analysis?: any;
}): Promise<{ case_id: string | null }> {
  const res = await fetch(`${API_BASE}/api/v1/legal/cases`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("create case failed");
  return await res.json();
}

export async function fetchLegalCase(caseId: string): Promise<{ case: any; stations: any[]; incidents: any[]; evidence: any[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/legal/case/${encodeURIComponent(caseId)}`);
    if (!res.ok) throw new Error("get case failed");
    return await res.json();
  } catch {
    return { case: null, stations: [], incidents: [], evidence: [] };
  }
}

export async function addStationToCase(caseId: string, stationId: string, notes?: string, priority?: number): Promise<{ case_station_id: string | null }> {
  const res = await fetch(`${API_BASE}/api/v1/legal/case/${caseId}/station`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ station_id: stationId, notes, priority })
  });
  if (!res.ok) throw new Error("add station to case failed");
  return await res.json();
}

export interface FilingWorkflow {
  id: string;
  case_id: string;
  channel: string;
  status: string;
  tracking_id?: string;
  created_at: string;
}

export async function fetchFilingWorkflows(caseId: string): Promise<FilingWorkflow[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/legal/filing/${caseId}`);
    if (!res.ok) throw new Error("filing workflows fetch failed");
    return (await res.json()).filings || [];
  } catch {
    return [];
  }
}

export async function createFilingWorkflow(payload: {
  case_id: string;
  channel: string;
  status?: string;
  tracking_id?: string;
  next_action?: string;
  next_action_date?: string;
}): Promise<{ filing_id: string | null }> {
  const res = await fetch(`${API_BASE}/api/v1/legal/filing`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("create filing workflow failed");
  return await res.json();
}

export async function redactPhoto(photoKey: string, redactionType: string, coordinates?: any): Promise<{ redaction_id: string | null; redacted_photo_key: string }> {
  const res = await fetch(`${API_BASE}/api/v1/legal/redact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ photo_key: photoKey, redaction_type: redactionType, coordinates })
  });
  if (!res.ok) throw new Error("redaction failed");
  return await res.json();
}

export async function createLegalPacket(caseId: string, packetType: string, includesRedacted?: boolean): Promise<{
  packet_id: string | null;
  packet_version: number;
  file_hash: string;
  generated_at: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/legal/packet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ case_id: caseId, packet_type: packetType, includes_redacted: includesRedacted })
  });
  if (!res.ok) throw new Error("create packet failed");
  return await res.json();
}

// ============================================
// Milestone 24: Governance, Credibility, and Trust Signals
// ============================================

export interface GovernanceContent {
  [key: string]: {
    section: string;
    title: string;
    content: string;
    last_updated_at: string;
  };
}

export async function fetchGovernanceContent(): Promise<GovernanceContent> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/governance/content`);
    if (!res.ok) throw new Error("governance content fetch failed");
    return await res.json();
  } catch {
    return {
      mission: { section: "mission", title: "Our Mission", content: "To provide independent election transparency through citizen observation.", last_updated_at: "" },
      non_partisan: { section: "non_partisan", title: "Non-Partisan Stance", content: "We are strictly non-partisan.", last_updated_at: "" },
      methodology: { section: "methodology", title: "Methodology", content: "Multiple observers verify evidence with checksums.", last_updated_at: "" },
      funding: { section: "funding", title: "Funding Disclosure", content: "Funding sources will be disclosed.", last_updated_at: "" }
    };
  }
}

export interface TransparencyLogEntry {
  id: string;
  event_type: string;
  severity: string;
  details: string;
  affected_count: number;
  action_taken?: string;
  logged_at: string;
}

export async function fetchTransparencyLog(eventType?: string, severity?: "info" | "warning" | "critical"): Promise<TransparencyLogEntry[]> {
  try {
    const params = new URLSearchParams();
    if (eventType) params.append("event_type", eventType);
    if (severity) params.append("severity", severity);
    const res = await fetch(`${API_BASE}/api/v1/transparency/log?${params.toString()}`);
    if (!res.ok) throw new Error("transparency log fetch failed");
    return (await res.json()).log || [];
  } catch {
    return [];
  }
}

export async function fetchModerationSummary(startDate?: string): Promise<{ summary: any[] }> {
  const params = new URLSearchParams();
  if (startDate) params.append("start_date", startDate);
  try {
    const res = await fetch(`${API_BASE}/api/v1/moderation/summary?${params.toString()}`);
    if (!res.ok) throw new Error("moderation summary fetch failed");
    return await res.json();
  } catch {
    return { summary: [] };
  }
}

// ============================================
// Milestone 25: Election Rule Engine
// ============================================

export interface ElectionRule {
  id: string;
  name: string;
  description: string;
  rule_type: string;
  config: any;
  effective_from?: string;
  effective_to?: string;
  is_active: boolean;
}

export async function fetchElectionRules(): Promise<{ current_rule: string | null; rules: ElectionRule[] }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/election/rules`);
    if (!res.ok) throw new Error("election rules fetch failed");
    return await res.json();
  } catch {
    return { current_rule: "2024_party_list", rules: [] };
  }
}

export async function simulateSeatAllocation(ruleSetId: string, inputData: any): Promise<{
  simulation_id: string | null;
  results: any;
  input_data_hash: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/election/simulate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rule_set_id: ruleSetId, input_data: inputData })
  });
  if (!res.ok) throw new Error("simulation failed");
  return await res.json();
}

export interface PartyVoteTotal {
  id: string;
  party_id: string;
  election_date: string;
  valid_votes: number;
  invalid_votes: number;
  total_votes: number;
  constituency_seats_won: number;
  party_list_seats_allocated: number;
}

export async function fetchPartyVotes(electionDate?: string): Promise<PartyVoteTotal[]> {
  try {
    const params = new URLSearchParams();
    if (electionDate) params.append("election_date", electionDate);
    const res = await fetch(`${API_BASE}/api/v1/election/party-votes?${params.toString()}`);
    if (!res.ok) throw new Error("party votes fetch failed");
    return (await res.json()).votes || [];
  } catch {
    return [];
  }
}

export interface PartyListAllocation {
  id: string;
  allocation_date: string;
  party_id: string;
  party?: { name_th: string; abbreviation: string };
  votes: number;
  constituency_seats: number;
  initial_party_list_seats: number;
  remainder_seats: number;
  total_seats: number;
}

export async function fetchPartyListAllocations(allocationDate: string): Promise<PartyListAllocation[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/election/allocation/${allocationDate}`);
    if (!res.ok) throw new Error("allocation details fetch failed");
    return (await res.json()).allocations || [];
  } catch {
    return [];
  }
}