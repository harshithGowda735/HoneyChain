# HoneyChain — ESP32 Smart Hive Telemetry Firmware

Simple, beginner-friendly ESP32 firmware for HoneyChain IoT telemetry integration using the **Arduino IDE**.

---

## 1. Architecture

```text
ESP32 + Sensors (DS18B20 + HX711)
          ↓ Wi-Fi (HTTP POST)
Existing HoneyChain Express Backend (port 3001)
          ↓ Firebase Admin
Cloud Firestore Database (`hives/{hiveId}`)
          ↓ Firestore onSnapshot
HoneyChain Expo Mobile Application (Live Telemetry)
```

---

## 2. Directory Structure

```text
firmware/
├── esp32_telemetry/
│   ├── esp32_telemetry.ino        # Main Arduino sketch (reads sensors & sends POST)
│   ├── config.example.h           # Configuration template with placeholders
│   └── config.h                   # Local credentials (git-ignored for security)
├── hx711_calibration/
│   └── hx711_calibration.ino      # Simple interactive calibration utility
└── README.md                      # This guide and testing checklist
```

---

## 3. Arduino IDE Setup

1. **Install Arduino IDE**: Download and install [Arduino IDE 2.x](https://www.arduino.cc/en/software).
2. **Add ESP32 Board Package**:
   - Open `File -> Preferences`.
   - In **Additional boards manager URLs**, add:
     ```text
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to `Tools -> Board -> Boards Manager...`, search for **esp32** (by Espressif Systems), and install it.
3. **Select Board**:
   - Go to `Tools -> Board -> esp32 -> ESP32 Dev Module` (or `DOIT ESP32 DEVKIT V1`).
   - Select your USB COM port under `Tools -> Port`.

---

## 4. Required Arduino Libraries

In Arduino IDE, open `Tools -> Manage Libraries...` (or `Ctrl+Shift+I` / `Cmd+Shift+I`) and install:

1. **OneWire** (by Paul Stoffregen) — v2.3.7+
2. **DallasTemperature** (by Miles Burton) — v3.9.0+
3. **HX711** (by Bogdan Necula) — v0.7.5+

*(Built-in ESP32 libraries `WiFi.h` and `HTTPClient.h` are included automatically with the board package).*

---

## 5. Wiring Connections & Electrical Precautions

| Sensor | Sensor Pin | ESP32 GPIO Pin | Electrical Requirement |
| :--- | :--- | :--- | :--- |
| **DS18B20 (Temp)** | Yellow / White (DATA) | **GPIO 4** | **Requires 4.7kΩ pull-up resistor** between DATA and 3.3V |
| | Red (VCC) | **3.3V** | Operating voltage: 3.0V – 5.5V |
| | Black (GND) | **GND** | Ground |
| **HX711 (Scale)** | DT / DOUT (Data) | **GPIO 21** | Digital serial data output |
| | SCK (Clock) | **GPIO 22** | Digital serial clock input |
| | VCC | **3.3V** | Power from 3.3V to ensure 3.3V logic levels |
| | GND | **GND** | Ground |

> [!CAUTION]
> **ESP32 3.3V GPIO Limit**: ESP32 GPIO pins are strictly 3.3V tolerant. Power your sensors and pull-up resistor from the **3.3V rail** (not 5V/VIN) to protect the microcontroller from over-voltage damage.

---

## 6. Configuration Steps

1. In `firmware/esp32_telemetry/`, copy `config.example.h` to `config.h`:
   ```bash
   cp firmware/esp32_telemetry/config.example.h firmware/esp32_telemetry/config.h
   ```
2. Open `config.h` in your text editor or Arduino IDE:
   - Enter your home / apiary Wi-Fi SSID and password:
     ```c
     #define WIFI_SSID      "Your_WiFi_SSID"
     #define WIFI_PASSWORD  "Your_WiFi_Password"
     ```
   - Enter your computer's local LAN IP address for the backend (run `ipconfig` on Windows, e.g. `192.168.1.50`):
     ```c
     #define BACKEND_URL    "http://192.168.1.50:3001/api/telemetry/reading"
     ```
     *(Do not use `localhost` or `127.0.0.1` — those refer to the ESP32 itself).*
   - Set the `DEVICE_ID` to match the sensor ID registered for your hive in the HoneyChain mobile app (e.g. `HC-ESP32-001`).
   - Set `DEVICE_API_KEY` to match the `ESP32_API_KEY` configured in your backend `.env`.

---

## 7. HX711 Load Cell Calibration (When Physical Hardware Arrives)

1. Open `firmware/hx711_calibration/hx711_calibration.ino` in Arduino IDE.
2. Connect your ESP32 with the HX711 wired.
3. Upload and open the **Serial Monitor at 115200 baud** (newline set to "Both NL & CR").
4. **Step 1 (Tare)**: Ensure the scale platform is empty. Send any key to zero the scale.
5. **Step 2 (Calibration Weight)**: Place a known reference weight (e.g. 5.0 kg plate) on the platform, enter `5.0` in the Serial Monitor, and press Enter.
6. The sketch outputs your exact calibration factor:
   ```c
   #define CALIBRATION_FACTOR 2280.0f
   ```
7. Copy this factor into your `firmware/esp32_telemetry/config.h`.

---

## 8. Physical Hardware Testing Checklist

*(Keep this checklist for your next session when physical hardware is connected).*

- [ ] **Physical Hardware Setup**:
  - [ ] Connect DS18B20 with 4.7kΩ pull-up resistor between GPIO 4 and 3.3V.
  - [ ] Connect HX711 DOUT to GPIO 21 and SCK to GPIO 22.
  - [ ] Connect load cell 4-wire bridge to HX711 (E+, E-, A+, A-).
- [ ] **Firmware Flash**:
  - [ ] Open `esp32_telemetry.ino` in Arduino IDE.
  - [ ] Verify `config.h` has your Wi-Fi credentials and PC LAN IP.
  - [ ] Select port and click Upload (`Ctrl+U`).
- [ ] **Serial Monitor Verification (115200 baud)**:
  - [ ] Confirm "Wi-Fi Connected! ESP32 IP address: ..." appears.
  - [ ] Confirm temperature reading is valid (e.g. ~25°C to 35°C).
  - [ ] Confirm weight reading is valid (e.g. ~0.00 kg with empty scale).
  - [ ] Confirm HTTP 201 response: `{"success": true, "message": "Telemetry reading ingested successfully"}`.
- [ ] **HoneyChain Mobile Application Verification**:
  - [ ] Open HoneyChain app on mobile phone (connected to same Wi-Fi).
  - [ ] Navigate to Home or Apiary screen.
  - [ ] Observe Hive Card badge updating live with the latest temperature, weight, and "Connected & Live" green indicator.
