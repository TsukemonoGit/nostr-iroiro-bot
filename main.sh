#!/bin/bash

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# .envファイルから環境変数を読み込む
source ./.env

# main.jsがあるディレクトリのパスを取得
SCRIPTPATH="$(pwd)"

# main.jsを実行
$NODE_PATH "$SCRIPTPATH/main.js" "$NSEC" "$SCRIPTPATH"

# main.jsを実行し、プロセスIDを取得
$NODE_PATH "$SCRIPTPATH/main.js" "$NSEC" "$SCRIPTPATH" &

# 実行中のプロセスのIDを取得
PID=$!

# 2分間待つ
sleep 120

# 実行中のプロセスをチェックし、まだ実行中なら強制終了させる
if ps -p $PID > /dev/null; then
  echo "Timeout exceeded. Killing process $PID..."
  kill -9 $PID
fi

# スクリプトを終了する
exit 0