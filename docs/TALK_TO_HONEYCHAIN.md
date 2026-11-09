# Talk to HoneyChain — AI-Powered Voice Support

## 1. Overview & Architecture

**Talk to HoneyChain** is an AI-powered voice assistant embedded within the HoneyChain mobile application, specifically tailored for Indian beekeepers. It enables beekeepers in rural and semi-urban regions to obtain real-time, grounded guidance on hive management, colony health, sensor diagnostics, honey harvesting, traceability, and government schemes through push-to-talk voice interactions in **Kannada**, **Hindi**, and **English**.

### End-to-End Pipeline

```
┌────────────────────────────────────────────────────────┐
│             HoneyChain Expo React Native App           │
│  - Push-to-Hold Voice Button (expo-audio)                │
│  - Visual Waveform / Recording state                   │
│  - Automatic Barge-in (stopping audio on new tap)      │
│  - Multi-lingual UI (Kannada, Hindi, English)          │
│  - On-Device Audio Playback fallback (expo-speech)     │
└───────────────────────────┬────────────────────────────┘
                            │
               Multipart/Form-Data Audio
               + Firebase ID Token + Lang
                            ▼
┌────────────────────────────────────────────────────────┐
│         HoneyChain Node.js / TypeScript Server         │
│                 (Express REST API)                     │
│                                                        │
│  1. Speech-to-Text (STT):                              │
│     - Multimodal Gemini Audio Understanding / Whisper  │
│                                                        │
│  2. Beekeeper Context Fetching (Firestore):            │
│     - Authenticated user's hives, sensors, telemetry   │
│                                                        │
│  3. RAG Knowledge Retrieval:                           │
│     - Cosine similarity matching over 8 verified       │
│       beekeeping domain guides                         │
│                                                        │
│  4. Grounded LLM Answering:                            │
│     - Gemini 2.5 Flash / Flash Lite with strict safety │
│       guardrails (no fake pesticides or disease cures) │
│                                                        │
│  5. Text-to-Speech (TTS):                              │
│     - Fast multilingual speech generator with         │
│       client-side on-device fallback                   │
│                                                        │
│  6. Audit & Support Logging:                           │
│     - Logs turn to `voice_support_turns`               │
│     - Escalates to `support_requests` for human agent  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Supported Languages

| Language | Locale Code | Script | Fallback Support |
| :--- | :--- | :--- | :--- |
| **Kannada** | `kn-IN` | ಕನ್ನಡ | Gemini Audio STT + Multilingual TTS + `expo-speech` |
| **Hindi** | `hi-IN` | हिन्दी | Gemini Audio STT + Multilingual TTS + `expo-speech` |
| **English** | `en-IN` | Latin | Gemini Audio STT + Multilingual TTS + `expo-speech` |

---

## 3. Zero-Billing / Free-Tier Design

All components have been configured to operate strictly within the **free tiers** of available AI and cloud platforms:

1. **Server-Side Key Isolation**: The mobile client bundle contains **zero** AI API keys or secrets. All AI interactions occur via the backend API.
2. **Gemini Free Tier**: Uses Google AI Studio free tier for multimodal audio transcription (`gemini-2.5-flash`), embeddings (`text-embedding-004`), and grounded reasoning.
3. **Resilient Local Embeddings**: Includes an automated fallback to high-speed normalized 256-dimensional semantic term vectors with cosine similarity if API rate limits are approached.
4. **Resilient Multi-Tier TTS**:
   - Server attempts fast network audio synthesis.
   - If audio generation exceeds latency budgets (3.5s) or encounters quota limits, the server flags `onDeviceFallback: true`.
   - The React Native mobile app seamlessly hands off playback to `expo-speech`, leveraging the user's native Android/iOS TTS engine at zero operational cost.

---

## 4. Knowledge Base & Grounding Guardrails

The RAG system indexes 8 domain guides located in `server/src/knowledge/`:

1. `hive-management.md` — Apiary site selection, frame spacing, seasonal inspection checklists, summer shade, and monsoon wind protection.
2. `honey-harvesting.md` — Refractometer moisture limits (< 20%), honey cap inspection, extraction hygiene, and storage.
3. `honey-traceability.md` — Batch numbering scheme, blockchain anchoring, and customer supply-chain tracking.
4. `qr-verification.md` — QR sticker placement, scanner troubleshooting, and offline verification tokens.
5. `sensor-troubleshooting.md` — Solar battery degradation, load cell drift calibration, humidity thresholds, and telemetry recovery.
6. `colony-health.md` — Identifying Varroa destructor, American/European Foulbrood, chalkbrood, wax moths, organic oxalic/formic acid treatments, and quarantine protocols.
7. `government-schemes.md` — National Beekeeping & Honey Mission (NBHM), KVIC subsidy schedules, and tribal welfare grants.
8. `app-usage.md` — Walkthrough for recording harvests, generating batch QR codes, and viewing hive graphs.

### Strict Guardrail Rules

- **Anti-Hallucination**: If the question asks about unverified chemical pesticides, antibiotics in honey, or unsupported disease treatments, the system refuses to guess and directs the beekeeper to a certified state apicultural officer.
- **Sensor Grounding**: Sensor values are only referenced if present in the beekeeper's live Firestore records.

---

## 5. Backend Setup & Running

### Directory Structure

```
HoneyChain/
├── server/
│   ├── src/
│   │   ├── config.ts              # Env config loader
│   │   ├── types/                 # Domain types & interfaces
│   │   ├── knowledge/             # 8 verified markdown guides
│   │   ├── rag/                   # Chunking, ingestion, and vector retrieval
│   │   ├── providers/             # STT, LLM, TTS, Embeddings
│   │   ├── services/              # Firebase Admin, userContext, supportLogger
│   │   ├── pipeline.ts            # Core RAG voice pipeline
│   │   └── index.ts               # Express API entry point
│   ├── scripts/
│   │   └── test-audio.ts          # Comprehensive test harness
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
```

### Environment Configuration

Create `server/.env` based on `server/.env.example`:

```bash
PORT=5001
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_PROJECT_ID=honeychain-prod
```

### Ingesting the Knowledge Base

To re-index markdown guides into vectors:

```bash
cd server
npm run ingest
```

Output:
```
[Ingest] Ingesting knowledge documents from server/src/knowledge
[Ingest] Successfully ingested 26 chunks into knowledge-index.json
```

### Starting the Server

**Development Mode (Live TypeScript Reloading):**
```bash
cd server
npm run dev
```

**Production Build & Run:**
```bash
cd server
npm run build
npm run start
```

Health check endpoint: `GET http://localhost:5001/api/health`

---

## 6. Running the Automated Test Suite

A comprehensive test harness tests 5 critical production scenarios:

1. **English Hive Query**: "What should I do if my hive weight dropped suddenly?"
2. **Kannada Harvesting Query**: "ಜೇನುತುಪ್ಪ ಕೊಯ್ಲು ಮಾಡಲು ಸರಿಯಾದ ತೇವಾಂಶ ಎಷ್ಟು?"
3. **Hindi Varroa Mite Query**: "मधुमक्खी के छत्ते में वरोआ माइट्स का जैविक उपचार क्या है?"
4. **Empty Audio Edge Case**: Validates graceful rejection and prompt to speak louder.
5. **Out-of-Domain Guardrail**: Refuses to provide unverified dangerous pesticides.

Run the test suite:

```bash
cd server
npm run test:audio
```

All 5 test suites pass with detailed latency metrics, transcript accuracy checks, and citations.

---

## 7. Mobile App Integration

### Components Added

- **[VoiceSupportButton.jsx](file:///c:/Users/harsh/Desktop/HoneyChain/src/components/voice/VoiceSupportButton.jsx)**: Floating support button with microphone icon, pulsating status indicator, and safe-area inset positioning.
- **[TalkToHoneyChain.jsx](file:///c:/Users/harsh/Desktop/HoneyChain/src/pages/TalkToHoneyChain.jsx)**: Full modal assistant sheet featuring:
  - Push-to-hold recording with dynamic mic feedback.
  - Language selector with persistent state.
  - Real-time audio waveform / recording pulse.
  - Transcript, grounded answer, and citation display.
  - Stop playback button with automatic barge-in cancellation when the mic is tapped.
  - Human Callback Request button.
- **[voiceSupportService.js](file:///c:/Users/harsh/Desktop/HoneyChain/src/services/voiceSupportService.js)**: Network abstraction handling multipart audio uploads, JWT authentication, and human callback creation.
- **[AppNavigator.jsx](file:///c:/Users/harsh/Desktop/HoneyChain/src/navigation/AppNavigator.jsx)**: Integrates the voice assistant for authenticated beekeepers across all tabs.

### Running the Mobile App

```bash
# In the project root
npx expo start
```

---

## 8. Support Logging & Human Callback Workflow

1. **Turn Logs**: Every voice turn is recorded in the Firestore collection `voice_support_turns`:
   - `userId`, `language`, `transcript`, `answer`, `citations`, `durationMs`, and `timestamp`.
2. **Unanswered / Low-Confidence Queries**: Logged to `unanswered_questions` for knowledge base curation.
3. **Human Callback**: When a beekeeper taps "Request Human Callback", a document is created in `support_requests`:
   ```json
   {
     "userId": "uid_123",
     "beekeeperName": "Ramesh Gowda",
     "phoneNumber": "+919876543210",
     "language": "kn-IN",
     "querySummary": "Queen bee absent after monsoon storm",
     "status": "pending",
     "createdAt": "2026-11-01T20:30:00Z"
   }
   ```

