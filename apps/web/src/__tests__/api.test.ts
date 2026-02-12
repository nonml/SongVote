/**
 * Tests for api.ts functions
 * Covers all API endpoints and offline queue functionality
 */

import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

// Mock fetch globally before importing api
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

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

// Clear localStorage before each test
beforeEach(() => {
  localStorageMock.clear();
  mockFetch.mockReset();
});

// Mock config for import
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

describe("api - fetchConfig", () => {
  it("should return mock config when API fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const config = await api.fetchConfig();
    expect(config.provinces).toEqual([{ id: 1, name_th: "Bangkok" }]);
  });

  it("should handle network errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const config = await api.fetchConfig();
    expect(config.provinces).toEqual([{ id: 1, name_th: "Bangkok" }]);
  });
});

describe("api - createUnlistedStation", () => {
  it("should create unlisted station successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ station_id: "new-station-123", created: true }),
    });

    const result = await api.createUnlistedStation({
      constituency_id: 1,
      subdistrict_id: 1,
      subdistrict_name: "Test Subdistrict",
      station_number: 99,
      location_name: "Test Location",
    });

    expect(result).toEqual({ station_id: "new-station-123", created: true });
  });

  it("should throw error when API fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });

    await expect(
      api.createUnlistedStation({
        constituency_id: 1,
        subdistrict_id: 1,
        subdistrict_name: "Test",
        station_number: 99,
      })
    ).rejects.toThrow("station suggest failed");
  });
});

describe("api - submitIncident", () => {
  it("should submit incident successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "incident-123" }),
    });

    const payload: api.IncidentPayload = {
      incident_type: "form_not_posted_or_removed",
      occurred_at: "2024-03-24T10:00:00Z",
      description: "Form was removed",
      media_keys: [],
      station_id: "station-1",
      constituency_id: 1,
      subdistrict_id: 1,
      station_number: 1,
    };

    const result = await api.submitIncident(payload);
    expect(result).toEqual({ id: "incident-123" });
  });
});

describe("api - submitCustody", () => {
  it("should submit custody event successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "custody-123" }),
    });

    const payload: api.CustodyPayload = {
      event_type: "seal_broken_or_mismatch",
      occurred_at: "2024-03-24T10:00:00Z",
      box_id: "box-1",
      seal_id: "seal-123",
      notes: "Seal was broken",
      media_keys: [],
      station_id: "station-1",
      constituency_id: 1,
      subdistrict_id: 1,
      station_number: 1,
    };

    const result = await api.submitCustody(payload);
    expect(result).toEqual({ id: "custody-123" });
  });
});

describe("api - fetchPublicSnapshot", () => {
  it("should fetch public snapshot successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        metadata: {
          snapshot_version: "1.0.0",
          total_stations: 100,
          verified_submissions: 50,
        },
        provinces: [],
        constituencies: [],
        stations: [],
        province_stats: [],
        last_verified_at: null,
      }),
    });

    const snapshot = await api.fetchPublicSnapshot();
    expect(snapshot.metadata.total_stations).toBe(100);
  });

  it("should fetch snapshot with includePreliminary flag", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ metadata: {} }),
    });

    await api.fetchPublicSnapshot(true);
  });

  it("should return mock data when API fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const snapshot = await api.fetchPublicSnapshot();
    expect(snapshot.metadata.total_stations).toBe(0);
    expect(snapshot.metadata.snapshot_version).toBe("1.0.0");
  });
});

describe("api - fetchStationEvidence", () => {
  it("should fetch station evidence successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        station_id: "station-1",
        submissions: [],
        incidents: [],
        custody_events: [],
      }),
    });

    const evidence = await api.fetchStationEvidence("station-1");
    expect(evidence.station_id).toBe("station-1");
  });

  it("should return mock evidence when API fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const evidence = await api.fetchStationEvidence("station-1");
    expect(evidence.submissions).toEqual([]);
  });
});

describe("api - fetchPresignedUpload", () => {
  it("should fetch presigned URL successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        url: "https://s3.example.com/upload",
        key: "uploads/photo.jpg",
        fields: {},
        fileType: "image/jpeg",
      }),
    });

    const result = await api.fetchPresignedUpload("photo.jpg", "image/jpeg");
    expect(result.url).toBe("https://s3.example.com/upload");
    expect(result.key).toBe("uploads/photo.jpg");
  });

  it("should return empty response on error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await api.fetchPresignedUpload("photo.jpg");
    expect(result.url).toBe("");
  });
});

describe("api - fetchLegalKit", () => {
  it("should fetch legal kit successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        station_info: { station_id: "station-1" },
        submissions: [],
        incidents: [],
        custody_events: [],
        verification_logs: [],
        photo_hashes: [],
        generated_at: "2024-03-24T10:00:00Z",
      }),
    });

    const legalKit = await api.fetchLegalKit("station-1");
    expect(legalKit).not.toBeNull();
    expect(legalKit?.station_info.station_id).toBe("station-1");
  });

  it("should return null when API fails", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const legalKit = await api.fetchLegalKit("station-1");
    expect(legalKit).toBeNull();
  });
});

describe("api - submitEvidence", () => {
  it("should submit evidence successfully", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        submission_id: "sub-123",
        status: "success",
      }),
    });

    const payload: Parameters<typeof api.submitEvidence>[0] = {
      station_id: "station-1",
      photo_constituency_key: "key-1",
      photo_partylist_key: "key-2",
      checksum_constituency_total: 500,
      checksum_partylist_total: 300,
      user_session_id: "user-123",
      captcha_token: "token-123",
    };

    const result = await api.submitEvidence(payload);
    expect(result.submission_id).toBe("sub-123");
  });
});

describe("api - Offline Queue functions", () => {
  it("should get empty queue when localStorage is empty", () => {
    localStorageMock.clear();
    const queue = api.getOfflineQueue();
    expect(queue).toEqual([]);
  });

  it("should add item to queue", () => {
    const item: api.OfflineItem = {
      id: "item-1",
      type: "evidence",
      payload: { test: "data" },
      timestamp: Date.now(),
    };
    api.addToOfflineQueue(item);
    const queue = api.getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("item-1");
  });

  it("should remove item from queue", () => {
    const item1: api.OfflineItem = { id: "item-1", type: "evidence", payload: {}, timestamp: Date.now() };
    const item2: api.OfflineItem = { id: "item-2", type: "evidence", payload: {}, timestamp: Date.now() };
    api.addToOfflineQueue(item1);
    api.addToOfflineQueue(item2);

    api.removeFromQueue("item-1");
    const queue = api.getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe("item-2");
  });

  it("should clear queue", () => {
    api.addToOfflineQueue({ id: "item-1", type: "evidence", payload: {}, timestamp: Date.now() });
    api.clearOfflineQueue();
    const queue = api.getOfflineQueue();
    expect(queue).toEqual([]);
  });

  it("should check online status", () => {
    expect(api.isOnline()).toBe(true); // navigator.onLine is true by default in test environment
  });
});

describe("api - Status Metrics", () => {
  it("should fetch status metrics successfully", async () => {
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
  });

  it("should enable read-only mode", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Read-only enabled", read_only_mode: true }),
    });

    const result = await api.enableReadOnlyMode("admin-1");
    expect(result.read_only_mode).toBe(true);
  });

  it("should disable read-only mode", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Read-only disabled", read_only_mode: false }),
    });

    const result = await api.disableReadOnlyMode("admin-1");
    expect(result.read_only_mode).toBe(false);
  });

  it("should fetch read-only status", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ read_only_mode: true, last_updated: "2024-03-24T10:00:00Z" }),
    });

    const status = await api.fetchReadOnlyStatus();
    expect(status.read_only_mode).toBe(true);
  });
});

describe("api - Reviewer Throughput", () => {
  it("should fetch reviewer throughput", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        throughput: [
          {
            reviewer_id: "reviewer-1",
            period_start: "2024-03-24T00:00:00Z",
            sheets_reviewed: 50,
            auto_verified_count: 30,
            corrected_count: 10,
            dispute_rate: 0.2,
          },
        ],
      }),
    });

    const throughput = await api.fetchReviewerThroughput("reviewer-1", "day");
    expect(throughput).toHaveLength(1);
    expect(throughput[0].sheets_reviewed).toBe(50);
  });

  it("should start reviewer shift", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ shift_id: "shift-123" }),
    });

    const result = await api.startReviewerShift("reviewer-1");
    expect(result.shift_id).toBe("shift-123");
  });

  it("should end reviewer shift", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ shift_id: "shift-123" }),
    });

    const result = await api.endReviewerShift("shift-123", 0.5);
    expect(result.shift_id).toBe("shift-123");
  });

  it("should fetch prioritized queue", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        submission: { id: "submission-1" },
        priority: "high",
      }),
    });

    const result = await api.fetchPrioritizedQueue("constituency");
    expect(result.priority).toBe("high");
  });
});

describe("api - Geo Sanity Check", () => {
  it("should check geo sanity", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ warning: null }),
    });

    const result = await api.checkGeoSanity("station-1", 13.7563, 100.5018);
    expect(result.warning).toBeNull();
  });
});

describe("api - Offline Queue Status", () => {
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
    expect(status.success_count).toBe(10);
  });
});

describe("api - Version", () => {
  it("should fetch API version", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        current_version: "v1",
        supported_versions: ["v1", "v2"],
        latest: "v2",
      }),
    });

    const version = await api.fetchApiVersion();
    expect(version.current_version).toBe("v1");
    expect(version.supported_versions).toContain("v2");
  });
});

describe("api - Bulk Export", () => {
  it("should create bulk export", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        export_id: "export-123",
        export_type: "national",
        format: "csv",
        data: { rows: [] },
        provenance: {
          build_timestamp: "2024-03-24T10:00:00Z",
          dataset_hash: "abc123",
          export_id: "export-123",
        },
      }),
    });

    const result = await api.createBulkExport("national", "csv");
    expect(result.export_type).toBe("national");
    expect(result.format).toBe("csv");
  });

  it("should create province-specific export", async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) });

    await api.createBulkExport("province", "json", "1");
  });
});

describe("api - Partner Snapshots", () => {
  it("should fetch partner snapshots", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ snapshots: [{ id: "snap-1" }, { id: "snap-2" }] }),
    });

    const result = await api.fetchPartnerSnapshots("partner-token-123");
    expect(result.snapshots).toHaveLength(2);
  });
});

describe("api - Mirror Health Check", () => {
  it("should check mirror health", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ mirror: { id: "mirror-1", status: "active" } }),
    });

    const result = await api.checkMirrorHealth("mirror-1");
    expect(result.mirror.id).toBe("mirror-1");
  });

  it("should fetch failover status", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        primary_domain: "election-thai.vercel.app",
        active_domains: ["mirror1.example.com"],
        status: "operational",
      }),
    });

    const status = await api.fetchFailoverStatus();
    expect(status.status).toBe("operational");
  });

  it("should fetch distribution pack", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ pack: { id: "pack-1", version: "1.0.0" } }),
    });

    const pack = await api.fetchDistributionPack();
    expect(pack.pack).not.toBeNull();
  });
});

describe("api - Legal Cases", () => {
  it("should fetch legal cases", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        cases: [
          { id: "case-1", case_title: "Case 1", case_type: "election_dispute" },
          { id: "case-2", case_title: "Case 2", case_type: "abuse" },
        ],
      }),
    });

    const cases = await api.fetchLegalCases("user-123");
    expect(cases).toHaveLength(2);
    expect(cases[0].case_title).toBe("Case 1");
  });

  it("should create legal case", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ case_id: "case-123" }),
    });

    const result = await api.createLegalCase({
      case_title: "Election Irregularity Case",
      case_type: "election_dispute",
      case_description: "Detailed description",
      tags: ["high-priority", "legal-action"],
    });

    expect(result.case_id).toBe("case-123");
  });

  it("should fetch legal case details", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        case: { id: "case-1", case_title: "Case 1" },
        stations: [{ station_id: "station-1" }],
        incidents: [],
        evidence: [],
      }),
    });

    const result = await api.fetchLegalCase("case-1");
    expect(result.case).not.toBeNull();
  });

  it("should add station to case", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ case_station_id: "case-station-123" }),
    });

    const result = await api.addStationToCase("case-1", "station-1", "Relevant notes", 1);
    expect(result.case_station_id).toBe("case-station-123");
  });
});

describe("api - Filing Workflows", () => {
  it("should fetch filing workflows", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        filings: [
          { id: "filing-1", case_id: "case-1", channel: "election_commission", status: "pending" },
        ],
      }),
    });

    const workflows = await api.fetchFilingWorkflows("case-1");
    expect(workflows).toHaveLength(1);
    expect(workflows[0].channel).toBe("election_commission");
  });

  it("should create filing workflow", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ filing_id: "filing-123" }),
    });

    const result = await api.createFilingWorkflow({
      case_id: "case-1",
      channel: "election_commission",
      status: "pending",
      next_action: "Submit evidence",
      next_action_date: "2024-04-01",
    });

    expect(result.filing_id).toBe("filing-123");
  });
});

describe("api - Redaction", () => {
  it("should redact photo", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        redaction_id: "redact-123",
        redacted_photo_key: "redacted/photo.jpg",
      }),
    });

    const result = await api.redactPhoto("photo.jpg", "pixelate", { x: 100, y: 200, width: 50, height: 50 });
    expect(result.redaction_id).toBe("redact-123");
  });
});

describe("api - Legal Packet", () => {
  it("should create legal packet", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        packet_id: "packet-123",
        packet_version: 1,
        file_hash: "abc123def456",
        generated_at: "2024-03-24T10:00:00Z",
      }),
    });

    const result = await api.createLegalPacket("case-1", "evidence_packet", true);
    expect(result.packet_version).toBe(1);
  });
});

describe("api - Governance Content", () => {
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
    expect(content.mission.title).toBe("Our Mission");
  });

  it("should return default governance content on error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const content = await api.fetchGovernanceContent();
    expect(content.mission.title).toBe("Our Mission");
  });
});

describe("api - Transparency Log", () => {
  it("should fetch transparency log", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        log: [
          { id: "log-1", event_type: "data_update", severity: "info", details: "Updated", affected_count: 100, logged_at: "2024-03-24T10:00:00Z" },
        ],
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

describe("api - Election Rules", () => {
  it("should fetch election rules", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        current_rule: "2024_party_list",
        rules: [{ id: "rule-1", name: "Party List Rule", rule_type: "allocation" }],
      }),
    });

    const result = await api.fetchElectionRules();
    expect(result.current_rule).toBe("2024_party_list");
    expect(result.rules).toHaveLength(1);
  });

  it("should simulate seat allocation", async () => {
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
  });

  it("should fetch party votes", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        votes: [
          {
            id: "vote-1",
            party_id: "party-1",
            valid_votes: 100000,
            invalid_votes: 5000,
            total_votes: 105000,
            constituency_seats_won: 5,
            party_list_seats_allocated: 3,
          },
        ],
      }),
    });

    const votes = await api.fetchPartyVotes("2024-03-24");
    expect(votes).toHaveLength(1);
    expect(votes[0].valid_votes).toBe(100000);
  });

  it("should fetch party list allocations", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        allocations: [
          {
            id: "alloc-1",
            allocation_date: "2024-03-24",
            party_id: "party-1",
            votes: 100000,
            constituency_seats: 5,
            initial_party_list_seats: 2,
            remainder_seats: 1,
            total_seats: 8,
          },
        ],
      }),
    });

    const allocations = await api.fetchPartyListAllocations("2024-03-24");
    expect(allocations).toHaveLength(1);
    expect(allocations[0].total_seats).toBe(8);
  });
});

describe("api - Types", () => {
  it("should have correct SubmissionSummary type", () => {
    const summary: api.SubmissionSummary = {
      submission_id: "sub-123",
      created_at: "2024-03-24T10:00:00Z",
      status_constituency: "verified",
      status_partylist: "pending",
      has_constituency_photo: true,
      has_partylist_photo: false,
      checksums: { constituency: 500, partylist: 300 },
      verified_tallies: { constituency: 500, partylist: null },
    };
    expect(summary.status_constituency).toBe("verified");
    expect(summary.status_partylist).toBe("pending");
  });

  it("should have correct PublicSnapshot type", () => {
    const snapshot: api.PublicSnapshot = {
      metadata: {
        snapshot_version: "1.0.0",
        total_stations: 100,
        verified_submissions: 50,
        pending_review: 10,
        disputed_count: 5,
        verified_constituency_tallies: 50,
        verified_partylist_tallies: 50,
        rejected_submissions: 5,
        generated_at: "2024-03-24T10:00:00Z",
        last_updated: null,
        provenance: { build_time: "2024-03-24T09:00:00Z", runtime_version: "1.0.0" },
        coverage_statistics: { total_percent: 50, verified_constituency_percent: 50, verified_partylist_percent: 50 },
      },
      provinces: [],
      constituencies: [],
      stations: [],
      province_stats: [],
      last_verified_at: null,
    };
    expect(snapshot.metadata.total_stations).toBe(100);
  });
});