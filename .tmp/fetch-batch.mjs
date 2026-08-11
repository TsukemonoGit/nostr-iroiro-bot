import { NostrFetcher } from "nostr-fetch";
import WebSocket from "ws";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { excludedUrl, isImageUrl } from "./excluded-domains.mjs";
import { EXCLUDED_PUBKEYS } from "./excluded-pubkeys.mjs";

const urlRe = /https?:\/\/[^\s<>"')\]]+/;
const SCAN_LOG_INTERVAL = 10000;

function deriveMetaFilePath(outFile) {
  const m = outFile.match(/^(?:.*\/)?batch(\d+)-24h\.jsonl(?:\.bak)?$/);
  return m
    ? `batches/batch${m[1]}-24h.meta.json`
    : outFile.replace(/\.bak$/, "") + ".meta.json";
}

const configPath =
  process.env.ALGIA_CONFIG ||
  join(homedir(), ".config", "algia", "config.json");
const cfg = JSON.parse(readFileSync(configPath, "utf8"));

const relayUrls = Object.entries(cfg.relays)
  .filter(([, v]) => v.read)
  .map(([u]) => u);

const since = Number(process.argv[2]);
const until = Number(process.argv[3]);
const outFile = process.argv[4];

if (!since || !until || !outFile) {
  console.error(
    "usage: node fetch-batch.mjs <sinceUnix> <untilUnix> <outFile>",
  );
  process.exit(1);
}

const fetcher = NostrFetcher.init({ webSocketConstructor: WebSocket });

const seen = new Set();
const events = [];

console.error(`relays: ${relayUrls.join(", ")}`);
console.error(
  `range: ${new Date(since * 1000).toISOString()} ~ ${new Date(until * 1000).toISOString()}`,
);

const iter = fetcher.allEventsIterator(
  relayUrls,
  { kinds: [1] },
  { since, until },
  {
    skipVerification: true,
    skipFilterMatching: true,
    enableBackpressure: true,
  },
);

let total = 0;
let pubkeyExcluded = 0;
let urlExcluded = 0;

for await (const ev of iter) {
  total++;
  if (total % SCAN_LOG_INTERVAL === 0)
    console.error(`scanned ${total} events...`);
  if (seen.has(ev.id)) continue;

  if (EXCLUDED_PUBKEYS.has(ev.pubkey.slice(0, 12))) {
    pubkeyExcluded++;
    continue;
  }

  const allUrls = ev.content.match(urlRe) || [];
  if (allUrls.length === 0) continue;

  const goodUrls = allUrls.filter((u) => !excludedUrl(u) && !isImageUrl(u));
  if (goodUrls.length === 0) urlExcluded++;

  seen.add(ev.id);
  events.push({
    id: ev.id,
    pubkey: ev.pubkey,
    created_at: ev.created_at,
    content: ev.content,
  });
}

fetcher.shutdown();

events.sort((a, b) => b.created_at - a.created_at);
writeFileSync(outFile, events.map((e) => JSON.stringify(e)).join("\n") + "\n");

const meta = {
  range: { since, until },
  rangeFrom: new Date(since * 1000).toISOString(),
  rangeTo: new Date(until * 1000).toISOString(),
  eventsWithURL: events.length,
  fetchedAt: new Date().toISOString(),
};
const metaFile = deriveMetaFilePath(outFile);
writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n");

console.error(
  `scanned ${total} events total, ${pubkeyExcluded} excluded by pubkey, ${urlExcluded} had URL(s) but all domain-excluded, ${events.length} written with URL`,
);
console.error(`meta written to ${metaFile}`);
