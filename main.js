import "websocket-polyfill";
import { readFile, writeFile } from "fs/promises";
import { SimplePool, finalizeEvent, getPublicKey } from "nostr-tools";

const TIMEOUT = 8000;
const MAX_FAILURE_COUNT = 5;

const relays = [
  "wss://yabu.me",
  "wss://r.kojira.io/",
  "wss://nos.lol",
  "wss://relay-jp.nostr.moctane.com/",
  "wss://relay.nostr.band",
  "wss://relay.nostr.wirednet.jp/",
];

// サイトの生存確認
async function checkSite(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NostrBot/1.0)",
      },
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// 必要なプロパティを追加
function ensureProperties(siteData, siteId, jsonData) {
  let hasChanged = false;

  if (!siteData.hasOwnProperty("status")) {
    jsonData[siteId].status = "active";
    hasChanged = true;
  }
  if (!siteData.hasOwnProperty("failureCount")) {
    jsonData[siteId].failureCount = 0;
    hasChanged = true;
  }

  return hasChanged;
}

// サイトの状態を更新
function updateSiteStatus(siteId, jsonData, isUrlOk) {
  const currentFailureCount = jsonData[siteId].failureCount || 0;
  let hasChanged = false;

  if (isUrlOk) {
    // URLが有効 - 失敗カウントをリセット
    if (currentFailureCount > 0) {
      jsonData[siteId].failureCount = 0;
      if (jsonData[siteId].status === "inactive") {
        jsonData[siteId].status = "active";
      }
      hasChanged = true;
      console.log(`✅ ${jsonData[siteId].title} 復活 - カウントリセット`);
    }
  } else {
    // URLが無効 - 失敗カウントを増加
    const newFailureCount = currentFailureCount + 1;
    jsonData[siteId].failureCount = newFailureCount;
    hasChanged = true;

    console.log(
      `❌ ${jsonData[siteId].title} 失敗 (${newFailureCount}/${MAX_FAILURE_COUNT})`
    );

    if (newFailureCount >= MAX_FAILURE_COUNT) {
      jsonData[siteId].status = "inactive";
      console.log(`🚫 ${jsonData[siteId].title} をinactiveに変更`);
    }
  }

  return { isUrlOk, hasChanged };
}

// 手動指定サイトの処理
async function processManualSite(siteId, jsonData) {
  const siteData = jsonData[siteId];

  if (!siteData) {
    console.log(`No data found for ID: ${siteId}`);
    return { selectedData: null, hasChanged: false };
  }

  let hasChanged = ensureProperties(siteData, siteId, jsonData);

  // nostr URLの特別処理
  if (siteData.url.startsWith("nostr:")) {
    console.log(`nostrプロトコルのためURLチェックをスキップ: ${siteData.url}`);
    return { selectedData: siteData, hasChanged: hasChanged };
  }

  console.log(`Manual check: ${siteData.title} (${siteData.url})`);
  const isUrlOk = await checkSite(siteData.url);

  const statusResult = updateSiteStatus(siteId, jsonData, isUrlOk);
  hasChanged = hasChanged || statusResult.hasChanged;

  if (!statusResult.isUrlOk) {
    console.log("手動指定のサイトがアクセスできないため投稿を中止します");
    return { selectedData: null, hasChanged, shouldExit: true };
  }

  return { selectedData: siteData, hasChanged };
}

// 自動選択サイトの処理
async function processAutoSelection(filteredIds, jsonData) {
  let attempts = 0;
  const maxAttempts = Math.min(filteredIds.length, 10);
  let hasChanged = false;

  while (attempts < maxAttempts) {
    const randomIndex = Math.floor(Math.random() * filteredIds.length);
    const candidateId = filteredIds[randomIndex];
    const candidateData = jsonData[candidateId];

    hasChanged =
      ensureProperties(candidateData, candidateId, jsonData) || hasChanged;

    console.log(`Checking: ${candidateData.title} (${candidateData.url})`);
    const isUrlOk = await checkSite(candidateData.url);

    const statusResult = updateSiteStatus(candidateId, jsonData, isUrlOk);
    hasChanged = hasChanged || statusResult.hasChanged;

    if (statusResult.isUrlOk) {
      return {
        selectedId: candidateId,
        selectedData: candidateData,
        hasChanged,
      };
    }

    if (
      !statusResult.isUrlOk &&
      jsonData[candidateId].failureCount >= MAX_FAILURE_COUNT
    ) {
      const indexToRemove = filteredIds.indexOf(candidateId);
      if (indexToRemove > -1) {
        filteredIds.splice(indexToRemove, 1);
      }
    }

    attempts++;
  }

  console.log("All attempts failed or no valid sites available");
  return { selectedId: null, selectedData: null, hasChanged };
}

// 投稿内容の生成
function generateContent(siteData, isManual) {
  return `${isManual ? "(手動テスト)\n" : ""}${siteData.title}\n${
    siteData.url
  }\n${siteData.description}${
    siteData.kind ? `\n\n主なkind: ${siteData.kind}` : ""
  } ${
    siteData.category && siteData.category !== ""
      ? `\ncategory: ${siteData.category}`
      : ""
  }`;
}

// データ保存
async function saveData(dataPath, jsonData, hasChanged) {
  if (hasChanged) {
    await writeFile(dataPath, JSON.stringify(jsonData, null, 2));
  }
}

// メイン処理
async function main() {
  const [, , nsec, dataDir, manualId] = process.argv;
  const jsonPath = `${dataDir}/iroiro.json`;
  const logPath = `${dataDir}/postlog.json`;

  // データ読み込み
  const jsonData = JSON.parse(await readFile(jsonPath));
  const jsonDataIds = Object.keys(jsonData);

  let logData;
  try {
    logData = JSON.parse(await readFile(logPath));
  } catch (error) {
    logData = [];
  }

  // ログリセット
  if (logData.length >= jsonDataIds.length) {
    logData = [];
  }

  // 利用可能なIDをフィルタリング
  const filteredIds = jsonDataIds.filter((id) => {
    const site = jsonData[id];
    return !logData.includes(id) && site.status !== "inactive";
  });

  if (filteredIds.length === 0) {
    console.log("No available IDs to post (all posted or inactive)");
    process.exit(0);
  }

  let selectedId,
    selectedData,
    hasChanged = false;

  // サイト選択処理
  if (manualId) {
    const result = await processManualSite(manualId, jsonData);
    selectedData = result.selectedData;
    hasChanged = result.hasChanged;
    selectedId = manualId;

    if (result.shouldExit) {
      await saveData(jsonPath, jsonData, hasChanged);
      process.exit(1);
    }
  } else {
    const result = await processAutoSelection(filteredIds, jsonData);
    selectedId = result.selectedId;
    selectedData = result.selectedData;
    hasChanged = result.hasChanged;
  }

  if (!selectedData) {
    await saveData(jsonPath, jsonData, hasChanged);
    process.exit(0);
  }

  console.log(`Selected: ${selectedData.title}`);

  // 投稿処理
  const content = generateContent(selectedData, !!manualId);
  const pool = new SimplePool();

  const newEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: content,
  };

  const signedEvent = finalizeEvent(newEvent, nsec);

  // ログ更新（手動指定時は除く）
  if (!manualId) {
    logData.push(selectedId);
    await writeFile(logPath, JSON.stringify(logData));
  }

  // データ保存
  await saveData(jsonPath, jsonData, hasChanged);

  // 投稿実行
  await Promise.allSettled(pool.publish(relays, signedEvent));

  process.exit(0);
}

main().catch(console.error);
