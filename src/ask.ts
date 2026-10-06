import fs from "node:fs";
import path from "node:path";
import { OpenAI } from "openai";
import { Chunk } from "./chunker";
import { VectorChunk } from "./embed";

interface ScoreChunk extends Chunk {
  score: number;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    throw new Error("Vectors must be of the same length and not null.");
  }
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i]!, 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecA.reduce((sum, b) => sum + b * b, 0));

  return dotProduct / (normA * normB);
}

(async function () {
  const question = process.argv.slice(2).join(" ");

  if (!question.length) {
    console.log("Enter a question.");
    return;
  }

  const client = new OpenAI({
    baseURL: "http://localhost:11434/v1",
    apiKey: "ollama",
  });

  const response = await client.embeddings.create({
    model: "nomic-embed-text",
    input: question,
  });

  const vector = response.data[0]?.embedding;

  if (!vector) {
    console.error("Failed to generate embedding for the question.");
    return;
  }

  const vectorStorePath = path.resolve(__dirname, "../data/vector_store.json");
  const vectorStoreFile = fs.readFileSync(vectorStorePath, "utf-8");
  const vectorStore: VectorChunk[] = JSON.parse(vectorStoreFile);
  const scores: ScoreChunk[] = [];

  for (const vectorChunk of vectorStore) {
    const similarity = cosineSimilarity(vectorChunk.embedding, vector);

    scores.push({ ...vectorChunk, score: similarity });
  }

  const contextChunks = scores.sort((a, b) => b.score - a.score).slice(0, 5);
  const contextText = contextChunks
    .map(
      (chunk, i) =>
        `[Source #${chunk.id} | Relevance: ${chunk.score.toFixed(3)}]:\n${chunk.text}`,
    )
    .join("\n\n---\n\n");

  console.log(`\n🔍 Found top ${contextChunks.length} relevant lore passages.`);
  console.log(`🤖 Generating answer using llama3.2...\n`);

  const chatResponse = await client.chat.completions.create({
    model: "llama3.2",
    messages: [
      {
        role: "system",
        content: `Thou art an ancient sage and keeper of lore within the Lands Between.
Thy tongue is steeped in solemn, archaic speech. Employ 'thou', 'thee', 'thy', 'thine', 'hath', and 'dost'. Address the traveler as 'Tarnished' or 'Seeker of the Throne'.
Thy sacred covenant:
1. Expound upon the traveler's inquiries using ONLY the truths etched into the provided CONTEXT PASSAGES.
2. Deliver thy counsel with cryptic gravity, sorrow, and reverence for the fallen world.
3. If the sacred texts speak not of the matter, reply solemnly: 'Alas, Tarnished... of this, the echoes of Grace tell no tale.'`,
      },
      {
        role: "user",
        content: `CONTEXT PASSAGES:\n${contextText}\n\nQUESTION:\n${question}`,
      },
    ],
    temperature: 0.5,
  });

  const answer = chatResponse.choices[0]?.message.content;

  console.log("=== LORE MASTER'S ANSWER ===");
  console.log(answer);
  console.log("\n============================");
  console.log("\n📚 Sources used:");
  for (const chunk of contextChunks) {
    console.log(
      `- Chunk #${chunk.id} (Similarity: ${(chunk.score * 100).toFixed(1)}%)`,
    );
  }
})();
