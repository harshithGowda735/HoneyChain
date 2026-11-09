import { createSTTProvider } from './providers/stt';
import { createLLMProvider } from './providers/llm';
import { createTTSProvider } from './providers/tts';
import { retrieveRelevantChunks } from './rag/retrieve';
import { fetchBeekeeperContext } from './services/userContext';
import { logVoiceTurn } from './services/supportLogger';
import { SupportedLanguage, VoiceSupportResponse, VoiceTurnMetrics } from './types';

export async function processVoiceSupportTurn({
  audioBuffer,
  mimeType,
  language,
  uid,
  textQuery,
}: {
  audioBuffer?: Buffer;
  mimeType?: string;
  language: SupportedLanguage;
  uid: string;
  textQuery?: string;
}): Promise<VoiceSupportResponse> {
  const startTime = Date.now();
  const metrics: VoiceTurnMetrics = {
    sttLatencyMs: 0,
    userContextLatencyMs: 0,
    ragLatencyMs: 0,
    llmLatencyMs: 0,
    ttsLatencyMs: 0,
    totalLatencyMs: 0,
  };

  const sttProvider = createSTTProvider();
  const llmProvider = createLLMProvider();
  const ttsProvider = createTTSProvider();

  console.log(`\n--- [Pipeline] New Turn for ${uid} (language: ${language}) ---`);
  console.log(`Providers: STT=${sttProvider.name} | LLM=${llmProvider.name} | TTS=${ttsProvider.name}`);

  let transcript = (textQuery || '').trim();
  let detectedLang = language;
  let sttUsedName = sttProvider.name;
  let isMockResponse = false;

  // 1. Speech-to-Text
  if (!transcript && audioBuffer && audioBuffer.length > 0) {
    const sttStart = Date.now();
    const sttRes = await sttProvider.transcribe(audioBuffer, mimeType || 'audio/m4a', language);
    metrics.sttLatencyMs = Date.now() - sttStart;
    transcript = sttRes.text.trim();
    if (sttRes.language) detectedLang = sttRes.language;
    sttUsedName = sttRes.provider || sttProvider.name;
    if (sttRes.isMock) isMockResponse = true;
    console.log(`[Pipeline] Transcribed in ${metrics.sttLatencyMs}ms: "${transcript}" (language: ${detectedLang})`);
  }

  // Handle empty or unintelligible speech
  if (!transcript || transcript === '[unintelligible]') {
    const errorAnswers: Record<string, string> = {
      'kn-IN': 'ಧ್ವನಿ ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮೈಕ್ರೊಫೋನ್ ಬಟನ್ ಒತ್ತಿ ಹಿಡಿದು ಮತ್ತೆ ಮಾತನಾಡಿ.',
      kn: 'ಧ್ವನಿ ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮೈಕ್ರೊಫೋನ್ ಬಟನ್ ಒತ್ತಿ ಹಿಡಿದು ಮತ್ತೆ ಮಾತನಾಡಿ.',
      'hi-IN': 'आवाज साफ सुनाई नहीं दी। कृपया माइक्रोफोन दबाकर फिर से बोलें।',
      hi: 'आवाज साफ सुनाई नहीं दी। कृपया माइक्रोफोन दबाकर फिर से बोलें।',
      'en-IN': 'Could not clearly detect speech. Please press and hold the microphone to ask your question again.',
      en: 'Could not clearly detect speech. Please press and hold the microphone to ask your question again.',
    };
    const answerText = errorAnswers[detectedLang] || errorAnswers['en-IN'];

    const ttsStart = Date.now();
    const ttsRes = await ttsProvider.synthesize(answerText, detectedLang);
    metrics.ttsLatencyMs = Date.now() - ttsStart;
    metrics.totalLatencyMs = Date.now() - startTime;

    return {
      success: true,
      transcript: '[unintelligible]',
      answerText,
      audioBase64: ttsRes.audioBase64,
      audioMimeType: ttsRes.mimeType,
      onDeviceFallback: ttsRes.onDeviceFallback,
      citations: [],
      language: detectedLang,
      metrics,
      needsHumanSupport: false,
      providers: {
        stt: sttUsedName,
        llm: llmProvider.name,
        tts: ttsProvider.name,
      },
      isMock: isMockResponse,
    };
  }

  // 2. Fetch Beekeeper Context (Parallelized with RAG)
  const ctxStart = Date.now();
  const ragStart = Date.now();

  const [beekeeperContext, relevantChunks] = await Promise.all([
    fetchBeekeeperContext(uid).catch((err) => {
      console.warn(`[Pipeline] Context fetch non-fatal notice: ${err.message}`);
      return null;
    }),
    retrieveRelevantChunks(transcript).catch((err) => {
      console.warn(`[Pipeline] RAG retrieval non-fatal notice: ${err.message}`);
      return [];
    }),
  ]);

  metrics.userContextLatencyMs = Date.now() - ctxStart;
  metrics.ragLatencyMs = Date.now() - ragStart;
  console.log(`[Pipeline] Context fetched (${metrics.userContextLatencyMs}ms) & RAG retrieved ${relevantChunks.length} chunks (${metrics.ragLatencyMs}ms)`);

  // 3. Grounded LLM Answering in the Detected Language
  const llmStart = Date.now();
  const llmAnswer = await llmProvider.generateAnswer({
    question: transcript,
    language: detectedLang,
    beekeeperContext,
    retrievedKnowledge: relevantChunks.map((r) => r.chunk),
  });
  metrics.llmLatencyMs = Date.now() - llmStart;
  if (llmAnswer.isMock) isMockResponse = true;
  console.log(`[Pipeline] LLM answered in ${metrics.llmLatencyMs}ms: "${llmAnswer.text}"`);

  // 4. Edge Text-to-Speech Synthesis
  const ttsStart = Date.now();
  const ttsRes = await ttsProvider.synthesize(llmAnswer.text, detectedLang);
  metrics.ttsLatencyMs = Date.now() - ttsStart;
  if (ttsRes.isMock) isMockResponse = true;
  console.log(`[Pipeline] TTS generated ${ttsRes.audioBase64 ? `${ttsRes.audioBase64.length} base64 chars` : 'fallback mode'} in ${metrics.ttsLatencyMs}ms`);

  metrics.totalLatencyMs = Date.now() - startTime;
  console.log(`--- [Pipeline] Turn completed in ${metrics.totalLatencyMs}ms ---\n`);

  // 5. Asynchronous Turn Logging to Firestore
  logVoiceTurn({
    uid,
    transcript,
    answerText: llmAnswer.text,
    language: detectedLang,
    citations: llmAnswer.citations,
    metrics,
    success: true,
    needsHumanSupport: llmAnswer.needsEscalation,
  }).catch((err) => console.warn('[Pipeline] Logger notice:', err.message));

  return {
    success: true,
    transcript,
    answerText: llmAnswer.text,
    audioBase64: ttsRes.audioBase64,
    audioMimeType: ttsRes.mimeType,
    onDeviceFallback: ttsRes.onDeviceFallback,
    citations: llmAnswer.citations,
    language: detectedLang,
    metrics,
    needsHumanSupport: llmAnswer.needsEscalation,
    providers: {
      stt: sttUsedName,
      llm: llmAnswer.provider || llmProvider.name,
      tts: ttsRes.provider || ttsProvider.name,
    },
    isMock: isMockResponse,
    mockReason: isMockResponse ? 'ALLOW_MOCK was active or API keys unconfigured' : undefined,
  };
}
