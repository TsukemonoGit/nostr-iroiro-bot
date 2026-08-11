import { readFileSync, writeFileSync } from "fs";
import { excludedUrl, isMediaUrl } from "./excluded-domains.mjs";
import { EXCLUDED_PUBKEYS } from "./excluded-pubkeys.mjs";

const urlRe = /https?:\/\/[^\s<>"')\]]+/;

const lines = readFileSync(process.argv[2], "utf8").trim().split("\n");
const out = [];
const seen = new Set();
let excludedCount = 0;
for (const l of lines) {
  const e = JSON.parse(l);
  if (seen.has(e.id)) continue;
  if (EXCLUDED_PUBKEYS.has(e.pubkey.slice(0, 12))) {
    excludedCount++;
    continue;
  }
  const urls = e.content.match(urlRe) || [];
  if (urls.length === 0) continue;
  const goodUrls = urls.filter((u) => !excludedUrl(u) && !isMediaUrl(u));
  if (goodUrls.length === 0) {
    excludedCount++;
    continue;
  }
  seen.add(e.id);
  out.push(e);
}
out.sort((a, b) => b.created_at - a.created_at);
writeFileSync(process.argv[3], out.map(JSON.stringify).join("\n") + "\n");
console.log(
  `original: ${lines.length}, excluded: ${excludedCount}, kept: ${out.length}`,
);
