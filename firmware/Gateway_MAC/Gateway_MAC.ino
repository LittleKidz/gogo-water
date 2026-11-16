// GoGo Water — Step A: print this board's MAC address
// Upload this to the GATEWAY. Write the MAC down — Node1 needs it for ESP-NOW.
// Board: "DOIT ESP32 DEVKIT V1"  ·  Serial Monitor: 115200 baud

#include <WiFi.h>
#include <esp_wifi.h>

void printMac() {
  uint8_t mac[6];
  if (esp_wifi_get_mac(WIFI_IF_STA, mac) == ESP_OK) {
    Serial.printf("MAC = %02X:%02X:%02X:%02X:%02X:%02X\n",
                  mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
    Serial.printf("For code: {0x%02X, 0x%02X, 0x%02X, 0x%02X, 0x%02X, 0x%02X}\n",
                  mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  } else {
    Serial.println("Could not read MAC");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  WiFi.mode(WIFI_STA);   // start Wi-Fi in station mode so the MAC can be read
  delay(100);
}

void loop() {
  printMac();            // repeat so you don't miss it when opening Serial Monitor
  delay(3000);
}
