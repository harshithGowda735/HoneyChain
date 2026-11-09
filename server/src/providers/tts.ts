import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { SupportedLanguage, TTSResult } from '../types';

export interface ITTSProvider {
  name: string;
  synthesize(text: string, language: SupportedLanguage): Promise<TTSResult>;
}

/**
 * Microsoft Edge TTS Provider (Free, High Quality Neural Voices)
 * Kannada: kn-IN-SapnaNeural
 * Hindi:   hi-IN-SwaraNeural
 * English: en-IN-NeerjaNeural
 */
export class EdgeTTSProvider implements ITTSProvider {
  name = 'Microsoft-Edge-TTS';

  private voiceMap: Record<string, string> = {
    'kn-IN': 'kn-IN-SapnaNeural',
    kn: 'kn-IN-SapnaNeural',
    'hi-IN': 'hi-IN-SwaraNeural',
    hi: 'hi-IN-SwaraNeural',
    'en-IN': 'en-IN-NeerjaNeural',
    en: 'en-IN-NeerjaNeural',
  };

  async synthesize(text: string, language: SupportedLanguage): Promise<TTSResult> {
    const voice = this.voiceMap[language] || 'en-IN-NeerjaNeural';

    // 1. Clean markdown, symbols, asterisks, URLs and bullet symbols for natural spoken speech
    const spokenText = this.cleanTextForSpeech(text);
    if (!spokenText) {
      return {
        audioBase64: '',
        mimeType: 'audio/mpeg',
        provider: this.name,
        onDeviceFallback: true,
      };
    }

    try {
      console.log(`[TTS] Synthesizing speech with ${voice} (${spokenText.length} chars)...`);
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

      const audioBuffer = await this.synthesizeToBuffer(tts, spokenText, 6000);

      if (audioBuffer && audioBuffer.length > 200) {
        return {
          audioBase64: audioBuffer.toString('base64'),
          mimeType: 'audio/mpeg',
          provider: this.name,
          onDeviceFallback: false,
          isMock: false,
        };
      }
      throw new Error('Received empty audio stream from Edge TTS.');
    } catch (err: any) {
      console.warn(`[TTS] Edge TTS notice (${err?.message || err}). Falling back to on-device speech.`);
      return {
        audioBase64: '',
        mimeType: 'audio/mpeg',
        provider: this.name,
        onDeviceFallback: true,
        isMock: false,
      };
    }
  }

  /**
   * Cleans text to produce natural spoken narration.
   * Removes markdown headers, asterisks, brackets, URLs, and bullet symbols.
   */
  private cleanTextForSpeech(raw: string): string {
    return raw
      .replace(/https?:\/\/\S+/g, '') // remove URLs
      .replace(/[*_#`~\[\](){}<>|\\]/g, '') // remove markdown symbols
      .replace(/[•–—]/g, ' ') // remove bullets and dashes
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Streams audio chunks into a complete Buffer with timeout safeguard.
   */
  private synthesizeToBuffer(tts: MsEdgeTTS, text: string, timeoutMs: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const chunks: Buffer[] = [];

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          reject(new Error(`Edge TTS timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      try {
        const { audioStream } = tts.toStream(text);

        audioStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        audioStream.on('end', () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            resolve(Buffer.concat(chunks));
          }
        });

        audioStream.on('error', (err: any) => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            reject(err);
          }
        });
      } catch (err) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          reject(err);
        }
      }
    });
  }
}

export function createTTSProvider(): ITTSProvider {
  return new EdgeTTSProvider();
}
