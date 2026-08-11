import { SimplePool, useWebSocketImplementation } from "nostr-tools/pool";
import { nip19 } from "nostr-tools";
import WebSocket from "ws";
import { RELAYS } from "./relays.mjs";
import { parseRelayArgs, normalizePubkey, fmtUtc } from "./nostr-common.mjs";

// 実行前にWebSocket実装を切り替える（Node.js では ws を使う）
useWebSocketImplementation(WebSocket);

const DEFAULT_LIMIT = 20;

let limit = DEFAULT_LIMIT;
const { relays, rest } = parseRelayArgs(process.argv.slice(2));
const relayUrls = relays.length ? relays : RELAYS;

const positionals = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a === "--limit") {
    limit = Number(rest[++i]);
  } else if (a.startsWith("--limit=")) {
    limit = Number(a.slice("--limit=".length));
  } else {
    positionals.push(a);
  }
}
if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT;
limit = Math.floor(limit);

const target = positionals[0];
if (!target) {
  console.error(
    `usage: node timeline.mjs <pubkey|npub> [--limit N] [--relay <url>]...`,
  );
  process.exit(1);
}

const pubkey = normalizePubkey(target);
if (!pubkey) {
  console.error(`invalid pubkey: ${target}（npub または hex64文字）`);
  process.exit(1);
}

const pool = new SimplePool();
let events = [];
try {
  events = await pool.querySync(relayUrls, {
    kinds: [1],
    authors: [pubkey],
    limit,
  });
} catch (err) {
  console.error(`relay error: ${err.message}`);
} finally {
  pool.close(relayUrls);
}

events.sort((a, b) => b.created_at - a.created_at);

console.log(`== ${pubkey}`);
console.log(`npub: ${nip19.npubEncode(pubkey)}`);
console.log(`(${events.length} posts)`);
console.log("");
events.forEach((e, i) => {
  const header = `[${i}] ${fmtUtc(e.created_at)} ${e.id}`;
  const content = e.content.replace(/\n/g, "\\n");
  console.log(`${header}\n${content}\n---`);
});
