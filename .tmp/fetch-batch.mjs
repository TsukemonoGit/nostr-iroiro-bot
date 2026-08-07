import { NostrFetcher } from "nostr-fetch";
import WebSocket from "ws";
import { readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

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
  "imgbox.com",
  "img.toto.im",
  "img.wangmoyu.com",
  "shorturl.at",
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

const EXCLUDED_PUBKEYS = new Set([
  "1aff749bcecf", // ニュース速報 bot
  "53efc19ec1e2", // 下半身露出ニュース bot
  "47f97d4e0a64", // birobela 動画転載 bot
  "8ae7965af1b6", // ロシア語暗号スパム
  "483a687b18cd", // Amazon アフィリエイトスパム
  "ce6cad02ffb8", // IPTV スパム
  "0403c86a1bb4", // PREDYX 漫画 bot
  "416442609f5a", // stspg.io ステータス bot
  "c558c7cc69bb", // URL クリーナー bot
  "3cfb52d250e1", // 台風・天気 bot
  "7202985c7e34", // いろいろボット自身の紹介投稿
  "7febe2a59aa8", // GitHub コミットミラー bot
  "a3c13ef4c9ec", // 流速計測 bot
  "431fa2f340f0", // Midjourney 画像 bot
  "5f468793f9a7", // MiniMax 動画生成 bot
  "18905d0a5d62", // klipy GIF 転載 bot
  "0c45d7d45edb", // klipy GIF 転載 bot
  "fc37f163f4a1", // reddit 転載 bot
  "5e5fc1434c92", // sovbit 画像転載 bot
  "5d1d83de3ee5", // PDF/リンクスパム
  "3ea210ca7717", // X 転載 bot
  "fe5915e97c59", // nostrmag ニュースレター bot
  "aee9d7ac9343", // nostrmag ニュースレター bot
  "a8eeb2053dad", // nostrmag ニュースレター bot
  "e4dd796a3c78", // nostrmag ニュースレター bot
  "d9c2ec976548", // nostrmag ニュースレター bot
  "9f59d9117ce4", // nostrmag ニュースレター bot
  "7a21b98084ea", // nostrmag ニュースレター bot
  "794833e538ff", // nostrmag ニュースレター bot
  "12e11290983d", // nostrmag ニュースレター bot
  "34d2619e6872", // nostrmag ニュースレター bot
  "3185c2e56ed0", // nostrmag ニュースレター bot
  "d49a9023a21d", // ニュース/リンクスパム
  "7b31d1ff8134", // 大道師神 ブログスパム
  "ae2df40f39a3", // ポルノ/リファラルスパム
  "3c1e1de0c67d", // 投資詐欺スパム
  "4d7842051782", // azzamo.media ニュース bot
  "67a8ed7e76c7", // reddit r/golang 転載 bot
  "e85ed75286cb", // APOD bot
  "d95514886855", // キンマweb クイズ bot
  "e0ca1e9e2be7", // nekora 漫画スパム bot
  "5a54abdc84a5", // 反移民政治スパム
  "a723805cda67", // 感謝の言葉 bot (gratefulday.space)
  "3828b339214c", // 天気予報 bot
  "9ce936615b0a", // 英語ループ投稿（USA250/GM Fren）
  "34f2e819da2a", // Al Jazeera ニュース転載
  "877fb7cfc478", // 室温報告 bot
  "1634e999c5fc", // Microsoft Office 鍵販売スパム
  "3170406792be", // nostrmag ニュースレター bot
  "343cf71f28c6", // nostrmag ニュースレター bot
]);

const configPath = process.env.ALGIA_CONFIG || join(homedir(), ".config", "algia", "config.json");
const cfg = JSON.parse(readFileSync(configPath, "utf8"));

const relayUrls = Object.entries(cfg.relays)
  .filter(([, v]) => v.read)
  .map(([u]) => u);

const since = Number(process.argv[2]);
const until = Number(process.argv[3]);
const outFile = process.argv[4];

if (!since || !until || !outFile) {
  console.error("usage: node fetch-batch.mjs <sinceUnix> <untilUnix> <outFile>");
  process.exit(1);
}

const fetcher = NostrFetcher.init({ webSocketConstructor: WebSocket });

const seen = new Set();
const events = [];

console.error(`relays: ${relayUrls.join(", ")}`);
console.error(`range: ${new Date(since * 1000).toISOString()} ~ ${new Date(until * 1000).toISOString()}`);

const iter = fetcher.allEventsIterator(
  relayUrls,
  { kinds: [1] },
  { since, until },
  { skipVerification: true, skipFilterMatching: true, enableBackpressure: true }
);

let total = 0;
let excluded = 0;
for await (const ev of iter) {
  total++;
  if (total % 10000 === 0) console.error(`scanned ${total} events...`);
  if (seen.has(ev.id)) continue;
  if (EXCLUDED_PUBKEYS.has(ev.pubkey)) {
    excluded++;
    continue;
  }
  const allUrls = ev.content.match(urlRe) || [];
  if (allUrls.length === 0) continue;
  const goodUrls = allUrls.filter(u => !excludedUrl(u));
  if (goodUrls.length === 0) excluded++;
  seen.add(ev.id);
  events.push({
    id: ev.id,
    pubkey: ev.pubkey,
    created_at: ev.created_at,
    content: ev.content,
    tags: ev.tags,
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
const m = outFile.match(/^(?:.*\/)?batch(\d+)-24h\.jsonl(?:\.bak)?$/);
const metaFile = m ? `batches/batch${m[1]}-24h.meta.json` : outFile.replace(/\.bak$/, "") + ".meta.json";
writeFileSync(metaFile, JSON.stringify(meta, null, 2) + "\n");

console.error(`scanned ${total} events total, ${excluded} excluded by pubkey, ${events.length} with URL`);
console.error(`meta written to ${metaFile}`);
