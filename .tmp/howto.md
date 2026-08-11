- `[i]` = エントリ番号、`MM-DD HH:MM` = UTC 時刻、`pubkey12` / `id12` = 先頭12文字
- 各エントリの完全データ（pubkey 全文・id 全文・created_at・content）は `batches/batchN-24h.jsonl.bak` から引ける

#### 判断基準

- **ピックアップ**: 投稿本人が作成したツールへの言及。日本語投稿が基本
  - 外部ツールをただ引用・共有しているだけの投稿は除外
  - あいまいでもピックアップ（もれより多すぎがよい）。注釈で「作者本人か不明」等を書く

#### 実行時の運用ルール

- 日本語判定・本人作成判定に必要な確認作業（`algia profile` によるkind0取得、他のkind1投稿の確認等）は、レビュー中に都度ユーザーに「確認しますか？」と聞かず、手順書の判定基準に従って自動で実行する
- 投稿本文が英語等で日本語が無い場合も、ピックアップ候補になりうる投稿（本人作成ツールへの言及と読めるもの）は判定を保留せず、その場でkind0・他kind1を確認して日本人か判定する
- 判定の結果「日本人か不明」であれば、その時点でリストに入れない（除外）。ユーザーへの確認は不要
- 日本語投稿でない、かつ日本人と判定できない投稿（例: 非日本語圏ユーザーによる本人作成ツール言及）は、そのままピックアップ対象外とする。個別にユーザーへ「ピックアップするか」を問い合わせない
- レビュー中に生じるのは判定作業であり、方針判断ではない。方針判断（除外リストへの追加要否等、手順書に基準が無い新規のケース）が生じた場合のみユーザーに確認する
- 全件の判定を終えたうえで、最終候補リストを `irerukamo.json` に追加し、追加したツール、除外・不明の内訳を1回でまとめて報告する（手順5「集計報告と継続確認」の通り）

#### 本人作成かどうかの判定

判断が難しい場合、以下を確認する。いずれも補助材料であり、単独では確定としない。

- **NIP-05 とドメインの一致**: `algia profile -u <pubkey全文>` で取得した `nip05` のドメインと、投稿中のツールURLのドメインが一致する場合、本人作成の可能性が高い（例: nip05が`user@example.com`でツールURLが`https://example.com/tool`）
- **profileのwebsiteフィールド**: profileの `website` フィールドがツールURLまたはそのリポジトリと一致するか確認する
- **GitHubでの記載確認**:
  - ツールがGitHubリポジトリを持つ場合、README等にnpub/pubkeyの記載があるか確認する
  - リポジトリのowner名・GitHubプロフィール名とnostrのprofile name/displayNameが一致するか確認する
  - commit履歴の主要な著者と投稿者が一致するか確認する（判断材料の一つ。確定情報ではない）
- **投稿文言による一次判定**: 「作った」「公開しました」「リリースしました」等は本人作成を示唆。「紹介します」「共有します」「見つけました」等は他人のツールの共有を示唆
- 上記いずれも決定打がない場合は「作者本人か不明」と note に明記した上でピックアップする（除外しない）

#### 日本人かどうかの判定（厳格）

- 投稿本文に日本語がある → 日本人。ピックアップ対象
- 投稿に日本語がなければ kind0（プロフィール）を取得し、プロフィールに日本語がある → 日本人。ピックアップ対象
- 投稿・kind0のどちらにも日本語がなければ、そのpubkeyの他のkind1投稿も確認する（1投稿がURLのみ・英語のみ等でも、他の投稿に日本語があれば日本人と判定できる可能性があるため）:

他投稿に日本語があれば日本人。ピックアップ対象

- **投稿・kind0・他のkind1のいずれにも日本語がなければ「日本人か不明」としてピックアップしない（リストに入れない）**
- kind0 の取得は **algia** を使う（`fetch-profiles.mjs` 等のスクリプトは使わない）:

```bash
  algia profile -u <pubkey全文>
```

`name` / `displayName` / `about` に日本語（ひらがな・カタカナ・漢字）があるかで判定する。同時に `nip05` / `website` フィールドも確認し、本人作成判定（上記）に利用する。

- この判定基準は今後も適用する
- 判定結果は注記にも残す（「日本語」or「kind0に日本語 → 日本人」or「他のkind1投稿に日本語 → 日本人」等）
- **除外**: スパム、bot（天気・ニュース・漫画・政治・感謝bot等）、ポルノ、他人のツールの共有、iroiro.json に既収載のツール、Nostr と無関係
- Nostr ツールでなくても「投稿本人の作成物」なら候補に入れて良い（判断はユーザー任せ）
- **禁止事項**: 投稿本文の日本語を自動抽出するフィルタ（スクリプト）を**絶対に追加しない**。手動で reviewN.txt を読むこと。urlのみ投稿した日本人ユーザーが除外されてしまうため。

#### スパム発見時の除外追加

- `excluded-pubkeys.mjs` の `EXCLUDED_PUBKEYS` に **pubkey 先頭12文字** + コメント（bot の種別）を追加
- 既存バッチも `.bak` から再フィルターして同期する:

```bash
node re-filter.mjs batches/batch1-24h.jsonl.bak batches/batch1-24h.jsonl  # .bak があるもののみ
node re-filter.mjs batches/batch2-24h.jsonl.bak batches/batch2-24h.jsonl
node re-filter.mjs batches/batch3-24h.jsonl.bak batches/batch3-24h.jsonl
node review.mjs batches/batchN-24h.jsonl reviewN.txt   # 再生成
```

- 注: batch1 は .bak が無い（フィルター前データは失われている）。batch1 は除外リスト追加前の内容のまま。過去バッチとの整合を取るため、必要なら batch1 だけ再取得してもよい
- ピックアップ済みのエントリが除外で消えないこと（irerukamo.json に追加済みの id は残る）

## 除外 URL リストの管理

`excluded-domains.mjs` に `EXCLUDED_DOMAINS`（ドメイン単位の除外）と `isImageUrl`（画像拡張子判定。jpg/jpeg/png/gif/webp/avif/bmp/svg/heic/heif が対象）がある。`fetch-batch.mjs` と `re-filter.mjs` 両方がここから import して使う。投稿中の全URLが画像URLのみの場合は自動的に除外される（画像以外のURLが1つでも含まれていれば除外されない）。レビュー中に「また同じ関係ない URL が出てきた」と思ったら `excluded-domains.mjs` の `EXCLUDED_DOMAINS` に適宜追加する。

- ドメイン指定（`blossom.primal.net`）またはサブドメインマッチ（`*.loca.lt`）に対応
- SNS系（x.com, instagram.com, youtube.com 等）、画像共有系（catbox, blossom 等）、スパム系（headlines-world.com 等）をまず除外
- 画像URLのみが含まれる投稿は拡張子判定で自動除外（`isImageUrl`）
- ツールURLが直接含まれる投稿だけが残るように調整

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

`excluded-domains.mjs` に `EXCLUDED_DOMAINS` があり、`fetch-batch.mjs` と `re-filter.mjs` 両方がここから import して使う。レビュー中に「また同じ関係ない URL が出てきた」と思ったら `excluded-domains.mjs` に適宜追加する。

- ドメイン指定（`blossom.primal.net`）またはサブドメインマッチ（`*.loca.lt`）に対応
- SNS系（x.com, instagram.com, youtube.com 等）、画像共有系（catbox, blossom 等）、スパム系（headlines-world.com 等）をまず除外
- ツールURLが直接含まれる投稿だけが残るように調整

## 注意点

- 日時はすべて **UTC**（review.mjs は getUTCMonth などを使う）
- URL 正規表現は `fetch-batch.mjs` の `urlRe`（`/https?:\/\/[^\s<>"')\]]+/`）。これにマッチしないと除外される
- バッチのイベント総数・URL 付き数・除外数は fetch-batch.mjs / re-filter.mjs のログに出すので、報告の参考にする
- 判断はテキストベースではなく内容で行う（memo.md）
  投稿本文の日本語を自動抽出するフィルタ（スクリプト）を**絶対に追加しない**。urlのみ投稿した日本人ユーザーが除外されてしまうため。

## 未実施の改善検討事項

以下は未実装。手順への組み込みはユーザー判断待ち。

- **重複チェック**: 同一ツールURL・pubkeyがirerukamo.jsonに既に存在するかを事前検索する仕組みが未整備
- **iroiro.json との突合せ自動化**: 「既収載のツール」判定は現状手動。自動照合スクリプトが未整備
- **batch1の.bak欠如への恒久対応**: 現状は「必要なら再取得」の記載のみ。方針未確定
- **EXCLUDED_PUBKEYSのコメント書式統一**: bot種別のカテゴリ表記が統一されているか未確認
- **JSON必須フィールドの型検証**: 現状の妥当性確認は構文チェック（json.load）のみ。フィールド欠落・型不一致は検出されない
- **リレー接続失敗時のリトライ**: 接続エラー時の再試行手順が未記載
- **review.mjs出力の拡張**: nip05・websiteをreviewN.txtに表示すれば、本人作成判定の作業効率が上がる可能性がある。未実装
- **excludedCountの内訳分離（re-filter.mjs）**: pubkey起因の除外とURL起因の除外が同一カウンタに合算されている。fetch-batch.mjsは分離済み。未実装
