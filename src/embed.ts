import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { Chunk } from "./chunker";

export interface VectorChunk extends Chunk {
  embedding: number[];
}

const client = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

async function main() {
  const chunksPath = path.resolve(__dirname, "../data/chunks.json");
  const outputPath = path.resolve(__dirname, "../data/vector_store.json");

  console.log(`📖 Reading chunks from: ${chunksPath}`);
  const rawData = fs.readFileSync(chunksPath, "utf-8");
  const chunks: Chunk[] = JSON.parse(rawData);

  console.log(
    `⚡ Generating embeddings for ${chunks.length} chunks via nomic-embed-text...`,
  );

  const vectorStore: VectorChunk[] = [];
  const startTime = Date.now();
  const BATCH_SIZE = 20;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);

    try {
      const response = await client.embeddings.create({
        model: "nomic-embed-text",
        input: texts,
      });

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]!;
        const embedding = response.data[j]?.embedding;
        if (embedding) {
          vectorStore.push({
            ...chunk,
            embedding,
          });
        }
      }
    } catch (err) {
      console.warn(
        `\nBatch at index ${i} failed, falling back to sequential embedding...`,
      );
      for (const chunk of batch) {
        const res = await client.embeddings.create({
          model: "nomic-embed-text",
          input: chunk.text,
        });
        const embedding = res.data[0]?.embedding;
        if (embedding) {
          vectorStore.push({ ...chunk, embedding });
        }
      }
    }

    const currentCount = Math.min(i + BATCH_SIZE, chunks.length);
    const pct = ((currentCount / chunks.length) * 100).toFixed(1);
    process.stdout.write(
      `\rProgress: [${currentCount}/${chunks.length}] (${pct}%) chunks embedded`,
    );
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n\n🎉 Successfully embedded all ${vectorStore.length} chunks in ${elapsed}s!`,
  );

  fs.writeFileSync(outputPath, JSON.stringify(vectorStore, null, 2), "utf-8");

  console.log(`Saved master vector store to: ${outputPath}`);
  console.log(
    `Vector dimensions: ${vectorStore[0]?.embedding.length} floats per chunk`,
  );
}

main().catch(console.error);
