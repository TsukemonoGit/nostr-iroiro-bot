//node datatest.js
import { readFile, writeFile } from 'fs/promises'

const testData = JSON.parse(await readFile(`./iroiro.json`));

// テスト対象の関数
function checkForDuplicateTitles(data) {
  const titles = new Set(); // 重複をチェックするためのセット
  const urls = new Set();//urlの重複もチェックする

  for (const key in data) {
    const item = data[key];
    if (titles.has(item.title)) {
      return `title: ${item.title}`; // 重複が見つかった場合はtitleを返す
    }
    if (urls.has(item.url)) {
      return `url: ${item.url}`; // 重複が見つかった場合はtitleを返す
    }
    titles.add(item.title); // セットにタイトルを追加
    urls.add(item.url);

  }


  return false; // 重複が見つからなかった場合はfalseを返す
}

// テストの実行
const hasDuplicates = checkForDuplicateTitles(testData);
// 結果の出力
if (hasDuplicates) {
  console.log(`Error! Duplicate ${hasDuplicates}`);
} else {
  console.log("OK!");
}