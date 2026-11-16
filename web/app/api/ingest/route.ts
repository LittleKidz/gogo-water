import { createHash, timingSafeEqual } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/server";
import { validatePayload } from "@/lib/validate";

const MAX_BODY_BYTES = 32 * 1024;
const MIN_TOKEN_LENGTH = 32; // `openssl rand -hex 32` gives 64 chars

const sha256 = (s: string) => createHash("sha256").update(s).digest();

/**
 * Constant-time token check. Hashing first makes both buffers 32 bytes, so length is not leaked.
 * Fails closed if DEVICE_TOKEN is missing or too short (misconfiguration).
 */
function tokenOk(header: string | null): boolean {
  const expected = process.env.DEVICE_TOKEN;
  if (!expected || expected.length < MIN_TOKEN_LENGTH) {
    console.error("[ingest] DEVICE_TOKEN missing or shorter than", MIN_TOKEN_LENGTH, "chars — rejecting all requests");
    return false;
  }
  if (!header?.startsWith("Bearer ")) return false;
  const given = header.slice("Bearer ".length).trim();
  return timingSafeEqual(sha256(given), sha256(expected));
}

const json = (status: number, body: object) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Reads the body but stops as soon as it exceeds `limit` bytes (no unbounded buffering). */
async function readLimited(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: Request) {
  if (!tokenOk(request.headers.get("authorization"))) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return json(415, { ok: false, error: "content-type must be application/json" });
  }

  // cheap early reject from the header, then enforce the real size while reading
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return json(413, { ok: false, error: "payload too large" });
  const raw = await readLimited(request, MAX_BODY_BYTES);
  if (raw === null) return json(413, { ok: false, error: "payload too large" });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: "invalid JSON" });
  }

  const v = validatePayload(body);
  if (!v.ok) return json(400, { ok: false, error: v.error });

  try {
    const { error } = await getAdminClient().from("readings").insert(v.items);
    if (error) {
      console.error("[ingest] insert failed:", error.message);
      return json(500, { ok: false, error: "insert failed" });
    }
  } catch (e) {
    // e.g. SUPABASE_SECRET_KEY not set — log details server-side only
    console.error("[ingest] server misconfigured:", e instanceof Error ? e.message : e);
    return json(500, { ok: false, error: "server misconfigured" });
  }

  return json(200, { ok: true, inserted: v.items.length });
}
