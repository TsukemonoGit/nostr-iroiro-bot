import { readFileSync } from "fs";
import { nip19 } from "nostr-tools";
import { fmtUtc } from "./nostr-common.mjs";

// レビュー中に「これ既に収載してない？」を確認するためのスクリプト。
// 検索対象は irerukamo.json。判定（ピックアップ/除外）は行わない。
//
// usage:
//   node check-duplicate.mjs <toolURL|キーワード>   … tool / note の部分一致
//   node check-duplicate.mjs <npub>                … pubkey 完全一致
//   node check-duplicate.mjs <pubkey12>            … pubkey 先頭12文字
//   node check-duplicate.mjs <hex64>               … id または pubkey 完全一致

const IRERUKAMO = "irerukamo.json";

const q = (process.argv[2] || "").trim();
if (!q) {
  console.error("usage: node check-duplicate.mjs <toolURL|キーワード|npub|pubkey12|hex64>");
  process.exit(1);
}

let entries;
try {
  entries = JSON.parse(readFileSync(IRERUKAMO, "utf8"));
} catch {
  console.error(`${IRERUKAMO} が JSON として読めません`);
  process.exit(1);
}

let matches = [];
if (/^[0-9a-f]{64}$/i.test(q)) {
  const s = q.toLowerCase();
  matches = entries.filter((e) => e.id === s || e.pubkey === s);
} else if (/^[0-9a-f]{12}$/i.test(q)) {
  const s = q.toLowerCase();
  matches = entries.filter((e) => e.pubkey.toLowerCase().startsWith(s));
} else if (q.startsWith("npub")) {
  try {
    const { type, data } = nip19.decode(q);
    if (type === "npub") matches = entries.filter((e) => e.pubkey === data);
  } catch {
    console.error(`npub として解釈できません: ${q}`);
    process.exit(1);
  }
} else {
  const ql = q.toLowerCase();
  matches = entries.filter(
    (e) =>
      (e.tool || "").toLowerCase().includes(ql) ||
      (e.note || "").toLowerCase().includes(ql),
  );
}

if (matches.length === 0) {
  console.log("該当なし");
  process.exit(0);
}
matches.forEach((e) => {
  console.log(`${fmtUtc(e.created_at)} ${e.tool} | ${e.note}`);
});
console.log(`${matches.length}件ヒット`);
