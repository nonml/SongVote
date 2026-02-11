// Security Hardening Module - MVP2 Milestone 17
// Threat modeling, Row-Level Security (RLS) patterns, and encryption

import { createHash } from "crypto";

// Type definitions
export interface ThreatLog {
  id: string;
  timestamp: string;
  type: "brute_force" | "ddos" | "injection" | "tampering" | "access_violation" | "other";
  severity: "low" | "medium" | "high" | "critical";
  source_ip?: string;
  user_id?: string;
  target?: string;
  details: string;
  action_taken?: string;
}

export interface RLSConfig {
  role: string;
  allowed_tables: string[];
  allowed_columns: Record<string, string[]>;
  row_filter?: string;
}

export interface EncryptedField<T = unknown> {
  ciphertext: string;
  nonce: string;
  tag: string;
  algorithm: "aes-256-gcm";
}

// Threat detection thresholds
export const THREAT_THRESHOLDS = {
  maxRequestsPerMinute: 60,
  maxLoginAttemptsPerHour: 10,
  maxSubmissionsPerStation: 5,
  suspiciousUserAgentPatterns: [
    "sqlmap",
    "nikto",
    "nmap",
    "masscan",
    "gobuster",
    "dirbuster",
  ],
};

// Threat severity scores
export const SEVERITY_SCORES = {
  low: 1,
  medium: 2,
  high: 4,
  critical: 8,
};

// Generate SHA-256 hash for integrity verification
export function hashData(data: string | Uint8Array): string {
  if (typeof data === "string") {
    return createHash("sha256").update(data).digest("hex");
  }
  return createHash("sha256").update(data).digest("hex");
}

// Generate SHA-384 hash for stronger integrity
export function hashDataStrong(data: string | Uint8Array): string {
  if (typeof data === "string") {
    return createHash("sha384").update(data).digest("hex");
  }
  return createHash("sha384").update(data).digest("hex");
}

// Generate SHA-512 hash for maximum integrity
export function hashDataMax(data: string | Uint8Array): string {
  if (typeof data === "string") {
    return createHash("sha512").update(data).digest("hex");
  }
  return createHash("sha512").update(data).digest("hex");
}

// Validate checksum (comparison with tolerance for floating point)
export function validateChecksum(
  received: number,
  calculated: number,
  tolerance: number = 0
): boolean {
  return Math.abs(received - calculated) <= tolerance;
}

// Rate limit tracking
export interface RateLimitState {
  requests: number[];
  blocked: boolean;
  blockUntil?: number;
}

// Track rate limit state
export function trackRateLimit(
  state: RateLimitState,
  currentTimestamp: number,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  // Clean old requests
  const windowStart = currentTimestamp - windowMs;
  state.requests = state.requests.filter(ts => ts > windowStart);

  // Check if blocked
  if (state.blocked && state.blockUntil && currentTimestamp < state.blockUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: state.blockUntil,
    };
  }

  // Reset block if expired
  if (state.blocked && state.blockUntil && currentTimestamp >= state.blockUntil) {
    state.blocked = false;
    state.blockUntil = undefined;
    state.requests = [];
  }

  // Calculate remaining
  const remaining = Math.max(0, THREAT_THRESHOLDS.maxRequestsPerMinute - state.requests.length);

  // Allow or block
  if (state.requests.length >= THREAT_THRESHOLDS.maxRequestsPerMinute) {
    state.blocked = true;
    state.blockUntil = currentTimestamp + 60000; // Block for 1 minute
    return {
      allowed: false,
      remaining: 0,
      resetTime: state.blockUntil,
    };
  }

  // Record request
  state.requests.push(currentTimestamp);

  return {
    allowed: true,
    remaining: remaining - 1,
    resetTime: currentTimestamp + windowMs,
  };
}

// Detect suspicious user agent
export function isSuspiciousUserAgent(ua: string): boolean {
  const lowerUa = ua.toLowerCase();
  return THREAT_THRESHOLDS.suspiciousUserAgentPatterns.some(pattern =>
    lowerUa.includes(pattern)
  );
}

// Sanitize user input to prevent injection
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

// Encrypt data (simulated for browser environment)
export function encryptData<T>(data: T, key: string): EncryptedField {
  // In production, use Web Crypto API
  // const encoder = new TextEncoder();
  // const keyMaterial = await window.crypto.subtle.importKey(...);
  // const encrypted = await window.crypto.subtle.encrypt(...);
  const serialized = JSON.stringify(data);
  // Simulated encryption
  const nonce = crypto.randomUUID();
  const ciphertext = btoa(serialized); // Base64 (not real encryption)
  const tag = hashData(ciphertext + key);

  return {
    ciphertext,
    nonce,
    tag,
    algorithm: "aes-256-gcm",
  };
}

// Decrypt data (simulated)
export function decryptData<T>(encrypted: EncryptedField, key: string): T | null {
  try {
    const serialized = atob(encrypted.ciphertext);
    // Verify tag
    const expectedTag = hashData(encrypted.ciphertext + key);
    if (encrypted.tag !== expectedTag) {
      return null; // Tampering detected
    }
    return JSON.parse(serialized) as T;
  } catch {
    return null;
  }
}

// Validate request integrity
export function validateRequestIntegrity(
  payload: Record<string, unknown>,
  signature: string,
  secret: string
): boolean {
  const payloadString = JSON.stringify(payload);
  const expectedSig = hashData(payloadString + secret);
  return signature === expectedSig;
}

// Generate session token
export function generateSessionToken(userId: string): string {
  const timestamp = Date.now();
  const random = crypto.randomUUID();
  const hash = hashData(`${userId}-${timestamp}-${random}`).slice(0, 32);
  return `sess_${hash}_${timestamp}`;
}

// Validate session token
export function validateSessionToken(token: string, userId: string): boolean {
  if (!token.startsWith("sess_")) return false;
  const parts = token.split("_");
  if (parts.length !== 3) return false;
  const timestamp = parseInt(parts[2], 10);
  if (isNaN(timestamp)) return false;
  // Token expires after 24 hours
  const age = Date.now() - timestamp;
  if (age > 86400000) return false;
  // Re-verify hash
  const hash = hashData(`${userId}-${timestamp}-${parts[1]}`).slice(0, 32);
  return hash === parts[1];
}

// Security headers configuration
export const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
};

// Row-Level Security (RLS) patterns for database
export const RLS_POLICIES = {
  // Public read access to verified data
  public_read: {
    role: "public",
    allowed_tables: ["provinces", "constituencies", "stations", "submissions"],
    allowed_columns: {
      provinces: ["id", "name_th"],
      constituencies: ["id", "province_id", "khet_number"],
      stations: ["id", "constituency_id", "subdistrict_id", "subdistrict_name", "station_number", "location_name"],
      submissions: ["id", "station_id", "created_at", "status_constituency", "status_partylist"],
    },
  },
  // Reviewer access with limited write
  reviewer: {
    role: "reviewer",
    allowed_tables: ["provinces", "constituencies", "stations", "submissions", "tallies", "verification_log"],
    allowed_columns: {
      provinces: ["id", "name_th"],
      constituencies: ["id", "province_id", "khet_number"],
      stations: ["id", "constituency_id", "subdistrict_id", "subdistrict_name", "station_number", "location_name"],
      submissions: ["id", "station_id", "created_at", "status_constituency", "status_partylist", "photo_constituency_key", "photo_partylist_key", "checksum_constituency_total", "checksum_partylist_total"],
      tallies: ["id", "submission_id", "sheet_type", "score_map", "metadata_checks", "action", "details", "transcription_confidence", "dispute_reason"],
      verification_log: ["id", "submission_id", "reviewer_id", "sheet_type", "action", "details", "created_at"],
    },
    row_filter: "reviewer_id = current_user_id",
  },
  // Admin full access
  admin: {
    role: "admin",
    allowed_tables: ["*"],
    allowed_columns: {
      "*": ["*"],
    },
  },
  // Authenticated user (uploaders)
  authenticated: {
    role: "authenticated",
    allowed_tables: ["stations", "submissions", "incidents", "custody_events"],
    allowed_columns: {
      stations: ["id", "constituency_id", "subdistrict_id", "subdistrict_name", "station_number", "location_name"],
      submissions: ["id", "station_id", "created_at", "status_constituency", "status_partylist", "photo_constituency_key", "photo_partylist_key", "checksum_constituency_total", "checksum_partylist_total", "user_session_id"],
      incidents: ["id", "station_id", "constituency_id", "subdistrict_id", "station_number", "incident_type", "occurred_at", "description", "media_keys", "created_at"],
      custody_events: ["id", "station_id", "constituency_id", "subdistrict_id", "station_number", "event_type", "occurred_at", "box_id", "seal_id", "notes", "confidence", "media_keys", "created_at"],
    },
    row_filter: "station_id IN (SELECT id FROM stations WHERE constituency_id IN (SELECT constituency_id FROM user_constituencies WHERE user_id = current_user_id))",
  },
};

// Threat modeling helper
export interface Threat {
  id: string;
  category: "confidentiality" | "integrity" | "availability" | "authentication" | "authorization";
  title: string;
  description: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high" | "critical";
  mitigation: string;
}

export const THREAT_MODEL: Threat[] = [
  {
    id: "THREAT-001",
    category: "confidentiality",
    title: "Photo Data Exposure",
    description: "Evidence photos containing station locations could be misused",
    likelihood: "medium",
    impact: "high",
    mitigation: "Use watermarked photos; don't store exact coordinates; implement IP-based rate limiting",
  },
  {
    id: "THREAT-002",
    category: "integrity",
    title: "Data Tampering",
    description: "Attacker modifies submitted vote counts or verification results",
    likelihood: "low",
    impact: "critical",
    mitigation: "Use SHA-256/512 hashes; implement digital signatures; maintain audit logs",
  },
  {
    id: "THREAT-003",
    category: "availability",
    title: "DDoS Attack",
    description: "Service overload preventing公众 access to election data",
    likelihood: "medium",
    impact: "high",
    mitigation: "Implement rate limiting; use CDN; deploy multiple mirrors; Cloudflare protection",
  },
  {
    id: "THREAT-004",
    category: "authentication",
    title: "Session Hijacking",
    description: "Attacker steals session token to impersonate reviewer or uploader",
    likelihood: "low",
    impact: "high",
    mitigation: "Use secure tokens; implement short-lived sessions; require re-auth for sensitive actions",
  },
  {
    id: "THREAT-005",
    category: "authorization",
    title: "Privilege Escalation",
    description: "Authenticated user gains reviewer or admin privileges",
    likelihood: "low",
    impact: "critical",
    mitigation: "Implement strict RLS policies; audit all privilege changes; use role-based access control",
  },
  {
    id: "THREAT-006",
    category: "integrity",
    title: "SQL Injection",
    description: "Malicious input executes unauthorized database queries",
    likelihood: "low",
    impact: "critical",
    mitigation: "Use parameterized queries; input sanitization;ORM libraries; WAF rules",
  },
  {
    id: "THREAT-007",
    category: "availability",
    title: "Mirror Sync Failure",
    description: "Distributed mirrors become out of sync, causing data inconsistency",
    likelihood: "medium",
    impact: "medium",
    mitigation: "Implement checksum verification; use consensus protocol; automatic failover",
  },
  {
    id: "THREAT-008",
    category: "authentication",
    title: "Brute Force Login",
    description: "Attacker attempts to guess reviewer/admin credentials",
    likelihood: "medium",
    impact: "high",
    mitigation: "Implement rate limiting; use CAPTCHA; require strong passwords; multi-factor auth",
  },
];

// Get threat score based on likelihood and impact
export function calculateThreatScore(likelihood: "low" | "medium" | "high" | "critical", impact: "low" | "medium" | "high" | "critical"): number {
  const likelihoodScores = { low: 1, medium: 2, high: 4, critical: 8 };
  const impactScores = { low: 1, medium: 2, high: 4, critical: 8 };
  return likelihoodScores[likelihood] * impactScores[impact];
}

// Get security recommendations based on highest threats
export function getSecurityRecommendations(threats: Threat[]): string[] {
  const recommendations: string[] = [];

  const highestThreats = [...threats].sort((a, b) => calculateThreatScore(b.likelihood, b.impact) - calculateThreatScore(a.likelihood, a.impact)).slice(0, 3);

  highestThreats.forEach(threat => {
    recommendations.push(`Priority: ${threat.id} - ${threat.title}`);
    recommendations.push(`  Mitigation: ${threat.mitigation}`);
    recommendations.push("");
  });

  return recommendations;
}

// System guarantees disclaimer - what the system CAN and CANNOT guarantee
export const SYSTEM_GUARANTEES = {
  CAN_GUARANTEE: [
    "Evidence integrity through cryptographic hashing (SHA-256/512)",
    "Append-only audit trail for all verification actions",
    "Anonymous reporter identity (no public PII exposure)",
    "Tamper-proof submission tracking via unique station anchors",
    "Consistent snapshot generation (deterministic output)",
    "Public read access even under partial service degradation",
  ],
  CANNOT_GUARANTEE: [
    "Full custody chain coverage (depends on reporter participation)",
    "100% accuracy of public vote tallies (depends on review consensus)",
    "Protection against malicious actors who control the station itself",
    "Guaranteed seat outcome (election results require official certification)",
    "Legal admissibility of evidence (requires chain-of-custody documentation)",
    "Real-time data synchronization (snapshots have TTL-based freshness)",
  ],
};