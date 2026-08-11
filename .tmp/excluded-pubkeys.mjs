// excluded-pubkeys.mjs
export const EXCLUDED_PUBKEYS = new Set([
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
  "7febe2a59aa8", // GitHub コミットミラー bot / GitHub Pages リソース集 宣伝 bot
  "a3c13ef4c9ec", // リレー流速計測 bot
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
  "e6bef2fc320d", // 外人
  "08c6657385c5", // 外人
  "c239c0f994c4", // 外人
  "ae1bbe3a1fe7", // 外人
  "d981591e0ea6", // 外人
  "ee35b535d48d", // 外人
  "4e62f14445cc", // bot
  "4f7e61faeb06", // bot
  "a6259c888ca8", // bot
  "3fdf8b43d2e6", // bot
  "996e2d213612", // bot
  "2d0154e14033", // bot
  "7fd3d6c88899", // bot
  "88a26d85b87c", // 暗号資産ニュース bot
  "1e67de375417", // 外人（フランス語 #nostrfr）
  "08d49d7a6900", // 中国語 音楽スパム bot（#音乐 大量投稿）
  "8f1b628ef24c", // AWS whats-new スパム bot（英語・同刻大量投稿）
  "71ecabd8b6b3", // The Meme Bay（英語ミーム bot・smartflow.social プロモ）
  "d735231e8eeb", // クラスメソッド記事共有 bot
  "4fc2e3f74d5e", // Furry Art AI画像スパム bot（trycloudflare 生成画像 + BTC tips）
  "6c792fd0fc84", // Pinterest/ストック画像転載 bot（無テキスト 15連投）
  "4eb88310d6b4", // ミーム動画転載 bot（ROCKY trains DANIEL 等 #IKITAO）
  "096ec6d4c8be", // poder360 ポルトガル語ニュース bot
  "09fbf8f3be5a", // 中国語ポルノ/政治スパム bot（#黄播 #台湾）
  "9cb53e080594", // g1.globo.com ポルトガル語ニュース bot
  "501f27ec1321", // soap21.com 商品スパム bot（重複投稿）
  "ce643487280a", // redstate/americanthinker 右派政治スパム bot（計43バッチ）
  "3ffac3a6c859", // Girino Vey!（Facebook 転載 bot・英語/ポルトガル語、blossom-espelhator 画像）
  "deab79dafa1c", // Ryan（英語・haven.downisontheup.ca 画像投稿、外人）
  "1ea4ae8405ad", // celosia/the_moving_sands（英語・地政学コメント、外人）
  "0f0db1c9352e", // DOH.MONEY crypto/金融ニュース bot
  "f549a5f7d891", // Alephium プロモーション bot
  "7949809730b8", // invinoveritas spam bot
  "c6716205cf41", // チェコ語ニュース bot（idnes.cz 転載）
  "eb78d17ec0cc", // ロシア語AIエージェント crypto スパム（AEP Protocol）
  "197d83ddbf99", // yakihonne.com プロフィール宣伝 bot（同一URL繰り返し）
  "4a82bd5f227e", // AWS News Bot JP（aws.amazon.com/jp/new/ の翻訳転載 bot、about に Bot と明記）
  "6bc6e6dabd4d", // 学習リンク集 bot（y-history/gifu-net/kiuchi.jpn.org 等の wiki リンクを同一時刻に連投、kind0 なし）
  "bacd113c9ad7", // jornal-extra（ブラジル紙）ニュース転載 bot（dlvr.it + bsky、ポルトガル語・同一時刻連投）
  "42ae5db5fe31", // 複数メディア転載ニュース bot（tass.com / faktanasional.net の記事全文転載、同一 pubkey で6件）
  "960fcd3760bb", // ledevoir.com カナダ仏語新聞転載 bot（同一 pubkey で14件、自動投稿の決まり文句）
  "97c0571018ac", // forums.macrumors.com スレッド転載 bot（同一 pubkey で14件）
  "f648d9238a45", // 网易新聞（c.m.163.com）転載 bot（中国語・記事全文コピペ）
  "eaae798bef03", // republika.co.id インドネシア語ニュース転載 bot
  "0ef0ea1288cc", // mediaindonesia.com インドネシア語ニュース転載 bot
  "e0c279d6cf1f", // n1info.si スロベニア語ニュース転載 bot
  "591082e1768a", // tempo.co インドネシア語ニュース転載 bot
  "f00a87a666dd", // express.co.uk 英ニュース転載 bot
  "cab418d67811", // correiobraziliense ポルトガル語ニュース転載 bot（bsky ミラー含む）
  "264fa2461fce", // sputniknews.cn 中国語ニュース転載 bot（簡体字）
  "6bb81407878e", // sputniknews.cn 中国語ニュース転載 bot（簡体字・別アカウント）
  "a4132de3f6fe", // aljazeera.com ニュース転載 bot
  "25658dd3bb20", // ビットコインテストネットマイニング通知 bot（Block found! 連投）
  "ad49832d5a2a", // ニコニコアニメ新着配信 bot（nicoanime.com）
  "2bb2abbfc589", // うにゅう(ぼっと)
  "b40ea0357125", // jserinfo RSS feed bot（kind0 に「非公式」と明記）
  "36a48177fa2f", // スペイン語疑似科学/陰謀論スパム bot（歯医者・テレグラム誘導）
  "36b2e156ae97", // ニュース速報 bot（Google News RSS 転載「皆さんはどう思いますか？」）
  "0e6d283ae35c", // ニュース速報 bot（Google News RSS 転載）
  "b0e1d3f1af34", // ニュース速報 bot（Google News RSS 転載）
  "d42822e9961a", // Five-Dollar Toolkit（英語セールス連投・外人）
  "2efaa715bbb4", // vinney cavallo（grantless/catallax・英語・外人）
  "e41b93762c26",
]);
