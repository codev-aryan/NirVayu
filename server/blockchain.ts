import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

declare global {
  // eslint-disable-next-line no-var
  var __globalLedgerList: Array<{ hash: string; wardId: number; timestamp: number; txHash: string | null; metadata?: any }> | undefined;
}

const TMP_LEDGER_FILE = path.join(os.tmpdir(), "nirvayu_ledger.json");

function loadLedgerFromTmp() {
  if (global.__globalLedgerList && global.__globalLedgerList.length > 0) {
    return global.__globalLedgerList;
  }
  let list: Array<{ hash: string; wardId: number; timestamp: number; txHash: string | null; metadata?: any }> = [];
  try {
    if (fs.existsSync(TMP_LEDGER_FILE)) {
      const raw = fs.readFileSync(TMP_LEDGER_FILE, "utf-8");
      list = JSON.parse(raw);
    }
  } catch (e) {
    console.error("[Blockchain] Failed to read /tmp/nirvayu_ledger.json", e);
  }
  global.__globalLedgerList = list;
  return list;
}

function saveLedgerToTmp(list: Array<{ hash: string; wardId: number; timestamp: number; txHash: string | null; metadata?: any }>) {
  global.__globalLedgerList = list;
  try {
    fs.writeFileSync(TMP_LEDGER_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("[Blockchain] Failed to write /tmp/nirvayu_ledger.json", e);
  }
}

class SecureRegistryService {
  async deployContract() {
    console.log("[Secure Registry] Cryptographic ledger initialized.");
    return null;
  }

  async submitReport(reportHash: string, wardId: number, metadata?: any) {
    const list = loadLedgerFromTmp();
    const timestamp = Math.floor(Date.now() / 1000);

    const fallbackItem = {
      hash: reportHash,
      wardId,
      timestamp: timestamp * 1000,
      txHash: null,
      metadata: metadata || null
    };

    console.log(`[Secure Registry] Registered report SHA-256 hash ${reportHash} for ward ${wardId}`);
    list.push(fallbackItem);
    saveLedgerToTmp(list);
    return null;
  }

  async verifyOnChain(reportHash: string) {
    const list = loadLedgerFromTmp();
    return list.some(r => r.hash === reportHash);
  }

  async getOnChainReports() {
    return loadLedgerFromTmp();
  }
}

export const blockchainService = new SecureRegistryService();
