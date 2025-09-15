#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESモジュール環境で__dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const JSON_FILE = "iroiro.json";

// コマンドライン引数を解析
const args = process.argv.slice(2);

function showHelp() {
  console.log(`
使用方法:
  node iroiro-cli.js <コマンド> [オプション]

コマンド:
  add                      新しいブックマークを追加
  edit <ID>                指定したIDのブックマークを編集
  delete <ID>              指定したIDのブックマークを削除
  list                     ブックマーク一覧を表示
  show <ID>                指定したIDのブックマーク詳細を表示
  check [--title <タイトル>] [--url <URL>]  タイトルまたはURLで存在チェック

addコマンドのオプション:
  --category <カテゴリ>     カテゴリを指定
  --title <タイトル>        タイトルを指定（必須）
  --url <URL>              URLを指定（必須）
  --description <説明>      説明を指定
  --kind <種類>            kind値を指定
  --force                  重複チェックをスキップして強制追加

editコマンドのオプション:
  --category <カテゴリ>     カテゴリを更新
  --title <タイトル>        タイトルを更新
  --url <URL>              URLを更新
  --description <説明>      説明を更新
  --kind <種類>            kind値を更新

例:
  node iroiro-cli.js add --title "テストサイト" --url "https://example.com"
  node iroiro-cli.js edit 5 --title "新しいタイトル"
  node iroiro-cli.js delete 5
  node iroiro-cli.js show 5
  node iroiro-cli.js list
  `);
}

function parseArgs(args) {
  const options = {
    category: "",
    title: "",
    url: "",
    description: "",
    force: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--category":
        options.category = nextArg || "";
        i++;
        break;
      case "--title":
        options.title = nextArg || "";
        i++;
        break;
      case "--url":
        options.url = nextArg || "";
        i++;
        break;
      case "--description":
        options.description = nextArg.replace(/\\n/g, "\n") || "";
        i++;
        break;
      case "--kind":
        options.kind = parseInt(nextArg) || 39701;
        i++;
        break;
      case "--force":
        options.force = true;
        break;
      case "--help":
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function parseEditArgs(args) {
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case "--category":
        options.category = nextArg || "";
        i++;
        break;
      case "--title":
        options.title = nextArg || "";
        i++;
        break;
      case "--url":
        options.url = nextArg || "";
        i++;
        break;
      case "--description":
        options.description = nextArg.replace(/\\n/g, "\n") || "";
        i++;
        break;
      case "--kind":
        options.kind = parseInt(nextArg) || undefined;
        i++;
        break;
    }
  }

  return options;
}

function loadJSON() {
  try {
    if (fs.existsSync(JSON_FILE)) {
      const data = fs.readFileSync(JSON_FILE, "utf8");
      return JSON.parse(data);
    } else {
      return {};
    }
  } catch (error) {
    console.error("JSONファイルの読み込みに失敗しました:", error.message);
    return {};
  }
}

function saveJSON(data) {
  try {
    fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2), "utf8");
    console.log("データが正常に保存されました。");
  } catch (error) {
    console.error("JSONファイルの保存に失敗しました:", error.message);
  }
}

function getNextId(data) {
  const keys = Object.keys(data)
    .map((key) => parseInt(key))
    .filter((key) => !isNaN(key));
  return keys.length > 0 ? Math.max(...keys) + 1 : 0;
}

function checkDuplicate(data, title, url) {
  const duplicates = [];

  for (const [id, entry] of Object.entries(data)) {
    if (entry.title === title) {
      duplicates.push({ type: "title", id, entry });
    }
    if (entry.url === url) {
      duplicates.push({ type: "url", id, entry });
    }
  }

  return duplicates;
}

function addBookmark(options) {
  // 必須項目のチェック
  if (!options.title || !options.url) {
    console.error("エラー: --title と --url は必須です。");
    console.log("--help でヘルプを表示します。");
    return;
  }

  // JSONファイルを読み込み
  const data = loadJSON();

  // 重複チェック（--forceが指定されていない場合のみ）
  if (!options.force) {
    const duplicates = checkDuplicate(data, options.title, options.url);

    if (duplicates.length > 0) {
      console.error("エラー: 重複するデータが見つかりました:");
      duplicates.forEach((dup) => {
        if (dup.type === "title") {
          console.error(
            `  同じタイトル「${dup.entry.title}」が既に存在します (ID: ${dup.id})`
          );
          console.error(`    URL: ${dup.entry.url}`);
        } else if (dup.type === "url") {
          console.error(
            `  同じURL「${dup.entry.url}」が既に存在します (ID: ${dup.id})`
          );
          console.error(`    タイトル: ${dup.entry.title}`);
        }
      });
      console.log("\n追加を続行するには --force フラグを使用してください。");
      return;
    }
  } else {
    console.log(
      "警告: --force フラグが指定されているため、重複チェックをスキップします。"
    );
  }

  // 新しいIDを取得
  const newId = getNextId(data);

  // 新しいエントリを作成
  const newEntry = {
    category: options.category,
    title: options.title,
    url: options.url,
    description: options.description,
    kind: options.kind,
  };

  // データに追加
  data[newId.toString()] = newEntry;

  // ファイルに保存
  saveJSON(data);

  console.log(`新しいブックマークが追加されました (ID: ${newId}):`);
  console.log(JSON.stringify(newEntry, null, 2));
}

function editBookmark(id, options) {
  // JSONファイルを読み込み
  const data = loadJSON();

  // IDの存在チェック
  if (!data[id]) {
    console.error(`エラー: ID ${id} のブックマークが見つかりません。`);
    return;
  }

  const currentEntry = data[id];
  const updatedEntry = { ...currentEntry };
  const changes = [];

  // 各フィールドを更新
  if (
    options.category !== undefined &&
    options.category !== currentEntry.category
  ) {
    updatedEntry.category = options.category;
    changes.push(
      `category: "${currentEntry.category}" → "${options.category}"`
    );
  }

  if (options.title !== undefined && options.title !== currentEntry.title) {
    updatedEntry.title = options.title;
    changes.push(`title: "${currentEntry.title}" → "${options.title}"`);
  }

  if (options.url !== undefined && options.url !== currentEntry.url) {
    updatedEntry.url = options.url;
    changes.push(`url: "${currentEntry.url}" → "${options.url}"`);
  }

  if (
    options.description !== undefined &&
    options.description !== currentEntry.description
  ) {
    updatedEntry.description = options.description;
    changes.push(
      `description: "${currentEntry.description}" → "${options.description}"`
    );
  }

  if (options.kind !== undefined && options.kind !== currentEntry.kind) {
    updatedEntry.kind = options.kind;
    changes.push(`kind: ${currentEntry.kind} → ${options.kind}`);
  }

  // 変更がない場合
  if (changes.length === 0) {
    console.log("変更がありませんでした。");
    return;
  }

  // 重複チェック（タイトルまたはURLが変更された場合）
  if (options.title || options.url) {
    const checkTitle = options.title || currentEntry.title;
    const checkUrl = options.url || currentEntry.url;

    const duplicates = checkDuplicate(data, checkTitle, checkUrl).filter(
      (dup) => dup.id !== id
    );

    if (duplicates.length > 0) {
      console.error("エラー: 重複するデータが見つかりました:");
      duplicates.forEach((dup) => {
        if (dup.type === "title") {
          console.error(
            `  同じタイトル「${dup.entry.title}」が既に存在します (ID: ${dup.id})`
          );
        } else if (dup.type === "url") {
          console.error(
            `  同じURL「${dup.entry.url}」が既に存在します (ID: ${dup.id})`
          );
        }
      });
      return;
    }
  }

  // データを更新
  data[id] = updatedEntry;

  // ファイルに保存
  saveJSON(data);

  console.log(`ブックマーク ID ${id} を更新しました:`);
  changes.forEach((change) => console.log(`  ${change}`));
}

function deleteBookmark(id) {
  // JSONファイルを読み込み
  const data = loadJSON();

  // IDの存在チェック
  if (!data[id]) {
    console.error(`エラー: ID ${id} のブックマークが見つかりません。`);
    return;
  }

  const deletedEntry = data[id];

  // データから削除
  delete data[id];

  // ファイルに保存
  saveJSON(data);

  console.log(`ブックマーク ID ${id} を削除しました:`);
  console.log(`  タイトル: ${deletedEntry.title}`);
  console.log(`  URL: ${deletedEntry.url}`);
}

function showBookmark(id) {
  const data = loadJSON();

  // IDの存在チェック
  if (!data[id]) {
    console.error(`エラー: ID ${id} のブックマークが見つかりません。`);
    return;
  }

  const entry = data[id];
  console.log(`ブックマーク詳細 (ID: ${id}):`);
  console.log(JSON.stringify(entry, null, 2));
}

function listBookmarks() {
  const data = loadJSON();
  const keys = Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b));

  if (keys.length === 0) {
    console.log("ブックマークがありません。");
    return;
  }

  console.log("現在のブックマーク一覧:");
  keys.forEach((key) => {
    const entry = data[key];
    console.log(`ID: ${key} - ${entry.title} (${entry.url})`);
  });
}

function checkBookmark(options) {
  if (!options.title && !options.url) {
    console.error(
      "エラー: --title または --url のどちらかを指定してください。"
    );
    return;
  }

  const data = loadJSON();
  let found = [];

  for (const [id, entry] of Object.entries(data)) {
    if (options.title && entry.title === options.title) {
      found.push({ id, entry, type: "title" });
    }
    if (options.url && entry.url === options.url) {
      found.push({ id, entry, type: "url" });
    }
  }

  if (found.length === 0) {
    console.log("該当するブックマークは見つかりませんでした。");
  } else {
    console.log("一致するブックマーク:");
    found.forEach((f) => {
      console.log(
        `ID: ${f.id} - ${f.entry.title} (${f.entry.url}) [${f.type}]`
      );
    });
  }
}

// メイン処理
if (args.length === 0) {
  showHelp();
  process.exit(1);
}

const command = args[0];

switch (command) {
  case "add":
    const options = parseArgs(args.slice(1));
    addBookmark(options);
    break;
  case "edit":
    if (args.length < 2) {
      console.error("エラー: edit コマンドにはIDが必要です。");
      console.log("使用方法: node iroiro-cli.js edit <ID> [オプション]");
      process.exit(1);
    }
    const editId = args[1];
    const editOptions = parseEditArgs(args.slice(2));
    editBookmark(editId, editOptions);
    break;
  case "delete":
    if (args.length < 2) {
      console.error("エラー: delete コマンドにはIDが必要です。");
      console.log("使用方法: node iroiro-cli.js delete <ID>");
      process.exit(1);
    }
    const deleteId = args[1];
    deleteBookmark(deleteId);
    break;
  case "show":
    if (args.length < 2) {
      console.error("エラー: show コマンドにはIDが必要です。");
      console.log("使用方法: node iroiro-cli.js show <ID>");
      process.exit(1);
    }
    const showId = args[1];
    showBookmark(showId);
    break;
  case "list":
    listBookmarks();
    break;
  case "check":
    const checkOptions = parseArgs(args.slice(1));
    checkBookmark(checkOptions);
    break;
  default:
    console.error(`未知のコマンド: ${command}`);
    showHelp();
    process.exit(1);
}
