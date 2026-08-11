import { readFileSync, writeFileSync } from "fs";

// レビューで「ピックアップ」と決めたエントリを irerukamo.json に追記する。
// 判定自体は手動のまま。ここで行うのは .bak からのデータ取得と追記のみ。
//
// usage: node add-pickup.mjs <reviewN.txt> <エントリ番号> <toolURL> <note...>
//   例: node add-pickup.mjs review51.txt 114 https://kazaguruma-transit.nawashiro.dev/ "風ぐるま乗換案内（作者本人）"

const IRERUKAMO = "irerukamo.json";

const [reviewFile, idxStr, tool, ...noteParts] = process.argv.slice(2);
const note = noteParts.join(" ");

if (!reviewFile || !idxStr || !tool || !note) {
  console.error(
    "usage: node add-pickup.mjs <reviewN.txt> <エントリ番号> <toolURL> <note...>",
  );
  process.exit(1);
}

const m = reviewFile.match(/^review(\d+)\.txt$/);
if (!m) {
  console.error(`review file 名が不正です: ${reviewFile}（例: review51.txt）`);
  process.exit(1);
}
const batchN = m[1];
const bakFile = `batches/batch${batchN}-24h.jsonl.bak`;

// reviewN.txt の [i] ヘッダ行から id / pubkey を取り出す
const idx = Number(idxStr);
if (!Number.isInteger(idx) || idx < 0) {
  console.error(`エントリ番号が不正です: ${idxStr}`);
  process.exit(1);
}
const reviewLines = readFileSync(reviewFile, "utf8").split("\n");
const headerRe = new RegExp(`^\\[${idx}\\] \\d\\d-\\d\\d \\d\\d:\\d\\d ([0-9a-f]{64}) ([0-9a-f]{64})$`);
let evId = null;
for (const line of reviewLines) {
  const hm = line.match(headerRe);
  if (hm) {
    evId = hm[1];
    break;
  }
}
if (!evId) {
  console.error(`reviewN.txt に [${idx}] のエントリが見つかりません: ${reviewFile}`);
  process.exit(1);
}

// .bak から該当イベントの完全データを取得する（howto: id/pubkey/created_at/content は .bak から正確にコピー）
let ev = null;
for (const line of readFileSync(bakFile, "utf8").trim().split("\n")) {
  const e = JSON.parse(line);
  if (e.id === evId) {
    ev = e;
    break;
  }
}
if (!ev) {
  console.error(`${bakFile} に id=${evId} のイベントが見つかりません`);
  process.exit(1);
}

// irerukamo.json に追記（既存の書式・末尾構造を保ったまま末尾に挿入）
const text = readFileSync(IRERUKAMO, "utf8");
let entries = [];
try {
  entries = JSON.parse(text);
} catch {
  console.error(`${IRERUKAMO} が JSON として壊れています`);
  process.exit(1);
}

const sameTool = entries.filter((e) => (e.tool || "").toLowerCase() === tool.toLowerCase());
if (sameTool.length > 0) {
  // id が異なっていても同一 tool URL は重複収載しない（同一ツールの複数収録を防止）
  console.error(`同一 tool URL は既に収載済みのため追加しません: ${tool}`);
  sameTool.forEach((e) => console.error(`  既収載: id=${e.id.slice(0, 12)} ${e.note}`));
  process.exit(1);
}
const sameId = entries.filter((e) => e.id === ev.id);
if (sameId.length > 0) {
  // 同一投稿から別URLを収録する正当ケース（[139][140]等）は許容し、その旨を表示する
  console.warn(`WARN: 同一 id の別 tool が既収載です: ${sameId.map((e) => e.tool).join(" | ")}`);
}

const newEntry = {
  id: ev.id,
  pubkey: ev.pubkey,
  created_at: ev.created_at,
  tool,
  note,
  content: ev.content,
};

const endMarker = "  }\n]";
const markIdx = text.lastIndexOf(endMarker);
if (markIdx === -1) {
  console.error(`${IRERUKAMO} の末尾構造が想定と異なります（末尾が "  }" + "]" ではありません）`);
  process.exit(1);
}
const entryText = JSON.stringify(newEntry, null, 2)
  .split("\n")
  .map((l) => "  " + l)
  .join("\n");
const tail = text.slice(markIdx + endMarker.length); // 末尾の改行等を保持
const out = text.slice(0, markIdx + endMarker.indexOf("\n]")) + ",\n" + entryText + "\n]" + tail;

writeFileSync(IRERUKAMO, out);
try {
  JSON.parse(out);
} catch {
  console.error("追記後の JSON が壊れています。ファイルを確認してください");
  process.exit(1);
}

console.log(`[${idx}] ${ev.id.slice(0, 12)} ${ev.pubkey.slice(0, 12)} created_at=${ev.created_at}`);
console.log(`tool: ${tool}`);
console.log(`note: ${note}`);
console.log(`追記完了（総数: ${entries.length + 1}件）`);
