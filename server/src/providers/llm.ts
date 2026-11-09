import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { BeekeeperContext, KnowledgeChunk, LLMAnswer, SupportedLanguage } from '../types';

export interface ILLMProvider {
  name: string;
  generateAnswer(params: {
    question: string;
    language: SupportedLanguage;
    beekeeperContext: BeekeeperContext | null;
    retrievedKnowledge: KnowledgeChunk[];
  }): Promise<LLMAnswer>;
}

export class GeminiLLMProvider implements ILLMProvider {
  name = 'Gemini-Grounded-LLM';
  private client: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.geminiApiKey) {
      this.client = new GoogleGenerativeAI(config.geminiApiKey);
    }
  }

  async generateAnswer({
    question,
    language,
    beekeeperContext,
    retrievedKnowledge,
  }: {
    question: string;
    language: SupportedLanguage;
    beekeeperContext: BeekeeperContext | null;
    retrievedKnowledge: KnowledgeChunk[];
  }): Promise<LLMAnswer> {
    if (!this.client) {
      throw new Error('Gemini API key not configured for LLM answering. Add GEMINI_API_KEY in server/.env.');
    }

    const model = this.client.getGenerativeModel({ model: config.geminiModel });

    // Format Knowledge context
    const knowledgeText = retrievedKnowledge.length > 0
      ? retrievedKnowledge
          .map((k, idx) => `[Doc ${idx + 1}: ${k.title}] (${k.id})\n${k.content}`)
          .join('\n\n')
      : 'NO RETRIEVED KNOWLEDGE BASE ARTICLES AVAILABLE.';

    // Format Beekeeper Hive Context
    let userContextText = 'Beekeeper not logged in or no profile provided.';
    if (beekeeperContext) {
      const hivesList = beekeeperContext.hives.length > 0
        ? beekeeperContext.hives.map(h =>
            `- Hive "${h.name}" (ID: ${h.id}): Status: ${h.status}, Weight: ${h.weight != null ? `${h.weight} kg` : 'Unavailable'}, Temp: ${h.temperature != null ? `${h.temperature}°C` : 'Unavailable'}, Humidity: ${h.humidity != null ? `${h.humidity}%` : 'Unavailable'}, Sensor: ${h.sensorStatus || 'Not linked'}`
          ).join('\n')
        : 'Zero hives registered yet.';

      userContextText = `
Beekeeper Name: ${beekeeperContext.displayName}
Apiary: ${beekeeperContext.apiaryName || 'Cauvery Honey Farm'}
Region: ${beekeeperContext.district ? `${beekeeperContext.district}, ` : ''}${beekeeperContext.state || 'Karnataka'}
Registered Hives Count: ${beekeeperContext.hivesCount}
Hives Details:
${hivesList}
Total Honey Harvested: ${beekeeperContext.totalHarvestKg} kg
Recent Batches: ${beekeeperContext.recentBatches.length > 0 ? beekeeperContext.recentBatches.map(b => `${b.batchCode} (${b.honeyType}, ${b.quantity} kg)`).join(', ') : 'None'}`;
    }

    const langNameMap: Record<string, string> = {
      'kn-IN': 'Kannada (ಕನ್ನಡ)',
      kn: 'Kannada (ಕನ್ನಡ)',
      'hi-IN': 'Hindi (हिन्दी)',
      hi: 'Hindi (हिन्दी)',
      'en-IN': 'Indian English',
      en: 'English',
    };
    const targetLang = langNameMap[language] || 'the language of the user question';

    const systemPrompt = `You are "Talk to HoneyChain", the friendly, expert AI voice support assistant for HoneyChain, helping rural Indian beekeepers.

LANGUAGE REQUIREMENT:
- You MUST respond in the EXACT same language as the user: ${targetLang}.
- If the question is in Kannada, respond in authentic, spoken Kannada (ಕನ್ನಡ ಲಿಪಿ).
- If the question is in Hindi, respond in polite, clear Hindi (देवनागरी लिपि).
- If in English, respond in simple, natural Indian English.

SPOKEN-STYLE RULES (CRITICAL FOR AUDIO PLAYBACK):
1. Keep the answer SHORT (2 to 3 sentences maximum). The user is listening through a mobile phone speaker.
2. DO NOT use ANY markdown formatting (NO asterisks *, NO hashes #, NO underscores _, NO backticks \`).
3. DO NOT use bullet points (NO bullets •, NO dash lists -, NO numbered lists 1., 2.).
4. DO NOT include any URLs, web links, or citations inside the spoken text.
5. Speak directly and warmly, as if talking over a telephone call.

STRICT GROUNDING & SAFETY:
1. Ground your answer strictly in the RETRIEVED KNOWLEDGE and BEEKEEPER HIVE DATA sections below.
2. For hive weights, telemetry, or harvests, use ONLY the beekeeper's actual data. If sensor weight is unavailable, say it has not reported yet. Never fabricate telemetry.
3. If asked about chemical pesticides, advise consulting a local KVK or agricultural extension officer. Never prescribe unverified chemical dosages.
4. If the question cannot be answered from the provided knowledge, politely say the information is not in HoneyChain records and offer human specialist help. Mark with [NEEDS_ESCALATION].

RETRIEVED KNOWLEDGE:
${knowledgeText}

BEEKEEPER HIVE DATA:
${userContextText}
`;

    const userPrompt = `Beekeeper Question: "${question}"

Generate the grounded spoken answer in ${targetLang}:`;

    console.log(`[LLM] Generating answer using ${config.geminiModel} in ${targetLang}...`);
    const result = await model.generateContent([
      { text: systemPrompt },
      { text: userPrompt },
    ]);

    let responseText = result.response.text().trim();
    const needsEscalation =
      responseText.includes('[NEEDS_ESCALATION]') ||
      responseText.toLowerCase().includes('not available in the current knowledge') ||
      responseText.includes('ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ') ||
      responseText.includes('जानकारी उपलब्ध नहीं');

    // Clean any tags and ensure no markdown characters remain
    responseText = responseText
      .replace(/\[NEEDS_ESCALATION\]/g, '')
      .replace(/[*_#`~[\](){}<>|\\]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const citations = retrievedKnowledge.map(k => `${k.title} (${k.id})`);

    return {
      text: responseText,
      isGrounded: true,
      needsEscalation,
      citations,
      provider: this.name,
      isMock: false,
    };
  }
}

/**
 * Local Fallback LLM Provider for offline / mock testing
 * Only active when ALLOW_MOCK=true
 */
export class LocalFallbackLLMProvider implements ILLMProvider {
  name = 'Local-Mock-LLM';

  async generateAnswer({
    question,
    language,
    beekeeperContext,
    retrievedKnowledge,
  }: {
    question: string;
    language: SupportedLanguage;
    beekeeperContext: BeekeeperContext | null;
    retrievedKnowledge: KnowledgeChunk[];
  }): Promise<LLMAnswer> {
    const isKn = language.startsWith('kn');
    const isHi = language.startsWith('hi');

    let text = '';
    const citations = retrievedKnowledge.slice(0, 2).map(k => `${k.title} (${k.id})`);

    if (question.toLowerCase().includes('weight') || question.includes('ತೂಕ') || question.includes('वजन')) {
      const hiveCount = beekeeperContext?.hivesCount ?? 0;
      const firstHive = beekeeperContext?.hives[0];
      const weightStr = firstHive?.weight ? `${firstHive.weight} kg` : 'unavailable';

      if (isKn) {
        text = `ನಿಮ್ಮ ಜೇನುತೋಟದಲ್ಲಿ ${hiveCount} ಪೆಟ್ಟಿಗೆಗಳು ನೋಂದಾಯಿತವಾಗಿವೆ. ಮೊದಲ ಪೆಟ್ಟಿಗೆಯ ತೂಕ ${weightStr} ಆಗಿದೆ.`;
      } else if (isHi) {
        text = `आपकी मधुमक्खीशाला में ${hiveCount} बक्से पंजीकृत हैं। पहले बक्से का वजन ${weightStr} है।`;
      } else {
        text = `You have ${hiveCount} registered hive. The latest measured weight for your primary hive is ${weightStr}.`;
      }
    } else {
      if (isKn) {
        text = `ಹನಿಚೈನ್ ಸಹಾಯವಾಣಿಗೆ ಸುಸ್ವಾಗತ. ಜೇನು ಪೆಟ್ಟಿಗೆ, ತೂಕದ ಸೆನ್ಸಾರ್, ಅಥವಾ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಕುರಿತು ನೀವು ಪ್ರಶ್ನೆ ಕೇಳಬಹುದು.`;
      } else if (isHi) {
        text = `हनीचेन वॉयस सपोर्ट में आपका स्वागत है। आप अपने बक्से, सेंसर, या योजनाओं के बारे में पूछ सकते हैं।`;
      } else {
        text = `Welcome to HoneyChain Voice Support. You can ask about your hive weights, harvest tracking, or government apiculture schemes.`;
      }
    }

    return {
      text,
      isGrounded: true,
      needsEscalation: false,
      citations,
      provider: this.name,
      isMock: true,
    };
  }
}

export function createLLMProvider(): ILLMProvider {
  if (config.geminiApiKey) {
    return new GeminiLLMProvider();
  }
  if (config.allowMock) {
    return new LocalFallbackLLMProvider();
  }
  throw new Error('LLM Provider unavailable: GEMINI_API_KEY is not set in server/.env.');
}
