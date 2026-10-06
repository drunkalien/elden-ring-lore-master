import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { Chunk } from "./chunker.js";

const client = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

export interface VectorChunk extends Chunk {
  embedding: number[];
}

async function main() {
  const chunksPath = path.resolve(__dirname, "../data/chunks.json");
  const outputPath = path.resolve(__dirname, "../data/vector_store.json");

  console.log(`Reading chunks from: ${chunksPath}`);
  const rawData = fs.readFileSync(chunksPath, "utf-8");
  const chunks: Chunk[] = JSON.parse(rawData);

  console.log("generating embeddings for chunks...");

  const vectorsStore: VectorChunk[] = [];
  const startTime = Date.now();

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (!chunk) continue;
    const response = await client.embeddings.create({
      model: "nomic-embed-text",
      input: chunk.text,
    });
    const vector = response.data[0]?.embedding;
    vectorsStore.push({ ...chunk, embedding: vector! });
    process.stdout.write(
      `\rProgress: [${i + 1}/${chunks.length}] chunks embedded`,
    );
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(
    `\n🎉 Successfully embedded all ${chunks.length} chunks in ${elapsed}s!`,
  );

  fs.writeFileSync(outputPath, JSON.stringify(vectorsStore, null, 2), "utf-8");

  console.log(`💾 Saved local vector store to: ${outputPath}`);
  console.log(
    `📐 Vector dimensions: ${vectorsStore[0]?.embedding.length} floats per chunk`,
  );
}

main().catch(console.error);
