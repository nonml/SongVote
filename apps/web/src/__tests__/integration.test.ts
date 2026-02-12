/**
 * Integration tests for key workflows
 * Covers multi-step processes and cross-module interactions
 */

import { describe, it, expect, vi } from "vitest";

// Mock localStorage
const localStorageMock = {
  data: {} as Record<string, string>,
  getItem: (key: string) => localStorageMock.data[key] || null,
  setItem: (key: string, value: string) => {
    localStorageMock.data[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageMock.data[key];
  },
  clear: () => {
    localStorageMock.data = {};
  },
};
globalThis.localStorage = localStorageMock as any;

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock crypto.randomUUID
const mockUUID = "test-uuid-1234567890";
vi.mock("crypto", () => ({
  randomUUID: () => mockUUID,
}));

beforeEach(() => {
  localStorageMock.clear();
  mockFetch.mockReset();
});

// Mock config
vi.mock("../mock/config.json", () => ({
  default: {
    provinces: [{ id: 1, name_th: "Bangkok" }],
    constituencies: [{ id: 1, province_id: 1, khet_number: 1 }],
    subdistricts: [{ constituency_id: 1, subdistrict_id: 1, subdistrict_name: "Bang Kho Laem" }],
    stations: [
      {
        id: "station-1",
        constituency_id: 1,
        subdistrict_id: 1,
        subdistrict_name: "Bang Kho Laem",
        station_number: 1,
        location_name: "Test School",
        is_verified_exist: true,
      },
    ],
  },
}));

import * as api from "../lib/api";
import * as risk from "../lib/risk";
import * as trustSafety from "../lib/trustSafety";
import * as security from "../lib/security";

describe("Integration - Evidence Submission Workflow", () => {
  it("should handle complete evidence submission flow", async () => {
    // First fetch for config should fail to trigger mock fallback
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });
    // Subsequent fetch for unlisted station should succeed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ station_id: "new-station", created: true }),
    });
    // Subsequent fetch for evidence should succeed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ submission_id: "sub-123", status: "success" }),
    });

    // Step 1: Fetch config
    const config = await api.fetchConfig();
    expect(config.stations).toHaveLength(1);

    // Step 2: Create unlisted station if needed
    const newStation = await api.createUnlistedStation({
      constituency_id: 1,
      subdistrict_id: 1,
      subdistrict_name: "New Subdistrict",
      station_number: 99,
    });
    expect(newStation.created).toBe(true);

    // Step 3: Submit evidence
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ submission_id: "sub-123", status: "success" }),
    });

    const evidenceResult = await api.submitEvidence({
      station_id: "new-station",
      photo_constituency_key: "photo-1",
      checksum_constituency_total: 500,
    });
    expect(evidenceResult.submission_id).toBe("sub-123");
  });

  it("should handle offline evidence queueing", () => {
    // Note: navigator.onLine is read-only in jsdom, so we test the queue functionality
    // directly without trying to change navigator.onLine

    // Add to queue
    const queueItem: api.OfflineItem = {
      id: "item-1",
      type: "evidence",
      payload: { station_id: "station-1" },
      timestamp: Date.now(),
    };
    api.addToOfflineQueue(queueItem);

    const queue = api.getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("evidence");

    // Verify online status returns true (jsdom default)
    expect(api.isOnline()).toBe(true);
  });
});

describe("Integration - Risk Assessment Workflow", () => {
  it("should calculate risk from evidence and incidents", () => {
    const stationId = "station-1";
    const stationNumber = 1;
    const constituencyId = 1;
    const subdistrictName = "Bang Kho Laem";
    const locationName = "Test School";

    const submissions = [
      {
        checksum_constituency_total: 500,
        verified_tallies: { constituency: 450 }, // Mismatch
      },
    ];

    const incidents = [
      { incident_type: "form_not_posted_or_removed" },
    ];

    const custodyEvents = [
      { event_type: "seal_broken_or_mismatch" },
    ];

    // Step 1: Calculate station risk
    const stationRisk = risk.calculateStationRisk(
      stationId,
      stationNumber,
      constituencyId,
      subdistrictName,
      locationName,
      submissions,
      incidents,
      custodyEvents
    );

    expect(stationRisk.checksum_mismatch).toBe(true);
    expect(stationRisk.seal_mismatch).toBe(true);
    expect(stationRisk.missing_posted_form).toBe(true);
    // 25 (seal) + 20 (form) + 20 (checksum) = 65
    expect(stationRisk.risk_score).toBe(65);
    expect(stationRisk.leverage).toBe("High");

    // Step 2: Get recommendations
    const recommendations = risk.getRecommendations(stationRisk);
    expect(recommendations).toContain("Investigate this station first");
    expect(recommendations).toContain("Document all discrepancies for legal action");

    // Step 3: Get risk explanation
    const explanation = risk.getRiskExplanation(stationRisk);
    expect(explanation).toContain("High leverage station");
    expect(explanation).toContain("If fixed, this could potentially flip the constituency seat");
  });

  it("should aggregate constituency-level risk metrics", () => {
    const stations: risk.StationRisk[] = [
      risk.calculateStationRisk("s1", 1, 1, "A", null, [], [], []),
      risk.calculateStationRisk("s2", 2, 1, "A", null, [], [], []),
      risk.calculateStationRisk("s3", 3, 1, "A", null, [], [], []),
      risk.calculateStationRisk("s4", 4, 1, "A", null, [], [{ incident_type: "form_not_posted_or_removed" }], []),
      risk.calculateStationRisk("s5", 5, 1, "A", null, [], [], [{ event_type: "seal_broken_or_mismatch" }]),
    ];

    const constituencyMetrics = risk.calculateConstituencyMetrics(1, 1, 1, stations);

    expect(constituencyMetrics.total_stations).toBe(5);
    // 3 stations with risk_score 0 (s1, s2, s3)
    expect(constituencyMetrics.verified_stations).toBe(3);
    expect(constituencyMetrics.high_risk_stations).toBe(0);
    // s4 has 20 points (missing form), s5 has 25 points (seal mismatch)
    // Both are Low leverage (<30), so medium_risk_stations = 0
    expect(constituencyMetrics.medium_risk_stations).toBe(0);
    expect(constituencyMetrics.low_risk_stations).toBe(5);
  });
});

describe("Integration - Trust & Safety Assessment", () => {
  it("should assess user risk from activity patterns", () => {
    // Create submissions that trigger the suspicious pattern
    // The check is: recentSubmissions / uniqueStations > 2
    // With 25 submissions and 10 unique stations, ratio = 2.5 (> 2 triggers +20 bonus)
    const thirtyMinutesAgo = Date.now() - 1800000;

    // Create 25 submissions that go to only 10 unique stations
    // Each station gets 2-3 submissions, triggering suspicious pattern
    const userSubmissions = Array.from({ length: 25 }, (_, i) => ({
      created_at: new Date(thirtyMinutesAgo).toISOString(),
      station_id: `station-${i % 10}`, // Only 10 unique stations
    }));

    const custodyEvents = Array.from({ length: 12 }, (_, i) => ({
      created_at: new Date(thirtyMinutesAgo).toISOString(),
      event_type: "seal_broken",
    }));

    const incidents = [];

    // Step 1: Calculate risk score
    const riskScore = trustSafety.calculateUserRiskScore(
      userSubmissions,
      custodyEvents,
      incidents
    );

    // Verify the suspicious pattern triggers
    const uniqueStations = new Set(userSubmissions.map(s => s.station_id)).size;
    const ratio = userSubmissions.length / uniqueStations;
    console.log(`Unique stations: ${uniqueStations}, ratio: ${ratio}`);

    expect(riskScore).toBeGreaterThan(50);

    // Step 2: Determine action
    const action = trustSafety.shouldTakeAction(riskScore);
    expect(action.needsReview).toBe(true);
    // Risk score is 30 (submissions) + 20 (suspicious pattern) + 15 (custody) = 65
    // This triggers temp_block (50-69 range)
    expect(action.recommendedAction).toBe("temp_block");

    // Step 3: Get best mirror for failover
    const bestMirror = trustSafety.getBestMirror(trustSafety.DEFAULT_MIRRORS);
    expect(bestMirror).not.toBeNull();
  });

  it("should evaluate mirror health for failover", () => {
    const mirrors = [
      { id: "mirror-1", url: "url1", region: "TH", status: "active", lastSync: null, latencyMs: 50 },
      { id: "mirror-2", url: "url2", region: "SG", status: "degraded", lastSync: null, latencyMs: 150 },
      { id: "mirror-3", url: "url3", region: "JP", status: "offline", lastSync: null, latencyMs: 200 },
    ];

    const status = trustSafety.getMirrorSyncStatus(mirrors);

    expect(status.total).toBe(3);
    expect(status.active).toBe(1);
    expect(status.degraded).toBe(1);
    expect(status.offline).toBe(1);
    expect(status.overallHealth).toBe("critical");
  });
});

describe("Integration - Security Hardening", () => {
  it("should protect against threats using multiple controls", () => {
    // Step 1: Rate limiting - create fresh state for each test
    let state = { requests: [], blocked: false };
    const now = Date.now();

    // Simulate many requests - trackRateLimit mutates state directly
    for (let i = 0; i < security.THREAT_THRESHOLDS.maxRequestsPerMinute; i++) {
      security.trackRateLimit(state, now + i * 100);
    }

    // Should still be within limit (threshold is 50)
    expect(state.blocked).toBe(false);

    // Add more to exceed limit
    for (let i = 0; i < 30; i++) {
      security.trackRateLimit(state, now + 50000 + i * 100);
    }

    // Now should be blocked
    expect(state.blocked).toBe(true);

    // Step 2: Input sanitization
    const maliciousInput = "<script>alert('xss')</script>";
    const sanitized = security.sanitizeInput(maliciousInput);
    expect(sanitized).not.toContain("<script>");
    expect(sanitized).toContain("&lt;script&gt;");

    // Step 3: User agent filtering
    const suspiciousUA = "sqlmap/1.0";
    expect(security.isSuspiciousUserAgent(suspiciousUA)).toBe(true);

    const normalUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
    expect(security.isSuspiciousUserAgent(normalUA)).toBe(false);
  });

  it("should validate data integrity with hashes", () => {
    const testData = { votes: 500, constituency: "BKK-1" };
    const signature = security.hashData(JSON.stringify(testData) + "secret");

    const isValid = security.validateRequestIntegrity(testData, signature, "secret");
    expect(isValid).toBe(true);

    const tamperedData = { votes: 600, constituency: "BKK-1" };
    const isTamperedValid = security.validateRequestIntegrity(tamperedData, signature, "secret");
    expect(isTamperedValid).toBe(false);
  });

  it("should generate and validate secure session tokens", () => {
    const userId = "user-123";
    const token = security.generateSessionToken(userId);

    // Token format is sess_<userId>_<sha256-32hexchars>_<timestamp>
    expect(token).toMatch(/^sess_user-123_sha256-[a-f0-9]{32}_\d+$/);

    const isValid = security.validateSessionToken(token, userId);
    expect(isValid).toBe(true);

    const invalidUser = security.validateSessionToken(token, "user-456");
    expect(invalidUser).toBe(false);
  });
});

describe("Integration - Legal Kit Generation", () => {
  it("should prepare legal evidence package", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        station_info: { station_id: "station-1", station_number: 1 },
        submissions: [{ submission_id: "sub-1" }],
        incidents: [{ id: "incident-1", incident_type: "form_not_posted" }],
        custody_events: [{ id: "custody-1", event_type: "seal_broken" }],
        verification_logs: [],
        photo_hashes: [{ key: "photo-1", hash: "abc123" }],
        generated_at: "2024-03-24T12:00:00Z",
      }),
    });

    const legalKit = await api.fetchLegalKit("station-1");

    expect(legalKit).not.toBeNull();
    expect(legalKit?.station_info.station_id).toBe("station-1");
    expect(legalKit?.incidents).toHaveLength(1);
    expect(legalKit?.photo_hashes).toHaveLength(1);
  });

  it("should create legal case with filing workflows", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ case_id: "case-123" }),
    });

    const caseResult = await api.createLegalCase({
      case_title: "Election Irregularity - Station 1",
      case_type: "election_dispute",
      case_description: "Missing posted form reported",
      tags: ["high-priority", "legal-action"],
    });

    expect(caseResult.case_id).toBe("case-123");

    // Add station to case
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ case_station_id: "case-station-1" }),
    });

    const stationResult = await api.addStationToCase("case-123", "station-1", "Key evidence", 1);
    expect(stationResult.case_station_id).toBe("case-station-1");

    // Create filing workflow
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ filing_id: "filing-1" }),
    });

    const filingResult = await api.createFilingWorkflow({
      case_id: "case-123",
      channel: "election_commission",
      status: "pending",
    });
    expect(filingResult.filing_id).toBe("filing-1");
  });
});

describe("Integration - Snapshot Generation", () => {
  it("should produce valid snapshot metadata", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        metadata: {
          snapshot_version: "1.0.0",
          total_stations: 100,
          verified_submissions: 50,
          pending_review: 10,
          disputed_count: 5,
          verified_constituency_tallies: 50,
          verified_partylist_tallies: 50,
          rejected_submissions: 5,
          generated_at: "2024-03-24T12:00:00Z",
          last_updated: null,
          provenance: {
            build_time: "2024-03-24T11:00:00Z",
            runtime_version: "1.0.0",
          },
          coverage_statistics: {
            total_percent: 50,
            verified_constituency_percent: 50,
            verified_partylist_percent: 50,
          },
        },
        provinces: [],
        constituencies: [],
        stations: [],
        province_stats: [],
        last_verified_at: null,
      }),
    });

    const snapshot = await api.fetchPublicSnapshot();

    expect(snapshot.metadata.snapshot_version).toBe("1.0.0");
    expect(snapshot.metadata.total_stations).toBe(100);
    expect(snapshot.metadata.verified_submissions).toBe(50);
    expect(snapshot.metadata.coverage_statistics.total_percent).toBe(50);
  });

  it("should handle snapshot with preliminary data", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ metadata: {} }),
    });

    await api.fetchPublicSnapshot(true);
  });
});

describe("Integration - Reviewer Operations", () => {
  it("should manage reviewer shifts and throughput", async () => {
    // Start shift
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ shift_id: "shift-1" }),
    });

    const startResult = await api.startReviewerShift("reviewer-1");
    expect(startResult.shift_id).toBe("shift-1");

    // Fetch throughput
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        throughput: [{
          reviewer_id: "reviewer-1",
          period_start: "2024-03-24T00:00:00Z",
          sheets_reviewed: 50,
          auto_verified_count: 30,
          corrected_count: 10,
          dispute_rate: 0.2,
        }],
      }),
    });

    const throughput = await api.fetchReviewerThroughput("reviewer-1", "day");
    expect(throughput).toHaveLength(1);
    expect(throughput[0].sheets_reviewed).toBe(50);

    // End shift
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ shift_id: "shift-1" }),
    });

    const endResult = await api.endReviewerShift("shift-1", 0.5);
    expect(endResult.shift_id).toBe("shift-1");
  });

  it("should fetch prioritized queue for review", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        submission: { id: "sub-1", priority: "high" },
        priority: "high",
      }),
    });

    const result = await api.fetchPrioritizedQueue("constituency");
    expect(result.priority).toBe("high");
    expect(result.submission).not.toBeNull();
  });
});

describe("Integration - Failover & Mirroring", () => {
  it("should handle failover status and mirror health", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        primary_domain: "election-thai.vercel.app",
        active_domains: ["mirror1.example.com", "mirror2.example.com"],
        status: "operational",
      }),
    });

    const failoverStatus = await api.fetchFailoverStatus();
    expect(failoverStatus.status).toBe("operational");
    expect(failoverStatus.primary_domain).toBe("election-thai.vercel.app");
    expect(failoverStatus.active_domains).toHaveLength(2);
  });

  it("should check individual mirror health", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ mirror: { id: "mirror-1", status: "active", latencyMs: 50 } }),
    });

    const health = await api.checkMirrorHealth("mirror-1");
    expect(health.mirror.id).toBe("mirror-1");
    expect(health.mirror.status).toBe("active");
  });

  it("should fetch distribution pack for offline use", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ pack: { id: "pack-1", version: "1.0.0", data: [] } }),
    });

    const pack = await api.fetchDistributionPack();
    expect(pack.pack).not.toBeNull();
  });
});

describe("Integration - Vote Tabulation & Allocation", () => {
  it("should handle party vote totals and seat allocation", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        votes: [{
          id: "vote-1",
          party_id: "party-1",
          election_date: "2024-03-24",
          valid_votes: 100000,
          invalid_votes: 5000,
          total_votes: 105000,
          constituency_seats_won: 5,
          party_list_seats_allocated: 3,
        }],
      }),
    });

    const votes = await api.fetchPartyVotes("2024-03-24");
    expect(votes).toHaveLength(1);
    expect(votes[0].valid_votes).toBe(100000);
    expect(votes[0].total_votes).toBe(105000);
  });

  it("should fetch party list seat allocations", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        allocations: [{
          id: "alloc-1",
          allocation_date: "2024-03-24",
          party_id: "party-1",
          votes: 100000,
          constituency_seats: 5,
          initial_party_list_seats: 2,
          remainder_seats: 1,
          total_seats: 8,
        }],
      }),
    });

    const allocations = await api.fetchPartyListAllocations("2024-03-24");
    expect(allocations).toHaveLength(1);
    expect(allocations[0].total_seats).toBe(8);
  });

  it("should run seat allocation simulation", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        simulation_id: "sim-123",
        results: { parties: [] },
        input_data_hash: "abc123",
      }),
    });

    const result = await api.simulateSeatAllocation("rule-1", { parties: [] });
    expect(result.simulation_id).toBe("sim-123");
    expect(result.input_data_hash).toBe("abc123");
  });
});

describe("Integration - Governance & Transparency", () => {
  it("should fetch governance content", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        mission: { section: "mission", title: "Our Mission", content: "Test content", last_updated_at: "2024-03-24" },
        non_partisan: { section: "non_partisan", title: "Non-Partisan", content: "Test", last_updated_at: "2024-03-24" },
        methodology: { section: "methodology", title: "Methodology", content: "Test", last_updated_at: "2024-03-24" },
        funding: { section: "funding", title: "Funding", content: "Test", last_updated_at: "2024-03-24" },
      }),
    });

    const content = await api.fetchGovernanceContent();
    expect(content.mission).toBeDefined();
    expect(content.non_partisan).toBeDefined();
    expect(content.methodology).toBeDefined();
    expect(content.funding).toBeDefined();
  });

  it("should fetch transparency log entries", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        log: [{
          id: "log-1",
          event_type: "data_update",
          severity: "info",
          details: "Updated station counts",
          affected_count: 100,
          action_taken: "Verification completed",
          logged_at: "2024-03-24T12:00:00Z",
        }],
      }),
    });

    const log = await api.fetchTransparencyLog("data_update", "info");
    expect(log).toHaveLength(1);
    expect(log[0].severity).toBe("info");
  });

  it("should fetch moderation summary", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        summary: [{ date: "2024-03-24", reviews: 100, disputes: 5 }],
      }),
    });

    const summary = await api.fetchModerationSummary("2024-03-24");
    expect(summary.summary).toHaveLength(1);
  });
});

describe("Integration - Admin Operations", () => {
  it("should manage read-only mode", async () => {
    // Enable read-only mode
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Read-only enabled", read_only_mode: true }),
    });

    const enableResult = await api.enableReadOnlyMode("admin-1");
    expect(enableResult.read_only_mode).toBe(true);

    // Check status
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ read_only_mode: true, last_updated: "2024-03-24T12:00:00Z" }),
    });

    const status = await api.fetchReadOnlyStatus();
    expect(status.read_only_mode).toBe(true);

    // Disable read-only mode
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Read-only disabled", read_only_mode: false }),
    });

    const disableResult = await api.disableReadOnlyMode("admin-1");
    expect(disableResult.read_only_mode).toBe(false);
  });

  it("should fetch status metrics", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        uptime: 99.9,
        snapshot_freshness_seconds: 10,
        read_only_mode: false,
        queue_depth: 5,
        verified_stations: 100,
      }),
    });

    const metrics = await api.fetchStatusMetrics();
    expect(metrics.uptime).toBe(99.9);
    expect(metrics.read_only_mode).toBe(false);
    expect(metrics.verified_stations).toBe(100);
  });

  it("should fetch geo sanity warning", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ warning: null }),
    });

    const result = await api.checkGeoSanity("station-1", 13.7563, 100.5018);
    expect(result.warning).toBeNull();
  });

  it("should fetch offline queue status", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        pending_count: 5,
        syncing_count: 2,
        success_count: 10,
        failed_count: 1,
      }),
    });

    const status = await api.fetchOfflineQueueStatus("user-123");
    expect(status.pending_count).toBe(5);
    expect(status.syncing_count).toBe(2);
  });
});