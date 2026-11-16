// Copy this file to secrets.h IN EACH SKETCH FOLDER that uses it, and fill in real values:
//   firmware/Gateway_ESPNOW_Receiver/secrets.h  (uses all 4 values)
//   firmware/Node1_ESPNOW_Sender/secrets.h      (uses only WIFI_SSID, to find the hotspot's channel)
// secrets.h is git-ignored — never commit real passwords or tokens.
// The hotspot must be 2.4 GHz (ESP32 has no 5 GHz). iPhone: turn on "Maximize Compatibility".
#pragma once

#define WIFI_SSID      "your-hotspot-name"
#define WIFI_PASSWORD  "your-hotspot-password"

#define API_URL        "https://gogo-water.vercel.app/api/ingest"
#define DEVICE_TOKEN   "paste-the-same-value-as-DEVICE_TOKEN-on-Vercel"
