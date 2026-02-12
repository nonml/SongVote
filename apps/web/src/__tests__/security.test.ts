/**
 * Tests for security.ts functions
 * Covers threat detection, hashing, encryption, and rate limiting
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as security from "../lib/security";

// Mock crypto module properly
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createHash: (algo: string) => {
      return {
        update: (data: string | Uint8Array) => {
          const str = typeof data === "string" ? data : new TextDecoder().decode(data);
          return {
            digest: (format: string) => {
              if (format === "hex") {
                return `mock-${algo}-${str.slice(0, 10)}...`;
              }
              return "";
            },
          };
        },
      };
    },
  };
});

describe("security - Hash Functions", () => {
  it("should produce consistent SHA-256 hash for string", () => {
    const hash = security.hashData("test data");

    expect(typeof hash).toBe("string");
    expect(hash).toContain("sha256");
  });

  it("should produce consistent SHA-384 hash", () => {
    const hash = security.hashDataStrong("test data");

    expect(typeof hash).toBe("string");
    expect(hash).toContain("sha384");
  });

  it("should produce consistent SHA-512 hash", () => {
    const hash = security.hashDataMax("test data");

    expect(typeof hash).toBe("string");
    expect(hash).toContain("sha512");
  });

  it("should handle Uint8Array input", () => {
    const uint8Array = new TextEncoder().encode("test data");
    const hash = security.hashData(uint8Array);

    expect(typeof hash).toBe("string");
  });
});

describe("security - Checksum Validation", () => {
  it("should validate equal checksums", () => {
    expect(security.validateChecksum(100, 100)).toBe(true);
  });

  it("should validate checksums within tolerance", () => {
    expect(security.validateChecksum(100, 105, 10)).toBe(true); // Within tolerance of 10
    expect(security.validateChecksum(100, 106, 5)).toBe(false); // Outside tolerance
  });

  it("should invalidate checksums outside tolerance", () => {
    expect(security.validateChecksum(100, 150, 10)).toBe(false);
  });

  it("should validate with zero tolerance", () => {
    expect(security.validateChecksum(100, 100, 0)).toBe(true);
    expect(security.validateChecksum(100, 101, 0)).toBe(false);
  });
});

describe("security - Rate Limiting", () => {
  it("should allow requests within limit", () => {
    const state = { requests: [], blocked: false };

    // First request should be allowed
    const result = security.trackRateLimit(state, Date.now());
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(security.THREAT_THRESHOLDS.maxRequestsPerMinute - 1);
  });

  it("should block when limit exceeded", () => {
    const state = { requests: [], blocked: false };
    const windowMs = 60000;
    const now = 1000000;

    // Fill up the rate limit - each request increments the count
    // After 60 requests, the state.requests.length = 60 but blocking happens on the NEXT request
    for (let i = 0; i < security.THREAT_THRESHOLDS.maxRequestsPerMinute; i++) {
      security.trackRateLimit(state, now + i * 500);
    }

    // After 60 requests, state.requests.length = 60
    expect(state.requests.length).toBe(60);

    // The 61st request should be blocked
    const result = security.trackRateLimit(state, now + 30000);
    expect(result.allowed).toBe(false);
    expect(state.blocked).toBe(true);
  });

  it("should clear old requests after window", () => {
    const state = { requests: [], blocked: false };

    // Add some requests
    security.trackRateLimit(state, Date.now() - 100000); // Old request (100s ago)
    security.trackRateLimit(state, Date.now()); // New request

    // Should still be allowed
    const result = security.trackRateLimit(state, Date.now());
    expect(result.allowed).toBe(true);
  });

  it("should reset block after time expires", () => {
    const state = { requests: [], blocked: false };
    const windowMs = 60000;
    const now = 1000000;

    // Fill up the rate limit
    for (let i = 0; i < security.THREAT_THRESHOLDS.maxRequestsPerMinute; i++) {
      security.trackRateLimit(state, now + i * 500);
    }

    // The 61st request should be blocked
    security.trackRateLimit(state, now + 30000);
    expect(state.blocked).toBe(true);

    // Block lasts for 60 seconds (blockUntil = currentTimestamp + 60000)
    // After 120 seconds, the block should expire
    const result = security.trackRateLimit(state, now + 120000);
    expect(result.allowed).toBe(true);
    expect(state.blocked).toBe(false);
  });
});

describe("security - Suspicious User Agent Detection", () => {
  it("should detect sqlmap", () => {
    expect(security.isSuspiciousUserAgent("sqlmap/1.0")).toBe(true);
  });

  it("should detect nikto", () => {
    expect(security.isSuspiciousUserAgent("nikto/2.1")).toBe(true);
  });

  it("should detect nmap", () => {
    expect(security.isSuspiciousUserAgent("nmap scripting engine")).toBe(true);
  });

  it("should detect masscan", () => {
    expect(security.isSuspiciousUserAgent("masscan")).toBe(true);
  });

  it("should detect gobuster", () => {
    expect(security.isSuspiciousUserAgent("gobuster/3.0")).toBe(true);
  });

  it("should detect dirbuster", () => {
    expect(security.isSuspiciousUserAgent("dirbuster")).toBe(true);
  });

  it("should not detect normal browsers", () => {
    expect(security.isSuspiciousUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
    expect(security.isSuspiciousUserAgent("Chrome/120.0.0.0")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(security.isSuspiciousUserAgent("SQLMAP/1.0")).toBe(true);
    expect(security.isSuspiciousUserAgent("NiKtO")).toBe(true);
  });
});

describe("security - Input Sanitization", () => {
  it("should escape HTML tags", () => {
    expect(security.sanitizeInput("<script>alert('xss')</script>")).toBe("&lt;script&gt;alert(&#x27;xss&#x27;)&lt;&#x2F;script&gt;");
  });

  it("should escape double quotes", () => {
    expect(security.sanitizeInput('name="test"')).toBe("name=&quot;test&quot;");
  });

  it("should escape single quotes", () => {
    expect(security.sanitizeInput("it's a test")).toBe("it&#x27;s a test");
  });

  it("should escape forward slashes", () => {
    expect(security.sanitizeInput("</div>")).toBe("&lt;&#x2F;div&gt;");
  });

  it("should trim whitespace", () => {
    expect(security.sanitizeInput("  test  ")).toBe("test");
  });

  it("should handle empty string", () => {
    expect(security.sanitizeInput("")).toBe("");
  });
});

describe("security - Encryption", () => {
  it("should encrypt and decrypt data", () => {
    const data = { test: "value", number: 123 };
    const key = "encryption-key";

    const encrypted = security.encryptData(data, key);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.nonce).toBeDefined();
    expect(encrypted.tag).toBeDefined();
    expect(encrypted.algorithm).toBe("aes-256-gcm");

    const decrypted = security.decryptData(encrypted, key);
    expect(decrypted).toEqual(data);
  });

  it("should return null for tampered data", () => {
    const data = { test: "value" };
    const key = "encryption-key";

    const encrypted = security.encryptData(data, key);
    encrypted.ciphertext = "tampered-data";

    const decrypted = security.decryptData(encrypted, key);
    expect(decrypted).toBeNull();
  });

  it("should return null for wrong key", () => {
    const data = { test: "value" };
    const key = "encryption-key";

    const encrypted = security.encryptData(data, key);
    const decrypted = security.decryptData(encrypted, "wrong-key");
    expect(decrypted).toBeNull();
  });

  it("should handle null ciphertext", () => {
    const encrypted = { ciphertext: "not-base64", nonce: "nonce", tag: "tag", algorithm: "aes-256-gcm" };
    const decrypted = security.decryptData(encrypted, "key");
    expect(decrypted).toBeNull();
  });
});

describe("security - Request Integrity", () => {
  it("should validate correct signature", () => {
    const payload = { test: "value" };
    const secret = "my-secret";
    const signature = security.hashData(JSON.stringify(payload) + secret);

    expect(security.validateRequestIntegrity(payload, signature, secret)).toBe(true);
  });

  it("should invalidate wrong signature", () => {
    const payload = { test: "value" };
    const secret = "my-secret";
    const wrongSignature = "wrong-signature";

    expect(security.validateRequestIntegrity(payload, wrongSignature, secret)).toBe(false);
  });

  it("should invalidate with wrong secret", () => {
    const payload = { test: "value" };
    const secret = "my-secret";
    const signature = security.hashData(JSON.stringify(payload) + secret);

    expect(security.validateRequestIntegrity(payload, signature, "wrong-secret")).toBe(false);
  });

  it("should handle empty payload", () => {
    const secret = "my-secret";
    const signature = security.hashData(JSON.stringify({}) + secret);

    expect(security.validateRequestIntegrity({}, signature, secret)).toBe(true);
  });
});

describe("security - Session Token Generation", () => {
  it("should generate valid session token", () => {
    const token = security.generateSessionToken("user-123");
    expect(token).toMatch(/^sess_user-123_sha256-[a-f0-9]{32}_\d+$/);
  });

  it("should validate correct token", () => {
    const userId = "user-123";
    const token = security.generateSessionToken(userId);
    expect(security.validateSessionToken(token, userId)).toBe(true);
  });

  it("should invalidate expired token", () => {
    const userId = "user-123";
    const token = security.generateSessionToken(userId);
    // Token with old timestamp (simulating 25 hour old token)
    const oldToken = token.replace(/_\d+$/, "_1000000000000");
    expect(security.validateSessionToken(oldToken, userId)).toBe(false);
  });

  it("should reject invalid format", () => {
    expect(security.validateSessionToken("invalid-token", "user-123")).toBe(false);
    expect(security.validateSessionToken("sess_only", "user-123")).toBe(false);
    expect(security.validateSessionToken("sess_abc_def_ghi", "user-123")).toBe(false);
  });
});

describe("security - Security Headers", () => {
  it("should have Content-Security-Policy", () => {
    expect(security.SECURITY_HEADERS["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(security.SECURITY_HEADERS["Content-Security-Policy"]).toContain("script-src 'self'");
  });

  it("should have X-Content-Type-Options", () => {
    expect(security.SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("should have X-Frame-Options", () => {
    expect(security.SECURITY_HEADERS["X-Frame-Options"]).toBe("DENY");
  });

  it("should have Strict-Transport-Security", () => {
    expect(security.SECURITY_HEADERS["Strict-Transport-Security"]).toContain("max-age=31536000");
  });

  it("should have Permissions-Policy", () => {
    expect(security.SECURITY_HEADERS["Permissions-Policy"]).toContain("geolocation=()");
    expect(security.SECURITY_HEADERS["Permissions-Policy"]).toContain("camera=()");
  });
});

describe("security - RLS Policies", () => {
  it("should have public_read policy", () => {
    expect(security.RLS_POLICIES.public_read.role).toBe("public");
    expect(security.RLS_POLICIES.public_read.allowed_tables).toContain("provinces");
    expect(security.RLS_POLICIES.public_read.allowed_tables).toContain("stations");
  });

  it("should have reviewer policy", () => {
    expect(security.RLS_POLICIES.reviewer.role).toBe("reviewer");
    expect(security.RLS_POLICIES.reviewer.allowed_tables).toContain("submissions");
    expect(security.RLS_POLICIES.reviewer.allowed_tables).toContain("verification_log");
  });

  it("should have admin policy", () => {
    expect(security.RLS_POLICIES.admin.role).toBe("admin");
    expect(security.RLS_POLICIES.admin.allowed_tables).toContain("*");
  });

  it("should have authenticated policy", () => {
    expect(security.RLS_POLICIES.authenticated.role).toBe("authenticated");
    expect(security.RLS_POLICIES.authenticated.allowed_tables).toContain("incidents");
    expect(security.RLS_POLICIES.authenticated.allowed_tables).toContain("custody_events");
  });
});

describe("security - Threat Model", () => {
  it("should have 8 defined threats", () => {
    expect(security.THREAT_MODEL).toHaveLength(8);
  });

  it("should calculate threat score correctly", () => {
    expect(security.calculateThreatScore("low", "low")).toBe(1);
    expect(security.calculateThreatScore("medium", "medium")).toBe(4);
    expect(security.calculateThreatScore("high", "high")).toBe(16);
    expect(security.calculateThreatScore("critical", "critical")).toBe(64);
  });

  it("should have data tampering threat", () => {
    const tamperingThreat = security.THREAT_MODEL.find(t => t.id === "THREAT-002");
    expect(tamperingThreat).toBeDefined();
    expect(tamperingThreat?.category).toBe("integrity");
    expect(tamperingThreat?.title).toBe("Data Tampering");
    expect(tamperingThreat?.impact).toBe("critical");
  });

  it("should have DDoS threat", () => {
    const ddosThreat = security.THREAT_MODEL.find(t => t.id === "THREAT-003");
    expect(ddosThreat).toBeDefined();
    expect(ddosThreat?.category).toBe("availability");
    expect(ddosThreat?.title).toBe("DDoS Attack");
  });

  it("should have SQL injection threat", () => {
    const sqlInjection = security.THREAT_MODEL.find(t => t.id === "THREAT-006");
    expect(sqlInjection).toBeDefined();
    expect(sqlInjection?.category).toBe("integrity");
    expect(sqlInjection?.title).toBe("SQL Injection");
  });
});

describe("security - System Guarantees", () => {
  it("should list CAN_GUARANTEE items", () => {
    const canGuarantee = security.SYSTEM_GUARANTEES.CAN_GUARANTEE;
    expect(canGuarantee.length).toBe(6);
    expect(canGuarantee[0]).toBe("Evidence integrity through cryptographic hashing (SHA-256/512)");
    expect(canGuarantee[1]).toBe("Append-only audit trail for all verification actions");
  });

  it("should list CANNOT_GUARANTEE items", () => {
    const cannotGuarantee = security.SYSTEM_GUARANTEES.CANNOT_GUARANTEE;
    expect(cannotGuarantee.length).toBe(6);
    expect(cannotGuarantee[0]).toBe("Full custody chain coverage (depends on reporter participation)");
    expect(cannotGuarantee[1]).toBe("100% accuracy of public vote tallies (depends on review consensus)");
  });

  it("should have at least 6 guaranteed items", () => {
    expect(security.SYSTEM_GUARANTEES.CAN_GUARANTEE).toHaveLength(6);
  });

  it("should have at least 6 non-guaranteed items", () => {
    expect(security.SYSTEM_GUARANTEES.CANNOT_GUARANTEE).toHaveLength(6);
  });
});