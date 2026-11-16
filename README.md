# GoGo Water

Smart drinking-water dispenser — Embedded System (CEDT, Chulalongkorn University) Final Project 2026 "Smart Devices".

Sensor nodes (ESP32) measure water quality and send it over ESP-NOW to a gateway (ESP32-S3), which forwards it over HTTPS to a Next.js API on Vercel. Data is stored in Supabase and shown on a live dashboard.

**Live dashboard:** https://gogo-water.vercel.app

```
Node1 (TDS) --ESP-NOW--> Gateway (ESP32-S3) --HTTPS--> Vercel API --> Supabase --> Dashboard
```

- `firmware/` — Arduino sketches (Arduino-ESP32 core 3.x)
- `web/` — Next.js API + dashboard (deployed to Vercel automatically on every push to `main`)

## Firmware setup

1. Install the **Arduino-ESP32 core 3.x** (Boards Manager → "esp32" by Espressif).
2. Create `secrets.h` in **each** sketch folder (it is git-ignored):
   ```
   cp firmware/secrets.example.h firmware/Gateway_ESPNOW_Receiver/secrets.h
   cp firmware/secrets.example.h firmware/Node1_ESPNOW_Sender/secrets.h
   ```
   | Value | Gateway | Node1 |
   |---|---|---|
   | `WIFI_SSID` — phone hotspot name (exact) | ✓ | ✓ |
   | `WIFI_PASSWORD` | ✓ | |
   | `API_URL` — already set to the Vercel URL | ✓ | |
   | `DEVICE_TOKEN` — same value as on Vercel | ✓ | |
3. The hotspot must be **2.4 GHz** (ESP32 has no 5 GHz; iPhone: turn on "Maximize Compatibility").
4. Flash the **Gateway** (`Gateway_ESPNOW_Receiver`, board "ESP32S3 Dev Module"). Serial (115200) should show:
   `WiFi connected … channel=N` and `Gateway MAC = …`
5. Put that MAC in `GATEWAY_MAC` in `Node1_ESPNOW_Sender.ino`.
6. Flash **Node1** (`Node1_ESPNOW_Sender`, board "DOIT ESP32 DEVKIT V1"). Serial should show:
   `Hotspot channel = N` (same N as the Gateway) and `[TX] … OK`.
7. The Gateway prints `[POST] … HTTP 200` and the dashboard updates live.

Why Node1 scans for the hotspot: ESP-NOW must use the same WiFi channel as the Gateway, and the Gateway's channel is set by the hotspot it joins.

## Security

- Board → cloud is **HTTPS only**; the Gateway verifies the server certificate against pinned root CAs (`ca_cert.h`) — no `setInsecure()`.
- The Gateway authenticates with `Authorization: Bearer <DEVICE_TOKEN>`; the API compares it in constant time and validates every field before inserting.
- The Supabase secret key lives only on the server (Vercel env). The browser uses the publishable key, which is **read-only** through Row Level Security.
- Secrets (`.env*`, `firmware/**/secrets.h`) are never committed; only `secrets.example.h` is.
- Planned: HMAC + replay protection on ESP-NOW messages.

AI tools used: Claude (Anthropic) assisted with design and code; see the final report for details.
