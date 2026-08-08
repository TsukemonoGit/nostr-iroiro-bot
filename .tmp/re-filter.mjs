import { readFileSync, writeFileSync } from "fs";

const fetchSrc = readFileSync(new URL("./fetch-batch.mjs", import.meta.url), "utf8");
const pkStart = fetchSrc.indexOf("const EXCLUDED_PUBKEYS");
const block = fetchSrc.slice(pkStart, fetchSrc.indexOf("]);", pkStart));
const excluded = new Set([...block.matchAll(/"([0-9a-f]{12})"/g)].map((m) => m[1]));

const urlRe = /https?:\/\/[^\s<>"')\]]+/;

const EXCLUDED_DOMAINS = new Set([
  // SNS系
  "x.com", "twitter.com",
  "www.instagram.com",
  "www.facebook.com",
  "www.youtube.com", "youtu.be",
  "www.tiktok.com",
  "discord.gg",
  "mastodon.social",
  "threads.net",
  "bsky.app",
  "t.me",
  // 画像・メディア系
  "files.catbox.moe", "litter.catbox.moe",
  "image.nostr.build", "i.nostr.build",
  "23img.com",
  "blossom.primal.net", "blossom.yakihonne.com",
  "cdnt-preview.dzcdn.net",
  "serveousercontent.com",
  "blossom.band",
  "imgbox.com",
  "img.toto.im",
  "img.wangmoyu.com",
  "shorturl.at",
  // スパム系
  "headlines-world.com",
  "allgraph.ro",
  "aepiot.com", "aepiot.ro",
  "24hhotnewsai.com",
  "rwatimes.io",
  "searchcelebrityhd.com",
  "loca.lt",
  "blogspot.com",
  "coinup.io",
  "proxy.bostr.online",
  "i.redd.it",
  "media.tenor.com",
  "pbs.twimg.com",
  "media.libernet.app",
]);

function excludedUrl(url) {
  const m = url.match(/^https?:\/\/([^/\s]+)/);
  if (!m) return false;
  const domain = m[1];
  for (const d of EXCLUDED_DOMAINS) {
    if (domain === d || domain.endsWith("." + d)) return true;
  }
  return false;
}

const lines = readFileSync(process.argv[2], "utf8").trim().split("\n");
const out = [];
const seen = new Set();
let excludedCount = 0;
for (const l of lines) {
  const e = JSON.parse(l);
  if (seen.has(e.id)) continue;
  if (excluded.has(e.pubkey.slice(0, 12))) { excludedCount++; continue; }
  if (!urlRe.test(e.content)) continue;
  const urls = e.content.match(urlRe) || [];
  const goodUrls = urls.filter(u => !excludedUrl(u));
  if (goodUrls.length === 0) { excludedCount++; continue; }
  seen.add(e.id);
  out.push(e);
}
out.sort((a, b) => b.created_at - a.created_at);
writeFileSync(process.argv[3], out.map(JSON.stringify).join("\n") + "\n");
console.log(`original: ${lines.length}, excluded: ${excludedCount}, kept: ${out.length}`);
