// ============================================================================
// HoneyChain — ESP32 Smart Hive Telemetry Node (Prototype Firmware)
//
// Target Board: ESP32 DevKit V1 (ESP32-WROOM-32)
// IDE: Arduino IDE (with ESP32 board package by Espressif)
//
// Required Libraries (Install via Arduino Library Manager):
// 1. OneWire (by Paul Stoffregen)
// 2. DallasTemperature (by Miles Burton)
// 3. HX711 (by Bogdan Necula)
//
// Data Flow:
// Sensors -> ESP32 -> Wi-Fi -> HoneyChain Express Backend -> Cloud Firestore -> Mobile App
// ============================================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HX711.h>

// Load credentials and pin configuration
#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.example.h"
#endif

// Hardware driver instances
static OneWire oneWire(PIN_DS18B20_DATA);
static DallasTemperature tempSensor(&oneWire);
static HX711 scale;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println(F("\n========================================================"));
  Serial.println(F("🐝 HoneyChain ESP32 Smart Hive Telemetry Node"));
  Serial.print(F("📌 Device ID: "));
  Serial.println(DEVICE_ID);
  Serial.print(F("🌐 Backend URL: "));
  Serial.println(BACKEND_URL);
  Serial.println(F("========================================================\n"));

  // 1. Initialize DS18B20 Temperature Sensor
  Serial.println(F("[Sensors] Initializing DS18B20 on GPIO 4..."));
  tempSensor.begin();
  int deviceCount = tempSensor.getDeviceCount();
  if (deviceCount > 0) {
    Serial.print(F("✅ DS18B20 detected ("));
    Serial.print(deviceCount);
    Serial.println(F(" sensor found)."));
  } else {
    Serial.println(F("⚠️ WARNING: No DS18B20 sensor found! Check 4.7kΩ pull-up resistor and wiring."));
  }

  // 2. Initialize HX711 Load Cell Amplifier
  Serial.println(F("[Sensors] Initializing HX711 scale (DOUT: 21, SCK: 22)..."));
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  if (scale.wait_ready_timeout(1500)) {
    scale.set_scale(CALIBRATION_FACTOR);
    scale.tare(10); // Zero the empty hive scale baseline
    Serial.print(F("✅ HX711 ready. Calibration factor: "));
    Serial.println(CALIBRATION_FACTOR);
  } else {
    Serial.println(F("⚠️ WARNING: HX711 not responding! Check DT/SCK wiring and VCC."));
  }

  // 3. Connect to Wi-Fi
  Serial.print(F("\n[Wi-Fi] Connecting to SSID: "));
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 30) {
    delay(500);
    Serial.print(F("."));
    wifiAttempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("✅ Wi-Fi Connected! ESP32 IP address: "));
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(F("❌ Wi-Fi Connection Failed. Will retry in loop..."));
  }

  Serial.println(F("\n--- Starting Telemetry Loop ---\n"));
}

void loop() {
  Serial.println(F("--------------------------------------------------"));
  Serial.println(F("[Cycle] Sampling hive sensors..."));

  // =========================================================================
  // 1. Read Brood Chamber Temperature (DS18B20)
  // =========================================================================
  tempSensor.requestTemperatures();
  float temperature = tempSensor.getTempCByIndex(0);
  bool validTemp = false;

  // Filter out disconnected code (-127°C), power-on reset state (85°C), and out-of-range values
  if (temperature != DEVICE_DISCONNECTED_C &&
      temperature != 85.0f &&
      !isnan(temperature) &&
      temperature >= -20.0f &&
      temperature <= 60.0f) {
    validTemp = true;
    Serial.print(F("🌡️ Temperature: "));
    Serial.print(temperature, 2);
    Serial.println(F(" °C"));
  } else {
    Serial.print(F("❌ DS18B20 reading invalid or disconnected (raw: "));
    Serial.print(temperature, 2);
    Serial.println(F(" °C)"));
  }

  // =========================================================================
  // 2. Read Hive Weight (HX711)
  // =========================================================================
  float weight = 0.0f;
  bool validWeight = false;

  if (scale.wait_ready_timeout(1000)) {
    float sampledWeight = scale.get_units(5); // Average 5 readings for stability

    // Clamp small zero-point drift (-0.05 kg to 0.00 kg) to 0.00 kg
    if (sampledWeight >= -0.05f && sampledWeight < 0.0f) {
      sampledWeight = 0.0f;
    }

    if (sampledWeight >= 0.0f && sampledWeight <= 250.0f && !isnan(sampledWeight)) {
      weight = sampledWeight;
      validWeight = true;
      Serial.print(F("⚖️ Hive Weight: "));
      Serial.print(weight, 2);
      Serial.println(F(" kg"));
    } else {
      Serial.print(F("❌ Weight out of bounds (0.0 to 250.0 kg): "));
      Serial.print(sampledWeight, 2);
      Serial.println(F(" kg"));
    }
  } else {
    Serial.println(F("❌ HX711 scale timed out / not ready."));
  }

  // =========================================================================
  // 3. Transmit Telemetry over Wi-Fi
  // =========================================================================
  // Safety check: Never transmit fabricated data if physical sensors failed
  if (!validTemp || !validWeight) {
    Serial.println(F("⚠️ SKIPPED: Telemetry transmission aborted due to invalid sensor reading."));
    delay(REPORT_INTERVAL_MS);
    return;
  }

  // Ensure Wi-Fi is still connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("⚠️ Wi-Fi disconnected. Reconnecting..."));
    WiFi.reconnect();
    delay(5000);
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(F("❌ Wi-Fi reconnect failed."));
      delay(REPORT_INTERVAL_MS);
      return;
    }
  }

  // Build simple JSON payload
  // (Backend automatically assigns the current server timestamp)
  String jsonPayload = String("{\"deviceId\":\"") + DEVICE_ID +
                       "\",\"temperature\":" + String(temperature, 2) +
                       ",\"weight\":" + String(weight, 2) + "}";

  Serial.print(F("🚀 Sending POST to: "));
  Serial.println(BACKEND_URL);
  Serial.print(F("📦 Payload: "));
  Serial.println(jsonPayload);

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader(F("Content-Type"), F("application/json"));
  http.addHeader(F("X-Device-Key"), DEVICE_API_KEY);
  http.setTimeout(8000); // 8-second HTTP timeout

  int httpResponseCode = http.POST(jsonPayload);

  if (httpResponseCode > 0) {
    String responseBody = http.getString();
    Serial.print(F("📡 HTTP Response Code: "));
    Serial.println(httpResponseCode);
    Serial.print(F("📥 Server Response: "));
    Serial.println(responseBody);

    if (httpResponseCode == 201) {
      Serial.println(F("✅ SUCCESS: Telemetry saved and Firestore updated."));
    } else if (httpResponseCode == 401) {
      Serial.println(F("❌ ERROR 401: Unauthorized. Verify DEVICE_API_KEY matches ESP32_API_KEY."));
    } else if (httpResponseCode == 404) {
      Serial.println(F("❌ ERROR 404: Device ID is not paired with any hive in HoneyChain app."));
    }
  } else {
    Serial.print(F("❌ HTTP POST Failed: "));
    Serial.println(http.errorToString(httpResponseCode));
  }

  http.end();

  // Wait 10-15 seconds before the next reading
  Serial.print(F("⏳ Waiting "));
  Serial.print(REPORT_INTERVAL_MS / 1000);
  Serial.println(F(" seconds for next cycle...\n"));

  delay(REPORT_INTERVAL_MS);
}
