#!/bin/bash
#引数で番号指定できる

# 引数をチェックして処理する関数
process_arguments() {
    # 引数があるかチェック
    if [ $# -gt 0 ]; then
        # 引数をそのまま `main.js` に渡す
        $NODE_PATH "$SCRIPTPATH/main.js" "$NSEC" "$SCRIPTPATH" "$@"
    else
        # 引数がない場合は通常の実行
        $NODE_PATH "$SCRIPTPATH/main.js" "$NSEC" "$SCRIPTPATH"
    fi
}


# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# .envファイルから環境変数を読み込む
source ./.env

# main.jsがあるディレクトリのパスを取得
SCRIPTPATH="$(pwd)"

# main.jsを実行し、プロセスIDを取得
process_arguments "$@" &

# 実行中のプロセスのIDを取得
PID=$!

# 15秒間待つ
sleep 15

# 実行中のプロセスをチェックし、まだ実行中なら強制終了させる
if ps -p $PID > /dev/null; then
  echo "Timeout exceeded. Killing process $PID..."
  kill -9 $PID
fi

# スクリプトを終了する
exit 0