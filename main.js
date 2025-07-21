import "websocket-polyfill";
import { readFile, writeFile } from "fs/promises";
import { SimplePool, finalizeEvent } from "nostr-tools";

// 定数
const CONFIG = {
  TIMEOUT: 8000,
  MAX_FAILURE_COUNT: 5,
  MAX_ATTEMPTS: 10,
  USER_AGENT: "Mozilla/5.0 (compatible; NostrBot/1.0)",
};

const RELAYS = [
  "wss://yabu.me",
  "wss://r.kojira.io/",
  "wss://nos.lol",
  "wss://relay-jp.nostr.moctane.com/",
  "wss://relay.nostr.band",
  "wss://relay.nostr.wirednet.jp/",
];

// ファイル操作クラス
class FileManager {
  constructor(dataDir) {
    this.jsonPath = `${dataDir}/iroiro.json`;
    this.logPath = `${dataDir}/postlog.json`;
  }

  async loadSiteData() {
    try {
      const data = await readFile(this.jsonPath);
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`サイトデータの読み込みに失敗: ${error.message}`);
    }
  }

  async loadLogData() {
    try {
      const data = await readFile(this.logPath);
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async saveData(data, hasChanged) {
    if (hasChanged) {
      await writeFile(this.jsonPath, JSON.stringify(data, null, 2));
    }
  }

  async saveLog(logData) {
    await writeFile(this.logPath, JSON.stringify(logData));
  }
}

// サイトチェック機能
class SiteChecker {
  static async checkSite(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

      const isScrapbox = url.includes("scrapbox.io");
      // Scrapboxはステータスが404でも存在すると見なす
      // GETでもHEADでもなにしても404しか返ってこない
      if (isScrapbox) {
        console.log(`Scrapbox.io 対応: ステータスに関わらず true`);
        return true;
      }

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": CONFIG.USER_AGENT || "Mozilla/5.0",
        },
      });

      clearTimeout(timeoutId);

      console.log(`Fetched ${url} => ${response.status}`);

      // ブロック系はOK扱い
      if ([403, 429].includes(response.status)) {
        console.warn(
          `User-Agent blocked or rate-limited for ${url}, but treating as available`
        );
        return true;
      }

      return response.ok;
    } catch (error) {
      console.error(`Error checking ${url}:`, error.name, error.message);
      if (error.name === "AbortError") {
        console.warn(`Timeout while checking: ${url}`);
      }
      return false;
    }
  }
}

// サイトデータ管理クラス
class SiteDataManager {
  constructor(siteData) {
    this.siteData = siteData;
  }

  ensureProperties(siteId) {
    const site = this.siteData[siteId];
    let hasChanged = false;

    if (!site.hasOwnProperty("status")) {
      site.status = "active";
      hasChanged = true;
    }
    if (!site.hasOwnProperty("failureCount")) {
      site.failureCount = 0;
      hasChanged = true;
    }

    return hasChanged;
  }

  updateSiteStatus(siteId, isUrlOk) {
    const site = this.siteData[siteId];
    const currentFailureCount = site.failureCount || 0;
    let hasChanged = false;

    if (isUrlOk) {
      if (currentFailureCount > 0) {
        site.failureCount = 0;
        if (site.status === "inactive") {
          site.status = "active";
        }
        hasChanged = true;
        console.log(`✅ ${site.title} 復活 - カウントリセット`);
      }
    } else {
      const newFailureCount = currentFailureCount + 1;
      site.failureCount = newFailureCount;
      hasChanged = true;

      console.log(
        `❌ ${site.title} 失敗 (${newFailureCount}/${CONFIG.MAX_FAILURE_COUNT})`
      );

      if (newFailureCount >= CONFIG.MAX_FAILURE_COUNT) {
        site.status = "inactive";
        console.log(`🚫 ${site.title} をinactiveに変更`);
      }
    }

    return { isUrlOk, hasChanged };
  }

  getFilteredIds(logData) {
    return Object.keys(this.siteData).filter((id) => {
      const site = this.siteData[id];
      return !logData.includes(id) && site.status !== "inactive";
    });
  }
}

// サイト選択機能
class SiteSelector {
  constructor(siteDataManager) {
    this.siteDataManager = siteDataManager;
  }

  async processManualSite(siteId) {
    const siteData = this.siteDataManager.siteData[siteId];

    if (!siteData) {
      console.log(`No data found for ID: ${siteId}`);
      return { selectedData: null, hasChanged: false };
    }

    let hasChanged = this.siteDataManager.ensureProperties(siteId);

    // nostr URLの特別処理
    if (siteData.url.startsWith("nostr:")) {
      console.log(
        `nostrプロトコルのためURLチェックをスキップ: ${siteData.url}`
      );
      return { selectedData: siteData, hasChanged };
    }

    console.log(`Manual check: ${siteData.title} (${siteData.url})`);
    const isUrlOk = await SiteChecker.checkSite(siteData.url);

    const statusResult = this.siteDataManager.updateSiteStatus(siteId, isUrlOk);
    hasChanged = hasChanged || statusResult.hasChanged;

    if (!statusResult.isUrlOk) {
      console.log("手動指定のサイトがアクセスできないため投稿を中止します");
      return { selectedData: null, hasChanged, shouldExit: true };
    }

    return { selectedData: siteData, hasChanged };
  }

  async processAutoSelection(filteredIds) {
    let attempts = 0;
    const maxAttempts = Math.min(filteredIds.length, CONFIG.MAX_ATTEMPTS);
    let hasChanged = false;
    const workingIds = [...filteredIds];

    while (attempts < maxAttempts && workingIds.length > 0) {
      const randomIndex = Math.floor(Math.random() * workingIds.length);
      const candidateId = workingIds[randomIndex];
      const candidateData = this.siteDataManager.siteData[candidateId];

      hasChanged =
        this.siteDataManager.ensureProperties(candidateId) || hasChanged;

      // nostr URLの特別処理
      if (candidateData.url.startsWith("nostr:")) {
        console.log(
          `nostrプロトコルのためURLチェックをスキップ: ${candidateData.url}`
        );
        return {
          selectedId: candidateId,
          selectedData: candidateData,
          hasChanged,
        };
      }

      console.log(`Checking: ${candidateData.title} (${candidateData.url})`);
      const isUrlOk = await SiteChecker.checkSite(candidateData.url);

      const statusResult = this.siteDataManager.updateSiteStatus(
        candidateId,
        isUrlOk
      );
      hasChanged = hasChanged || statusResult.hasChanged;

      if (statusResult.isUrlOk) {
        return {
          selectedId: candidateId,
          selectedData: candidateData,
          hasChanged,
        };
      }

      if (
        this.siteDataManager.siteData[candidateId].failureCount >=
        CONFIG.MAX_FAILURE_COUNT
      ) {
        workingIds.splice(workingIds.indexOf(candidateId), 1);
      }

      attempts++;
    }

    console.log("All attempts failed or no valid sites available");
    return { selectedId: null, selectedData: null, hasChanged };
  }
}

// 投稿機能
class NostrPublisher {
  static generateContent(siteData, isManual) {
    const parts = [
      isManual ? "(手動テスト)" : "",
      siteData.title,
      siteData.url,
      siteData.description,
      siteData.kind ? `\n主なkind: ${siteData.kind}` : "",
      siteData.category && siteData.category !== ""
        ? `\ncategory: ${siteData.category}`
        : "",
    ];

    return parts.filter((part) => part !== "").join("\n");
  }

  static async publish(content, nsec) {
    const pool = new SimplePool();

    const newEvent = {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: content,
    };

    const signedEvent = finalizeEvent(newEvent, nsec);
    await Promise.allSettled(pool.publish(RELAYS, signedEvent));
  }
}

// メインアプリケーションクラス
class NostrSiteBot {
  constructor(nsec, dataDir, manualId = null) {
    this.nsec = nsec;
    this.manualId = manualId;
    this.fileManager = new FileManager(dataDir);
  }

  async run() {
    try {
      // データ読み込み
      const siteData = await this.fileManager.loadSiteData();
      let logData = await this.fileManager.loadLogData();

      const siteDataManager = new SiteDataManager(siteData);
      const siteSelector = new SiteSelector(siteDataManager);

      // ログリセット処理

      // 利用可能なIDをフィルタリング
      let filteredIds = siteDataManager.getFilteredIds(logData);

      // 利用可能なIDがない場合はログをリセットして再フィルタリング
      if (filteredIds.length === 0) {
        logData = [];
        await this.fileManager.saveLog(logData);
        filteredIds = siteDataManager.getFilteredIds(logData);
        console.log("利用可能なIDがないため、ログをリセットしました");
      }

      let selectedId,
        selectedData,
        hasChanged = false;

      // サイト選択処理
      if (this.manualId) {
        const result = await siteSelector.processManualSite(this.manualId);
        selectedData = result.selectedData;
        hasChanged = result.hasChanged;
        selectedId = this.manualId;

        if (result.shouldExit) {
          await this.fileManager.saveData(siteData, hasChanged);
          process.exit(1);
        }
      } else {
        const result = await siteSelector.processAutoSelection(filteredIds);
        selectedId = result.selectedId;
        selectedData = result.selectedData;
        hasChanged = result.hasChanged;
      }

      if (!selectedData) {
        await this.fileManager.saveData(siteData, hasChanged);
        process.exit(0);
      }

      console.log(`Selected: ${selectedData.title}`);

      // 投稿処理
      const content = NostrPublisher.generateContent(
        selectedData,
        !!this.manualId
      );
      await NostrPublisher.publish(content, this.nsec);

      // ログ更新（手動指定時は除く）
      if (!this.manualId) {
        logData.push(selectedId);
        await this.fileManager.saveLog(logData);
      }

      // データ保存
      await this.fileManager.saveData(siteData, hasChanged);

      process.exit(0);
    } catch (error) {
      console.error("エラーが発生しました:", error);
      process.exit(1);
    }
  }
}

// メイン実行
async function main() {
  const [, , nsec, dataDir, manualId] = process.argv;

  if (!nsec || !dataDir) {
    console.error("使用方法: node script.js <nsec> <dataDir> [manualId]");
    process.exit(1);
  }

  const bot = new NostrSiteBot(nsec, dataDir, manualId);
  await bot.run();
}

main().catch(console.error);
