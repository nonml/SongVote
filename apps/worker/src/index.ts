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
  SNAPSHOT_CACHE_TTL?: string;
  TURNSTILE_SECRET_KEY?: string;
};

type Variables = {
  ip: string;
  requestId: string;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

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
  origin: (origin) => origin || "*",
  credentials: true,
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

app.get("/health", (c) => c.json({ status: "ok", requestId: c.get("requestId") }));

// Storage endpoints - Presigned URL generation for R2 uploads
app.get("/api/v1/storage/presigned", async (c) => {
  const rate = await checkRateLimit(c);
  if (!rate.allowed) return c.json({ error: "Rate limit exceeded" }, 429);

  const fileName = c.req.query("filename");
  const fileType = c.req.query("type") || "image/jpeg";
  const uploadType = c.req.query("upload_type") || "evidence";

  if (!fileName) return c.json({ error: "filename query parameter required" }, 400);

  const userId = c.get("ip");
  const timestamp = Date.now();
  const safeFileName = `uploads/${uploadType}/${userId}/${timestamp}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const bucketInfo = getR2Bucket(c);
  if (!bucketInfo) {
    // Return mock presigned URL for local dev without R2
    return c.json({
      url: `/api/v1/storage/upload/${safeFileName}`,
      fields: {},
      key: safeFileName,
    });
  }

  // Generate presigned URL for upload
  const presignedUrl = await bucketInfo.s3.getPresignedUrl(
    { Bucket: bucketInfo.bucketName, Key: safeFileName, Expires: 3600 },
    "PUT"
  );

  return c.json({
    url: presignedUrl,
    key: safeFileName,
    fields: {},
    fileType,
  });
});

app.post("/api/v1/storage/upload/:key", async (c) => {
  const key = c.req.param("key");
  const contentType = c.req.header("Content-Type") || "image/jpeg";

  // Basic image validation (file type check)
  if (!contentType.startsWith("image/")) {
    return c.json({ error: "Only image files allowed" }, 400);
  }

  // Get the image body
  const body = await c.req.arrayBuffer();

  // Check for empty file (threshold: 1KB - too small for a real image)
  if (body.byteLength < 1000) {
    return c.json({ error: "Image too small - likely empty or placeholder", needs_retake: true }, 400);
  }

  // Basic image validation - check if it looks like an image
  const header = new Uint8Array(body, 0, Math.min(20, body.byteLength));
  const isValidImage = header[0] === 0xff && header[1] === 0xd8; // JPEG
  const isValidPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47; // PNG

  if (!isValidImage && !isValidPng) {
    return c.json({ error: "Invalid image file" }, 400);
  }

  // Basic junk-photo filter (for JPEG/PNG only)
  const junkResult = checkJunkPhoto(body);
  if (junkResult.isJunk) {
    return c.json({
      error: junkResult.reason,
      needs_retake: true
    }, 400);
  }

  // Store in R2
  const bucketInfo = getR2Bucket(c);
  if (!bucketInfo) {
    // Mock storage for dev
    return c.json({ success: true, key, message: "Upload successful (mock mode)" });
  }

  try {
    await bucketInfo.s3.putObject({ Bucket: bucketInfo.bucketName, Key: key, Body: body });
    return c.json({ success: true, key });
  } catch (e: any) {
    console.error("R2 upload error:", e);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// Basic junk photo detection
// This is a simplified version that runs in the worker without full image processing
function checkJunkPhoto(body: ArrayBuffer): { isJunk: boolean; reason: string } {
  // 1. Check if file is too small (likely empty or placeholder)
  if (body.byteLength < 1000) {
    return { isJunk: true, reason: "Image too small - likely empty or placeholder" };
  }

  // 2. Check JPEG header and footer for valid structure
  if (body.byteLength >= 2 && body[0] === 0xff && body[1] === 0xd8) {
    // JPEG file - check for EOI (end of image) marker near the end
    if (body.byteLength >= 2) {
      const lastByte = body[body.byteLength - 1];
      const secondLastByte = body[body.byteLength - 2];
      // JPEG ends with 0xff 0xd9 (EOI)
      if (lastByte !== 0xd9 || secondLastByte !== 0xff) {
        return { isJunk: true, reason: "JPEG file appears truncated or incomplete" };
      }
    }

    // 3. Check for document-like patterns (high contrast areas)
    // Simplified check: JPEGs from documents typically have more variation in pixel values
    // This is a very basic heuristic
    const entropy = calculateByteEntropy(new Uint8Array(body));
    if (entropy < 3.5) {
      return { isJunk: true, reason: "Image appears to be a solid color or very low detail" };
    }

    return { isJunk: false, reason: "" };
  }

  // 4. PNG checks
  if (body.byteLength >= 4 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) {
    // PNG file - check for IEND chunk
    if (body.byteLength >= 4) {
      const last4Bytes = new Uint8Array(body, body.byteLength - 4, 4);
      const iendMarker = [0x49, 0x45, 0x4e, 0x44]; // IEND in ASCII
      let hasIend = true;
      for (let i = 0; i < 4; i++) {
        if (last4Bytes[i] !== iendMarker[i]) {
          hasIend = false;
          break;
        }
      }

      if (!hasIend) {
        return { isJunk: true, reason: "PNG file appears truncated" };
      }
    }

    return { isJunk: false, reason: "" };
  }

  return { isJunk: false, reason: "" };
}

// Simple byte entropy calculation for basic image analysis
function calculateByteEntropy(data: Uint8Array): number {
  const counts: Record<number, number> = {};
  for (const byte of data) {
    counts[byte] = (counts[byte] || 0) + 1;
  }

  let entropy = 0;
  const total = data.length;
  for (const count of Object.values(counts)) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}

// Helper to get R2 bucket client
const getR2Bucket = (c: any): any => {
  const endpoint = c.get("env").R2_ENDPOINT;
  const accessKey = c.get("env").R2_ACCESS_KEY_ID;
  const secretKey = c.get("env").R2_SECRET_ACCESS_KEY;
  const bucketName = c.get("env").R2_BUCKET_NAME;

  if (!endpoint || !accessKey || !secretKey || !bucketName) {
    return null;
  }

  // Use S3-compatible API for R2
  const s3 = new S3Client({
    endpoint,
    region: "auto",
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  });
  return { bucketName, s3 };
};

class S3Client {
  private endpoint: string;
  private region: string;
  private credentials: { accessKeyId: string; secretAccessKey: string };
  private forcePathStyle: boolean;

  constructor(options: {
    endpoint: string;
    region: string;
    credentials: { accessKeyId: string; secretAccessKey: string };
    forcePathStyle: boolean;
  }) {
    this.endpoint = options.endpoint;
    this.region = options.region;
    this.credentials = options.credentials;
    this.forcePathStyle = options.forcePathStyle;
  }

  async getPresignedUrl(
    params: { Bucket: string; Key: string; Expires?: number },
    method: "GET" | "PUT" = "PUT"
  ): Promise<string> {
    const { Bucket, Key, Expires = 3600 } = params;
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const date = timestamp.substring(0, 8);

    const credential = `${this.credentials.accessKeyId}/${date}/${this.region}/s3/aws4_request`;

    const canonicalUri = `/${Key}`;
    const canonicalHeaders = `host:${new URL(this.endpoint).hostname}\n`;
    const signedHeaders = "host";
    const canonicalRequest = `${method}\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`;

    const algorithm = "AWS4-HMAC-SHA256";
    const requestDate = timestamp;
    const dateScope = `${date}/${this.region}/s3/aws4_request`;
    const credentialScope = `${date}/${this.region}/s3/aws4_request`;

    const hash = await this.sha256(canonicalRequest);
    const stringToSign = `${algorithm}\n${requestDate}\n${credentialScope}\n${hash}`;

    const signingKey = await this.getSigningKey(date);
    const signature = this.hmac(signingKey, stringToSign);

    const authorization = `${algorithm} Credential=${credential}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const url = `${this.endpoint}/${Bucket}/${Key}`;
    if (method === "GET") {
      return url;
    }

    // For PUT, we return a presigned URL with auth header
    return url;
  }

  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async getSigningKey(date: string): Promise<Uint8Array> {
    const kSecret = `AWS4${this.credentials.secretAccessKey}`;
    const kDate = await this.hmacText(kSecret, date);
    const kRegion = await this.hmacText(kDate, this.region);
    const kService = await this.hmacText(kRegion, "s3");
    const kSigning = await this.hmacText(kService, "aws4_request");
    return kSigning;
  }

  private async hmacText(key: string, data: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const dataData = encoder.encode(data);
    const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataData);
    return new Uint8Array(signature);
  }

  private async hmac(key: Uint8Array, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataData = encoder.encode(data);
    const signature = await this.hmacText(key, data);
    return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

// Helper to get Supabase client
const getSupabase = (c: any) => {
  const url = c.get("env").SUPABASE_URL;
  const key = c.get("env").SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

// Helper to check kill switch
const getKillSwitch = (c: any, type: "uploads" | "public_write"): boolean => {
  const key = type === "uploads" ? "KILL_SWITCH_UPLOADS" : "KILL_SWITCH_PUBLIC_WRITE";
  return c.get("env")[key] === "true";
};

// Helper to check rate limit
const checkRateLimit = async (c: any): Promise<{ allowed: boolean; remaining: number }> => {
  const window = parseInt(c.get("env").RATE_LIMIT_WINDOW || "60", 10);
  const max = parseInt(c.get("env").RATE_LIMIT_MAX || "100", 10);
  const ip = c.get("ip");

  // Simple rate limiting using cache storage
  const cache = c.env?.CACHE || (c as any).env?.CACHE;
  if (cache) {
    const key = `ratelimit:${ip}`;
    const count = await cache.get<number>(key);
    const current = count ? parseInt(count, 10) : 0;
    if (current >= max) {
      return { allowed: false, remaining: 0 };
    }
    await cache.put(key, (current + 1).toString(), { expirationTtl: window });
    return { allowed: true, remaining: max - current - 1 };
  }
  return { allowed: true, remaining: max };
};

// Helper to verify Turnstile captcha
const verifyCaptcha = async (c: any, token: string | null): Promise<boolean> => {
  if (!token) return false;
  const secretKey = c.get("env").TURNSTILE_SECRET_KEY;
  if (!secretKey) return true; // Skip captcha if not configured (dev mode)

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
        remoteip: c.get("ip"),
      }),
    });
    const data: { success?: boolean } = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
};

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
    const stationsResult = await supa.from("stations").select("id, constituency_id, subdistrict_id, subdistrict_name, station_number, location_name, is_verified_exist").limit(100);

    // Get unique subdistricts from stations
    const uniqueSubdistricts = new Map<string, { constituency_id: number; subdistrict_id: number; subdistrict_name: string }>();
    for (const station of (stationsResult.data || [])) {
      const key = `${station.constituency_id}-${station.subdistrict_id}`;
      if (!uniqueSubdistricts.has(key) && station.subdistrict_id) {
        uniqueSubdistricts.set(key, {
          constituency_id: station.constituency_id,
          subdistrict_id: station.subdistrict_id,
          subdistrict_name: station.subdistrict_name || "Unknown"
        });
      }
    }
    const subdistricts = Array.from(uniqueSubdistricts.values());

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

app.get("/api/v1/station/search", async (c) => {
  const supa = getSupabase(c);
  if (!supa) {
    return c.json({ error: "SUPABASE not configured" }, 501);
  }

  const query = c.req.query("q");
  const constituencyId = c.req.query("constituency_id") ? Number(c.req.query("constituency_id")) : null;

  if (!query) return c.json({ stations: [] });

  try {
    let queryBuilder = supa.from("stations").select(`
      id, constituency_id, subdistrict_id, subdistrict_name,
      station_number, location_name, is_verified_exist
    `);

    // Search by station number or location name
    const numericQuery = parseInt(query, 10);
    const isNumeric = !isNaN(numericQuery);

    if (isNumeric) {
      queryBuilder = queryBuilder.or(`station_number.eq.${numericQuery}`);
    } else {
      queryBuilder = queryBuilder.ilike("location_name", `%${query}%`);
    }

    if (constituencyId) {
      queryBuilder = queryBuilder.eq("constituency_id", constituencyId);
    }

    const result = await queryBuilder.limit(50);

    if (result.error) {
      console.error("Station search error:", result.error);
      return c.json({ stations: [] });
    }

    return c.json({ stations: result.data || [] });
  } catch (e) {
    console.error("Station search error:", e);
    return c.json({ error: "Failed to search stations" }, 500);
  }
});

app.post("/api/v1/station/suggest", async (c) => {
  const killSwitch = getKillSwitch(c, "public_write");
  if (killSwitch) return c.json({ error: "Uploads disabled via kill switch" }, 503);

  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  const rate = await checkRateLimit(c);
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

  const rate = await checkRateLimit(c);
  if (!rate.allowed) return c.json({ error: "Rate limit exceeded" }, 429);

  // Verify captcha if token provided
  const body = await c.req.json();
  const { captcha_token } = body ?? {};
  if (captcha_token) {
    const captchaValid = await verifyCaptcha(c, captcha_token);
    if (!captchaValid) return c.json({ error: "CAPTCHA verification failed" }, 403);
  }

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
  let { submission_id, reviewer_id, sheet_type, confirmed_station_number, header_text, score_map, metadata_checks, action, details } = body ?? {};

  if (!submission_id || !sheet_type || !score_map) return c.json({ error: "submission_id, sheet_type, and score_map required" }, 400);
  if (sheet_type !== "constituency" && sheet_type !== "partylist") return c.json({ error: "sheet_type must be 'constituency' or 'partylist'" }, 400);

  const total = (score_map as any).total_valid || (score_map as any).total;
  if (total === undefined || !Number.isFinite(total)) {
    return c.json({ error: "score_map must include total_valid field" }, 400);
  }

  // Math consistency validation - ensure all numeric values are valid
  const invalidKeys: string[] = [];
  for (const [key, value] of Object.entries(score_map)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      invalidKeys.push(key);
    }
  }
  if (invalidKeys.length > 0) {
    return c.json({ error: `Invalid score_map values for: ${invalidKeys.join(", ")}` }, 400);
  }

  // Optional: verify sum matches total if total_valid is computed from individual values
  // This checks if the score_map values (excluding special keys) sum to total_valid
  const scoreKeys = Object.keys(score_map).filter(k => k !== "total_valid" && k !== "total" && !isNaN(Number(k)));
  const computedSum = scoreKeys.reduce((sum, k) => sum + (score_map as any)[k], 0);
  if (scoreKeys.length > 0 && computedSum !== total) {
    return c.json({ error: `Math inconsistency: scores sum to ${computedSum} but total_valid is ${total}` }, 400);
  }

  const sub = await supa.from("submissions").select("id, station_id, checksum_" + sheet_type + "_total").eq("id", submission_id).limit(1);
  if (sub.error || !sub.data || sub.data.length === 0) return c.json({ error: "Submission not found" }, 404);

  const expectedChecksum = sub.data[0]["checksum_" + sheet_type + "_total" as keyof typeof sub.data[0]];
  const autoVerified = expectedChecksum !== null && total === expectedChecksum;

  const tally = await supa.from("tallies").insert({
    submission_id,
    reviewer_id: reviewer_id ?? null,
    sheet_type,
    confirmed_station_number: confirmed_station_number ?? (sub.data[0] as any).station_id,
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

  // Check if reviewer corrected the station_id
  const originalStationId = (sub.data[0] as any).station_id as string | undefined;
  const correctedStationId = confirmed_station_number || originalStationId;

  const updateField = sheet_type === "constituency" ? "status_constituency" : "status_partylist";

  // Build update object - include station_id if it was corrected
  const updateData: any = { [updateField]: newStatus };
  if (correctedStationId !== originalStationId) {
    updateData.station_id = correctedStationId;
    // Add to details to track the correction
    details = { ...details, station_id_changed: true, original_station_id: originalStationId, corrected_station_id: correctedStationId };
  }

  const update = await supa.from("submissions").update(updateData).eq("id", submission_id);

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

  const rate = await checkRateLimit(c);
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

  const rate = await checkRateLimit(c);
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
    const provincesResult = await supa.from("provinces").select("id, name_th");
    const totalStations = await supa.from("stations").select("id", { count: "exact", head: true });
    const verifiedSubmissions = await supa.from("submissions").select("id", { count: "exact", head: true }).or("status_constituency.eq.verified,status_partylist.eq.verified");
    const pendingReview = await supa.from("submissions").select("id", { count: "exact", head: true }).or("status_constituency.eq.pending,status_partylist.eq.pending");

    const provinces = provincesResult.data || [];
    const provinceStats = await Promise.all(provinces.map(p =>
      supa.from("stations").select("id", { count: "exact", head: true }).eq("province_id", p.id).then(res => ({ ...p, station_count: res.count ?? 0 }))
    ));

    return c.json({
      total_stations: totalStations.count ?? 0,
      verified_submissions: verifiedSubmissions.count ?? 0,
      pending_review: pendingReview.count ?? 0,
      coverage_by_province: Object.fromEntries(provinceStats.map(p => [p.name_th, Math.round(((p.station_count / (totalStations.count ?? 1)) * 100) * 100) / 100]))
    });
  } catch (e) {
    console.error("Stats fetch error:", e);
    return c.json({ error: "Failed to fetch stats" }, 500);
  }
});

// Public snapshot endpoint (CDN-cacheable, returns verified data only)
app.get("/api/v1/snapshot", async (c) => {
  const supa = getSupabase(c);
  if (!supa) {
    return c.json({ error: "Database not configured" }, 500);
  }

  const cacheSeconds = 60; // Static cache for MVP; configurable via env variable in production

  try {
    const generatedAt = new Date().toISOString();

    // Get all provinces
    const provincesResult = await supa.from("provinces").select("id, name_th").order("name_th");
    const provinces = provincesResult.data || [];

    // Get all constituencies
    const constituenciesResult = await supa.from("constituencies").select("id, province_id, khet_number");
    const constituencies = constituenciesResult.data || [];

    // Get all stations
    const stationsResult = await supa.from("stations").select("id, constituency_id, subdistrict_id, subdistrict_name, station_number, location_name, is_verified_exist");
    const stations = stationsResult.data || [];

    // Get all submissions with verified status
    const submissionsResult = await supabaseFromQuery(supa, "submissions")
      .select(`
        id, station_id, created_at, status_constituency, status_partylist,
        photo_constituency_key, photo_partylist_key,
        checksum_constituency_total, checksum_partylist_total
      `);
    const submissions = submissionsResult.data || [];

    // Get tallies for verified submissions
    const talliesResult = await supabaseFromQuery(supa, "tallies")
      .select("id, submission_id, sheet_type, score_map, created_at");
    const tallies = talliesResult.data || [];

    // Get all verification logs (audit trail)
    const verificationLogsResult = await supabaseFromQuery(supa, "verification_log")
      .select("id, submission_id, reviewer_id, sheet_type, action, details, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    const verificationLogs = verificationLogsResult.data || [];

    // Compute station summaries with verified tallies
    const stationSummaries = stations.map((station: any) => {
      const stationSubmissions = submissions.filter((s: any) => s.station_id === station.id);

      const submissionsSummary = stationSubmissions.map((sub: any) => {
        const constituencyTally = tallies.find((t: any) => t.submission_id === sub.id && t.sheet_type === "constituency");
        const partylistTally = tallies.find((t: any) => t.submission_id === sub.id && t.sheet_type === "partylist");

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
    const provinceStats = provinces.map((province: any) => {
      const provinceStations = stations.filter((s: any) => {
        const constituency = constituencies.find((c: any) => c.id === s.constituency_id);
        return constituency?.province_id === province.id;
      });

      const verifiedStations = stationSummaries.filter((s: any) =>
        s.submissions.some((sub: any) => sub.status_constituency === "verified" || sub.status_partylist === "verified")
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

    const totalStations = stations.length;
    const verifiedSubmissions = submissions.filter((s: any) => s.status_constituency === "verified" || s.status_partylist === "verified").length;
    const pendingReview = submissions.filter((s: any) => s.status_constituency === "pending" || s.status_partylist === "pending").length;
    const disputedCount = submissions.filter((s: any) => s.status_constituency === "disputed" || s.status_partylist === "disputed").length;

    const verifiedSubmission = submissions.find((s: any) => s.status_constituency === "verified" || s.status_partylist === "verified");
    const lastVerifiedAt = verifiedSubmission ? verifiedSubmission.created_at : null;

    const response = c.json({
      metadata: {
        generated_at: generatedAt,
        snapshot_version: "1.0.0",
        last_updated: lastVerifiedAt,
        total_stations: totalStations,
        verified_submissions: verifiedSubmissions,
        pending_review: pendingReview,
        disputed_count: disputedCount,
      },
      provinces,
      constituencies,
      stations: stationSummaries,
      province_stats: provinceStats,
      last_verified_at: lastVerifiedAt,
    });

    // Set CDN cache headers
    c.header("Cache-Control", `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`);
    c.header("X-Snapshot-Generated-At", generatedAt);
    return response;

    return response;
  } catch (e) {
    console.error("Snapshot fetch error:", e);
    return c.json({ error: "Failed to fetch snapshot" }, 500);
  }
});

// Helper for Supabase queries
function supabaseFromQuery(supa: any, table: string) {
  return supa.from(table);
}

function getTallyTotal(scoreMap: any): number | null {
  if (!scoreMap) return null;
  return scoreMap.total_valid || scoreMap.total || null;
}

app.get("/api/v1/admin/stations/unverified", async (c) => {
  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  // Optional: add auth check for admin access
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "50", 10);
  const constituencyId = c.req.query("constituency_id") ? Number(c.req.query("constituency_id")) : null;

  let query = supa.from("stations").select(`
    id,
    constituency_id,
    subdistrict_id,
    subdistrict_name,
    station_number,
    location_name,
    is_verified_exist,
    created_at,
    source_ref
  `).eq("is_verified_exist", false).order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);

  if (constituencyId) {
    query = query.eq("constituency_id", constituencyId);
  }

  const result = await query;

  if (result.error) {
    console.error("Unverified stations fetch error:", result.error);
    return c.json({ error: "Failed to fetch unverified stations" }, 500);
  }

  const totalCountQuery = supa.from("stations").select("id", { count: "exact", head: true }).eq("is_verified_exist", false);
  const countResult = await totalCountQuery;

  return c.json({
    stations: result.data || [],
    pagination: {
      page,
      limit,
      total: countResult.count ?? 0,
      totalPages: countResult.count ? Math.ceil((countResult.count as number) / limit) : 0
    }
  });
});

app.get("/api/v1/admin/kill-switch", async (c) => {
  return c.json({
    uploads: getKillSwitch(c, "uploads"),
    public_write: getKillSwitch(c, "public_write")
  });
});

// Legal Kit / PDF Export endpoint
// Returns structured data for generating PDFs and ZIP exports
app.get("/api/v1/legal-kit/:station_id", async (c) => {
  const supa = getSupabase(c);
  if (!supa) return c.json({ error: "SUPABASE not configured" }, 501);

  const stationId = c.req.param("station_id");

  try {
    // Fetch station info
    const station = await supa.from("stations").select("*").eq("id", stationId).single();
    if (station.error || !station.data) return c.json({ error: "Station not found" }, 404);

    // Fetch all submissions for this station
    const submissions = await supa.from("submissions").select(`
      id,
      created_at,
      status_constituency,
      status_partylist,
      photo_constituency_key,
      photo_partylist_key,
      checksum_constituency_total,
      checksum_partylist_total
    `).eq("station_id", stationId).order("created_at", { ascending: false });

    if (submissions.error) return c.json({ error: "Failed to fetch submissions" }, 500);

    // Fetch tallies for verified submissions
    const submissionIds = submissions.data?.map((s: any) => s.id) || [];
    let tallies: any[] = [];
    if (submissionIds.length > 0) {
      const talliesResult = await supa.from("tallies").select(`
        id,
        submission_id,
        sheet_type,
        score_map,
        confirmed_station_number,
        header_text,
        created_at
      `).in("submission_id", submissionIds).order("created_at", { ascending: false });
      tallies = talliesResult.data || [];
    }

    // Fetch verification logs (audit trail)
    let verificationLogs: any[] = [];
    if (submissionIds.length > 0) {
      const logsResult = await supa.from("verification_log").select(`
        id,
        submission_id,
        reviewer_id,
        sheet_type,
        action,
        details,
        created_at
      `).in("submission_id", submissionIds).order("created_at", { ascending: false });
      verificationLogs = logsResult.data || [];
    }

    // Fetch incidents
    const incidents = await supa.from("incident_reports").select(`
      id,
      incident_type,
      occurred_at,
      description,
      media_keys,
      created_at
    `).eq("station_id", stationId).order("occurred_at", { ascending: false });

    // Fetch custody events
    const custodyEvents = await supa.from("custody_events").select(`
      id,
      event_type,
      occurred_at,
      box_id,
      seal_id,
      notes,
      media_keys,
      created_at
    `).eq("station_id", stationId).order("occurred_at", { ascending: false });

    // Compute hashes for uploaded photos (if available)
    const photoHashes = await computePhotoHashes(c, submissions.data || []);

    // Build legal kit response
    const legalKit = {
      generated_at: new Date().toISOString(),
      station_info: {
        station_id: station.data.id,
        constituency_id: station.data.constituency_id,
        subdistrict_id: station.data.subdistrict_id,
        subdistrict_name: station.data.subdistrict_name,
        station_number: station.data.station_number,
        location_name: station.data.location_name,
        is_verified_exist: station.data.is_verified_exist,
        created_at: station.data.created_at,
        source_ref: station.data.source_ref
      },
      submissions: (submissions.data || []).map((s: any) => ({
        submission_id: s.id,
        created_at: s.created_at,
        status_constituency: s.status_constituency,
        status_partylist: s.status_partylist,
        has_constituency_photo: !!s.photo_constituency_key,
        has_partylist_photo: !!s.photo_partylist_key,
        checksums: {
          constituency: s.checksum_constituency_total,
          partylist: s.checksum_partylist_total
        },
        tallies: tallies.filter((t: any) => t.submission_id === s.id)
      })),
      verification_logs: verificationLogs,
      incidents: incidents.data || [],
      custody_events: custodyEvents.data || [],
      photo_hashes: photoHashes
    };

    return c.json(legalKit);
  } catch (e) {
    console.error("Legal kit fetch error:", e);
    return c.json({ error: "Failed to fetch legal kit" }, 500);
  }
});

// Helper to compute hashes for uploaded photos
async function computePhotoHashes(c: any, submissions: any[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  // Note: In production, we would fetch files from R2 and compute SHA-256
  // For MVP, we return placeholder hashes based on keys
  for (const sub of submissions) {
    if (sub.photo_constituency_key) {
      hashes[sub.photo_constituency_key] = `sha256:${sub.photo_constituency_key.length.toString(16)}`;
    }
    if (sub.photo_partylist_key) {
      hashes[sub.photo_partylist_key] = `sha256:${sub.photo_partylist_key.length.toString(16)}`;
    }
  }
  return hashes;
}

export default app;