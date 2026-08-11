import { readFileSync } from "fs";

// irerukamo.json の構造妥当性を検証する。
// 手動編集・追記スクリプト利用の際の最終確認に使う。
// tool URL の重複（id が異なっても同一 URL は重複）も検出する。
//
// usage: node validate-irerukamo.mjs

const IRERUKAMO = "irerukamo.json";

let entries;
try {
  entries = JSON.parse(readFileSync(IRERUKAMO, "utf8"));
} catch (e) {
  console.error(`ERROR: ${IRERUKAMO} が JSON として読めません: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(entries)) {
  console.error(`ERROR: ${IRERUKAMO} の最上位が配列ではありません`);
  process.exit(1);
}

const errors = [];
const seenTools = new Map();
const REQ_FIELDS = ["id", "pubkey", "created_at", "tool", "note", "content"];

// tool は http(s) のほか、収録済み実績のある gopher / gemini も許容する
const TOOL_RE = /^(https?|gopher|gemini):\/\//;

entries.forEach((e, i) => {
  const where = `[${i}]`;
  if (!e || typeof e !== "object") {
    errors.push(`${where} オブジェクトではありません`);
    return;
  }
  for (const f of REQ_FIELDS) {
    if (e[f] === undefined || e[f] === null || e[f] === "") {
      errors.push(`${where} 必須フィールド ${f} が欠落しています`);
    }
  }
  if (typeof e.id === "string" && !/^[0-9a-f]{64}$/.test(e.id)) {
    errors.push(`${where} id が64文字hexではありません: ${e.id}`);
  }
  if (typeof e.pubkey === "string" && !/^[0-9a-f]{64}$/.test(e.pubkey)) {
    errors.push(`${where} pubkey が64文字hexではありません: ${e.pubkey}`);
  }
  if (typeof e.created_at !== "undefined" && !Number.isInteger(e.created_at)) {
    errors.push(`${where} created_at が整数ではありません: ${e.created_at}`);
  }
  if (typeof e.tool === "string" && !TOOL_RE.test(e.tool)) {
    errors.push(`${where} tool が http(s)/gopher/gemini URL ではありません: ${e.tool}`);
  }
  if (typeof e.tool === "string") {
    // tool URL は id が異なっていても同一なら重複（同一ツールの複数収録を防止）。同一投稿から別URLを収録する運用（[139][140]等）は id のみ重複のため検出しない
    const k = e.tool.toLowerCase();
    if (seenTools.has(k)) {
      errors.push(`${where} tool URL が重複しています（${seenTools.get(k)} と同一）: ${e.tool}`);
    } else {
      seenTools.set(k, i);
    }
  }
});

if (errors.length > 0) {
  errors.forEach((m) => console.error(`ERROR: ${m}`));
  console.error(`${errors.length}件のエラー`);
  process.exit(1);
}
console.log(`OK: ${entries.length}件、全フィールド妥当（tool URL 重複なし）`);
