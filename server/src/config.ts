import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();
// Also attempt loading parent .env if available
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function resolveKnowledgePath(): { dir: string; index: string } {
  const localDir = path.resolve(__dirname, 'knowledge');
  if (fs.existsSync(localDir)) {
    return {
      dir: localDir,
      index: path.resolve(__dirname, 'knowledge-index.json'),
    };
  }
  const srcDir = path.resolve(__dirname, '../src/knowledge');
  if (fs.existsSync(srcDir)) {
    return {
      dir: srcDir,
      index: path.resolve(__dirname, '../src/knowledge-index.json'),
    };
  }
  return {
    dir: localDir,
    index: path.resolve(__dirname, 'knowledge-index.json'),
  };
}

const resolvedPaths = resolveKnowledgePath();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  groqApiKey: process.env.GROQ_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'honeychain-fa9c9',
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '',
  knowledgeDir: resolvedPaths.dir,
  vectorIndexPath: resolvedPaths.index,
  maxAudioSizeBytes: 15 * 1024 * 1024, // 15MB
  topKRetrieval: 4,
  allowMock: process.env.ALLOW_MOCK === 'true',
};

export function validateStartupConfig(): void {
  const missingKeys: string[] = [];
  if (!config.groqApiKey) missingKeys.push('GROQ_API_KEY');
  if (!config.geminiApiKey) missingKeys.push('GEMINI_API_KEY');

  console.log('\n======================================================');
  console.log('🐝 HoneyChain Voice Assistant Service Configuration');
  console.log('======================================================');
  console.log(`Port:                 ${config.port}`);
  console.log(`Groq STT Key:         ${config.groqApiKey ? 'configured (whisper-large-v3)' : 'MISSING'}`);
  console.log(`Gemini LLM Key:       ${config.geminiApiKey ? 'configured (' + config.geminiModel + ')' : 'MISSING'}`);
  console.log(`TTS Engine:           Microsoft Edge TTS (msedge-tts)`);
  console.log(`Voices:               kn-IN-SapnaNeural | hi-IN-SwaraNeural | en-IN-NeerjaNeural`);
  console.log(`Knowledge Base:       ${config.knowledgeDir}`);
  console.log(`Allow Mock Fallback:  ${config.allowMock}`);
  console.log('======================================================\n');

  if (missingKeys.length > 0) {
    if (!config.allowMock) {
      const errorMsg =
        `[FATAL STARTUP ERROR] Missing required environment variable(s): ${missingKeys.join(', ')}.\n` +
        `Please set them in server/.env (obtain free keys at https://console.groq.com and https://aistudio.google.com),\n` +
        `or explicitly set ALLOW_MOCK=true in server/.env for offline development testing.`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    } else {
      console.warn(
        `[WARNING] Starting with ALLOW_MOCK=true because ${missingKeys.join(', ')} are not set. Responses will be flagged with isMock=true.`
      );
    }
  }
}
