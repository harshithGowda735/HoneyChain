# HoneyChain Knowledge Base: Hive Weight & IoT Sensor Troubleshooting

## 1. Supported Telemetry Hardware
- **Microcontroller**: ESP32 with WiFi / Bluetooth LE / GSM SIM800L module.
- **Scale Subsystem**: 4x 50kg load cells in wheatstone bridge configuration (or single 200kg bar cell) with an **HX711** 24-bit ADC amplifier.
- **Climate Sensors**: DHT22 or SHT31 for internal hive temperature and relative humidity.

## 2. Sensor Status Indicators in HoneyChain
- **Live / Connected (Green)**: Fresh sensor readings received within the last 24 hours.
- **Stale (Amber)**: The last reading is older than 24 hours. Check ESP32 solar battery level or network connectivity.
- **Disconnected (Red)**: Device configured but no packet received for over 48 hours.
- **No Sensor**: The hive does not have a linked IoT device. Manual scale readings can be recorded anytime by tapping the hive in **My Apiary**.

## 3. Weight Trend vs Honey Production
- **Important**: Hive weight changes represent total colony mass fluctuations (brood growth, pollen reserves, nectar flow, water carrying, adult bee population, and wooden moisture).
- An increase in weight indicates net biomass/store gain, but is not 100% extracted honey until harvested.
- A sudden drop in hive weight of 1.5 kg to 3 kg in spring/summer frequently signals a **swarm event** (queen departed with half the colony). Check the apiary trees immediately.
- A steady daily weight decline in winter or dearth periods indicates colonies are consuming winter stores; emergency supplemental feeding may be required.

## 4. Troubleshooting Steps for HX711 Scale
- If readings fluctuate wildly: Check for moisture condensation on HX711 analog lines, ensure load cells have rigid corner shims, and check ground wires.
- If readings read constant zero: Verify clock (SCK) and data (DT) pin assignments on ESP32 GPIOs.

