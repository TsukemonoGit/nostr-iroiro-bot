import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ESモジュールで__dirnameを取得
//const __filename = fileURLToPath(import.meta.url);
//const __dirname = path.dirname(__filename);

// データディレクトリのパス
const dataDir = "./"; //path.join(__dirname, "data");
const inputFile = path.join(dataDir, "iroiro.json");
const sitesFile = path.join(dataDir, "iroiro.json");
const statusFile = path.join(dataDir, "status.json");

try {
  // iroiro.jsonを読み込み
  const originalData = JSON.parse(fs.readFileSync(inputFile, "utf8"));

  // データファイルとステータスファイルに分割
  const sitesData = {};
  const statusData = {};

  for (const [key, value] of Object.entries(originalData)) {
    // データファイル用（status と failureCount を除く）
    sitesData[key] = {
      category: value.category,
      title: value.title,
      url: value.url,
      description: value.description,
      ...(value.kind !== undefined && { kind: value.kind }),
    };

    // ステータスファイル用
    statusData[key] = {
      status: value.status,
      failureCount: value.failureCount,
    };
  }

  // sites.jsonに保存
  fs.writeFileSync(sitesFile, JSON.stringify(sitesData, null, 2), "utf8");
  console.log(
    `✓ sites.json を保存しました (${Object.keys(sitesData).length}件)`
  );

  // status.jsonに保存
  fs.writeFileSync(statusFile, JSON.stringify(statusData, null, 2), "utf8");
  console.log(
    `✓ status.json を保存しました (${Object.keys(statusData).length}件)`
  );

  console.log("\n分割完了！");
} catch (error) {
  console.error("エラーが発生しました:", error.message);
  process.exit(1);
}
