#!/bin/bash

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# .envファイルから環境変数を読み込む
source ./.env

# main.jsがあるディレクトリのパスを取得
SCRIPTPATH="$(pwd)"

# main.jsを実行
$NODE_PATH "$SCRIPTPATH/main.js" "$NSEC" "$SCRIPTPATH"