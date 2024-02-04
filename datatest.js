import { readFile, writeFile } from 'fs/promises'

const testData = JSON.parse(await readFile(`./iroiro.json`));

// テスト対象の関数
function checkForDuplicateTitles(data) {
  const titles = new Set(); // 重複をチェックするためのセット

  for (const item of data) {
    if (titles.has(item.title)) {
      return item.title; // 重複が見つかった場合はtrueを返す
    }
    titles.add(item.title); // セットにタイトルを追加
  }

  return false; // 重複が見つからなかった場合はfalseを返す
}

// テストの実行
const hasDuplicates = checkForDuplicateTitles(testData);

// 結果の出力
if (hasDuplicates) {
  console.log(`Error! Duplicate title [ ${hasDuplicates} ]`);
} else {
  console.log("OK!");
}