import { nip19 } from "nostr-tools";

// 日本語判定に使う正規表現（ひらがな・カタカナ・漢字）
export const JA_RE = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]/;

export function hasJapanese(s) {
  return JA_RE.test(s);
}

// pubkey を npub / hex のどちらでも受け付け、hex に正規化する
// 変換は nostr-tools の nip19 を使う（howto.md「npub/hex 変換」参照）
export function normalizePubkey(input) {
  const s = String(input).trim();
  if (/^[0-9a-f]{64}$/i.test(s)) return s.toLowerCase();
  try {
    const { type, data } = nip19.decode(s);
    if (type === "npub") return data;
  } catch {}
  return null;
}

// "--relay <url>" / "--relay=<url>" を抜き出し、残りの引数と一緒に返す
export function parseRelayArgs(args) {
  const relays = [];
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--relay") {
      relays.push(args[++i]);
    } else if (a.startsWith("--relay=")) {
      relays.push(a.slice("--relay=".length));
    } else {
      rest.push(a);
    }
  }
  return { relays, rest };
}

// UTC の MM-DD HH:MM 表示（review.mjs と同じ書式）
export function fmtUtc(ts) {
  const d = new Date(ts * 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
