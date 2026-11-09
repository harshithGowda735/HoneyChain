import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

export interface IEmbeddingProvider {
  name: string;
  embedText(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Deterministic Word-Hash Vector Provider (Offline & Resilient Fallback)
 * Generates normalized 256-dimensional semantic term vectors.
 * Ensures local testing and offline ingestion work smoothly without charges or rate limits.
 */
export class LocalEmbeddingProvider implements IEmbeddingProvider {
  name = 'Local-Term-Vector';
  private dimensions = 256;

  async embedText(text: string): Promise<number[]> {
    const vec = new Array(this.dimensions).fill(0);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

    for (const word of words) {
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = (hash << 5) - hash + word.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % this.dimensions;
      vec[index] += 1;
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vec[i] /= norm;
      }
    }
    return vec;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embedText(t)));
  }
}

/**
 * Gemini Embedding Provider with automatic fallback to LocalEmbeddingProvider
 */
export class GeminiEmbeddingProvider implements IEmbeddingProvider {
  name = 'Gemini-Embedding';
  private client: GoogleGenerativeAI | null = null;
  private fallback = new LocalEmbeddingProvider();

  constructor() {
    if (config.geminiApiKey) {
      this.client = new GoogleGenerativeAI(config.geminiApiKey);
    }
  }

  async embedText(text: string): Promise<number[]> {
    if (this.client) {
      try {
        const model = this.client.getGenerativeModel({ model: config.geminiEmbeddingModel });
        const result = await model.embedContent(text);
        if (result && result.embedding && result.embedding.values) {
          return result.embedding.values;
        }
      } catch (err: any) {
        // Fallback silently to fast local term vector
        return this.fallback.embedText(text);
      }
    }
    return this.fallback.embedText(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const emb = await this.embedText(text);
      results.push(emb);
    }
    return results;
  }
}

export function createEmbeddingProvider(): IEmbeddingProvider {
  if (config.geminiApiKey) {
    return new GeminiEmbeddingProvider();
  }
  return new LocalEmbeddingProvider();
}
