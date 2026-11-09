import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { chunkMarkdownFile } from './chunk';
import { createEmbeddingProvider } from '../providers/embeddings';
import { KnowledgeChunk } from '../types';

export async function ingestKnowledgeBase(): Promise<KnowledgeChunk[]> {
  console.log(`[RAG Ingest] Scanning knowledge directory: ${config.knowledgeDir}`);
  if (!fs.existsSync(config.knowledgeDir)) {
    throw new Error(`Knowledge directory not found: ${config.knowledgeDir}`);
  }

  const files = fs.readdirSync(config.knowledgeDir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    throw new Error(`No markdown files found in: ${config.knowledgeDir}`);
  }

  const allChunks: KnowledgeChunk[] = [];
  for (const file of files) {
    const fullPath = path.join(config.knowledgeDir, file);
    const fileChunks = chunkMarkdownFile(fullPath);
    console.log(`[RAG Ingest] Chunked ${file}: ${fileChunks.length} sections`);
    allChunks.push(...fileChunks);
  }

  console.log(`[RAG Ingest] Total chunks to embed: ${allChunks.length}`);
  const embeddingProvider = createEmbeddingProvider();
  console.log(`[RAG Ingest] Using embedding provider: ${embeddingProvider.name}`);

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const textToEmbed = `${chunk.title}\n${chunk.content}`;
    try {
      chunk.embedding = await embeddingProvider.embedText(textToEmbed);
    } catch (err: any) {
      console.warn(`[RAG Ingest] Failed to embed chunk ${chunk.id}: ${err.message}`);
    }
  }

  // Save to index
  fs.writeFileSync(config.vectorIndexPath, JSON.stringify(allChunks, null, 2), 'utf-8');
  console.log(`[RAG Ingest] Successfully indexed ${allChunks.length} chunks to: ${config.vectorIndexPath}`);
  return allChunks;
}

// Allow direct CLI execution: ts-node src/rag/ingest.ts
if (require.main === module) {
  ingestKnowledgeBase()
    .then((chunks) => {
      console.log(`✅ Knowledge base ingestion complete. (${chunks.length} chunks)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Ingestion failed:', err);
      process.exit(1);
    });
}

