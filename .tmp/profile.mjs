import { SimplePool, useWebSocketImplementation } from "nostr-tools/pool";
import { nip19 } from "nostr-tools";
import WebSocket from "ws";
import { RELAYS } from "./relays.mjs";
import { parseRelayArgs, normalizePubkey, hasJapanese } from "./nostr-common.mjs";

// 実行前にWebSocket実装を切り替える（Node.js では ws を使う）
useWebSocketImplementation(WebSocket);

const { relays, rest } = parseRelayArgs(process.argv.slice(2));
const relayUrls = relays.length ? relays : RELAYS;
const target = rest[0];

if (!target) {
  console.error("usage: node profile.mjs <pubkey|npub> [--relay <url>]...");
  process.exit(1);
}

const pubkey = normalizePubkey(target);
if (!pubkey) {
  console.error(`invalid pubkey: ${target}（npub または hex64文字）`);
  process.exit(1);
}

const pool = new SimplePool();
let ev = null;
try {
  // kind0（プロフィール）を取得し、最新のものを採用
  const events = await pool.querySync(relayUrls, {
    kinds: [0],
    authors: [pubkey],
  });
  events.sort((a, b) => b.created_at - a.created_at);
  ev = events[0] || null;
} catch (err) {
  console.error(`relay error: ${err.message}`);
} finally {
  pool.close(relayUrls);
}

if (!ev) {
  console.log(`== ${pubkey}`);
  console.log("(kind0取得なし)");
  process.exit(0);
}

let profile = {};
try {
  profile = JSON.parse(ev.content);
} catch {}

const name = profile.name ?? "";
const displayName = profile.display_name ?? profile.displayName ?? "";
const nip05 = profile.nip05 ?? "";
const website = profile.website ?? "";
const about = profile.about ?? "";
const jp = hasJapanese(name + displayName + about);

console.log(`== ${pubkey}`);
console.log(`npub: ${nip19.npubEncode(pubkey)}`);
console.log(`name: ${name}`);
console.log(`displayName: ${displayName}`);
console.log(`nip05: ${nip05}`);
console.log(`website: ${website}`);
console.log(`about: ${about}`);
console.log(`日本語判定: ${jp ? "kind0に日本語あり" : "kind0に日本語なし"}`);
