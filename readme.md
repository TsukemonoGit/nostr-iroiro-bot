# nostr-iroiro-bot

[https://nostter.app/npub1wgpfshr7xjnur3ytj0vg922nc5jceu3xyp8vjklvanvrvrre995s5lrecv](https://nostter.app/npub1wgpfshr7xjnur3ytj0vg922nc5jceu3xyp8vjklvanvrvrre995s5lrecv)

# データの 追加/修正

- [iroiro.json](./iroiro.json) を修正して (((( ˙꒳˙ ))))ﾌﾟﾙﾌﾟﾙﾌﾟﾙﾌﾟﾙﾌﾟﾙﾌﾟﾙﾌﾟﾙ
- イシューに書く
- Nostr でメッセージを送る
- サイトの方のフィードバックから送る（フィードバックはたまにしか確認してません）

のいずれかでお願いします

# site

[https://tsukemonogit.github.io/iroirotest/](https://tsukemonogit.github.io/iroirotest/) ( ripo: [https://github.com/TsukemonoGit/iroirotest](https://github.com/TsukemonoGit/iroirotest))

crontab

```
16 * * * * bash /main.sh
```

みたいな感じで動かしてます

Nostr に関するまたは Nostr で便利なツールとかあれば随時追加予定

---

番号指定して手動実行したいときは

```
bash main.sh 35
```

みたいなかんじでできる

---

### category について

- BOT: 自動でポストするアカウント
- WebClient: SNS の機能を持った Web アプリ
- WebApp: その他の Web アプリ。ユーザーが何らかの操作ができるタイプ
- WebSite: 一方的に見るタイプ
- Library: Nostr アプリとかを作るときに使うライブラリ
- Extention: 拡張機能
- Relay: Nostr リレー
- Tool: ツール…
- Uncategorized: 未分類
- Article: よみもの

---

### iroiro-cli

使用方法:

```
node iroiro-cli.js <コマンド> [オプション]

コマンド:
  add                        新しいブックマークを追加
  edit <ID>                  指定した ID のブックマークを編集
  delete <ID>                指定した ID のブックマークを削除
  list                       ブックマーク一覧を表示
  show <ID>                  指定した ID のブックマーク詳細を表示
  check [--title <タイトル>] [--url <URL>]
                             タイトルまたはURLで存在チェック

add コマンドのオプション:
  --category <カテゴリ>       カテゴリを指定
  --title <タイトル>          タイトルを指定（必須）
  --url <URL>                URL を指定（必須）
  --description <説明>        説明を指定（\n で改行可）
  --kind <種類>              kind 値を指定
  --force                    重複チェックをスキップして強制追加

edit コマンドのオプション:
  --category <カテゴリ>       カテゴリを更新
  --title <タイトル>          タイトルを更新
  --url <URL>                URL を更新
  --description <説明>        説明を更新
  --kind <種類>              kind 値を更新

例:
  node iroiro-cli.js add --title "テストサイト" --url "https://example.com" --description "test\\n\\nてすと"
  node iroiro-cli.js edit 5 --title "新しいタイトル"
  node iroiro-cli.js delete 5
  node iroiro-cli.js show 5
  node iroiro-cli.js list
  node iroiro-cli.js check --title "テストサイト"
  node iroiro-cli.js check --url "https://example.com"
```

---

### コミット前重複チェック

`.git/hooks/pre-commit` を作成して以下を記述:

```bash
#!/bin/bash

# Run the data test script
node datatest.js

# Check the exit status of the data test script
if [ $? -ne 0 ]; then
   echo "Data test failed. Please fix the issues before committing."
   exit 1
fi

# If the data test passed, allow the commit
exit 0
```

実行権限を付与:

```
chmod +x .git/hooks/pre-commit
```

`git commit` のときに `node datatest.js` が動いて、
タイトルと URL の重複チェックが通れば commit されるようになる。
