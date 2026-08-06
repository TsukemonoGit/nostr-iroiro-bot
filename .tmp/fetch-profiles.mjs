import { NostrFetcher } from "nostr-fetch";
import WebSocket from "ws";
import { readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const configPath = process.env.ALGIA_CONFIG || join(homedir(), ".config", "algia", "config.json");
const cfg = JSON.parse(readFileSync(configPath, "utf8"));
const relayUrls = Object.entries(cfg.relays)
  .filter(([, v]) => v.read)
  .map(([u]) => u);

const pubkeys = process.argv.slice(2);

const fetcher = NostrFetcher.init({ webSocketConstructor: WebSocket });
const latest = new Map();
const iter = fetcher.allEventsIterator(
  relayUrls,
  { kinds: [0], authors: pubkeys },
  { since: 0, until: Math.floor(Date.now() / 1000) + 3600 },
  { skipVerification: true, skipFilterMatching: true }
);
for await (const ev of iter) {
  const cur = latest.get(ev.pubkey);
  if (!cur || ev.created_at > cur.created_at) latest.set(ev.pubkey, ev);
}
fetcher.shutdown();

for (const pk of pubkeys) {
  const ev = latest.get(pk);
  if (!ev) {
    console.log(`== ${pk}`);
    console.log("(no kind0)");
    console.log("");
    continue;
  }
  let profile = {};
  try {
    profile = JSON.parse(ev.content);
  } catch {}
  const name = profile.name || "";
  const displayName = profile.display_name || profile.displayName || "";
  const about = profile.about || "";
  console.log(`== ${pk}`);
  console.log(`name: ${name} / displayName: ${displayName}`);
  console.log(`about: ${about.slice(0, 200)}`);
  console.log(`japanese in kind0: ${/[\u3040-\u309F\u30A0-\u30FF]/.test(about + name + displayName) ? "YES" : "no"}`);
  console.log("");
}
