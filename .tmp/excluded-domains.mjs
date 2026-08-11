// excluded-domains.mjs
export const EXCLUDED_DOMAINS = new Set([
  // SNS系
  "x.com",
  "twitter.com",
  "instagram.com",
  "facebook.com",
  "youtube.com", // サブドメイン全体（shorts.youtube.com / www.youtube.com 等）を除外
  "youtu.be",
  "tiktok.com",
  "discord.gg",
  "mastodon.social",
  "threads.net",
  "bsky.app",
  "t.me",
  "htn.to", //はてぶ
  "hatenablog.com", // はてブログ
  "reddit.com",
  // 診断・クイズ系（診断結果シェアが頻出。ツールではない）
  "shindanmaker.com",
  "otherstuff.ai", // WORD5 ワードルゲーム結果シェアが頻出（外国サイト）
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
  "amzn.to", //アマゾン
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

// excluded-domains.mjs に追加
const MEDIA_EXTENSIONS = new Set([
  // 画像
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "bmp",
  "svg",
  "heic",
  "heif",
  // 動画
  "mp4",
  "mov",
  "webm",
  "avi",
  "mkv",
  "m4v",
  "3gp",
  // 音声
  "mp3",
  "wav",
  "ogg",
  "m4a",
  "flac",
  "aac",
  "opus",
]);

export function isMediaUrl(url) {
  const m = url.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  if (!m) return false;
  return MEDIA_EXTENSIONS.has(m[1].toLowerCase());
}
