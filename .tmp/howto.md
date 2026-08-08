# いろいろボット追加候補ピックアップ 手順書

.tmp/内で作業すること

日本人ノスターユーザーの投稿から「いろいろボットのリストに追加したほうがいいやつ」= **投稿本人が作成したツール** に言及している投稿をピックアップして `irerukamo.json` に追加する。

この手順書は既に batch1〜batch7（2026-07-30 01:50 UTC 〜 2026-08-06 01:50 UTC）まで実施済みの内容をもとに、引き続き同じ手順で過去へ遡るためのもの。

> **2026-08-06 追記**: 「日本人か不明」のエントリはリストに入れない方針へ変更（下記「日本人かどうかの判定」）。irerukamo.json はこの方針で 19 件に整理済み。

## 概要

1. nostr-fetch で kind1 を 24h ごとのバッチで取得 → URL 付き投稿のみに自動フィルター
2. 各バッチを手動レビューし、ピックアップ候補を `irerukamo.json` に追加
3. スパム/bot を見つけたら `EXCLUDED_PUBKEYS` に追加し、既存バッチも再フィルター
4. 各バッチ終了時に集計を報告し、「さらに遡るか」をユーザーに確認

## リレー

- wss://x.kojira.io
- wss://yabu.me

- 実行時は `ALGIA_CONFIG` 環境変数でパスを上書き可能（例: `ALGIA_CONFIG=/tmp/config.json`）
- NIP-50 search は使わない。kind1 REQ → URL フィルター方式のみ

## ファイル構成（.tmp/ 内）

| ファイル | 役割 |
|---|---|
| `fetch-batch.mjs` | バッチ取得 + `EXCLUDED_PUBKEYS`（除外リスト集約。**必ずここに追加**）+ 範囲メタ書き出し |
| `re-filter.mjs` | 既存 jsonl に除外リストを再適用 + URL フィルター + 降順ソート + 重複除去。除外リストは fetch-batch.mjs から自動読込 |
| `review.mjs` | jsonl → 人間可読な txt 変換（`node review.mjs <src.jsonl> <out.txt>`） |
| `next-batch.mjs` | 進捗把握と次バッチ計算（どこまで実施済みか + 次バッチの番号・範囲・実行例を表示） |
| `irerukamo.json` | ピックアップ候補の最終成果物 |
| `batches/batchN-24h.jsonl.bak` | 取得直後の原本（URL 付き全件）。**再フィルターは必ず .bak から行う**。git に追跡 |
| `batches/batchN-24h.meta.json` | 各バッチの取得範囲メタ（fetch-batch.mjs が自動書き出し）。next-batch.mjs が参照。git に追跡 |
| `batches/batchN-24h.jsonl` | フィルター済み（レビュー対象）。`.gitignore` で除外（`re-filter.mjs` で .bak から再生成可能） |
| `batches/batchN-24h.meta.json` | 各バッチの取得範囲メタ（fetch-batch.mjs が自動書き出し。next-batch.mjs が読む） |
| `reviewN.txt` | レビュー用テキスト（`[i] MM-DD HH:MM pubkey12 id12` + content） |
| `algia.md` | algia の使い方メモ |
| `memo.md` | 元の作業指示メモ |

`candidates.mjs` / `dump.mjs` / `dump2.mjs` は最初の試行時のスクリプトで、現在の手順では使わない。

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

### 3. pubkey頻出度チェックと除外

`reviewN.txt` を開く前に、まずpubkeyの出現順位を調べる。

```bash
node -e "const fs=require('fs');const lines=fs.readFileSync('reviewN.txt','utf8');const map=new Map();for(const line of lines.split('\n')){const m=line.match(/^\[(\d+)\] (\d+-\d+ \d+:\d+) (\w+) (\w+)/);if(m)map.set(m[3],(map.get(m[3])||0)+1)}const sorted=[...map.entries()].sort((a,b)=>b[1]-a[1]);for(const [pk,c] of sorted)console.log(c+' '+pk)"
```

出現頻度上位のpubkeyを**上から3つ**レビューし、明らかにbotまたは外国人であれば `EXCLUDED_PUBKEYS` に追加する。

### 4. レビュー

`reviewN.txt` を全部読む。書式:

```
[0] 08-06 01:50 abcdef123456 0123456789ab
投稿内容（改行は \n に変換）
---
```

- `[i]` = エントリ番号、`MM-DD HH:MM` = UTC 時刻、`pubkey12` / `id12` = 先頭12文字
- 各エントリの完全データ（pubkey 全文・id 全文・created_at・content）は `batches/batchN-24h.jsonl.bak` から引ける

#### 判断基準

- **ピックアップ**: 投稿本人が作成したツールへの言及。日本語投稿が基本
  - 外部ツールをただ引用・共有しているだけの投稿は除外
  - あいまいでもピックアップ（もれより多すぎがよい）。注釈で「作者本人か不明」等を書く

#### 日本人かどうかの判定（厳格）

- 投稿本文に日本語がある → 日本人。ピックアップ対象
- 投稿に日本語がなければ kind0（プロフィール）を取得し、プロフィールに日本語がある → 日本人。ピックアップ対象
- **どちらにも日本語がなければ「日本人か不明」としてピックアップしない（リストに入れない）**
- kind0 の取得は **algia** を使う（`fetch-profiles.mjs` 等のスクリプトは使わない）:
  ```bash
  algia profile -u <pubkey全文>
  ```
  `name` / `displayName` / `about` に日本語（ひらがな・カタカナ・漢字）があるかで判定する。
- この判定基準は今後も適用する
- 判定結果は注記にも残す（「日本語」or「kind0に日本語 → 日本人」等）
- **除外**: スパム、bot（天気・ニュース・漫画・政治・感謝bot等）、ポルノ、他人のツールの共有、iroiro.json に既収載のツール、Nostr と無関係
- Nostr ツールでなくても「投稿本人の作成物」なら候補に入れて良い（判断はユーザー任せ）
- **禁止事項**: 投稿本文の日本語を自動抽出するフィルタ（スクリプト）を**絶対に追加しない**。手動で reviewN.txt を読むこと。日本語判定は kind0 も確認する必要があるため

#### スパム発見時の除外追加

- `fetch-batch.mjs` の `EXCLUDED_PUBKEYS` に **pubkey 先頭12文字** + コメント（bot の種別）を追加
- 既存バッチも `.bak` から再フィルターして同期する:

```bash
node re-filter.mjs batches/batch1-24h.jsonl.bak batches/batch1-24h.jsonl  # .bak があるもののみ
node re-filter.mjs batches/batch2-24h.jsonl.bak batches/batch2-24h.jsonl
node re-filter.mjs batches/batch3-24h.jsonl.bak batches/batch3-24h.jsonl
node review.mjs batches/batchN-24h.jsonl reviewN.txt   # 再生成
```

- 注: batch1 は .bak が無い（フィルター前データは失われている）。batch1 は除外リスト追加前の内容のまま。過去バッチとの整合を取るため、必要なら batch1 だけ再取得してもよい
- ピックアップ済みのエントリが除外で消えないこと（irerukamo.json に追加済みの id は残る）

### 4. irerukamo.json に追記

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

- `id` / `pubkey` / `created_at` / `content` は .bak から正確にコピーする（内容を省略しない）
- 最後に `python3 -c "import json; json.load(open('irerukamo.json'))"` で妥当性確認

### 5. 集計報告と継続確認

各バッチ終了時:

- ピックアップした件数と内訳（pubkey12・ツール名・URL）
- 除外追加した件数（pubkey12・bot 種別）
- 現時点の総ピックアップ数

その後「さらに遡りますか？」と確認し、OK なら次のバッチ（1日分過去へ）を取得。ユーザーから別指示があれば従う。

## 除外 URL リストの管理

`fetch-batch.mjs` と `re-filter.mjs` に `EXCLUDED_DOMAINS` がある。レビュー中に「また同じ関係ない URL が出てきた」と思ったら適宜追加する。

- ドメイン指定（`blossom.primal.net`）またはサブドメインマッチ（`*.loca.lt`）に対応
- SNS系（x.com, instagram.com, youtube.com 等）、画像共有系（catbox, blossom 等）、スパム系（headlines-world.com 等）をまず除外
- ツールURLが直接含まれる投稿だけが残るように調整

## 注意点

- 日時はすべて **UTC**（review.mjs は getUTCMonth などを使う）
- URL 正規表現は `fetch-batch.mjs` の `urlRe`（`/https?:\/\/[^\s<>"')\]]+/`）。これにマッチしないと除外される
- バッチのイベント総数・URL 付き数・除外数は fetch-batch.mjs / re-filter.mjs のログに出すので、報告の参考にする
- 判断はテキストベースではなく内容で行う（memo.md）
