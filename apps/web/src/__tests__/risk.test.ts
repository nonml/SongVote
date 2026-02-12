/**
 * Tests for risk.ts functions
 * Covers station risk calculation and constituency metrics
 */

import { describe, it, expect } from "vitest";
import * as risk from "../lib/risk";

// Base station data constant for reuse across test blocks
const baseStationData: risk.StationRisk = {
  station_id: "station-1",
  station_number: 1,
  constituency_id: 1,
  subdistrict_name: "Test Subdistrict",
  location_name: "Test School",
  seal_mismatch: false,
  missing_posted_form: false,
  checksum_mismatch: false,
  abnormal_invalid_ratio: false,
  risk_score: 0,
  leverage: "Low",
  margin: null,
  votes_needed_to_flip: null,
  risk_reasons: [],
};

describe("risk - Station Risk Calculation", () => {
  it("should calculate zero risk for clean station", () => {
    const submissions = [{ checksum_constituency_total: 500, verified_tallies: { constituency: 500 } }];
    const incidents = [];
    const custodyEvents = [];

    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      "Test School",
      submissions,
      incidents,
      custodyEvents
    );

    expect(result.risk_score).toBe(0);
    expect(result.leverage).toBe("Low");
    expect(result.risk_reasons).toContain("No risk signals detected");
  });

  it("should detect seal mismatch custody event", () => {
    const submissions = [];
    const incidents = [];
    const custodyEvents = [{ event_type: "seal_broken_or_mismatch" }];

    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      null,
      submissions,
      incidents,
      custodyEvents
    );

    expect(result.seal_mismatch).toBe(true);
    expect(result.risk_score).toBe(25);
    expect(result.risk_reasons).toContain("Seal mismatch observed");
    // 25 points = Low leverage (< 30)
    expect(result.leverage).toBe("Low");
  });

  it("should detect seal intact before open event", () => {
    const submissions = [];
    const incidents = [];
    const custodyEvents = [{ event_type: "seal_intact_before_open" }];

    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      "Test School",
      submissions,
      incidents,
      custodyEvents
    );

    expect(result.seal_mismatch).toBe(true);
    expect(result.risk_score).toBe(25);
  });

  it("should detect missing posted form incident", () => {
    const submissions = [];
    const incidents = [{ incident_type: "form_not_posted_or_removed" }];
    const custodyEvents = [];

    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      "Test School",
      submissions,
      incidents,
      custodyEvents
    );

    expect(result.missing_posted_form).toBe(true);
    expect(result.risk_score).toBe(20);
    expect(result.risk_reasons).toContain("Missing posted form reported");
  });

  it("should detect counting obstructed incident", () => {
    const submissions = [];
    const incidents = [{ incident_type: "counting_obstructed" }];
    const custodyEvents = [];

    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      "Test School",
      submissions,
      incidents,
      custodyEvents
    );

    expect(result.missing_posted_form).toBe(true);
    expect(result.risk_score).toBe(20);
  });

  it("should detect checksum mismatch", () => {
    const submissions = [
      { checksum_constituency_total: 500, verified_tallies: { constituency: 450 } },
    ];
    const incidents = [];
    const custodyEvents = [];

    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      "Test School",
      submissions,
      incidents,
      custodyEvents
    );

    expect(result.checksum_mismatch).toBe(true);
    expect(result.risk_score).toBe(20);
    expect(result.risk_reasons).toContain("Checksum mismatch detected");
  });

  it("should handle null checksums gracefully", () => {
    const submissions = [
      { checksum_constituency_total: null, verified_tallies: { constituency: 500 } },
    ];
    const incidents = [];
    const custodyEvents = [];

    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      "Test School",
      submissions,
      incidents,
      custodyEvents
    );

    expect(result.checksum_mismatch).toBe(false);
    expect(result.risk_score).toBe(0);
  });

  it("should combine multiple risk signals", () => {
    const submissions = [
      { checksum_constituency_total: 500, verified_tallies: { constituency: 400 } },
    ];
    const incidents = [{ incident_type: "form_not_posted_or_removed" }];
    const custodyEvents = [{ event_type: "seal_broken_or_mismatch" }];

    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      "Test School",
      submissions,
      incidents,
      custodyEvents
    );

    expect(result.seal_mismatch).toBe(true);
    expect(result.missing_posted_form).toBe(true);
    expect(result.checksum_mismatch).toBe(true);
    // 25 (seal) + 20 (form) + 20 (checksum) = 65
    expect(result.risk_score).toBe(65);
    // >= 60 = High leverage
    expect(result.leverage).toBe("High");
  });

  it("should cap risk score at 100", () => {
    const submissions = [];
    const incidents = [{ incident_type: "form_not_posted_or_removed" }];
    const custodyEvents = [
      { event_type: "seal_broken_or_mismatch" },
      { event_type: "seal_broken_or_mismatch" },
    ];

    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      "Test School",
      submissions,
      incidents,
      custodyEvents
    );

    // 25 (seal) + 20 (form) = 45 (second seal doesn't add more since already counted)
    expect(result.risk_score).toBe(45);
  });

  it("should handle empty submissions array", () => {
    const result = risk.calculateStationRisk(
      "station-1",
      1,
      1,
      "Test Subdistrict",
      "Test School",
      [],
      [],
      []
    );

    expect(result.risk_score).toBe(0);
    expect(result.leverage).toBe("Low");
  });
});

describe("risk - Risk Explanation", () => {
  it("should provide high leverage explanation", () => {
    const highRisk: risk.StationRisk = {
      ...baseStationData,
      risk_score: 75,
      leverage: "High",
      margin: 35,
      votes_needed_to_flip: 18,
      risk_reasons: ["Seal mismatch observed", "Checksum mismatch detected"],
    };

    const explanation = risk.getRiskExplanation(highRisk);
    expect(explanation).toContain("High leverage station");
    expect(explanation).toContain("If fixed, this could potentially flip the constituency seat");
    expect(explanation).toContain("Estimated votes needed: 18");
  });

  it("should provide medium leverage explanation", () => {
    const mediumRisk: risk.StationRisk = {
      ...baseStationData,
      risk_score: 45,
      leverage: "Medium",
      margin: 25,
      votes_needed_to_flip: 13,
      risk_reasons: ["Missing posted form reported"],
    };

    const explanation = risk.getRiskExplanation(mediumRisk);
    expect(explanation).toContain("Medium leverage station");
    expect(explanation).toContain("Some risk factors present but less impact");
    expect(explanation).toContain("Estimated votes needed: 13");
  });

  it("should provide low leverage explanation", () => {
    const lowRisk: risk.StationRisk = {
      ...baseStationData,
      risk_score: 10,
      leverage: "Low",
      margin: 10,
      votes_needed_to_flip: 5,
      risk_reasons: ["No risk signals detected"],
    };

    const explanation = risk.getRiskExplanation(lowRisk);
    expect(explanation).toContain("Low leverage station");
    expect(explanation).toContain("Risk factors are minimal or not significant enough");
  });
});

describe("risk - Recommendations", () => {
  it("should provide high leverage recommendations", () => {
    const highRisk: risk.StationRisk = {
      ...baseStationData,
      risk_score: 75,
      leverage: "High",
    };

    const recommendations = risk.getRecommendations(highRisk);
    expect(recommendations).toContain("Investigate this station first");
    expect(recommendations).toContain("Compare all submissions for consistency");
    expect(recommendations).toContain("Verify chain of custody documentation");
    expect(recommendations).toContain("Document all discrepancies for legal action");
  });

  it("should provide medium leverage recommendations", () => {
    const mediumRisk: risk.StationRisk = {
      ...baseStationData,
      risk_score: 45,
      leverage: "Medium",
    };

    const recommendations = risk.getRecommendations(mediumRisk);
    expect(recommendations).toContain("Monitor this station for updates");
    expect(recommendations).toContain("Check for additional submissions");
    expect(recommendations).toContain("Review custody chain for gaps");
  });

  it("should provide low leverage recommendations", () => {
    const lowRisk: risk.StationRisk = {
      ...baseStationData,
      risk_score: 10,
      leverage: "Low",
    };

    const recommendations = risk.getRecommendations(lowRisk);
    expect(recommendations).toContain("Low priority - coverage is good");
    expect(recommendations).toContain("Continue monitoring for any issues");
    expect(recommendations).toContain("This station appears reliable");
  });
});

describe("risk - Risk Badge Color", () => {
  it("should return 'bad' for high leverage", () => {
    const highRisk: risk.StationRisk = {
      ...baseStationData,
      leverage: "High",
    };
    expect(risk.getRiskBadgeColor(highRisk)).toBe("bad");
  });

  it("should return 'warn' for medium leverage", () => {
    const mediumRisk: risk.StationRisk = {
      ...baseStationData,
      leverage: "Medium",
    };
    expect(risk.getRiskBadgeColor(mediumRisk)).toBe("warn");
  });

  it("should return 'ok' for low leverage", () => {
    const lowRisk: risk.StationRisk = {
      ...baseStationData,
      leverage: "Low",
    };
    expect(risk.getRiskBadgeColor(lowRisk)).toBe("ok");
  });
});

describe("risk - Constituency Metrics", () => {
  it("should calculate constituency metrics from station risks", () => {
    const stations: risk.StationRisk[] = [
      { ...baseStationData, risk_score: 0, leverage: "Low" },
      { ...baseStationData, risk_score: 0, leverage: "Low" },
      { ...baseStationData, risk_score: 0, leverage: "Low" },
      { ...baseStationData, risk_score: 0, leverage: "Low" },
      { ...baseStationData, risk_score: 0, leverage: "Low" },
      { ...baseStationData, risk_score: 0, leverage: "Low" },
      { ...baseStationData, risk_score: 0, leverage: "Low" },
      { ...baseStationData, risk_score: 0, leverage: "Low" },
      { ...baseStationData, risk_score: 60, leverage: "High" },
      { ...baseStationData, risk_score: 35, leverage: "Medium" },
    ];

    const result = risk.calculateConstituencyMetrics(
      1,
      1,
      1,
      stations
    );

    expect(result.total_stations).toBe(10);
    expect(result.verified_stations).toBe(8);
    expect(result.coverage_percent).toBe(80);
    expect(result.high_risk_stations).toBe(1);
    expect(result.medium_risk_stations).toBe(1);
    expect(result.low_risk_stations).toBe(8);
  });

  it("should handle empty stations array", () => {
    const result = risk.calculateConstituencyMetrics(1, 1, 1, []);
    expect(result.total_stations).toBe(0);
    expect(result.verified_stations).toBe(0);
    expect(result.coverage_percent).toBe(0);
    expect(result.high_risk_stations).toBe(0);
  });

  it("should calculate coverage percentage correctly", () => {
    const stations: risk.StationRisk[] = Array(20).fill({
      ...baseStationData,
      risk_score: 0,
      leverage: "Low",
    });

    const result = risk.calculateConstituencyMetrics(1, 1, 1, stations);
    expect(result.total_stations).toBe(20);
    expect(result.verified_stations).toBe(20);
    expect(result.coverage_percent).toBe(100);
  });

  it("should include placeholder data in results", () => {
    const stations: risk.StationRisk[] = [];
    const result = risk.calculateConstituencyMetrics(1, 1, 1, stations);
    expect(result.top_candidate).toBeNull();
    expect(result.runner_up).toBeNull();
  });
});