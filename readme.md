# nostr-iroiro-bot
https://nostter.app/npub1wgpfshr7xjnur3ytj0vg922nc5jceu3xyp8vjklvanvrvrre995s5lrecv

# site 
https://tsukemonogit.github.io/iroirotest/ ( ropo: https://github.com/TsukemonoGit/iroirotest)




crontab

16 * * * * bash /main.sh

みたいな感じで動かしてます

Nostrに関するまたはNostrで便利なツールとかあれば随時追加予定

Botなのかクライアントなのかなんなのかみたいなカテゴリを作りたかったけど分け方が分からな

---
番号指定して手動実行したいときは
```bash main.sh 35```
みたいなかんじでできる


### categoryについて

 - BOT: 自動でポストするアカウント

 - WebClient: SNSの機能を持ったWebアプリ

 - WebApp: その他のWebアプリ。ユーザーが何らかの操作ができるタイプ

 - WebSite: 一方的に見るタイプ

 - Library: Nostrアプリとかを作るときに使うライブラリ

 - Extention: 拡張機能

 - Relay: Nostrリレー

 - Tool: ツール…

 - Uncategorized: 未分類

 - Article: よみもの


 #### memo

 .git/hooks/pre-commit
 ファイルを作って
 ```
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
 
 て書いて
 
 ```
 chmod +x .git/hooks/pre-commit
 ```
 
 ってしておくと

 git commit のときにnode datatest.jsが動いて

 タイトルの重複とURLの重複チェックが動いて
 
 OKだったらcommitされるようになる

