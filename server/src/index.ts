import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { config, validateStartupConfig } from './config';
import { verifyAuthToken } from './services/firebase';
import { processVoiceSupportTurn } from './pipeline';
import { createTTSProvider } from './providers/tts';
import { recordSupportCallback } from './services/supportLogger';
import { loadKnowledgeIndex } from './rag/retrieve';
import { SupportedLanguage } from './types';
import {
  validateDeviceApiKey,
  processTelemetryIngestion,
  TelemetryValidationError,
  DeviceNotFoundError,
  DuplicateReadingError,
  OutOfOrderReadingError,
  AmbiguousDeviceMappingError,
} from './services/telemetryIngest';

// Fail loudly at startup if required keys are missing (unless ALLOW_MOCK=true)
validateStartupConfig();

const app = express();
const upload = multer({
  limits: { fileSize: config.maxAudioSizeBytes },
  storage: multer.memoryStorage(),
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 1. Healthcheck Endpoints (/health and /api/health)
const handleHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const index = await loadKnowledgeIndex();
    res.json({
      status: 'healthy',
      service: 'HoneyChain AI Voice & IoT Backend',
      knowledgeChunksIndexed: index.length,
      groqConfigured: Boolean(config.groqApiKey),
      geminiConfigured: Boolean(config.geminiApiKey),
      geminiModel: config.geminiModel,
      ttsEngine: 'Microsoft-Edge-TTS',
      iotTelemetryConfigured: Boolean(config.esp32ApiKey),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'unhealthy', error: err?.message || 'Knowledge index error' });
  }
};

app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

// 2. Direct TTS Endpoint for Instant Greeting Voice Synthesis
app.post(
  '/api/voice-support/tts',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const text = String(req.body.text || '').trim();
      const language = (req.body.language || 'en-IN') as SupportedLanguage;
      if (!text) {
        res.status(400).json({ error: 'Text parameter is required for TTS synthesis.' });
        return;
      }
      const ttsProvider = createTTSProvider();
      const result = await ttsProvider.synthesize(text, language);
      res.json(result);
    } catch (err: any) {
      next(err);
    }
  }
);

// 3. Main Voice Support Audio Turn Endpoint
app.post(
  '/api/voice-support/process',
  upload.single('audio'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract authentication token
      const authHeader = req.headers.authorization || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
      const token = bearerToken || (req.body.token as string) || '';

      let uid = 'anonymous_beekeeper';
      if (token) {
        try {
          const verified = await verifyAuthToken(token);
          uid = verified.uid;
        } catch (authErr: any) {
          console.warn(`[API] Auth notice (${authErr.message}). Using fallback UID.`);
          if (req.body.clientUid) {
            uid = String(req.body.clientUid);
          }
        }
      } else if (req.body.clientUid) {
        uid = String(req.body.clientUid);
      }

      const language = (req.body.language || 'en-IN') as SupportedLanguage;
      const textQuery = req.body.textQuery ? String(req.body.textQuery) : undefined;
      const file = req.file;

      let audioBuffer = file ? file.buffer : undefined;
      let mimeType = file ? file.mimetype : 'audio/m4a';

      if (!audioBuffer && req.body.audioBase64) {
        audioBuffer = Buffer.from(String(req.body.audioBase64), 'base64');
        mimeType = req.body.audioMimeType || req.body.mimeType || 'audio/m4a';
      }

      if (!audioBuffer && !textQuery) {
        res.status(400).json({
          success: false,
          error: 'Either audio (file/audioBase64) or textQuery parameter is required.',
        });
        return;
      }

      const result = await processVoiceSupportTurn({
        audioBuffer,
        mimeType,
        language,
        uid,
        textQuery,
      });

      res.json(result);
    } catch (err: any) {
      next(err);
    }
  }
);

// 4. Human Callback Request Endpoint
app.post(
  '/api/voice-support/callback',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : '';
      const token = bearerToken || (req.body.token as string) || '';

      let uid = req.body.uid || 'anonymous_beekeeper';
      if (token) {
        try {
          const verified = await verifyAuthToken(token);
          uid = verified.uid;
        } catch (_) {}
      }

      const result = await recordSupportCallback({
        uid,
        displayName: req.body.displayName,
        phoneNumber: req.body.phoneNumber,
        transcript: req.body.transcript || 'Beekeeper requested human callback from voice support screen',
        preferredLanguage: req.body.preferredLanguage || 'en-IN',
        reason: req.body.reason || 'Requested expert intervention',
        status: 'open',
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: 'Your human callback request has been recorded. An agricultural officer will contact you.',
        requestId: result.id,
      });
    } catch (err: any) {
      next(err);
    }
  }
);

// 5. Secure ESP32 Hardware Telemetry Ingestion Endpoint
app.post(
  '/api/telemetry/reading',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Authenticate via X-Device-Key header using timing-safe comparison
      const deviceKey = (req.header('X-Device-Key') || req.header('x-device-key'))?.trim();
      if (!validateDeviceApiKey(deviceKey)) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid or missing X-Device-Key header.',
        });
        return;
      }

      const result = await processTelemetryIngestion(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      if (err instanceof TelemetryValidationError) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      if (err instanceof DeviceNotFoundError) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      if (err instanceof DuplicateReadingError) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }
      if (err instanceof AmbiguousDeviceMappingError) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }
      if (err instanceof OutOfOrderReadingError) {
        res.status(422).json({ success: false, error: err.message });
        return;
      }

      console.error('[Telemetry Ingest Error]', err?.message || err);
      res.status(500).json({
        success: false,
        error: 'Internal server error while processing telemetry reading.',
      });
    }
  }
);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Server Error]', err?.message || err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal voice assistant server error',
  });
});

// Start listening
const server = app.listen(config.port, async () => {
  console.log(`🐝 HoneyChain Voice Assistant Backend listening on port ${config.port}`);
  try {
    const index = await loadKnowledgeIndex();
    console.log(`📚 RAG Knowledge Base ready: ${index.length} chunks indexed.`);
  } catch (err: any) {
    console.warn('⚠️ Could not load RAG index on startup:', err.message);
  }
});

export { app, server };
