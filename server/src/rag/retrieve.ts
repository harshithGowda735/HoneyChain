import fs from 'fs';
import { config } from '../config';
import { KnowledgeChunk, RetrievalResult } from '../types';
import { createEmbeddingProvider, cosineSimilarity } from '../providers/embeddings';
import { ingestKnowledgeBase } from './ingest';

let cachedIndex: KnowledgeChunk[] | null = null;

export async function loadKnowledgeIndex(): Promise<KnowledgeChunk[]> {
  if (cachedIndex) return cachedIndex;

  if (!fs.existsSync(config.vectorIndexPath)) {
    console.log('[RAG Retrieve] Index file not found, triggering initial ingestion...');
    cachedIndex = await ingestKnowledgeBase();
    return cachedIndex;
  }

  try {
    const raw = fs.readFileSync(config.vectorIndexPath, 'utf-8');
    cachedIndex = JSON.parse(raw);
    console.log(`[RAG Retrieve] Loaded ${cachedIndex?.length} chunks from cache index.`);
    return cachedIndex || [];
  } catch (err: any) {
    console.warn('[RAG Retrieve] Failed loading cached index, re-ingesting:', err.message);
    cachedIndex = await ingestKnowledgeBase();
    return cachedIndex;
  }
}

export async function retrieveRelevantChunks(
  query: string,
  topK = config.topKRetrieval
): Promise<RetrievalResult[]> {
  const index = await loadKnowledgeIndex();
  if (index.length === 0) {
    return [];
  }

  const embeddingProvider = createEmbeddingProvider();
  const queryEmbedding = await embeddingProvider.embedText(query);

  const scored: RetrievalResult[] = [];
  for (const chunk of index) {
    if (chunk.embedding && chunk.embedding.length > 0) {
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      scored.push({ chunk, score });
    }
  }

  // Sort descending by similarity
  scored.sort((a, b) => b.score - a.score);

  const topResults = scored.slice(0, topK);
  return topResults;
}

