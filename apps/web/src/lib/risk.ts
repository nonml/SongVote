// Risk signals for station prioritization (Milestone 13)
// Calculates risk levels and "worth chasing?" indicators

export interface StationRisk {
  station_id: string;
  station_number: number;
  constituency_id: number;
  subdistrict_name: string;
  location_name: string | null;

  // Risk signals
  seal_mismatch: boolean;
  missing_posted_form: boolean;
  checksum_mismatch: boolean;
  abnormal_invalid_ratio: boolean;

  // Calculated scores
  risk_score: number; // 0-100
  leverage: "High" | "Medium" | "Low";
  margin: number | null;
  votes_needed_to_flip: number | null;

  // Why this matters
  risk_reasons: string[];
}

export interface ConstituencyMetrics {
  constituency_id: number;
  province_id: number;
  khet_number: number;

  // Station count
  total_stations: number;
  verified_stations: number;
  coverage_percent: number;

  // Margin analysis
  margin: number | null;
  votes_needed_to_flip: number | null;
  top_candidate: string | null;
  runner_up: string | null;

  // Risk summary
  high_risk_stations: number;
  medium_risk_stations: number;
  low_risk_stations: number;
}

// Risk weightings
const RISK_WEIGHTS = {
  seal_mismatch: 25,
  missing_posted_form: 20,
  checksum_mismatch: 20,
  abnormal_invalid_ratio: 15,
};

// Calculate risk score for a station
export function calculateStationRisk(
  stationId: string,
  stationNumber: number,
  constituencyId: number,
  subdistrictName: string,
  locationName: string | null,
  submissions: Array<{
    checksum_constituency_total?: number | null;
    checksum_partylist_total?: number | null;
    verified_tallies?: {
      constituency?: number | null;
      partylist?: number | null;
    };
  }>,
  incidents: Array<{ incident_type: string }>,
  custodyEvents: Array<{ event_type: string }>
): StationRisk {
  const riskSignals: Record<string, boolean> = {};
  const riskReasons: string[] = [];

  // Check for seal mismatch custody events
  const sealMismatch = custodyEvents.some(e =>
    e.event_type === "seal_broken_or_mismatch" ||
    e.event_type === "seal_intact_before_open"
  );
  if (sealMismatch) {
    riskSignals.seal_mismatch = true;
    riskReasons.push("Seal mismatch observed");
  }

  // Check for missing posted form incidents
  const missingForm = incidents.some(e =>
    e.incident_type === "form_not_posted_or_removed" ||
    e.incident_type === "counting_obstructed"
  );
  if (missingForm) {
    riskSignals.missing_posted_form = true;
    riskReasons.push("Missing posted form reported");
  }

  // Check for checksum mismatches
  const checksumMismatch = submissions.some(sub => {
    if (!sub.checksum_constituency_total || !sub.verified_tallies?.constituency) return false;
    return sub.checksum_constituency_total !== sub.verified_tallies.constituency;
  });
  if (checksumMismatch) {
    riskSignals.checksum_mismatch = true;
    riskReasons.push("Checksum mismatch detected");
  }

  // Check for abnormal invalid ratio (placeholder - needs real data)
  // This would be calculated from tallies with invalid/no_vote counts
  const abnormalInvalidRatio = false; // Placeholder
  if (abnormalInvalidRatio) {
    riskSignals.abnormal_invalid_ratio = true;
    riskReasons.push("Abnormal invalid vote ratio");
  }

  // Calculate risk score (0-100)
  let riskScore = 0;
  for (const [signal, present] of Object.entries(riskSignals)) {
    if (present) {
      riskScore += RISK_WEIGHTS[signal as keyof typeof RISK_WEIGHTS];
    }
  }
  riskScore = Math.min(100, riskScore);

  // Calculate leverage based on risk and coverage
  // For MVP2, we estimate margin from risk score
  // In production, this would use actual verified tallies
  const estimatedMargin = riskScore > 50 ? Math.floor(riskScore / 2) : 35;
  const votesNeeded = Math.ceil(estimatedMargin / 2);

  // Determine leverage level
  let leverage: StationRisk["leverage"] = "Low";
  if (riskScore >= 60) {
    leverage = "High";
  } else if (riskScore >= 30) {
    leverage = "Medium";
  }

  return {
    station_id: stationId,
    station_number: stationNumber,
    constituency_id: constituencyId,
    subdistrict_name: subdistrictName,
    location_name: locationName,
    seal_mismatch: riskSignals.seal_mismatch || false,
    missing_posted_form: riskSignals.missing_posted_form || false,
    checksum_mismatch: riskSignals.checksum_mismatch || false,
    abnormal_invalid_ratio: riskSignals.abnormal_invalid_ratio || false,
    risk_score: riskScore,
    leverage,
    margin: estimatedMargin,
    votes_needed_to_flip: votesNeeded,
    risk_reasons: riskReasons.length > 0 ? riskReasons : ["No risk signals detected"],
  };
}

// Get why this matters explanation
export function getRiskExplanation(risk: StationRisk): string {
  if (risk.leverage === "High") {
    return `High leverage station. ${risk.risk_reasons.join(". ")}.
    If fixed, this could potentially flip the constituency seat.
    Estimated votes needed: ${risk.votes_needed_to_flip || "?"}`;
  } else if (risk.leverage === "Medium") {
    return `Medium leverage station. ${risk.risk_reasons.join(". ")}.
    Some risk factors present but less impact on overall result.
    Estimated votes needed: ${risk.votes_needed_to_flip || "?"}`;
  } else {
    return `Low leverage station. ${risk.risk_reasons.join(". ")}.
    Risk factors are minimal or not significant enough to affect outcome.`;
  }
}

// Calculate constituency-level metrics
export function calculateConstituencyMetrics(
  constituencyId: number,
  provinceId: number,
  khetNumber: number,
  stations: StationRisk[]
): ConstituencyMetrics {
  const totalStations = stations.length;
  const verifiedStations = stations.filter(s => s.risk_score === 0).length;
  const coveragePercent = totalStations > 0 ? Math.round((verifiedStations / totalStations) * 10000) / 100 : 0;

  // Calculate margin from verified tallies (placeholder)
  // In production, this would aggregate actual candidate vote totals
  const margin = totalStations > 0 ? 35 + (Math.random() * 20 - 10) : null;
  const votesNeededToFlip = margin ? Math.ceil(margin / 2) : null;

  // Count risk levels
  const highRiskStations = stations.filter(s => s.leverage === "High").length;
  const mediumRiskStations = stations.filter(s => s.leverage === "Medium").length;
  const lowRiskStations = stations.filter(s => s.leverage === "Low").length;

  return {
    constituency_id: constituencyId,
    province_id: provinceId,
    khet_number: khetNumber,
    total_stations: totalStations,
    verified_stations: verifiedStations,
    coverage_percent: coveragePercent,
    margin: margin,
    votes_needed_to_flip: votesNeededToFlip,
    top_candidate: null, // Placeholder - would come from tallies
    runner_up: null, // Placeholder - would come from tallies
    high_risk_stations: highRiskStations,
    medium_risk_stations: mediumRiskStations,
    low_risk_stations: lowRiskStations,
  };
}

// Get recommendations based on risk level
export function getRecommendations(risk: StationRisk): string[] {
  const recommendations: string[] = [];

  if (risk.leverage === "High") {
    recommendations.push("Investigate this station first");
    recommendations.push("Compare all submissions for consistency");
    recommendations.push("Verify chain of custody documentation");
    recommendations.push("Document all discrepancies for legal action");
  } else if (risk.leverage === "Medium") {
    recommendations.push("Monitor this station for updates");
    recommendations.push("Check for additional submissions");
    recommendations.push("Review custody chain for gaps");
  } else {
    recommendations.push("Low priority - coverage is good");
    recommendations.push("Continue monitoring for any issues");
    recommendations.push("This station appears reliable");
  }

  return recommendations;
}

// Format risk badge color
export function getRiskBadgeColor(risk: StationRisk): string {
  if (risk.leverage === "High") return "bad";
  if (risk.leverage === "Medium") return "warn";
  return "ok";
}