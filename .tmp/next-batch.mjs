import { readFileSync, readdirSync, existsSync } from "fs";

const dir = "batches";

const files = readdirSync(dir)
  .filter((f) => f.match(/^batch(\d+)-24h\.jsonl\.bak$/))
  .map((f) => Number(f.match(/^batch(\d+)-24h\.jsonl\.bak$/)[1]))
  .sort((a, b) => a - b);

if (files.length === 0) {
  console.error("batches/ に batchN-24h.jsonl.bak がありません。最初のバッチは手動で範囲を指定してください。");
  process.exit(1);
}

const lastN = files[files.length - 1];
const metaFile = `${dir}/batch${lastN}-24h.meta.json`;
if (!existsSync(metaFile)) {
  console.error(`missing ${metaFile} (batch${lastN} の範囲情報がありません)`);
  process.exit(1);
}
const meta = JSON.parse(readFileSync(metaFile, "utf8"));
const lastSince = meta.range.since;
const lastUntil = meta.range.until;

const nextN = lastN + 1;
const nextSince = lastSince - 86400;
const nextUntil = lastSince;

const iso = (u) => new Date(u * 1000).toISOString();

console.log(`既実施: batch1 〜 batch${lastN}`);
console.log(`  最新バッチ(batch${lastN}): ${iso(lastSince).slice(0,16)} ~ ${iso(lastUntil).slice(0,16)}`);
console.log("");
console.log(`次のバッチ: batch${nextN}`);
console.log(`  取得範囲: since=${nextSince} until=${nextUntil}  (${iso(nextSince).slice(0,16)} ~ ${iso(nextUntil).slice(0,16)} UTC)`);
console.log("");
console.log(`  実行例:`);
console.log(`    node fetch-batch.mjs ${nextSince} ${nextUntil} batches/batch${nextN}-24h.jsonl.bak`);
console.log(`    node re-filter.mjs batches/batch${nextN}-24h.jsonl.bak batches/batch${nextN}-24h.jsonl`);
console.log(`    node review.mjs batches/batch${nextN}-24h.jsonl review${nextN}.txt`);
