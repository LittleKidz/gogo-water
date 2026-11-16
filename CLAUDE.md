# CLAUDE.md — GoGo Water (Embedded System CEDT Final Project 2026)

## How to work with me (LittleKidz)
- Reply in **Thai**, concise. Explain step by step (Step 1, Step 2 …), short lines.
- Back claims with real sources (link docs). Label inferences/opinions as such.
- **If unsure, ask me first** — don't guess and push ahead.
- I like to see an example/mockup before big implementation.
- I debug iteratively with screenshots.

## Project
**GoGo Water** — smart drinking-water dispenser. Sensors check water quality; the tap opens only when the water looks safe (screening only — not a lab test).
Course: Embedded System (CEDT, Chulalongkorn) Final Project 2026 "Smart Devices", group of 5.

### Architecture
```
Node1 (ESP32 DevKit V1)  --ESP-NOW-->  Gateway (ESP32-S3 N16R8)  --WiFi/HTTPS + token-->  Vercel (Next.js API)  -->  Supabase (Postgres)
  TDS (+ turbidity later)                (+ ultrasonic, DS18B20,                                  |                       |
Node2 (ESP32) BH1750 + Hall               servo, OLED later)                                      +-- LLM decision (later) +--> Dashboard (Next.js, realtime)
                                                                                                  +-- LINE notify (later)
```
- Board-to-cloud is **HTTPS POST** (not MQTT): Vercel serverless functions can't hold a long MQTT subscription.
- Every message carries `node_id`, `seq`, `ts` → packet delivery rate, latency, uptime metrics.

## Deadlines
- **Fri 20 Nov 2026 23:59 — Checkpoint video (≤ 2 min):** data flowing end to end: sensor node → gateway → cloud → dashboard. No AI/servo/tank needed.
- Tue 8 Dec 2026 — final demo, report, video, source + Git.

## Status (16 Nov 2026)
- ✅ Node1 reads TDS on **D34** (ADC1). ADC floor measured: D34 tied to GND still reads ~142 mV → values < 160 mV reported as 0 ppm.
- ✅ ESP-NOW Node1 → Gateway works (tested on fixed channel 1, before WiFi).
- ✅ Supabase project + `readings` table created (see below).
- ✅ Vercel API `/api/ingest` + dashboard deployed: https://gogo-water.vercel.app (auto-deploy on push to `main`; 401 without token verified).
- 🟨 Gateway joins phone hotspot + HTTPS POST (CA-verified: GTS Root R1 + ISRG Root X1 in `ca_cert.h`), recv callback → FreeRTOS queue — code done, compiles; **needs test on boards**.
- 🟨 Node1 scans for the hotspot SSID and uses its channel for ESP-NOW (rescans after 5 failed sends) — code done; **needs test on boards**.
- ⬜ ESP-NOW security (HMAC + boot_id + replay + MAC whitelist) — separate commit after the above works.

## Repo layout
```
firmware/                 Arduino sketches (Arduino-ESP32 core 3.x)
  Node1_TDS_Test/           TDS read test
  Gateway_MAC/              print MAC
  Node1_ESPNOW_Sender/      Node1: read TDS → ESP-NOW (put Gateway MAC in GATEWAY_MAC)
  Gateway_ESPNOW_Receiver/  Gateway: receive ESP-NOW, print + PDR
  secrets.example.h         copy to secrets.h (git-ignored)
web/                      Next.js app (API + dashboard) → deployed on Vercel (Root Directory = web)
```

## Message format (ESP-NOW, identical struct on both boards)
```c
typedef struct __attribute__((packed)) {
  uint8_t  node_id;   // 1 = Node1
  uint32_t seq;       // +1 per message (resets on node reboot)
  uint32_t ts;        // node millis() when measured
  uint16_t tds_mv;    // raw ADC mV
  float    tds_ppm;   // TDS
} NodeMsg;
```

## Gateway → API (HTTPS)
`POST /api/ingest`
Headers: `Authorization: Bearer <DEVICE_TOKEN>`, `Content-Type: application/json`
Body: one object **or an array of objects** (array = store-and-forward batch later):
```json
{ "node_id": 1, "seq": 12, "node_ts": 123456, "tds_mv": 350, "tds_ppm": 150.2, "rssi": -40 }
```
Responses: `200 {ok:true, inserted:n}` · `401` bad/missing token · `400` invalid payload.

## Supabase
- Project: `gogo-water`, ref `fzmscynsjsyhpffsrsdu`, region ap-southeast-1
- URL: `https://fzmscynsjsyhpffsrsdu.supabase.co`
- Table `public.readings`: `id` (identity PK), `received_at` timestamptz default now(), `node_id` smallint 1–32, `seq` bigint, `node_ts` bigint, `tds_mv` int 0–3300, `tds_ppm` real 0–5000, `rssi` smallint
- **RLS on.** Only policy: `select` for `anon, authenticated`. No insert policy → inserts only via the **secret key on the server**.
- Table is in `supabase_realtime` publication (dashboard can subscribe to inserts).

## Vercel
- Team: `LittleKidz's projects` (`team_8zvlBUOj8v8Tao17aGHM2bD5`)
- Project Root Directory: `web`

## Environment variables (never commit values)
| Name | Where | Value from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel + web/.env.local | URL above |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel + web/.env.local | Supabase → Project Settings → API Keys → publishable (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | Vercel + web/.env.local (server only!) | Supabase → API Keys → secret (`sb_secret_…`) |
| `DEVICE_TOKEN` | Vercel + firmware/secrets.h | generate: `openssl rand -hex 32` |

## Security rules (E5 — graded)
1. HTTPS only; on ESP32 verify the server certificate (WiFiClientSecure + CA). **No `setInsecure()`** in final code.
2. Device token in `Authorization: Bearer`; server compares with `DEVICE_TOKEN` (constant-time compare).
3. Secret key only in server code (API route). Browser uses publishable key, read-only via RLS.
4. **Never commit** WiFi password, tokens, keys: `.env*`, `firmware/**/secrets.h` are git-ignored; keep `secrets.example.h`.
5. Validate payload server-side (types + ranges) before insert.

## Requirements to keep in mind (from the course spec)
- M5: raw data in cloud storage + dashboard. M8: public Git repo, **every member commits**.
- Declare AI tool usage in the report (Claude was used).
- Every member must be able to explain their own code.

## Dashboard design (approved mockup)
- Mockup: https://claude.ai/artifact/MUr2YFshTRH5TjKWvvZ662 · source copy: `docs/design/dashboard-mockup.dc.html` (reference markup — rebuild it as normal React/Tailwind components; the `.dc.html` runtime is not used in the app)
- Logo: `web/public/logo.png` (team's own logo, dark background) — header, 148×80, `object-fit: cover`, rounded 14px
- Theme (dark navy + cyan, like a modern analytics dashboard):
  - background `#0B1220`, sidebar `#0E1729`, card `#111A2E`, inner card `#0B1220`, border `#1C2944`
  - text `#E6EDF7`, muted `#8FA3BF`, secondary `#CBD5E1`
  - accent cyan `#38BDF8` (lines), blue `#3B82F6` (chart fill 22%), active pill bg `#13325A` / text `#7DD3FC`
  - safe `#34D399` on `#0F2A24` (border `#1E5A47`), warning `#FBBF24`, danger/threshold `#F87171`
  - fonts: IBM Plex Sans Thai (UI, Thai), Space Grotesk (big numbers); cards radius 16px
- Layout: icon sidebar (Overview, Nodes, History, Events, Metrics) + main max-width 1360px
  1. Header: logo, "GoGo Water", location placeholder, Live pill, last-updated time
  2. 4 KPI cards: Water status (safe/warning/unsafe + reason + source "AI" or "ตามเกณฑ์"), TDS (value + 1h sparkline + "≤ 1000 ppm"), Turbidity NTU, Water temp °C — sensors not connected yet show "—" and a "รอเชื่อม" badge
  3. TDS history chart (1h / 24h / 7d pills) with dashed red threshold line at 1000 ppm + Device panel (Node1, Gateway, Node2: board, sensors, online/offline from last-seen, RSSI, PDR)
  4. Event log · Lid & light (Node2) · System metrics rings (packet delivery, uptime, AI accuracy) + latency mean/min/max
- Data: read `readings` with the publishable key; subscribe to realtime inserts. Online = last reading < 30 s ago (adjust). Responsive: sidebar stacks on phone.
- Checkpoint needs only: header, TDS card, history chart, Node1/Gateway status, live updates. Everything else may show "รอเชื่อม".

## Next tasks for Claude Code
1. Scaffold Next.js (App Router, TypeScript) in `web/`; add `@supabase/supabase-js`.
2. `web/app/api/ingest/route.ts` — token check, validate, insert with secret key. Test with curl locally and on Vercel.
3. `web/app/page.tsx` — dashboard: latest TDS card, node status (last seen), chart of recent readings, realtime updates.
4. Push → link repo to Vercel (Root Directory `web`), set env vars, deploy.
5. Firmware: Gateway joins hotspot + POSTs each received NodeMsg; Node1 scans for the hotspot SSID to use its channel.
