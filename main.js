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
    this.sitesPath = `${dataDir}/iroiro.json`;
    this.statusPath = `${dataDir}/status.json`;
    this.logPath = `${dataDir}/postlog.json`;
  }

  async loadSites() {
    const data = await readFile(this.sitesPath);
    return JSON.parse(data);
  }

  async loadStatus() {
    try {
      const data = await readFile(this.statusPath);
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  async saveStatus(statusData) {
    await writeFile(this.statusPath, JSON.stringify(statusData, null, 2));
  }

  async loadLogData() {
    try {
      const data = await readFile(this.logPath);
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  async saveLog(logData) {
    await writeFile(this.logPath, JSON.stringify(logData, null, 2));
  }
}

// サイトチェック機能
class SiteChecker {
  static EXEMPT_HOSTS = ["marketplace.visualstudio.com", "scrapbox.io"];

  static async checkSite(url) {
    try {
      const host = new URL(url).hostname;

      // 例外ホストは常にOK
      if (this.EXEMPT_HOSTS.includes(host)) {
        console.log(`例外ホスト: ${host} => 常にOK扱い`);
        return true;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

      const response = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": CONFIG.USER_AGENT },
      });

      clearTimeout(timeoutId);
      console.log(`Fetched ${url} => ${response.status}`);

      if ([403, 429].includes(response.status)) {
        console.warn(`User-Agent制限を検出 (${response.status}) => OK扱い`);
        return true;
      }

      // HEADが405で失敗したらGETで再確認
      if (!response.ok && response.status === 405) {
        const getRes = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: { "User-Agent": CONFIG.USER_AGENT },
        });
        return getRes.ok;
      }

      return response.ok;
    } catch (error) {
      console.error(`Error checking ${url}:`, error.name, error.message);
      if (error.name === "AbortError") console.warn(`Timeout: ${url}`);
      return false;
    }
  }
}

// サイトデータ管理クラス
class SiteDataManager {
  constructor(siteData, statusData) {
    this.siteData = siteData;
    this.statusData = statusData;
  }

  ensureProperties(siteId) {
    if (!this.statusData[siteId]) {
      this.statusData[siteId] = { status: "active", failureCount: 0 };
      return true;
    }
    return false;
  }

  updateSiteStatus(siteId, isOk) {
    const state = this.statusData[siteId] || {
      status: "active",
      failureCount: 0,
    };
    let changed = false;

    if (isOk) {
      if (state.failureCount > 0 || state.status === "inactive") {
        this.statusData[siteId] = { status: "active", failureCount: 0 };
        changed = true;
      }
    } else {
      state.failureCount++;
      if (state.failureCount >= CONFIG.MAX_FAILURE_COUNT) {
        state.status = "inactive";
      }
      this.statusData[siteId] = state;
      changed = true;
    }
    return { changed, isOk };
  }

  getFilteredIds(logData) {
    return Object.keys(this.siteData).filter(
      (id) =>
        !logData.includes(id) && this.statusData[id]?.status !== "inactive"
    );
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

    if (siteData.url.startsWith("nostr:")) {
      console.log(
        `nostrプロトコルのためURLチェックをスキップ: ${siteData.url}`
      );
      return { selectedData: siteData, hasChanged };
    }

    console.log(`Manual check: ${siteData.title} (${siteData.url})`);
    const isUrlOk = await SiteChecker.checkSite(siteData.url);

    const statusResult = this.siteDataManager.updateSiteStatus(siteId, isUrlOk);
    hasChanged = hasChanged || statusResult.changed;

    if (!statusResult.isOk) {
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
      hasChanged = hasChanged || statusResult.changed;

      if (statusResult.isOk) {
        return {
          selectedId: candidateId,
          selectedData: candidateData,
          hasChanged,
        };
      }

      if (
        this.siteDataManager.statusData[candidateId].failureCount >=
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
      const siteData = await this.fileManager.loadSites();
      const statusData = await this.fileManager.loadStatus();
      let logData = await this.fileManager.loadLogData();

      const siteDataManager = new SiteDataManager(siteData, statusData);
      const siteSelector = new SiteSelector(siteDataManager);

      let filteredIds = siteDataManager.getFilteredIds(logData);

      if (filteredIds.length === 0) {
        logData = [];
        await this.fileManager.saveLog(logData);
        filteredIds = siteDataManager.getFilteredIds(logData);
        console.log("利用可能なIDがないため、ログをリセットしました");
      }

      let selectedId,
        selectedData,
        hasChanged = false;

      if (this.manualId) {
        const result = await siteSelector.processManualSite(this.manualId);
        selectedData = result.selectedData;
        hasChanged = result.hasChanged;
        selectedId = this.manualId;

        if (result.shouldExit) {
          await this.fileManager.saveStatus(statusData);
          process.exit(1);
        }
      } else {
        const result = await siteSelector.processAutoSelection(filteredIds);
        selectedId = result.selectedId;
        selectedData = result.selectedData;
        hasChanged = result.hasChanged;
      }

      if (!selectedData) {
        await this.fileManager.saveStatus(statusData);
        process.exit(0);
      }

      console.log(`Selected: ${selectedData.title}`);

      const content = NostrPublisher.generateContent(
        selectedData,
        !!this.manualId
      );
      await NostrPublisher.publish(content, this.nsec);

      if (!this.manualId) {
        logData.push(selectedId);
        await this.fileManager.saveLog(logData);
      }

      if (hasChanged) {
        await this.fileManager.saveStatus(statusData);
      }

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
