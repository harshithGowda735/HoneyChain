import { Groq, toFile } from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { STTResult, SupportedLanguage } from '../types';

export interface ISTTProvider {
  name: string;
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    languageHint?: SupportedLanguage
  ): Promise<STTResult>;
}

/**
 * Groq Whisper STT Provider (Primary)
 * Uses Groq's high-speed, free-tier Whisper (whisper-large-v3).
 * Supports automatic language detection as well as ISO hints (kn, hi, en).
 */
export class GroqSTTProvider implements ISTTProvider {
  name = 'Groq-Whisper-large-v3';
  private client: Groq | null = null;

  constructor() {
    if (config.groqApiKey) {
      this.client = new Groq({ apiKey: config.groqApiKey });
    }
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    languageHint?: SupportedLanguage
  ): Promise<STTResult> {
    if (!this.client) {
      throw new Error('Groq API key not configured for Speech-to-Text.');
    }
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Empty audio buffer received.');
    }

    // Clean mime type
    let cleanMime = mimeType || 'audio/m4a';
    if (cleanMime.includes(';')) cleanMime = cleanMime.split(';')[0].trim();
    if (cleanMime === 'audio/x-m4a') cleanMime = 'audio/m4a';

    const filename = cleanMime.endsWith('wav') ? 'audio.wav' : 'audio.m4a';
    const file = await toFile(audioBuffer, filename, { type: cleanMime });

    // Extract 2-letter ISO language code for Whisper hint
    let isoLang: string | undefined = undefined;
    if (languageHint) {
      if (languageHint.startsWith('kn')) isoLang = 'kn';
      else if (languageHint.startsWith('hi')) isoLang = 'hi';
      else if (languageHint.startsWith('en')) isoLang = 'en';
    }

    const transcription = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3',
      language: isoLang,
      response_format: 'verbose_json',
      temperature: 0.0,
    });

    const rawText = transcription.text ? transcription.text.trim() : '';
    const detectedLang = (transcription as any).language || isoLang || 'en';

    // Map detected code back to SupportedLanguage
    let finalLang: SupportedLanguage = 'en-IN';
    if (detectedLang.startsWith('kn')) finalLang = 'kn-IN';
    else if (detectedLang.startsWith('hi')) finalLang = 'hi-IN';
    else if (detectedLang.startsWith('en')) finalLang = 'en-IN';

    return {
      text: rawText || '[unintelligible]',
      language: finalLang,
      provider: this.name,
      isMock: false,
    };
  }
}

/**
 * Gemini Multimodal STT Provider (Fallback)
 * Uses Gemini's native audio comprehension to transcribe Kannada, Hindi, and English.
 */
export class GeminiSTTProvider implements ISTTProvider {
  name = 'Gemini-Multimodal-STT';
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      this.client = new GoogleGenerativeAI(config.geminiApiKey);
    }
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    languageHint: SupportedLanguage = 'en-IN'
  ): Promise<STTResult> {
    if (!this.client) {
      throw new Error('Gemini API key not configured for Speech-to-Text.');
    }
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('Empty audio buffer received.');
    }

    const model = this.client.getGenerativeModel({ model: config.geminiModel });

    const langNameMap: Record<string, string> = {
      'kn-IN': 'Kannada (ಕನ್ನಡ)',
      kn: 'Kannada (ಕನ್ನಡ)',
      'hi-IN': 'Hindi (हिन्दी)',
      hi: 'Hindi (हिन्दी)',
      'en-IN': 'Indian English',
      en: 'English',
    };
    const targetLangName = langNameMap[languageHint] || 'the spoken language (Kannada, Hindi, or English)';

    let cleanMime = mimeType || 'audio/m4a';
    if (cleanMime.includes(';')) cleanMime = cleanMime.split(';')[0].trim();
    if (cleanMime === 'audio/x-m4a') cleanMime = 'audio/m4a';

    const base64Audio = audioBuffer.toString('base64');

    const prompt = `You are a high-precision Speech-to-Text transcription engine for Indian farmers and beekeepers.
The audio is spoken in ${targetLangName}.
Task: Transcribe the spoken speech verbatim into text.
Rules:
1. If spoken in Kannada, transcribe in authentic Kannada script (ಕನ್ನಡ ಲಿಪಿ).
2. If spoken in Hindi, transcribe in authentic Devanagari script (देवनागरी).
3. If spoken in English, transcribe in English.
4. Output strictly the transcribed spoken words.
5. Do NOT add preamble, commentary, translations, quotes, or notes.
6. If the audio is empty, silence, or unintelligible noise, output exactly: [unintelligible]`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: cleanMime,
          data: base64Audio,
        },
      },
    ]);

    const transcript = result.response.text().trim();
    return {
      text: transcript || '[unintelligible]',
      language: languageHint,
      provider: this.name,
      isMock: false,
    };
  }
}

/**
 * Local Fallback / Test STT Provider
 * Only active when ALLOW_MOCK=true and real providers fail
 */
export class LocalFallbackSTTProvider implements ISTTProvider {
  name = 'Local-Mock-STT';

  async transcribe(
    audioBuffer: Buffer,
    _mimeType: string,
    languageHint: SupportedLanguage = 'en-IN'
  ): Promise<STTResult> {
    if (!audioBuffer || audioBuffer.length < 50) {
      return { text: '[unintelligible]', language: languageHint, provider: this.name, isMock: true };
    }

    let text = 'What is the current weight and status of my hives?';
    if (languageHint.startsWith('kn')) {
      text = 'ನನ್ನ ಪೆಟ್ಟಿಗೆಯ ತೂಕ ಮತ್ತು ಸ್ಥಿತಿ ಹೇಗಿದೆ?';
    } else if (languageHint.startsWith('hi')) {
      text = 'मेरे बक्से का वर्तमान वजन और स्थिति क्या है?';
    }

    return {
      text,
      language: languageHint,
      provider: this.name,
      isMock: true,
    };
  }
}

/**
 * Resilient Factory with Automatic Failover:
 * 1. Primary: Groq Whisper (if configured)
 * 2. Fallback: Gemini Multimodal STT (if configured)
 * 3. Mock fallback: Local STT (only if ALLOW_MOCK=true)
 */
export class ResilientSTTProvider implements ISTTProvider {
  name = 'Resilient-STT';

  private groqProvider: GroqSTTProvider | null = null;
  private geminiProvider: GeminiSTTProvider | null = null;
  private mockProvider: LocalFallbackSTTProvider | null = null;

  constructor() {
    if (config.groqApiKey) this.groqProvider = new GroqSTTProvider();
    if (config.geminiApiKey) this.geminiProvider = new GeminiSTTProvider();
    if (config.allowMock) this.mockProvider = new LocalFallbackSTTProvider();
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    languageHint?: SupportedLanguage
  ): Promise<STTResult> {
    // 1. Try Groq Whisper
    if (this.groqProvider) {
      try {
        console.log('[STT] Transcribing audio with Groq (whisper-large-v3)...');
        const res = await this.groqProvider.transcribe(audioBuffer, mimeType, languageHint);
        return res;
      } catch (groqErr: any) {
        console.warn(`[STT] Groq transcription error (${groqErr?.message || groqErr}). Falling back to Gemini...`);
      }
    }

    // 2. Try Gemini STT
    if (this.geminiProvider) {
      try {
        console.log('[STT] Transcribing audio with Gemini fallback...');
        const res = await this.geminiProvider.transcribe(audioBuffer, mimeType, languageHint);
        return res;
      } catch (geminiErr: any) {
        console.warn(`[STT] Gemini transcription error (${geminiErr?.message || geminiErr}).`);
      }
    }

    // 3. Mock fallback (only if enabled)
    if (this.mockProvider && config.allowMock) {
      console.warn('[STT] Both Groq and Gemini failed/unconfigured. Using Local Mock STT (ALLOW_MOCK=true).');
      return await this.mockProvider.transcribe(audioBuffer, mimeType, languageHint);
    }

    throw new Error(
      'Speech-to-Text failed: Groq and Gemini services are unavailable or unconfigured. Please check GROQ_API_KEY or GEMINI_API_KEY in server/.env.'
    );
  }
}

export function createSTTProvider(): ISTTProvider {
  return new ResilientSTTProvider();
}
