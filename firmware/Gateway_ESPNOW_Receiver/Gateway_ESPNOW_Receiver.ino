// GoGo Water — Gateway (ESP32-S3) : receive ESP-NOW messages from Node1
// Checkpoint step 1: ESP-NOW only (no Wi-Fi/cloud yet). Both boards on channel 1.
// Board: "ESP32S3 Dev Module"  ·  Serial Monitor: 115200 baud
// If you plug into the S3's native "USB" port: Tools → USB CDC On Boot → Enabled

#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

#define ESPNOW_CHANNEL 1          // must match Node1 (later: the hotspot's channel)

// ---- Message format: MUST be identical on Node1 and Gateway ----
typedef struct __attribute__((packed)) {
  uint8_t  node_id;   // 1 = Node1
  uint32_t seq;       // increases by 1 every message (for packet delivery rate)
  uint32_t ts;        // millis() on the node when measured
  uint16_t tds_mv;    // raw ADC reading (mV)
  float    tds_ppm;   // TDS value
} NodeMsg;

// ---- Hand-off from the callback to loop() (keep the callback short) ----
volatile bool newMsg = false;
NodeMsg  lastMsg;
uint8_t  lastMac[6];
int      lastRssi = 0;

// per-node stats (node_id 1..8)
uint32_t lastSeq[9]  = {0};
uint32_t received[9] = {0};
uint32_t lost[9]     = {0};

// Receive callback — Arduino-ESP32 core 3.x signature
void onRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  if (len != sizeof(NodeMsg)) return;          // ignore unknown packets
  memcpy(&lastMsg, data, sizeof(NodeMsg));
  memcpy(lastMac, info->src_addr, 6);
  lastRssi = info->rx_ctrl ? info->rx_ctrl->rssi : 0;
  newMsg = true;
}

void printMyMac() {
  uint8_t mac[6];
  esp_wifi_get_mac(WIFI_IF_STA, mac);
  Serial.printf("Gateway MAC = %02X:%02X:%02X:%02X:%02X:%02X\n",
                mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

void setup() {
  Serial.begin(115200);
  delay(1500);                                  // time for USB serial to come up

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init FAILED");
    while (true) delay(1000);
  }
  esp_now_register_recv_cb(onRecv);

  printMyMac();
  Serial.printf("Gateway ready — listening on channel %d\n", ESPNOW_CHANNEL);
}

void loop() {
  if (newMsg) {
    noInterrupts();
    NodeMsg m = lastMsg;
    newMsg = false;
    interrupts();

    uint8_t id = (m.node_id >= 1 && m.node_id <= 8) ? m.node_id : 0;
    if (id) {
      if (received[id] > 0 && m.seq > lastSeq[id] + 1) lost[id] += m.seq - lastSeq[id] - 1;
      lastSeq[id] = m.seq;
      received[id]++;
    }
    float pdr = (id && received[id] + lost[id] > 0)
                  ? 100.0 * received[id] / (received[id] + lost[id]) : 0;

    Serial.printf("[RX] node=%u seq=%lu ts=%lu  TDS=%.1f ppm (%u mV)  RSSI=%d dBm  PDR=%.1f%%\n",
                  m.node_id, (unsigned long)m.seq, (unsigned long)m.ts,
                  m.tds_ppm, m.tds_mv, lastRssi, pdr);
  }
  delay(10);
}
