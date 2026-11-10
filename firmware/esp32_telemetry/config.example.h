#ifndef HONEYCHAIN_CONFIG_H
#define HONEYCHAIN_CONFIG_H

// ============================================================================
// HoneyChain ESP32 Telemetry Node Configuration
//
// INSTRUCTIONS:
// 1. Copy this file to `config.h` in the same folder:
//    cp config.example.h config.h
// 2. Open `config.h` and enter your Wi-Fi credentials and PC LAN IP address.
// 3. `config.h` is excluded by Git (.gitignore) so your secrets remain safe.
// ============================================================================

// --- Wi-Fi Credentials ---
#define WIFI_SSID          "YOUR_WIFI_SSID"
#define WIFI_PASSWORD      "YOUR_WIFI_PASSWORD"

// --- HoneyChain Express Ingestion Endpoint ---
// IMPORTANT:
// - Replace 192.168.1.50 with your computer's local LAN IPv4 address (run `ipconfig` on Windows).
// - The backend server runs on port 3001 (server/src/config.ts).
// - DO NOT use "localhost" or "127.0.0.1" (those refer to the ESP32 itself).
#define BACKEND_URL        "http://192.168.1.50:3001/api/telemetry/reading"

// --- Hardware Device Authentication ---
// Device ID paired with your hive in the HoneyChain mobile app (e.g. HC-ESP32-001)
#define DEVICE_ID          "HC-ESP32-001"

// Secret API key validated against backend ESP32_API_KEY environment variable
#define DEVICE_API_KEY     "YOUR_ESP32_SECRET_KEY"

// --- Hardware GPIO Pin Connections ---
#define PIN_DS18B20_DATA   4     // DS18B20 1-Wire data pin (requires 4.7kΩ pull-up to 3.3V)
#define PIN_HX711_DOUT     21    // HX711 digital data output pin
#define PIN_HX711_SCK      22    // HX711 serial clock pin

// --- HX711 Load Cell Calibration ---
// NOTE: Use `firmware/hx711_calibration/hx711_calibration.ino` with a known weight
// (e.g. 5.0 kg) to find your exact calibration factor. Default placeholder: 2280.0
#define CALIBRATION_FACTOR 2280.0f

// --- Telemetry Reporting Interval ---
#define REPORT_INTERVAL_MS 15000 // Send reading every 15 seconds

#endif // HONEYCHAIN_CONFIG_H
