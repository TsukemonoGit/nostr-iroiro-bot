# いろいろボット追加候補ピックアップ 手順書

.tmp/内で作業すること

投稿本文の日本語を自動抽出するフィルタ（スクリプト）を**絶対に追加しない**。urlのみ投稿した日本人ユーザーが除外されてしまうため。
日本人ノスターユーザーの投稿から「いろいろボットのリストに追加したほうがいいやつ」= **投稿本人が作成したツール** に言及している投稿をピックアップして `irerukamo.json` に追加する。

この手順書は既に batch1〜batch7（2026-07-30 01:50 UTC 〜 2026-08-06 01:50 UTC）まで実施済みの内容をもとに、引き続き同じ手順で過去へ遡るためのもの。

## 概要

1. nostr-fetch で kind1 を 24h ごとのバッチで取得 → URL 付き投稿のみに自動フィルター
2. 各バッチを手動レビューし、ピックアップ候補を `irerukamo.json` に追加
3. スパム/bot を見つけたら `EXCLUDED_PUBKEYS` に追加し、既存バッチも再フィルター
4. 各バッチ終了時に集計を報告し、「さらに遡るか」をユーザーに確認

## リレー

- wss://x.kojira.io
- wss://yabu.me

- NIP-50 search は使わない。kind1 REQ → URL フィルター方式のみ

## ファイル構成（.tmp/ 内）

| ファイル                       | 役割                                                                                                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---- | -------- | ------------------------------------------------ |
| `fetch-batch.mjs`              | バッチ取得 + 範囲メタ書き出し                                                                                                                                                                                                          |
| `re-filter.mjs`                | 既存 jsonl に除外リストを再適用 + URL フィルター + 降順ソート + 重複除去                                                                                                                                                               |
| `review.mjs`                   | jsonl → 人間可読な txt 変換（`node review.mjs <src.jsonl> <out.txt>`）                                                                                                                                                                 |
| `next-batch.mjs`               | 進捗把握と次バッチ計算（どこまで実施済みか + 次バッチの番号・範囲・実行例を表示）                                                                                                                                                      |
| `excluded-pubkeys.mjs`         | `EXCLUDED_PUBKEYS`（除外pubkeyリスト集約。**必ずここに追加**）。fetch-batch.mjs / re-filter.mjs が import                                                                                                                              |
| `excluded-domains.mjs`         | `EXCLUDED_DOMAINS`（除外ドメインリスト）+ `isImageUrl`（画像拡張子判定）。fetch-batch.mjs / re-filter.mjs が import                                                                                                                    |
| `irerukamo.json`               | ピックアップ候補の最終成果物                                                                                                                                                                                                           |
| `batches/batchN-24h.jsonl.bak` | 取得直後の原本（URL 付き全件）。**再フィルターは必ず .bak から行う**。git に追跡                                                                                                                                                       |
| `batches/batchN-24h.meta.json` | 各バッチの取得範囲メタ（fetch-batch.mjs が自動書き出し。next-batch.mjs が参照）。git に追跡                                                                                                                                            |
| `batches/batchN-24h.jsonl`     | フィルター済み（レビュー対象）。`.gitignore` で除外（`re-filter.mjs` で .bak から再生成可能）                                                                                                                                          |
| `reviewN.txt`                  | レビュー用テキスト（`[i] MM-DD HH:MM pubkey12 id12 pubkey全文` + content）                                                                                                                                                             |
| `profile.mjs`                  | kind0取得（`algia profile -u` 代替）。pubkey は npub / hex どちらでも可。nip05 / website も表示                                                                                                                                        |
| `timeline.mjs`                 | 対象pubkey の kind1 投稿一覧取得（`algia timeline` 代替）。`--limit N` で件数指定                                                                                                                                                      |
| `relays.mjs`                   | リレー定義（x.kojira.io / yabu.me）。fetch-batch.mjs ほかが import する                                                                                                                                                                |
| `nostr-common.mjs`             | 共通ヘルパ（`--relay` 引数解析 / npub⇔hex 変換 / 日本語判定 / UTC時刻表示）                                                                                                                                                            |
| `add-pickup.mjs`               | ピックアップ追記（`node add-pickup.mjs reviewN.txt <エントリ番号> <toolURL> <note>`。.bak から id/pubkey/created_at/content を取得して irerukamo.json に追記。既存書式・末尾構造を保持。同一 tool URL は id が違っても追記をブロック） |
| `check-duplicate.mjs`          | 既収載チェック（`node check-duplicate.mjs <toolURL                                                                                                                                                                                     | キーワード | npub | pubkey12 | hex64>`。irerukamo.json を検索してヒットを表示） |
| `validate-irerukamo.mjs`       | irerukamo.json の構造検証（必須フィールド欠落 / id・pubkey の hex 形式 / created_at 整数 / tool の URL 形式 / tool URL 重複を検出）                                                                                                    |
| `memo.md`                      | 元の作業指示メモ                                                                                                                                                                                                                       |

## 手順

### 1. バッチ取得

```bash
cd .tmp
node fetch-batch.mjs <sinceUnix> <untilUnix> batches/batchN-24h.jsonl.bak
```

- レンジは UTC の 24h で、`since = 前回の until - 86400`、`until = 前回の since`（過去へ遡る）
- **進捗管理は手動でしない。`batches/batchN-24h.meta.json` と `next-batch.mjs` で自動把握する**:
  - `fetch-batch.mjs` は取得時に `batches/batchN-24h.meta.json`（取得した since/until と日時）を自動書き出しする
  - `node next-batch.mjs` で「どこまで実施済みか + 次のバッチ番号と取得範囲・実行例」を表示する
  - つまり `batches/` にある `.bak` ファイルが最新なら next-batch.mjs が正しい次レンジを出す。手動で表を更新する必要はない
  - （参考: 最新バッチの `.meta.json` が無い場合にだけ次バッチが確定できない。取得は必ず fetch-batch.mjs 経由で行うこと）
- 例（次バッチの取得〜レビュー）:
  ```bash
  node next-batch.mjs   # 次バッチの番号・範囲・実行例を確認
  node fetch-batch.mjs <since> <until> batches/batchN-24h.jsonl.bak
  node re-filter.mjs batches/batchN-24h.jsonl.bak batches/batchN-24h.jsonl
  node review.mjs batches/batchN-24h.jsonl reviewN.txt
  ```
- 出力は原本ファイル（.bak）。イベントは kind1 のみ

### 2. フィルター

```bash
node re-filter.mjs batches/batchN-24h.jsonl.bak batches/batchN-24h.jsonl
node review.mjs batches/batchN-24h.jsonl reviewN.txt
```

- `re-filter.mjs` が除外リスト適用 + URL 付き判定 + 重複除去 + created_at 降順ソートを行う
- 取得直後は fetch-batch.mjs 側にも同じ除外があるので re-filter と結果は一致するはず
  投稿本文の日本語を自動抽出するフィルタ（スクリプト）を**絶対に追加しない**。urlのみ投稿した日本人ユーザーが除外されてしまうため。

### 3. pubkey頻出度チェックと除外

`reviewN.txt` を開く前に、まずpubkeyの出現順位を調べる。

```bash
node -e "const fs=require('fs');const lines=fs.readFileSync('reviewN.txt','utf8');const map=new Map();for(const line of lines.split('\n')){const m=line.match(/^\[(\d+)\] (\d+-\d+ \d+:\d+) (\w{64}) (\w{64})/);if(m)map.set(m[4].slice(0,12),(map.get(m[4].slice(0,12))||0)+1)}const sorted=[...map.entries()].sort((a,b)=>b[1]-a[1]);for(const [pk,c] of sorted)console.log(c+' '+pk)"
```

出現頻度上位のpubkeyを**上から3つ**レビューし、明らかにbotまたは外国人であれば `EXCLUDED_PUBKEYS` に追加する。

### 4. レビュー

`reviewN.txt` を全部読む。書式:

```
[0] 08-06 01:50 0123456789ab...（id全文64文字） abcdef1234567890...（pubkey全文64文字）
投稿内容（改行は \n に変換）
---
```

- `[i]` = エントリ番号、`MM-DD HH:MM` = UTC 時刻、id・pubkeyともに全文（64文字）を表示
- 各エントリの完全データ（created_at・content含む）はこの行と本文からすべて取得できる。`batches/batchN-24h.jsonl.bak` の参照は不要

#### 判断基準

- **ピックアップ**: 投稿本人が作成したツールへの言及。日本語投稿が基本
  - 外部ツールをただ引用・共有しているだけの投稿は除外
  - あいまいでもピックアップ（もれより多すぎがよい）。注釈で「作者本人か不明」等を書く

#### 実行時の運用ルール

- 日本語判定・本人作成判定に必要な確認作業（`kind0取得、他のkind1投稿の確認等）は、レビュー中に都度ユーザーに「確認しますか？」と聞かず、手順書の判定基準に従って自動で実行する
- 投稿本文が英語等で日本語が無い場合も、ピックアップ候補になりうる投稿（本人作成ツールへの言及と読めるもの）は判定を保留せず、その場でkind0・他kind1を確認して日本人か判定する
- 判定の結果「日本人か不明」であれば、その時点でリストに入れない（除外）。ユーザーへの確認は不要
- 日本語投稿でない、かつ日本人と判定できない投稿（例: 非日本語圏ユーザーによる本人作成ツール言及）は、そのままピックアップ対象外とする。個別にユーザーへ「ピックアップするか」を問い合わせない
- レビュー中に生じるのは判定作業であり、方針判断ではない。方針判断（除外リストへの追加要否等、手順書に基準が無い新規のケース）が生じた場合のみユーザーに確認する
- レビューは1件ずつ逐次処理する。エントリを読む→判定する→ピックアップ対象なら即座に `irerukamo.json` に追加する→その判定に使った確認内容（kind0取得結果、他kind1確認結果、GitHub確認内容等）は破棄して次のエントリに進む。判定結果を貯めておいて最後にまとめて追加する必要はない
- 全件処理後にまとめて報告するのは「集計」（件数・内訳）であり、判定の詳細な経緯ではない。詳細はirerukamo.json自体に記録されているので、報告時に再度参照する必要はない
- **件数が多いことを理由に、grep・正規表現・スクリプト等で「日本語を含む行」「URLを含む行」等を機械的に抽出して選別対象を絞り込むことをしない。件数の多さは効率化の理由にならない。reviewN.txtは冒頭から末尾まで全件を人間が読むのと同じように目視で確認する。この制約は既存の「投稿本文の日本語を自動抽出するフィルタを絶対に追加しない」という禁止事項の適用範囲であり、恒久的なスクリプトへの組み込みだけでなく、レビュー中の一時的なコマンド一発の抽出（grep等）にも及ぶ**

#### 本人作成かどうかの判定

判断が難しい場合、以下を確認する。いずれも補助材料であり、単独では確定としない。

- **NIP-05 とドメインの一致**: `node profile.mjs <pubkey>` で取得した `nip05` のドメインと、投稿中のツールURLのドメインが一致する場合、本人作成の可能性が高い（例: nip05が`user@example.com`でツールURLが`https://example.com/tool`）
- **profileのwebsiteフィールド**: profileの `website` フィールドがツールURLまたはそのリポジトリと一致するか確認する
- **GitHubでの記載確認**:
  - ツールがGitHubリポジトリを持つ場合、README等にnpub/pubkeyの記載があるか確認する
  - リポジトリのowner名・GitHubプロフィール名とnostrのprofile name/displayNameが一致するか確認する
  - commit履歴の主要な著者と投稿者が一致するか確認する（判断材料の一つ。確定情報ではない）
- **投稿文言による一次判定**: 「作った」「公開しました」「リリースしました」等は本人作成を示唆。「紹介します」「共有します」「見つけました」等は他人のツールの共有を示唆
- 上記いずれも決定打がない場合は「作者本人か不明」と note に明記した上でピックアップする（除外しない）

#### npub/hex 変換

pubkeyのnpub形式⇔hex形式の相互変換や、その他nostr関連のエンコード/デコードが必要な場合、`nostr-tools`（`npm install`済み）を使う。手動変換や自作の変換ロジックは書かない。

```javascript
import { nip19 } from "nostr-tools";

// hex pubkey → npub
const npub = nip19.npubEncode(hexPubkey);

// npub → hex pubkey
const { data: hexPubkey } = nip19.decode(npub);

// event id (hex) → note1形式
const note = nip19.noteEncode(hexEventId);
```

GitHubのREADME等でnpub形式のみ記載されているケース（本人作成判定時）や、逆にhex形式のみ記載されているケースの照合時に使う。

#### 日本人かどうかの判定（厳格）

- 投稿本文に日本語がある → 日本人。ピックアップ対象
- 投稿に日本語がなければ kind0（プロフィール）を取得し、プロフィールに日本語がある → 日本人。ピックアップ対象
- 投稿・kind0のどちらにも日本語がなければ、そのpubkeyの他のkind1投稿も確認する（1投稿がURLのみ・英語のみ等でも、他の投稿に日本語があれば日本人と判定できる可能性があるため）。`node timeline.mjs <pubkey>` で対象pubkeyの投稿一覧を取得する（`--limit N` で表示件数を指定可、既定20件）
  他投稿に日本語があれば日本人。ピックアップ対象
- **投稿・kind0・他のkind1のいずれにも日本語がなければ「日本人か不明」としてピックアップしない（リストに入れない）**
- kind0 の取得は **profile.mjs** を使う（nostr-tools ベース。npub / hex どちらでも可）:
  ```bash
  node profile.mjs <pubkey>
  ```
  `name` / `displayName` / `about` に日本語（ひらがな・カタカナ・漢字）があるかで判定する。同時に `nip05` / `website` フィールドも確認し、本人作成判定（上記）に利用する。
- この判定基準は今後も適用する
- 判定結果は注記にも残す（「日本語」or「kind0に日本語 → 日本人」or「他のkind1投稿に日本語 → 日本人」等）
- **除外**: スパム、bot（天気・ニュース・漫画・政治・感謝bot等）、ポルノ、他人のツールの共有、iroiro.json に既収載のツール、Nostr と無関係
- Nostr ツールでなくても「投稿本人の作成物」なら候補に入れて良い（判断はユーザー任せ）
- **禁止事項**: 投稿本文の日本語を自動抽出するフィルタ（スクリプト）を**絶対に追加しない**。手動で reviewN.txt を読むこと。urlのみ投稿した日本人ユーザーが除外されてしまうため。

#### スパム発見時の除外追加

- `excluded-pubkeys.mjs` の `EXCLUDED_PUBKEYS` に **pubkey 先頭12文字** + コメント（bot の種別）を追加
- 過去バッチへの再フィルター適用は不要（バッチ作成→レビューを1バッチずつ完結させる運用のため、未レビューの過去バッチは存在しない）
- ピックアップ済みのエントリは除外リストに影響されない（irerukamo.json に追加済みの id は残る）

### 5. irerukamo.json に追記

書式（既存エントリに合わせる）:

```json
{
  "id": "イベントID(64文字)",
  "pubkey": "pubkey(64文字)",
  "created_at": 1785728429,
  "tool": "https://tool-url/",
  "note": "ツール名（種別）。出典の補足。日本語判定の根拠も記載（日本人は確定者のみ収録）",
  "content": "投稿本文（\n は改行のまま）"
}
```

- `id` / `pubkey` / `created_at` / `content` は **add-pickup.mjs 経由で .bak から正確に取得する**（手動コピー・内容省略の防止）。エントリ番号は reviewN.txt の `[i]` を使う
  ```bash
  node add-pickup.mjs reviewN.txt <エントリ番号> <toolURL> <note...>
  # 例: node add-pickup.mjs review51.txt 114 https://kazaguruma-transit.nawashiro.dev/ "風ぐるま乗換案内（作者本人）"
  ```
- 追記前に同一 tool URL（id が異なっていても）は既収載なら **add-pickup.mjs がブロック**する。同一 id の別 tool は警告のみ（1投稿に複数URLがある場合の正当な別収録）。判定を迷ったら `node check-duplicate.mjs <toolURL|npub|pubkey12>` で事前検索する
- 最後に `node validate-irerukamo.mjs` で妥当性確認（必須フィールド欠落・型・hex形式・id+tool重複を検出）

### 6. 集計報告と継続確認

各バッチ終了時:

- ピックアップした件数と内訳（pubkey12・ツール名・URL）
- 除外追加した件数（pubkey12・bot 種別）
- 現時点の総ピックアップ数

その後「さらに遡りますか？」と確認し、OK なら次のバッチ（1日分過去へ）を取得。ユーザーから別指示があれば従う。

## 除外 URL リストの管理

`excluded-domains.mjs` に `EXCLUDED_DOMAINS`（ドメイン単位の除外）と `isMediaUrl`（メディア拡張子判定。画像: jpg/jpeg/png/gif/webp/avif/bmp/svg/heic/heif、動画: mp4/mov/webm/avi/mkv/m4v/3gp、音声: mp3/wav/ogg/m4a/flac/aac/opus が対象）がある。`fetch-batch.mjs` と `re-filter.mjs` 両方がここから import して使う。投稿中の全URLがメディアURL（画像・動画・音声）のみの場合は自動的に除外される（メディア以外のURLが1つでも含まれていれば除外されない）。レビュー中に「また同じ関係ない URL が出てきた」と思ったら `excluded-domains.mjs` の `EXCLUDED_DOMAINS` に適宜追加する。

- ドメイン指定（`blossom.primal.net`）またはサブドメインマッチ（`*.loca.lt`）に対応
- SNS系（x.com, instagram.com, youtube.com 等）、画像共有系（catbox, blossom 等）、スパム系（headlines-world.com 等）をまず除外
- 画像・動画・音声URLのみが含まれる投稿は拡張子判定で自動除外（`isMediaUrl`）
- ツールURLが直接含まれる投稿だけが残るように調整

## 注意点

- 日時はすべて **UTC**（review.mjs は getUTCMonth などを使う）
- URL 正規表現は `fetch-batch.mjs` の `urlRe`（`/https?:\/\/[^\s<>"')\]]+/`）。これにマッチしないと除外される
- バッチのイベント総数・URL 付き数・除外数は fetch-batch.mjs / re-filter.mjs のログに出すので、報告の参考にする
- 判断はテキストベースではなく内容で行う（memo.md）
  投稿本文の日本語を自動抽出するフィルタ（スクリプト）を**絶対に追加しない**。urlのみ投稿した日本人ユーザーが除外されてしまうため。

## 未実施の改善検討事項

以下は未実装。手順への組み込みはユーザー判断待ち。

- **iroiro.json との突合せ自動化**: 「既収載のツール」判定は現状手動。自動照合スクリプトが未整備
- **batch1の.bak欠如への恒久対応**: 現状は「必要なら再取得」の記載のみ。方針未確定
- **EXCLUDED_PUBKEYSのコメント書式統一**: bot種別のカテゴリ表記が統一されているか未確認
- **リレー接続失敗時のリトライ**: 接続エラー時の再試行手順が未記載
- **review.mjs出力の拡張**: nip05・websiteをreviewN.txtに表示すれば、本人作成判定の作業効率が上がる可能性がある。未実装
- **excludedCountの内訳分離（re-filter.mjs）**: pubkey起因の除外とURL起因の除外が同一カウンタに合算されている。fetch-batch.mjsは分離済み。未実装

（実施済み: 重複チェック → check-duplicate.mjs / add-pickup.mjs の警告。JSON必須フィールドの型検証 → validate-irerukamo.mjs）
