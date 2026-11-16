// GoGo Water — Step B: test the TDS sensor on Node1 (no Wi-Fi yet)
// Wiring: TDS +  -> 3V3,  TDS - -> GND,  TDS A -> D34 (GPIO34, ADC1)
// Board: "DOIT ESP32 DEVKIT V1"  ·  Serial Monitor: 115200 baud
//
// Conversion formula is DFRobot's SEN0244 sample code (cubic polynomial × 0.5,
// temperature compensation 1 + 0.02*(T-25)). Temperature is fixed at 25 °C
// for the checkpoint; later the Gateway's DS18B20 can supply the real value.
// Values are approximate until calibrated.

const int   TDS_PIN     = 34;     // must be an ADC1 pin (GPIO32–39)
const int   SAMPLES     = 30;     // DFRobot sample uses 30 samples + median
const float TEMPERATURE = 25.0;   // °C (no temp sensor on Node1)

// ADC floor: with D34 tied to GND (true 0 V) this board still reads ~142 mV.
// Anything below this cannot be measured reliably, so report 0 ppm.
// (≈160 mV ≈ 66 ppm — far below the 1000 ppm safety limit.)
const int   ADC_FLOOR_MV = 160;

int readMedianMilliVolts() {
  int buf[SAMPLES];
  for (int i = 0; i < SAMPLES; i++) {
    buf[i] = analogReadMilliVolts(TDS_PIN);   // calibrated reading in mV
    delay(20);
  }
  // simple insertion sort, then take the median
  for (int i = 1; i < SAMPLES; i++) {
    int v = buf[i], j = i - 1;
    while (j >= 0 && buf[j] > v) { buf[j + 1] = buf[j]; j--; }
    buf[j + 1] = v;
  }
  return (buf[SAMPLES / 2] + buf[SAMPLES / 2 - 1]) / 2;
}

float voltageToTds(float volts, float tempC) {
  float coef = 1.0 + 0.02 * (tempC - 25.0);
  float v = volts / coef;
  return (133.42 * v * v * v - 255.86 * v * v + 857.39 * v) * 0.5;   // ppm
}

void setup() {
  Serial.begin(115200);
  delay(500);
  analogSetPinAttenuation(TDS_PIN, ADC_11db);   // full range ~0–3.1 V
  Serial.println("Node1 TDS test — dip the probe in water");
}

void loop() {
  int   mv  = readMedianMilliVolts();
  bool  belowRange = (mv < ADC_FLOOR_MV);
  float tds = belowRange ? 0.0 : voltageToTds(mv / 1000.0, TEMPERATURE);
  Serial.printf("raw = %4d mV   TDS = %6.1f ppm%s\n",
                mv, tds, belowRange ? "   (below ADC range)" : "");
  delay(1000);
}
