import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";

type Env = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_ENDPOINT?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  RATE_LIMIT_WINDOW?: string;
  RATE_LIMIT_MAX?: string;
  KILL_SWITCH_UPLOADS?: string;
  KILL_SWITCH_PUBLIC_WRITE?: string;
};

type Bindings = Env;
type Variables = {
  ip: string;
  requestId: string;
};

function getSupabase(c: Hono<{ Bindings: Bindings; Variables: Variables }>) {
  const url = c.get("env").SUPABASE_URL;
  const key = c.get("env").SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function getKillSwitch(c: Hono<{ Bindings: Bindings; Variables: Variables }>, type: "uploads" | "public_write") {
  const key = type === "uploads" ? "KILL_SWITCH_UPLOADS" : "KILL_SWITCH_PUBLIC_WRITE";
  return c.get("env")[key as keyof Env] === "true";
}

function checkRateLimit(c: Hono<{ Bindings: Bindings; Variables: Variables }>, key: string): { allowed: boolean; remaining: number } {
  const env = c.get("env");
  const window = parseInt(env.RATE_LIMIT_WINDOW || "60", 10);
  const max = parseInt(env.RATE_LIMIT_MAX || "100", 10);
  return { allowed: true, remaining: max };
}


const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  c.header("X-Request-ID", requestId);
  await next();
});

app.use("*", async (c, next) => {
  const xForwardedFor = c.req.header("X-Forwarded-For");
  const ip = xForwardedFor ? xForwardedFor.split(",")[0].trim() : c.req.header("CF-Connecting-IP") || "unknown";
  c.set("ip", ip);
  await next();
});

app.use("*", cors({
  origin: c => c.req.header("Origin") || "*",
  credentials: true,
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.get("/health", (c) => c.json({ status: "ok", requestId: c.get("requestId") }));

app.get("/api/v1/config", async (c) => {
  const supa = getSupabase(c);
  if (!supa) {
    return c.json({
      provinces: [{ id: 10, name_th: "กรุงเทพมหานคร" }],
      constituencies: [{ id: 1, province_id: 10, khet_number: 1 }],
      subdistricts: [{ constituency_id: 1, subdistrict_id: 1001, subdistrict_name: "แขวงตัวอย่าง" }],
      stations: [
        { id: "1000001", constituency_id: 1, subdistrict_id: 1001, subdistrict_name: "แขวงตัวอย่าง", station_number: 1, location_name: "โรงเรียนตัวอย่าง", is_verified_exist: true }
      ]
    });
  }

  try {
    const provincesResult = await supa.from("provinces").select("id, name_th").order("name_th");
      const constituenciesResult = await supa.from("constituencies").select("id, province_id, khet_number").order("khet_number");
      const subdistricts: { constituency_id: number; subdistrict_id: number; subdistrict_name: string }[] = (constituenciesResult.data || []).map(c => ({
        constituency_id: c.id,
        subdistrict_id: 1001,
        subdistrict_name: "ตัวอย่าง"
      }));
      const stationsResult = await supa.from("stations").select("id, constituency_id, subdistrict_id, subdistrict_name, station_number, location_name, is_verified_exist").limit(100);

      const provinces = provincesResult.data || [];
      const constituencies = constituenciesResult.data || [];
      const stations = stationsResult.data || [];

    return c.json({
      provinces,
      constituencies,
      subdistricts,
      stations
    });
  } catch (e) {
    console.error("Config fetch error:", e);
    return c.json({ error: "Failed to fetch config" }, 500);
  }
});

app.post("/api/v1/station/suggest", async (c) => {
  const killSwitch = getKillSwitch(c, "public_write");
  if (killSwitch) return c.json({ error: "Uploads disabled via kill switch" }, 503);

  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  const rate = checkRateLimit(c, "station_suggest");
  if (!rate.allowed) return c.json({ error: "Rate limit exceeded" }, 429);

  const body = await c.req.json();
  const { constituency_id, subdistrict_id, subdistrict_name, station_number, location_name } = body ?? {};
  if (!constituency_id || !subdistrict_name || !station_number) return c.json({ error: "missing required fields" }, 400);

  const dup = await supa
    .from("stations")
    .select("id")
    .eq("constituency_id", constituency_id)
    .eq("subdistrict_id", subdistrict_id ?? null)
    .eq("station_number", station_number)
    .limit(1);

  if (dup.data && dup.data.length > 0) return c.json({ station_id: dup.data[0].id, created: false });

  const id = crypto.randomUUID();
  const ins = await supa.from("stations").insert({
    id,
    constituency_id,
    subdistrict_id: subdistrict_id ?? null,
    subdistrict_name,
    station_number,
    location_name: location_name ?? null,
    is_verified_exist: false,
    source_ref: "user-suggest"
  });

  if (ins.error) return c.json({ error: ins.error.message }, 500);
  return c.json({ station_id: id, created: true });
});

app.post("/api/v1/evidence/upload", async (c) => {
  const killSwitch = getKillSwitch(c, "uploads");
  if (killSwitch) return c.json({ error: "Uploads disabled via kill switch" }, 503);

  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  const rate = checkRateLimit(c, "evidence_upload");
  if (!rate.allowed) return c.json({ error: "Rate limit exceeded" }, 429);

  const body = await c.req.json();
  const { station_id, photo_constituency_key, photo_partylist_key, checksum_constituency_total, checksum_partylist_total, user_session_id } = body ?? {};

  if (!station_id) return c.json({ error: "station_id required" }, 400);

  if (photo_constituency_key && checksum_constituency_total !== undefined && !Number.isFinite(checksum_constituency_total)) {
    return c.json({ error: "Invalid checksum_constituency_total" }, 400);
  }
  if (photo_partylist_key && checksum_partylist_total !== undefined && !Number.isFinite(checksum_partylist_total)) {
    return c.json({ error: "Invalid checksum_partylist_total" }, 400);
  }

  const ins = await supa.from("submissions").insert({
    station_id,
    user_session_id: user_session_id ?? null,
    ip_hash: null,
    photo_constituency_key: photo_constituency_key ?? null,
    photo_partylist_key: photo_partylist_key ?? null,
    checksum_constituency_total: checksum_constituency_total ?? null,
    checksum_partylist_total: checksum_partylist_total ?? null,
    status_constituency: photo_constituency_key ? "pending" : "missing",
    status_partylist: photo_partylist_key ? "pending" : "missing"
  }).select("id, status_constituency, status_partylist").limit(1);

  if (ins.error) return c.json({ error: ins.error.message }, 500);
  return c.json({ submission_id: ins.data?.[0]?.id ?? null, status: ins.data?.[0] });
});

app.get("/api/v1/admin/queue/next", async (c) => {
  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  const sheetType = c.req.query("sheet_type") as "constituency" | "partylist" | "all" | null;
  const status = c.req.query("status") as "pending" | "disputed" | null;

  let query = supa.from("submissions").select(`
    id,
    station_id,
    created_at,
    status_constituency,
    status_partylist,
    photo_constituency_key,
    photo_partylist_key,
    checksum_constituency_total,
    checksum_partylist_total,
    stations ( id, constituency_id, subdistrict_id, subdistrict_name, station_number, location_name, is_verified_exist )
  `).order("created_at", { ascending: true }).limit(1);

  if (sheetType === "constituency") {
    query = query.eq("status_constituency", status || "pending");
  } else if (sheetType === "partylist") {
    query = query.eq("status_partylist", status || "pending");
  } else if (sheetType === "all") {
    if (status) {
      query = query.or(`status_constituency.eq.${status},status_partylist.eq.${status}`);
    }
  } else if (status) {
    query = query.or(`status_constituency.eq.${status},status_partylist.eq.${status}`);
  }

  const res = await query;

  if (res.error) return c.json({ error: res.error.message }, 500);
  if (!res.data || res.data.length === 0) return c.json({ queue_empty: true });

  return c.json({ submission: res.data[0] });
});

app.post("/api/v1/admin/tally", async (c) => {
  const killSwitch = getKillSwitch(c, "public_write");
  if (killSwitch) return c.json({ error: "Write disabled via kill switch" }, 503);

  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  const body = await c.req.json();
  const { submission_id, reviewer_id, sheet_type, confirmed_station_number, header_text, score_map, metadata_checks, action, details } = body ?? {};

  if (!submission_id || !sheet_type || !score_map) return c.json({ error: "submission_id, sheet_type, and score_map required" }, 400);
  if (sheet_type !== "constituency" && sheet_type !== "partylist") return c.json({ error: "sheet_type must be 'constituency' or 'partylist'" }, 400);

  const total = (score_map as any).total_valid || (score_map as any).total;
  if (total === undefined || !Number.isFinite(total)) {
    return c.json({ error: "score_map must include total_valid field" }, 400);
  }

  const sub = await supa.from("submissions").select("id, station_id, checksum_" + sheet_type + "_total").eq("id", submission_id).limit(1);
  if (!sub.data || sub.data.length === 0) return c.json({ error: "Submission not found" }, 404);

  const expectedChecksum = sub.data[0]["checksum_" + sheet_type + "_total" as keyof typeof sub.data[0]];
  const autoVerified = expectedChecksum !== null && total === expectedChecksum;

  const tally = await supa.from("tallies").insert({
    submission_id,
    reviewer_id: reviewer_id ?? null,
    sheet_type,
    confirmed_station_number: confirmed_station_number ?? sub.data[0].station_id,
    header_text: header_text ?? null,
    score_map,
    metadata_checks: {
      autoVerified,
      ...metadata_checks
    }
  }).select("id").limit(1);

  if (tally.error) return c.json({ error: tally.error.message }, 500);

  let newStatus: "verified" | "rejected" | "disputed" | "pending" = autoVerified ? "verified" : "pending";
  if (action === "reject_quality") newStatus = "rejected";
  if (action === "reject_mismatch") newStatus = "rejected";
  if (action === "dispute") newStatus = "disputed";

  const updateField = sheet_type === "constituency" ? "status_constituency" : "status_partylist";
  const update = await supa.from("submissions").update({ [updateField]: newStatus }).eq("id", submission_id);

  if (update.error) return c.json({ error: update.error.message }, 500);

  await supa.from("verification_log").insert({
    submission_id,
    reviewer_id: reviewer_id ?? null,
    sheet_type,
    action: action || (autoVerified ? "auto_verified" : "manual_verify"),
    details: {
      total_valid: total,
      checksum_match: autoVerified,
      ...details
    }
  });

  return c.json({ tally_id: tally.data?.[0]?.id ?? null, status: newStatus, autoVerified });
});

app.post("/api/v1/incident/report", async (c) => {
  const killSwitch = getKillSwitch(c, "public_write");
  if (killSwitch) return c.json({ error: "Write disabled via kill switch" }, 503);

  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  const rate = checkRateLimit(c, "incident_report");
  if (!rate.allowed) return c.json({ error: "Rate limit exceeded" }, 429);

  const b = await c.req.json();
  if (!b.station_id || !b.incident_type) return c.json({ error: "station_id and incident_type required" }, 400);

  const r = await supa.from("incident_reports").insert({
    station_id: b.station_id,
    submission_id: b.submission_id ?? null,
    incident_type: b.incident_type,
    occurred_at: b.occurred_at ?? null,
    description: b.description ?? null,
    media_keys: b.media_keys ?? []
  }).select("id").limit(1);

  if (r.error) return c.json({ error: r.error.message }, 500);
  return c.json({ id: r.data?.[0]?.id ?? null });
});

app.post("/api/v1/custody/event", async (c) => {
  const killSwitch = getKillSwitch(c, "public_write");
  if (killSwitch) return c.json({ error: "Write disabled via kill switch" }, 503);

  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  const rate = checkRateLimit(c, "custody_event");
  if (!rate.allowed) return c.json({ error: "Rate limit exceeded" }, 429);

  const b = await c.req.json();
  if (!b.station_id || !b.event_type) return c.json({ error: "station_id and event_type required" }, 400);

  const r = await supa.from("custody_events").insert({
    station_id: b.station_id,
    submission_id: b.submission_id ?? null,
    event_type: b.event_type,
    occurred_at: b.occurred_at ?? null,
    box_id: b.box_id ?? null,
    seal_id: b.seal_id ?? null,
    notes: b.notes ?? null,
    media_keys: b.media_keys ?? []
  }).select("id").limit(1);

  if (r.error) return c.json({ error: r.error.message }, 500);
  return c.json({ id: r.data?.[0]?.id ?? null });
});

app.get("/api/v1/station/:station_id/evidence", async (c) => {
  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  const stationId = c.req.param("station_id");

  const [submissions, incidents, custody] = await Promise.all([
    supa.from("submissions").select(`
      id,
      created_at,
      status_constituency,
      status_partylist,
      photo_constituency_key,
      photo_partylist_key,
      checksum_constituency_total,
      checksum_partylist_total
    `).eq("station_id", stationId).order("created_at", { ascending: false }),
    supa.from("incident_reports").select("id, incident_type, occurred_at, description, created_at").eq("station_id", stationId).order("occurred_at", { ascending: false }),
    supa.from("custody_events").select("id, event_type, occurred_at, notes, created_at").eq("station_id", stationId).order("occurred_at", { ascending: false })
  ]);

  if (submissions.error || incidents.error || custody.error) {
    return c.json({ error: "Failed to fetch data" }, 500);
  }

  return c.json({
    station_id: stationId,
    submissions: submissions.data || [],
    incidents: incidents.data || [],
    custody_events: custody.data || []
  });
});

app.get("/api/v1/stats", async (c) => {
  const supa = getSupabase(c);
  if (!supa) {
    return c.json({
      total_stations: 0,
      verified_submissions: 0,
      pending_review: 0,
      coverage_by_province: {}
    });
  }

  try {
    const stats = await Promise.all([
      supa.from("stations").select("id", { count: "exact", head: true }),
      supa.from("submissions").select("id", { count: "exact", head: true }).or("status_constituency.eq.verified,status_partylist.eq.verified"),
      supa.from("submissions").select("id", { count: "exact", head: true }).or("status_constituency.eq.pending,status_partylist.eq.pending"),
      supa.from("provinces").select("id, name_th")
    ]);

    const provinces = stats[3].data || [];
    const provinceStats = await Promise.all(provinces.map(p =>
      supa.from("stations").select("id", { count: "exact", head: true }).eq("province_id", p.id).then(res => ({ ...p, station_count: res.count ?? 0 }))
    ));

    return c.json({
      total_stations: stats[0].count ?? 0,
      verified_submissions: stats[1].count ?? 0,
      pending_review: stats[2].count ?? 0,
      coverage_by_province: Object.fromEntries(provinceStats.map(p => [p.name_th, Math.round(((p.station_count / (stats[0].count ?? 1)) * 100) * 100) / 100]))
    });
  } catch (e) {
    console.error("Stats fetch error:", e);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

app.get("/api/v1/admin/kill-switch", async (c) => {
  return c.json({
    uploads: getKillSwitch(c, "uploads"),
    public_write: getKillSwitch(c, "public_write")
  });
});

export default app;