// Trust & Safety controls for MVP2
// Anti-abuse measures and multi-mirror support

export interface AbuseReport {
  id: string;
  type: "spam" | "trolling" | "harassment" | "misinformation" | "other";
  reporter_id: string;
  reported_id?: string;
  station_id?: string;
  content_summary: string;
  evidence_keys?: string[];
  created_at: string;
  status: "open" | "investigating" | "action_taken" | "dismissed";
  action_taken?: string;
  resolved_by?: string;
}

export interface AbuseConfig {
  maxSubmissionsPerHour: number;
  maxSubmissionsPerDay: number;
  maxPhotosPerSubmission: number;
  minTimeBetweenSubmissions: number;
  requireCaptcha: boolean;
}

export interface MirrorNode {
  id: string;
  url: string;
  region: string;
  status: "active" | "degraded" | "offline";
  lastSync: string | null;
  latencyMs: number | null;
}

// Anti-abuse thresholds (configurable)
export const ABUSE_THRESHOLDS = {
  maxSubmissionsPerHour: 10,
  maxSubmissionsPerDay: 50,
  maxPhotosPerSubmission: 4,
  minTimeBetweenSubmissions: 30000, // 30 seconds
};

// Calculate risk score for a user/session
export function calculateUserRiskScore(
  submissions: Array<{ created_at: string; station_id: string }>,
  custodyEvents: Array<{ created_at: string; event_type: string }>,
  incidents: Array<{ created_at: string; incident_type: string }>,
  currentWindowHours: number = 1
): number {
  let riskScore = 0;
  const now = Date.now();
  const windowMs = currentWindowHours * 60 * 60 * 1000;

  // Count submissions in window
  const recentSubmissions = submissions.filter(
    s => now - new Date(s.created_at).getTime() < windowMs
  ).length;

  // High submission frequency
  if (recentSubmissions > ABUSE_THRESHOLDS.maxSubmissionsPerHour) {
    riskScore += 30;
  } else if (recentSubmissions > 5) {
    riskScore += 15;
  }

  // Check for suspicious patterns
  // Multiple stations in short time (impossible for one person)
  const uniqueStations = new Set(submissions.map(s => s.station_id)).size;
  // Check if ratio of unique stations to submissions is high (> 2 means >2 stations per submission on average)
  // This would only be possible if some submissions go to multiple stations
  // For now, use the inverse: check if submissions are concentrated on few stations
  // (many submissions per station) which indicates spam/bot behavior
  if (recentSubmissions > 0 && recentSubmissions / uniqueStations > 2) {
    riskScore += 20; // Suspicious: many submissions per station
  }

  // Check for excessive custody/incident reports (potential trolling)
  const recentCustody = custodyEvents.filter(
    c => now - new Date(c.created_at).getTime() < windowMs
  ).length;
  const recentIncidents = incidents.filter(
    i => now - new Date(i.created_at).getTime() < windowMs
  ).length;

  if (recentCustody > 10) riskScore += 15;
  if (recentIncidents > 10) riskScore += 15;

  // Check for seal mismatch overuse (common false positive indicator)
  const sealMismatches = incidents.filter(
    i => i.incident_type === "seal_broken_or_mismatch" ||
         i.incident_type === "seal_intact_before_open"
  ).length;
  if (sealMismatches > 5) riskScore += 10;

  return Math.min(100, riskScore);
}

// Determine if action is needed
export function shouldTakeAction(riskScore: number): {
  needsReview: boolean;
  needsBlock: boolean;
  recommendedAction: "none" | "review" | "temp_block" | "permanent_block";
} {
  if (riskScore >= 70) {
    return {
      needsReview: true,
      needsBlock: true,
      recommendedAction: "permanent_block",
    };
  }
  if (riskScore >= 50) {
    return {
      needsReview: true,
      needsBlock: false,
      recommendedAction: "temp_block",
    };
  }
  if (riskScore >= 30) {
    return {
      needsReview: true,
      needsBlock: false,
      recommendedAction: "review",
    };
  }
  return {
    needsReview: false,
    needsBlock: false,
    recommendedAction: "none",
  };
}

// Multi-mirror configuration
export const DEFAULT_MIRRORS: MirrorNode[] = [
  { id: "mirror-th-bkk", url: "https://th-election-mirror-1.example.com", region: "Bangkok, TH", status: "active", lastSync: null, latencyMs: null },
  { id: "mirror-th-pku", url: "https://th-election-mirror-2.example.com", region: "Pathum Thani, TH", status: "active", lastSync: null, latencyMs: null },
  { id: "mirror-sg-sgp", url: "https://sg-election-mirror.example.com", region: "Singapore", status: "active", lastSync: null, latencyMs: null },
  { id: "mirror-jp-tky", url: "https://jp-election-mirror.example.com", region: "Tokyo, JP", status: "degraded", lastSync: null, latencyMs: null },
];

// Find best available mirror
export function getBestMirror(mirrors: MirrorNode[]): MirrorNode | null {
  const activeMirrors = mirrors.filter(m => m.status === "active");
  if (activeMirrors.length === 0) return null;
  // Return mirror with lowest latency (or first if unknown)
  return activeMirrors.sort((a, b) => {
    if (a.latencyMs === null && b.latencyMs === null) return 0;
    if (a.latencyMs === null) return 1;
    if (b.latencyMs === null) return -1;
    return a.latencyMs - b.latencyMs;
  })[0] || activeMirrors[0];
}

// Get mirror sync status
export function getMirrorSyncStatus(mirrors: MirrorNode[]): {
  total: number;
  active: number;
  degraded: number;
  offline: number;
  overallHealth: "healthy" | "degraded" | "critical";
} {
  const total = mirrors.length;
  const active = mirrors.filter(m => m.status === "active").length;
  const degraded = mirrors.filter(m => m.status === "degraded").length;
  const offline = mirrors.filter(m => m.status === "offline").length;

  let overallHealth: "healthy" | "degraded" | "critical" = "healthy";
  if (offline > 0 || active < 2) {
    overallHealth = "critical";
  } else if (degraded > 0) {
    overallHealth = "degraded";
  }

  return { total, active, degraded, offline, overallHealth };
}