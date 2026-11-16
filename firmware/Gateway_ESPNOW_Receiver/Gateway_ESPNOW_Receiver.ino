// GoGo Water — Gateway (ESP32-S3) : receive ESP-NOW from Node1 -> HTTPS POST to the cloud API
// Board: "ESP32S3 Dev Module"  ·  Serial Monitor: 115200 baud
// If you plug into the S3's native "USB" port: Tools → USB CDC On Boot → Enabled
//
// Setup: copy ../secrets.example.h to THIS folder as secrets.h and fill in the values.
// The hotspot must be 2.4 GHz (iPhone: "Maximize Compatibility" on).
//
// Flow:  ESP-NOW recv callback (WiFi task) --xQueueSend--> queue --loop()--> HTTPS POST /api/ingest
// ESP-NOW runs on the same channel as the hotspot the Gateway is connected to;
// Node1 scans for the hotspot SSID to find that channel.

#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>

#if !__has_include("secrets.h")
#error "secrets.h missing: copy firmware/secrets.example.h into this sketch folder as secrets.h"
#endif
#include "secrets.h"     // WIFI_SSID, WIFI_PASSWORD, API_URL, DEVICE_TOKEN (git-ignored)
#include "ca_cert.h"     // ROOT_CA (public root certificates)

#define QUEUE_LEN       32         // messages waiting to be uploaded
#define BATCH_MAX       10         // max messages per POST (sent as a JSON array)
#define STATS_EVERY_MS  30000

// ---- Message format: MUST be identical on Node1 and Gateway ----
typedef struct __attribute__((packed)) {
  uint8_t  node_id;   // 1 = Node1
  uint32_t seq;       // increases by 1 every message (for packet delivery rate)
  uint32_t ts;        // millis() on the node when measured
  uint16_t tds_mv;    // raw ADC reading (mV)
  float    tds_ppm;   // TDS value
} NodeMsg;

// One queue item = the message + the RSSI it was received with
typedef struct {
  NodeMsg msg;
  int8_t  rssi;
} RxItem;

QueueHandle_t rxQueue;
volatile uint32_t dropped = 0;      // queue full -> message lost before upload

// per-node stats (node_id 1..8)
uint32_t lastSeq[9]  = {0};
uint32_t received[9] = {0};
uint32_t lost[9]     = {0};
uint32_t postOk = 0, postFail = 0;  // counted in messages

WiFiClientSecure tls;               // kept alive between POSTs -> TLS session is reused

// Receive callback — runs in the WiFi task (not an ISR). Keep it short: copy + enqueue.
void onRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  if (len != sizeof(NodeMsg)) return;          // ignore unknown packets
  RxItem it;
  memcpy(&it.msg, data, sizeof(NodeMsg));
  it.rssi = info->rx_ctrl ? info->rx_ctrl->rssi : 0;
  if (xQueueSend(rxQueue, &it, 0) != pdTRUE) dropped++;   // never block the WiFi task
}

void connectWiFi() {
  Serial.printf("Connecting to WiFi \"%s\"", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (millis() - t0 > 20000) {               // retry from scratch every 20 s
      Serial.println(" retry");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      t0 = millis();
    }
  }
  Serial.printf("\nWiFi connected  IP=%s  channel=%d  RSSI=%d dBm\n",
                WiFi.localIP().toString().c_str(), WiFi.channel(), WiFi.RSSI());
}

void printMyMac() {
  uint8_t mac[6];
  esp_wifi_get_mac(WIFI_IF_STA, mac);
  Serial.printf("Gateway MAC = %02X:%02X:%02X:%02X:%02X:%02X\n",
                mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
}

// POST a JSON body. Returns the HTTP status code (<0 = connection/TLS error).
int postJson(const char *body, size_t len) {
  HTTPClient http;
  http.setReuse(true);                          // keep-alive
  http.setTimeout(8000);
  if (!http.begin(tls, API_URL)) return -100;
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + DEVICE_TOKEN);
  int code = http.POST((uint8_t *)body, len);
  if (code > 0 && code != 200) {
    Serial.printf("[POST] response: %s\n", http.getString().c_str());
  }
  http.end();
  return code;
}

void setup() {
  Serial.begin(115200);
  delay(1500);                                  // time for USB serial to come up

  rxQueue = xQueueCreate(QUEUE_LEN, sizeof(RxItem));

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  connectWiFi();
  WiFi.setSleep(false);                         // modem sleep would make ESP-NOW miss packets

  tls.setCACert(ROOT_CA);                       // verify the server certificate (no setInsecure)
  tls.setHandshakeTimeout(15);                  // seconds

  if (esp_now_init() != ESP_OK) {               // after WiFi: ESP-NOW uses the hotspot's channel
    Serial.println("ESP-NOW init FAILED");
    while (true) delay(1000);
  }
  esp_now_register_recv_cb(onRecv);

  printMyMac();
  Serial.printf("Gateway ready — ESP-NOW on channel %d, uploading to %s\n", WiFi.channel(), API_URL);
}

void loop() {
  static uint32_t lastStats = 0;
  if (millis() - lastStats > STATS_EVERY_MS) {
    lastStats = millis();
    Serial.printf("[STATS] node1 received=%lu lost=%lu  dropped=%lu  post_ok=%lu post_fail=%lu  ch=%d\n",
                  (unsigned long)received[1], (unsigned long)lost[1], (unsigned long)dropped,
                  (unsigned long)postOk, (unsigned long)postFail, WiFi.channel());
  }

  if (WiFi.status() != WL_CONNECTED) {          // keep messages in the queue until WiFi is back
    delay(100);
    return;
  }

  // Take up to BATCH_MAX messages from the queue (wait max 50 ms for the first one)
  RxItem items[BATCH_MAX];
  int n = 0;
  if (xQueueReceive(rxQueue, &items[0], pdMS_TO_TICKS(50)) != pdTRUE) return;
  n = 1;
  while (n < BATCH_MAX && xQueueReceive(rxQueue, &items[n], 0) == pdTRUE) n++;

  // Update stats + build the JSON array
  char body[BATCH_MAX * 120 + 8];
  size_t len = 0;
  body[len++] = '[';
  for (int i = 0; i < n; i++) {
    NodeMsg &m = items[i].msg;
    uint8_t id = (m.node_id >= 1 && m.node_id <= 8) ? m.node_id : 0;
    if (id) {
      if (received[id] > 0 && m.seq > lastSeq[id] + 1) lost[id] += m.seq - lastSeq[id] - 1;
      lastSeq[id] = m.seq;                      // smaller seq = node rebooted, start again
      received[id]++;
    }
    float pdr = (id && received[id] + lost[id] > 0)
                  ? 100.0 * received[id] / (received[id] + lost[id]) : 0;
    Serial.printf("[RX] node=%u seq=%lu ts=%lu  TDS=%.1f ppm (%u mV)  RSSI=%d dBm  PDR=%.1f%%\n",
                  m.node_id, (unsigned long)m.seq, (unsigned long)m.ts,
                  m.tds_ppm, m.tds_mv, items[i].rssi, pdr);

    len += snprintf(body + len, sizeof(body) - len,
                    "%s{\"node_id\":%u,\"seq\":%lu,\"node_ts\":%lu,\"tds_mv\":%u,\"tds_ppm\":%.2f,\"rssi\":%d}",
                    i ? "," : "", m.node_id, (unsigned long)m.seq, (unsigned long)m.ts,
                    m.tds_mv, m.tds_ppm, items[i].rssi);
  }
  body[len++] = ']';
  body[len] = '\0';

  uint32_t t0 = millis();
  int code = postJson(body, len);
  if (code == 200) postOk += n; else postFail += n;
  Serial.printf("[POST] %d message(s) -> HTTP %d  (%lu ms)%s\n", n, code,
                (unsigned long)(millis() - t0), code < 0 ? "  (connection/TLS error)" : "");
}
