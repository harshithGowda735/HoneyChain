export type SupportedLanguage = 'kn-IN' | 'hi-IN' | 'en-IN' | 'kn' | 'hi' | 'en';

export interface STTResult {
  text: string;
  language: SupportedLanguage;
  confidence?: number;
  provider: string;
  isMock?: boolean;
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  title: string;
  content: string;
  embedding?: number[];
}

export interface RetrievalResult {
  chunk: KnowledgeChunk;
  score: number;
}

export interface HiveSummary {
  id: string;
  name: string;
  status: string;
  weight?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  sensorDeviceId?: string | null;
  sensorStatus?: string;
  updatedAt?: string;
}

export interface BeekeeperContext {
  uid: string;
  displayName: string;
  phoneNumber?: string;
  apiaryName?: string;
  state?: string;
  district?: string;
  hivesCount: number;
  hives: HiveSummary[];
  totalHarvestKg: number;
  recentBatches: Array<{
    batchCode: string;
    honeyType: string;
    quantity: number;
    harvestDate?: string;
  }>;
}

export interface LLMAnswer {
  text: string;
  isGrounded: boolean;
  needsEscalation: boolean;
  citations: string[];
  provider: string;
  isMock?: boolean;
}

export interface TTSResult {
  audioBase64: string;
  mimeType: string;
  provider: string;
  onDeviceFallback?: boolean;
  isMock?: boolean;
}

export interface VoiceTurnMetrics {
  sttLatencyMs: number;
  userContextLatencyMs: number;
  ragLatencyMs: number;
  llmLatencyMs: number;
  ttsLatencyMs: number;
  totalLatencyMs: number;
}

export interface VoiceSupportResponse {
  success: boolean;
  transcript: string;
  answerText: string;
  audioBase64?: string;
  audioMimeType?: string;
  onDeviceFallback?: boolean;
  citations: string[];
  language: SupportedLanguage;
  metrics: VoiceTurnMetrics;
  needsHumanSupport: boolean;
  providers?: {
    stt: string;
    llm: string;
    tts: string;
  };
  isMock?: boolean;
  mockReason?: string;
}

export interface SupportCallbackRequest {
  id?: string;
  uid: string;
  displayName?: string;
  phoneNumber?: string;
  transcript: string;
  preferredLanguage: string;
  timestamp: string;
  reason: string;
  status: 'open' | 'in_progress' | 'resolved';
}

export interface IngestTelemetryPayload {
  deviceId: string;
  temperature: number;
  weight: number;
  timestamp?: string | number | Date;
  humidity?: number;
  batteryLevel?: number;
}

export interface IngestTelemetryResult {
  success: boolean;
  message: string;
  hiveId: string;
  hiveName: string;
  readingId: string;
  recordedAt: string;
  metrics: {
    temperature: number;
    weight: number;
    humidity?: number;
    batteryLevel?: number;
  };
}
