import { readFileSync, writeFileSync } from "fs";

const fetchSrc = readFileSync(new URL("./fetch-batch.mjs", import.meta.url), "utf8");
const block = fetchSrc.slice(fetchSrc.indexOf("const EXCLUDED_PUBKEYS"), fetchSrc.indexOf("];"));
const excluded = new Set([...block.matchAll(/"([0-9a-f]{12})"/g)].map((m) => m[1]));

const urlRe = /https?:\/\/[^\s<>"')\]]+/;

const lines = readFileSync(process.argv[2], "utf8").trim().split("\n");
const out = [];
const seen = new Set();
let excludedCount = 0;
for (const l of lines) {
  const e = JSON.parse(l);
  if (seen.has(e.id)) continue;
  if (excluded.has(e.pubkey.slice(0, 12))) { excludedCount++; continue; }
  if (!urlRe.test(e.content)) continue;
  seen.add(e.id);
  out.push(e);
}
out.sort((a, b) => b.created_at - a.created_at);
writeFileSync(process.argv[3], out.map(JSON.stringify).join("\n") + "\n");
console.log(`original: ${lines.length}, excluded: ${excludedCount}, kept: ${out.length}`);
