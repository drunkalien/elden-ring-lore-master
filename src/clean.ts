import * as fs from "fs";
import * as path from "path";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}

function cleanLoreHtml(rawHtml: string): string {
  // 1. Extract the main wiki body content inside mw-parser-output
  const bodyStartMatch = rawHtml.match(
    /<div[^>]*class="[^"]*mw-parser-output[^"]*"[^>]*>/i,
  );
  let content = rawHtml;
  if (bodyStartMatch && bodyStartMatch.index !== undefined) {
    content = rawHtml.slice(bodyStartMatch.index);
  }

  // Cut off at the category cloud or footer
  const endMatch = content.match(
    /<div class="valnet-category-cloud"|<!--\s*Saved in parser cache/i,
  );
  if (endMatch && endMatch.index !== undefined) {
    content = content.slice(0, endMatch.index);
  }

  // 2. Remove script, style, noscript, and iframe tags
  content = content.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
  content = content.replace(
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    "",
  );
  content = content.replace(
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    "",
  );

  // 3. Convert headers to Markdown
  content = content.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n\n# $1\n\n");
  content = content.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n\n## $1\n\n");
  content = content.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n\n### $1\n\n");
  content = content.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n\n#### $1\n\n");

  // 4. Convert lists
  content = content.replace(/<li[^>]*>(.*?)<\/li>/gi, "\n- $1");

  // 5. Convert paragraphs and line breaks
  content = content.replace(/<p[^>]*>/gi, "\n\n");
  content = content.replace(/<\/p>/gi, "\n");
  content = content.replace(/<br\s*\/?>/gi, "\n");

  // 6. Strip all remaining HTML tags
  content = content.replace(/<[^>]+>/g, "");

  // 7. Decode HTML entities
  content = decodeHtmlEntities(content);

  // 8. Clean up whitespace
  const lines = content.split("\n").map((line) => line.trim());

  // Collapse multiple empty lines
  const cleanedLines: string[] = [];
  let prevEmpty = false;
  for (const line of lines) {
    if (!line) {
      if (!prevEmpty) {
        cleanedLines.push("");
        prevEmpty = true;
      }
    } else {
      cleanedLines.push(line);
      prevEmpty = false;
    }
  }

  return cleanedLines.join("\n").trim();
}

const inputPath = path.resolve(__dirname, "../wiki/elden_ring_lore.txt");
const outputPath = path.resolve(__dirname, "../wiki/cleaned_lore.md");

console.log(`Reading raw lore from: ${inputPath}`);
const rawHtml = fs.readFileSync(inputPath, "utf-8");

console.log("Cleaning HTML and formatting to Markdown...");
const cleaned = cleanLoreHtml(rawHtml);

fs.writeFileSync(outputPath, cleaned, "utf-8");

const rawWordCount = rawHtml.trim().split(/\s+/).length;
const cleanedWordCount = cleaned.trim().split(/\s+/).length;

console.log(`\nDone!`);
console.log(`Raw HTML word count: ${rawWordCount.toLocaleString()} words`);
console.log(
  `Cleaned Markdown word count: ${cleanedWordCount.toLocaleString()} words`,
);
console.log(`Saved clean lore to: ${outputPath}`);
