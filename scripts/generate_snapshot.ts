/**
 * Static JSON Snapshot Generator
 * Generates a point-in-time snapshot of all verified election data
 * for CDN-backed public dashboard serving.
 *
 * Intended to run every 30-60 seconds (configurable via SCHEDULE_INTERVAL)
 */

import { createClient } from "@supabase/supabase-js";

type Env = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SNAPSHOT_OUTPUT_DIR?: string;
  SCHEDULE_INTERVAL?: string; // in seconds
};

// Type definitions for the snapshot structure
interface Province {
  id: number;
  name_th: string;
}

interface Constituency {
  id: number;
  province_id: number;
  khet_number: number;
}

interface Station {
  id: string;
  constituency_id: number;
  subdistrict_id: number | null;
  subdistrict_name: string;
  station_number: number;
  location_name: string | null;
  is_verified_exist: boolean;
}

interface Submission {
  id: string;
  station_id: string;
  created_at: string;
  status_constituency: "missing" | "pending" | "verified" | "rejected" | "disputed";
  status_partylist: "missing" | "pending" | "verified" | "rejected" | "disputed";
  photo_constituency_key: string | null;
  photo_partylist_key: string | null;
  checksum_constituency_total: number | null;
  checksum_partylist_total: number | null;
}

interface VerificationLog {
  id: number;
  submission_id: string;
  reviewer_id: string | null;
  sheet_type: "constituency" | "partylist" | null;
  action: string | null;
  details: any;
  created_at: string;
}

interface SnapshotMetadata {
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

interface StationSummary {
  station_id: string;
  station_number: number;
  location_name: string | null;
  constituency_id: number;
  subdistrict_name: string;
  submissions: SubmissionSummary[];
}

interface SubmissionSummary {
  submission_id: string;
  created_at: string;
  status_constituency: string;
  status_partylist: string;
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

interface ProvinceStats {
  province_id: number;
  province_name: string;
  total_stations: number;
  verified_stations: number;
  coverage_percent: number;
}

interface PublicSnapshot {
  metadata: SnapshotMetadata;
  provinces: Province[];
  constituencies: Constituency[];
  stations: StationSummary[];
  province_stats: ProvinceStats[];
  last_verified_at: string | null;
}

async function generateSnapshot(supabase: any, forHashing: boolean = false): Promise<PublicSnapshot> {
  const generatedAt = new Date().toISOString();

  // Get all provinces
  const provincesResult = await supabase
    .from("provinces")
    .select("id, name_th")
    .order("name_th");
  const provinces = provincesResult.data || [];

  // Get all constituencies
  const constituenciesResult = await supabase.from("constituencies").select("id, province_id, khet_number");
  const constituencies = constituenciesResult.data || [];

  // Get all stations
  const stationsResult = await supabase
    .from("stations")
    .select("id, constituency_id, subdistrict_id, subdistrict_name, station_number, location_name, is_verified_exist");
  const stations = stationsResult.data || [];

  // Get all submissions with their tallies
  const submissionsResult = await supabase
    .from("submissions")
    .select(`
      id, station_id, created_at, status_constituency, status_partylist,
      photo_constituency_key, photo_partylist_key,
      checksum_constituency_total, checksum_partylist_total
    `);
  const submissions = submissionsResult.data || [];

  // Get all tallies (reviewer transcriptions)
  const talliesResult = await supabase
    .from("tallies")
    .select("id, submission_id, sheet_type, score_map, created_at");
  const tallies = talliesResult.data || [];

  // Get all verification logs for audit trail
  const verificationLogsResult = await supabase
    .from("verification_log")
    .select("id, submission_id, reviewer_id, sheet_type, action, details, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  const verificationLogs = verificationLogsResult.data || [];

  // Compute station summaries
  const stationSummaries: StationSummary[] = stations.map((station: Station) => {
    const stationSubmissions = submissions.filter(
      (s: Submission) => s.station_id === station.id
    );

    const submissionsSummary: SubmissionSummary[] = stationSubmissions.map((sub: Submission) => {
      // Get tallies for this submission
      const constituencyTally = tallies.find(
        (t: any) => t.submission_id === sub.id && t.sheet_type === "constituency"
      );
      const partylistTally = tallies.find(
        (t: any) => t.submission_id === sub.id && t.sheet_type === "partylist"
      );

      return {
        submission_id: sub.id,
        created_at: sub.created_at,
        status_constituency: sub.status_constituency,
        status_partylist: sub.status_partylist,
        has_constituency_photo: !!sub.photo_constituency_key,
        has_partylist_photo: !!sub.photo_partylist_key,
        checksums: {
          constituency: sub.checksum_constituency_total,
          partylist: sub.checksum_partylist_total,
        },
        verified_tallies: {
          constituency: constituencyTally ? getTallyTotal(constituencyTally.score_map) : null,
          partylist: partylistTally ? getTallyTotal(partylistTally.score_map) : null,
        },
      };
    });

    return {
      station_id: station.id,
      station_number: station.station_number,
      location_name: station.location_name,
      constituency_id: station.constituency_id,
      subdistrict_name: station.subdistrict_name,
      submissions: submissionsSummary,
    };
  });

  // Compute province stats
  const provinceStats: ProvinceStats[] = provinces.map((province: Province) => {
    const provinceStations = stations.filter(
      (s: Station) => {
        // Need to lookup constituency to find province_id
        const constituency = constituencies.find((c: Constituency) => c.id === s.constituency_id);
        return constituency?.province_id === province.id;
      }
    );

    const verifiedStations = stationSummaries.filter((s: StationSummary) =>
      s.submissions.some(
        (sub: SubmissionSummary) =>
          sub.status_constituency === "verified" || sub.status_partylist === "verified"
      )
    );

    const total = provinceStations.length;
    const verified = verifiedStations.length;
    const coverage = total > 0 ? Math.round((verified / total) * 10000) / 100 : 0;

    return {
      province_id: province.id,
      province_name: province.name_th,
      total_stations: total,
      verified_stations: verified,
      coverage_percent: coverage,
    };
  });

  // Calculate totals
  const totalStations = stations.length;
  const verifiedSubmissions = submissions.filter(
    (s: Submission) => s.status_constituency === "verified" || s.status_partylist === "verified"
  ).length;
  const pendingReview = submissions.filter(
    (s: Submission) => s.status_constituency === "pending" || s.status_partylist === "pending"
  ).length;
  const disputedCount = submissions.filter(
    (s: Submission) => s.status_constituency === "disputed" || s.status_partylist === "disputed"
  ).length;
  const rejectedCount = submissions.filter(
    (s: Submission) => s.status_constituency === "rejected" || s.status_partylist === "rejected"
  ).length;

  // Count verified tallies
  const verifiedConstituencyTallies = tallies.filter(
    (t: any) => t.action === "verify"
  ).filter((t: any) => t.sheet_type === "constituency").length;
  const verifiedPartylistTallies = tallies.filter(
    (t: any) => t.action === "verify"
  ).filter((t: any) => t.sheet_type === "partylist").length;

  // Get most recent verified timestamp
  const verifiedSubmission = submissions.find(
    (s: Submission) => s.status_constituency === "verified" || s.status_partylist === "verified"
  );
  const lastVerifiedAt = verifiedSubmission ? verifiedSubmission.created_at : null;

  // Calculate coverage percentages
  const totalCoverage = totalStations > 0 ? Math.round((verifiedStations.length / totalStations) * 10000) / 100 : 0;
  const constituencyCoverage = verifiedConstituencyTallies > 0
    ? Math.round((verifiedConstituencyTallies / submissions.length) * 10000) / 100
    : 0;
  const partylistCoverage = verifiedPartylistTallies > 0
    ? Math.round((verifiedPartylistTallies / submissions.length) * 10000) / 100
    : 0;

  const metadata: SnapshotMetadata = {
    // Deterministic fields (same input = same output for hashing)
    snapshot_version: "2.0.0",
    total_stations: totalStations,
    verified_submissions: verifiedSubmissions,
    pending_review: pendingReview,
    disputed_count: disputedCount,
    verified_constituency_tallies: verifiedConstituencyTallies,
    verified_partylist_tallies: verifiedPartylistTallies,
    rejected_submissions: rejectedCount,
    // Metadata (may vary between runs)
    generated_at: generatedAt,
    last_updated: lastVerifiedAt,
    provenance: {
      build_time: generatedAt,
      runtime_version: "2.0.0",
      database_version: "v1",
    },
    coverage_statistics: {
      total_percent: totalCoverage,
      verified_constituency_percent: constituencyCoverage,
      verified_partylist_percent: partylistCoverage,
    },
  };

  return {
    metadata,
    provinces,
    constituencies,
    stations: stationSummaries,
    province_stats: provinceStats,
    last_verified_at: lastVerifiedAt,
  };
}

function getTallyTotal(scoreMap: any): number | null {
  if (!scoreMap) return null;
  return scoreMap.total_valid || scoreMap.total || null;
}

async function saveSnapshot(snapshot: PublicSnapshot, outputDir: string, isDeterministic: boolean = false): Promise<void> {
  const fs = await import("fs/promises");
  const path = await import("path");
  const crypto = await import("crypto");

  const filePath = path.join(outputDir, isDeterministic ? "snapshot.deterministic.json" : "snapshot.json");

  // For deterministic output, remove time-dependent fields
  let content: string;
  if (isDeterministic) {
    // Create deterministic version without generated_at
    const deterministicSnapshot = {
      ...snapshot,
      metadata: {
        ...snapshot.metadata,
        generated_at: "1970-01-01T00:00:00.000Z", // Fixed epoch for hashing
      }
    };
    content = JSON.stringify(deterministicSnapshot, null, 2);

    // Calculate hash for integrity verification
    const hash = crypto.createHash("sha256").update(content).digest("hex");
    content = `// Snapshot hash: ${hash}\n` + content;
  } else {
    content = JSON.stringify(snapshot, null, 2);
  }

  await fs.writeFile(filePath, content, "utf8");
  console.log(`Snapshot saved to ${filePath}`);
}

async function main() {
  const env = process.env as unknown as Env;

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
    process.exit(1);
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  console.log("Generating snapshot...");
  const snapshot = await generateSnapshot(supabase);

  console.log(`Generated snapshot with ${snapshot.stations.length} stations`);

  const outputDir = env.SNAPSHOT_OUTPUT_DIR || "./dist";

  // Save regular snapshot
  await saveSnapshot(snapshot, outputDir, false);

  // Save deterministic snapshot for integrity verification
  await saveSnapshot(snapshot, outputDir, true);

  console.log(`Metadata: ${snapshot.metadata.verified_submissions} verified, ${snapshot.metadata.pending_review} pending, ${snapshot.metadata.disputed_count} disputed`);
  console.log(`Coverage: ${snapshot.metadata.coverage_statistics.total_percent}% total, ${snapshot.metadata.coverage_statistics.verified_constituency_percent}% constituency`);
  console.log("Snapshot generation complete");
}

main().catch((err) => {
  console.error("Snapshot generation failed:", err);
  process.exit(1);
});