# 🍯 HoneyChain — Smart Apiary & Honey Traceability Mobile App (V1)

HoneyChain is a mobile-first beekeeping management application designed to bridge real-world apiary operations with IoT sensor telemetry and end-to-end honey batch traceability.

Built with **React Native** and **Expo SDK 57** using modern JavaScript (`.js` / `.jsx`), HoneyChain features an agricultural design language: warm cream backgrounds (`#F9F6F0`), deep forest greens (`#1B4332`), and subtle honey-gold accents (`#E69500`).

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Expo Go](https://expo.dev/go) on your mobile device (Android/iOS) or an active simulator

### Setup Instructions

1. **Clone and enter the repository:**
   ```bash
   git clone <repo-url>
   cd HoneyChain
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Verify project compatibility (Expo Doctor):**
   ```bash
   npx expo-doctor
   ```

4. **Launch the development server:**
   ```bash
   npx expo start
   ```

5. **Run on target platform:**
   - **Android Device/Emulator:** Press `a` in the terminal or scan the terminal QR code with the Expo Go app.
   - **iOS Simulator:** Press `i` in the terminal.
   - **Web Preview:** Press `w` in the terminal.

---

## 📂 Project Structure & Architecture

```text
HoneyChain/
├── assets/                          # Static assets and graphics
│   ├── images/                      # Image assets
│   ├── icons/                       # Custom vector and raster icons
│   └── fonts/                       # Custom typography assets
│
├── src/
│   ├── components/                  # Reusable UI component library
│   │   ├── common/                  # Universal UI primitives
│   │   │   ├── AppButton.jsx        # Standard button with variants (primary, secondary, outline)
│   │   │   ├── AppCard.jsx          # Rounded container card with warm border & subtle elevation
│   │   │   ├── AppHeader.jsx        # Accessible screen header with title & back interactions
│   │   │   ├── StatusBadge.jsx      # Health/state indicator pills (Healthy, Attention, Critical)
│   │   │   └── EmptyState.jsx       # Illustrated empty-result view for searches and filters
│   │   │
│   │   ├── dashboard/               # Home screen domain components
│   │   │   ├── OverviewCard.jsx     # Apiary colony breakdown & honey harvest summary
│   │   │   ├── SensorSummaryCard.jsx# Dual-column internal temperature & relative humidity cards
│   │   │   └── RecentActivity.jsx   # Feed of inspections, alerts, and lot bottling events
│   │   │
│   │   ├── hives/                   # Colony & hive domain components
│   │   │   └── HiveCard.jsx         # Card displaying hive ID, yard location, sensors, & status
│   │   │
│   │   ├── batches/                 # Honey harvest domain components
│   │   │   └── BatchCard.jsx        # Harvest lot card with floral source, quantity, & stage
│   │   │
│   │   └── navigation/              # Navigation UI elements
│   │       └── BottomTabBar.jsx     # Custom 4-tab bottom navigation bar with active styling
│   │
│   ├── pages/                       # Full-screen views composed of reusable components
│   │   ├── HomePage.jsx             # Apiary overview, sensor telemetry summary, and activity
│   │   ├── HivesPage.jsx            # Searchable and filterable hives list with detailed modal
│   │   ├── BatchesPage.jsx          # Extraction lots list, traceability timeline, & QR placeholder
│   │   └── ProfilePage.jsx          # Beekeeper credentials, yard info, preferences, & guest mode
│   │
│   ├── navigation/
│   │   └── AppNavigator.jsx         # Core navigation coordinator and tab state manager
│   │
│   ├── services/                    # Firestore & Firebase Authentication service layer
│   │   ├── firebase.js              # Initialized Firebase app, Auth persistence & core client
│   │   ├── userService.js           # Firestore user profile management (users/{uid})
│   │   ├── hiveService.js           # Firestore hives CRUD with ownerUid isolation (hives/{hiveId})
│   │   ├── sensorService.js         # Subcollection telemetry (hives/{hiveId}/readings/{readingId})
│   │   ├── batchService.js          # Honey batch CRUD with hive verification (batches/{batchId})
│   │   ├── activityService.js       # Activity stream logging (users/{uid}/activity/{activityId})
│   │   └── api.js                   # Extended API contracts
│   │
│   ├── hooks/
│   │   └── useHiveData.js           # Reactive Firestore hook for hives, batches, readings & stats
│   │
│   ├── context/
│   │   └── AuthContext.jsx          # Firebase Auth session state & user profile sync
│   │
│   ├── data/                        # Empty directory (.gitkeep) - mock business data completely removed
│   │
│   ├── constants/                   # Centralized design tokens and config
│   │   ├── colors.js                # Forest greens, honey golds, warm creams, and sensor colors
│   │   ├── layout.js                # Spacing scale, border radiuses, typography, and shadows
│   │   └── config.js                # Application version, apiary metadata, and system flags
│   │
│   ├── utils/                       # Pure utility formatting functions
│   │   ├── formatDate.js            # Human-friendly calendar and timestamp formatter
│   │   └── formatSensorValue.js     # Temperature (°C/°F), humidity (%), weight, and thresholds
│   │
│   └── styles/
│       └── globalStyles.js          # Shared style presets and containers
│
├── App.js                           # Minimal root entry point with SafeArea & Auth providers
├── app.json                         # Expo configuration manifest
├── package.json                     # Project manifest and locked SDK dependencies
└── README.md                        # Documentation and architecture guide
```

---

## 🌟 Key Features (V1 Release)

### 1. Home Dashboard (`HomePage.jsx`)
- **Beekeeper Greeting & Apiary Tag:** Personalized greeting with quick avatar shortcut to Profile.
- **Colony Overview:** Total colony count with breakdown of healthy, attention-needed, and critical hives.
- **Honey Harvest Indicator:** Tracks cumulative raw honey production across active yards.
- **ESP32 Fleet Telemetry:** Summary cards showing real-time average brood temperatures (optimal: 34.0–36.0°C) and hive relative humidity (optimal: 50–65% RH), clearly marked as simulated.
- **Recent Operations Log:** Event stream of inspections, harvests, and microclimate alerts.
- **Quick Actions:** Instant buttons to jump directly into hive management or honey batches.

### 2. Hives Management (`HivesPage.jsx`)
- **Instant Search:** Search across Hive ID, colony nickname, or yard location.
- **Status Filter Chips:** Filter colonies by `All Hives`, `Healthy`, `Attention`, or `Critical`.
- **Colony Cards:** Visual representation of each hive's current core brood temperature, relative humidity, scale weight, and node battery voltage.
- **Deep Inspection Modal:** Tap any card to open a full inspection view displaying:
  - Microclimate telemetry with optimal range indicators.
  - Queen status (laying pattern, color marking).
  - Brood frame counts and honey super layers.
  - Beekeeper field inspection notes.
  - Telemetry log history from the simulated node.

### 3. Honey Traceability (`BatchesPage.jsx`)
- **Lot Management:** Track harvested honey lots by Batch ID, harvest date, and botanical origin (Wildflower, Blackberry Blossom, Lavender, etc.).
- **Chain of Custody Modal:** Tap any batch to view its chronological production stages:
  - `Harvest` ➡️ `Cold Extraction` ➡️ `Filtration & Settling` ➡️ `Lab Quality Testing` ➡️ `Jarring & Tamper-Sealing`.
  - Details include operator name, timestamp, moisture analysis (refractometer reading), and simulated blockchain ledger transaction hashes.
- **QR Seal Placeholder:** An honest, clearly marked preview explaining that live Polygon ledger verification and camera scanning will connect in V2.

### 4. Beekeeper Profile (`ProfilePage.jsx`)
- **Credentials & Licensing:** Master Apiarist identification with state license number.
- **Yard Operations:** Lists managed yard sectors (Clover Valley, Pine Ridge, Wetland Outpost).
- **Hardware & Preferences:** Temperature unit toggles (°C / °F), offline cache controls, and telemetry source info.
- **Authentic Guest Mode:** Explains that Firebase Authentication will be enabled in V2 without rendering a fake working sign-out button.

---

## 🎨 Design System Tokens

The application design system is configured in `src/constants/colors.js`:

| Token | Hex / Value | Purpose |
| :--- | :--- | :--- |
| `colors.background` | `#F9F6F0` | Warm cream organic background |
| `colors.surface` | `#FFFFFF` | Card surface with subtle border |
| `colors.surfaceSubtle`| `#F3EFE6` | Soft cream accent surfaces |
| `colors.primary` | `#1B4332` | Deep forest green brand core |
| `colors.primarySoft` | `#E8F5E9` | Light green tint for badges & icons |
| `colors.accent` | `#E69500` | Honey gold highlight |
| `colors.accentSoft` | `#FEF3C7` | Warm honey pill background |
| `colors.textPrimary` | `#1E2922` | Deep slate-moss readable text |
| `colors.sensor.temp` | `#EA580C` | Brood temperature metric |
| `colors.sensor.humidity` | `#0284C7` | Hive relative humidity metric |

---

## 🔮 Future Roadmap (V2 & Beyond)

1. **FastAPI Backend:** Replace mock modules in `src/data/` with live REST/WebSocket endpoints defined in `src/services/api.js`.
2. **PostgreSQL Database:** Store continuous time-series sensor data and inspection records.
3. **ESP32 Hardware Nodes:** Real BLE/WiFi/LoRa mesh transmission from SHT31 temp/humidity sensors and load cell hive scales.
4. **Firebase Authentication:** Multi-factor authentication (email/password & SMS) with role-based access for apiary technicians.
5. **Polygon Blockchain Verification:** Consumer-facing tamper-proof verification where consumers scan jar QR codes to view immutable harvest-to-shelf provenance.

---

## 🛠️ Maintenance & Diagnostics Commands

- **Run Expo Doctor:** `npx expo-doctor`
- **Start bundler:** `npx expo start`
- **Clear cache if needed:** `npx expo start -c`
