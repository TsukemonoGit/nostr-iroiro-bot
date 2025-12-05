import { readFile, writeFile } from "fs/promises";

async function loadStatus(path) {
  const raw = await readFile(path);
  return JSON.parse(raw);
}

async function saveStatus(path, data) {
  await writeFile(path, JSON.stringify(data, null, 2));
}

function resetAll(data) {
  for (const id of Object.keys(data)) {
    data[id].failureCount = 0;
    data[id].status = "active";
  }
  return data;
}

function resetOne(data, targetId) {
  if (!data[targetId]) {
    console.error(`ID が存在しません: ${targetId}`);
    process.exit(1);
  }
  data[targetId].failureCount = 0;
  data[targetId].status = "active";
  return data;
}

async function main() {
  const [, , dataDir, mode, targetId] = process.argv;

  if (!dataDir || !mode) {
    console.error("使用方法:");
    console.error("  全リセット: node reset-status.js <dataDir> all");
    console.error("  1件リセット: node reset-status.js <dataDir> id <siteId>");
    process.exit(1);
  }

  const statusPath = `${dataDir}/status.json`;
  let data;

  try {
    data = await loadStatus(statusPath);
  } catch (e) {
    console.error("status.json の読み込みに失敗:", e);
    process.exit(1);
  }

  if (mode === "all") {
    resetAll(data);
    console.log("全サイトの failureCount をリセットしました");
  } else if (mode === "id") {
    if (!targetId) {
      console.error("ID モードには <siteId> が必要です");
      process.exit(1);
    }
    resetOne(data, targetId);
    console.log(`ID ${targetId} の failureCount をリセットしました`);
  } else {
    console.error("mode は all または id のみ使用できます");
    process.exit(1);
  }

  await saveStatus(statusPath, data);
}

main();
