// ============================================================================
// HoneyChain — HX711 Load Cell Interactive Calibration Tool
//
// Purpose:
// Determines the precise calibration factor and tare offset for your specific
// physical load cell geometry and amplifier board.
//
// Hardware Connections:
// - HX711 DT (Data)  -> ESP32 GPIO 21
// - HX711 SCK (Clock)-> ESP32 GPIO 22
// - HX711 VCC        -> ESP32 3.3V or 5V
// - HX711 GND        -> ESP32 GND
//
// Instructions:
// 1. Upload this sketch to your ESP32.
// 2. Open Arduino Serial Monitor at 115200 baud (set line ending to "Newline" or "Both NL & CR").
// 3. Follow the on-screen instructions step-by-step.
// ============================================================================

#include <Arduino.h>
#include <HX711.h>

#define PIN_HX711_DOUT 21
#define PIN_HX711_SCK  22

static HX711 scale;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(F("\n========================================================"));
  Serial.println(F("⚖️ HoneyChain HX711 Load Cell Calibration Tool"));
  Serial.println(F("========================================================\n"));

  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);

  if (!scale.wait_ready_timeout(2000)) {
    Serial.println(F("❌ ERROR: HX711 not responding!"));
    Serial.println(F("Please check wiring: DOUT -> GPIO 21, SCK -> GPIO 22, VCC, GND."));
    while (1) { delay(1000); }
  }

  Serial.println(F("✅ HX711 communication established."));
  Serial.println(F("\n[STEP 1] TARE CALIBRATION"));
  Serial.println(F("Ensure the scale platform is COMPLETELY EMPTY (no weight)."));
  Serial.println(F("Type any character and press Enter when ready to tare..."));

  while (!Serial.available()) {
    delay(50);
  }
  while (Serial.available()) {
    Serial.read(); // Clear serial buffer
  }

  Serial.println(F("Taring scale platform..."));
  scale.set_scale(); // Reset scale factor to 1.0
  scale.tare(20);    // Average 20 raw readings for clean zero baseline

  long tareOffset = scale.get_offset();
  Serial.print(F("✅ Tare complete. Zero-offset: "));
  Serial.println(tareOffset);

  Serial.println(F("\n[STEP 2] CALIBRATION WEIGHT"));
  Serial.println(F("Place a known calibration weight on the scale platform (e.g. 5.0 kg or 10.0 kg)."));
  Serial.println(F("Enter the exact weight in kilograms (e.g., '5.0') and press Enter:"));

  float knownWeightKg = 0.0f;
  while (knownWeightKg <= 0.0f) {
    if (Serial.available() > 0) {
      String inputStr = Serial.readStringUntil('\n');
      inputStr.trim();
      knownWeightKg = inputStr.toFloat();
      if (knownWeightKg <= 0.0f) {
        Serial.println(F("⚠️ Invalid weight. Please enter a positive number in kg (e.g. 5.0):"));
      }
    }
    delay(50);
  }

  Serial.print(F("Measuring known weight of "));
  Serial.print(knownWeightKg, 3);
  Serial.println(F(" kg..."));

  // Read averaged raw units with scale factor = 1.0
  float rawWithWeight = scale.get_units(20);
  float calculatedCalFactor = rawWithWeight / knownWeightKg;

  scale.set_scale(calculatedCalFactor);

  Serial.println(F("\n========================================================"));
  Serial.println(F("🎉 CALIBRATION COMPLETE!"));
  Serial.println(F("Copy these lines directly into your `firmware/esp32_telemetry/config.h`:"));
  Serial.println(F("--------------------------------------------------------"));
  Serial.print(F("#define HX711_CALIBRATION_FACTOR "));
  Serial.println(calculatedCalFactor, 2);
  Serial.print(F("#define HX711_TARE_OFFSET        "));
  Serial.print(tareOffset);
  Serial.println(F("L"));
  Serial.println(F("========================================================\n"));

  Serial.println(F("[STEP 3] LIVE SCALE VERIFICATION"));
  Serial.println(F("Testing live weight readings every second. Place/remove items to test:"));
}

void loop() {
  if (scale.wait_ready_timeout(500)) {
    float liveWeight = scale.get_units(5);
    Serial.print(F("Current Weight: "));
    Serial.print(liveWeight, 3);
    Serial.println(F(" kg"));
  } else {
    Serial.println(F("Scale not ready..."));
  }
  delay(1000);
}

