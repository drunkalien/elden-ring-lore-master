import path from "node:path";
import fs from "node:fs";

export interface Chunk {
  id: number;
  text: string;
  wordCount: number;
}

function getWords(): string[] {
  const fileWiki = path.resolve(__dirname, "../wiki/cleaned_lore.md");
  const fileCarian = path.resolve(__dirname, "../wiki/carian_lore.md");

  let content = "";
  if (fs.existsSync(fileWiki)) {
    content += fs.readFileSync(fileWiki, "utf-8") + "\n\n";
  }
  if (fs.existsSync(fileCarian)) {
    content += fs.readFileSync(fileCarian, "utf-8") + "\n\n";
  }

  return content.trim().split(/\s+/);
}

export function createChunks(
  chunkSize: number = 300,
  overlapSize: number = 50,
): Chunk[] {
  const words = getWords();
  const chunks: Chunk[] = [];
  const step = chunkSize - overlapSize;
  let id = 0;
  for (let i = 0; i < words.length; i += step) {
    const chunkWords = words.slice(i, i + chunkSize);
    if (chunkWords.length < 20 && chunks.length > 0) break;

    const chunkText = chunkWords.join(" ");
    const chunk: Chunk = {
      id: id++,
      text: chunkText,
      wordCount: chunkWords.length,
    };
    chunks.push(chunk);
  }
  return chunks;
}

if (require.main === module) {
  const chunks = createChunks(300, 50);
  const outDir = path.resolve(__dirname, "../data");

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, "chunks.json");
  fs.writeFileSync(outFile, JSON.stringify(chunks, null, 2), "utf-8");
  console.log(`✅ Generated ${chunks.length} chunks from full lore library!`);
  console.log(`Chunks written to: ${outFile}`);
}
