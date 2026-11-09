import fs from 'fs';
import path from 'path';
import { KnowledgeChunk } from '../types';

/**
 * Splits markdown documents into semantic section chunks based on headers.
 */
export function chunkMarkdownFile(filePath: string): KnowledgeChunk[] {
  const fileName = path.basename(filePath, path.extname(filePath));
  const rawText = fs.readFileSync(filePath, 'utf-8');

  const lines = rawText.split('\n');
  const chunks: KnowledgeChunk[] = [];

  let currentTitle = fileName.replace(/-/g, ' ');
  let currentContentLines: string[] = [];
  let sectionIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isH1 = line.startsWith('# ');
    const isH2 = line.startsWith('## ');

    if (isH1 || isH2) {
      if (currentContentLines.length > 0) {
        const text = currentContentLines.join('\n').trim();
        if (text.length > 30) {
          chunks.push({
            id: `${fileName}_sec_${sectionIndex}`,
            docId: fileName,
            title: currentTitle,
            content: text,
          });
          sectionIndex++;
        }
        currentContentLines = [];
      }
      currentTitle = line.replace(/^#+\s*/, '').trim();
    } else {
      currentContentLines.push(line);
    }
  }

  if (currentContentLines.length > 0) {
    const text = currentContentLines.join('\n').trim();
    if (text.length > 30) {
      chunks.push({
        id: `${fileName}_sec_${sectionIndex}`,
        docId: fileName,
        title: currentTitle,
        content: text,
      });
    }
  }

  return chunks;
}

