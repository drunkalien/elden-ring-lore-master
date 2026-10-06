import fs from "node:fs";
import path from "node:path";

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
}

function parseCarianArchive(rawHtml: string): string {
  // We want the lore-bearing sections
  const loreSections = new Set([
    "GoodsName.fmg",      // Key items, remembrances, Great Runes, crafting items
    "WeaponName.fmg",     // Weapons, staves, sacred seals
    "ProtectorName.fmg",  // Helmets, armor sets, cloaks
    "MagicName.fmg",      // Sorceries and incantations
    "AccessoryName.fmg",  // Talismans and rings
    "GemName.fmg",        // Ashes of War
    "TalkMsg.fmg",        // All NPC dialogues (Ranni, Melina, Gideon, Enia, etc.)
    "MovieSubtitle.fmg",  // Cutscene scripts
    "EventTextForTalk.fmg",
    "EventTextForMap.fmg",
  ]);

  // Split by <h2> headers
  const sectionRegex = /<h2>([^<]+)<\/h2>/gi;
  const sections: { name: string; content: string }[] = [];

  let match: RegExpExecArray | null;
  let lastIndex = 0;
  let lastName = "";

  while ((match = sectionRegex.exec(rawHtml)) !== null) {
    if (lastName) {
      sections.push({
        name: lastName,
        content: rawHtml.slice(lastIndex, match.index),
      });
    }
    lastName = match[1]?.trim() || "";
    lastIndex = match.index + match[0].length;
  }

  if (lastName) {
    sections.push({
      name: lastName,
      content: rawHtml.slice(lastIndex),
    });
  }

  const output: string[] = [
    "# Elden Ring Master Lore & Game Archives",
    "Comprehensive compilation of in-game item descriptions, remembrances, spells, armor, and NPC dialogues from the official game files.\n",
  ];

  for (const sec of sections) {
    if (!loreSections.has(sec.name)) {
      continue;
    }

    console.log(`Processing section: ${sec.name}...`);
    output.push(`\n## ${sec.name.replace(".fmg", "")}\n`);

    // Clean up content:
    let text = sec.content;

    // Convert <h3>Title [ID]</h3> to ### Title
    text = text.replace(/<h3>([^<\[]+)(?:\[\d+\])?<\/h3>/gi, (_, title) => {
      const cleanTitle = title.trim();
      return `\n\n### ${cleanTitle}\n`;
    });

    // Remove <h4> section numbers
    text = text.replace(/<h4>[^<]*<\/h4>/gi, "\n");

    // Convert <br /> to newlines
    text = text.replace(/<br\s*\/?>/gi, "\n");

    // Remove <p> tags, preserving content
    text = text.replace(/<p[^>]*>/gi, "\n");
    text = text.replace(/<\/p>/gi, "\n");

    // Remove dialogue ID markers like [1000] or [12000000]
    text = text.replace(/\[\d+\]\s*/g, "");

    // Strip remaining tags
    text = text.replace(/<[^>]+>/g, "");

    // Remove dummy text lines
    text = text.replace(/\(dummyText\)/gi, "");

    text = decodeHtml(text);

    // Clean up blank lines
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    output.push(lines.join("\n\n"));
  }

  return output.join("\n\n").trim();
}

async function main() {
  const inputPath = path.resolve(__dirname, "../wiki/carian_master.html");
  const outputPath = path.resolve(__dirname, "../wiki/carian_lore.md");

  console.log(`📖 Reading ${inputPath}...`);
  const rawHtml = fs.readFileSync(inputPath, "utf-8");

  console.log("⚡ Parsing Carian Archive into Markdown...");
  const markdown = parseCarianArchive(rawHtml);

  fs.writeFileSync(outputPath, markdown, "utf-8");

  const wordCount = markdown.trim().split(/\s+/).length;
  console.log(`\n🎉 Generated master lore file:`);
  console.log(`📁 File: ${outputPath}`);
  console.log(`📊 Word count: ${wordCount.toLocaleString()} words!`);
}

main().catch(console.error);
