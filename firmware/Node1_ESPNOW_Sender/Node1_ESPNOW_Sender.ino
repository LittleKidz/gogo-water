// GoGo Water — Node1 (ESP32 DevKit V1) : read TDS and send it to the Gateway via ESP-NOW
// Wiring: TDS + -> 3V3, TDS - -> GND, TDS A -> D34
// Board: "DOIT ESP32 DEVKIT V1"  ·  Serial Monitor: 115200 baud
//
// >>> STEP: put the Gateway's MAC address below (from the Gateway's Serial Monitor) <<<

#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>

uint8_t GATEWAY_MAC[6] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00};   // <-- CHANGE ME

#define NODE_ID         1
#define ESPNOW_CHANNEL  1          // must match the Gateway
#define SEND_EVERY_MS   2000

// ---- TDS settings (same as Node1_TDS_Test) ----
const int   TDS_PIN      = 34;
const int   SAMPLES      = 30;
const float TEMPERATURE  = 25.0;
const int   ADC_FLOOR_MV = 160;    // D34 tied to GND reads ~142 mV on this board

// ---- Message format: MUST be identical on Node1 and Gateway ----
typedef struct __attribute__((packed)) {
  uint8_t  node_id;
  uint32_t seq;
  uint32_t ts;
  uint16_t tds_mv;
  float    tds_ppm;
} NodeMsg;

uint32_t seq = 0;
volatile int lastSendOk = -1;      // -1 = no result yet, 1 = ok, 0 = fail

// Send callback — signature changed in Arduino-ESP32 core 3.3 (ESP-IDF 5.5)
#if ESP_ARDUINO_VERSION >= ESP_ARDUINO_VERSION_VAL(3, 3, 0)
void onSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
#else
void onSent(const uint8_t *mac, esp_now_send_status_t status) {
#endif
  lastSendOk = (status == ESP_NOW_SEND_SUCCESS) ? 1 : 0;
}

int readMedianMilliVolts() {
  int buf[SAMPLES];
  for (int i = 0; i < SAMPLES; i++) { buf[i] = analogReadMilliVolts(TDS_PIN); delay(20); }
  for (int i = 1; i < SAMPLES; i++) {
    int v = buf[i], j = i - 1;
    while (j >= 0 && buf[j] > v) { buf[j + 1] = buf[j]; j--; }
    buf[j + 1] = v;
  }
  return (buf[SAMPLES / 2] + buf[SAMPLES / 2 - 1]) / 2;
}

float voltageToTds(float volts, float tempC) {
  float v = volts / (1.0 + 0.02 * (tempC - 25.0));
  return (133.42 * v * v * v - 255.86 * v * v + 857.39 * v) * 0.5;
}

void setup() {
  Serial.begin(115200);
  delay(500);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init FAILED");
    while (true) delay(1000);
  }
  esp_now_register_send_cb(onSent);

  esp_now_peer_info_t peer = {};
  memcpy(peer.peer_addr, GATEWAY_MAC, 6);
  peer.channel = 0;                // 0 = use the current channel
  peer.encrypt = false;
  if (esp_now_add_peer(&peer) != ESP_OK) {
    Serial.println("Add peer FAILED — check GATEWAY_MAC");
    while (true) delay(1000);
  }
  Serial.println("Node1 ready — sending to Gateway");
}

void loop() {
  int   mv  = readMedianMilliVolts();
  float tds = (mv < ADC_FLOOR_MV) ? 0.0 : voltageToTds(mv / 1000.0, TEMPERATURE);

  NodeMsg msg;
  msg.node_id = NODE_ID;
  msg.seq     = ++seq;
  msg.ts      = millis();
  msg.tds_mv  = (uint16_t)mv;
  msg.tds_ppm = tds;

  lastSendOk = -1;
  esp_err_t r = esp_now_send(GATEWAY_MAC, (uint8_t *)&msg, sizeof(msg));

  // wait briefly for the send callback
  uint32_t t0 = millis();
  while (lastSendOk == -1 && millis() - t0 < 100) delay(1);

  Serial.printf("[TX] seq=%lu  TDS=%.1f ppm (%d mV)  -> %s\n",
                (unsigned long)msg.seq, tds, mv,
                r != ESP_OK ? "send error" : (lastSendOk == 1 ? "OK" : "FAIL"));

  delay(SEND_EVERY_MS);
}
