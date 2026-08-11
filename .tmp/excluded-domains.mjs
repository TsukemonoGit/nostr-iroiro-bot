// excluded-domains.mjs
export const EXCLUDED_DOMAINS = new Set([
  // SNS系
  "x.com",
  "twitter.com",
  "www.instagram.com",
  "www.facebook.com",
  "www.youtube.com",
  "youtu.be",
  "www.tiktok.com",
  "discord.gg",
  "mastodon.social",
  "threads.net",
  "bsky.app",
  "t.me",
  // 画像・メディア系
  "files.catbox.moe",
  "litter.catbox.moe",
  "image.nostr.build",
  "i.nostr.build",
  "23img.com",
  "blossom.primal.net",
  "blossom.yakihonne.com",
  "cdnt-preview.dzcdn.net",
  "serveousercontent.com",
  "blossom.band",
  "imgbox.com",
  "img.toto.im",
  "img.wangmoyu.com",
  "i.redd.it",
  "media.tenor.com",
  "pbs.twimg.com",
  "media.libernet.app",
  // スパム系
  "headlines-world.com",
  "allgraph.ro",
  "aepiot.com",
  "aepiot.ro",
  "24hhotnewsai.com",
  "rwatimes.io",
  "searchcelebrityhd.com",
  "loca.lt",
  "blogspot.com",
  "coinup.io",
  "proxy.bostr.online",
  "shorturl.at",
  "projekto-epekto.netlify.app", // フィリピン政治キャンペーン bot ネットワーク
  "nadezhda.netlify.app", // 政治キャンペーン bot ネットワーク
]);

export function excludedUrl(url) {
  const m = url.match(/^https?:\/\/([^/\s]+)/);
  if (!m) return false;
  const domain = m[1];
  for (const d of EXCLUDED_DOMAINS) {
    if (domain === d || domain.endsWith("." + d)) return true;
  }
  return false;
}
