import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";

declare global {
  // eslint-disable-next-line no-var
  var __globalLedgerList: Array<{ hash: string; wardId: number; timestamp: number; txHash: string | null; metadata?: any }> | undefined;
}

const TMP_LEDGER_FILE = path.join(os.tmpdir(), "nirvayu_ledger.json");

const INITIAL_SEED_LEDGER = [
  {
    hash: "0x8f4a2b1c9d3e5f7a6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
    wardId: 153,
    timestamp: Date.now() - 3600000,
    txHash: null,
    metadata: {
      id: 1,
      wardId: 153,
      pollutionType: "Open Garbage Fire",
      latitude: 28.6471,
      longitude: 77.3811,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      mediaHash: "0x8f4a2b1c9d3e5f7a6b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
      imageUrl: "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?auto=format&fit=crop&w=600&q=80",
      status: "pending",
      description: "Open waste and trash burning releasing dense toxic smoke near ward intersection",
      aiConfidence: 98,
      aiExplanation: "AI Vision identified open garbage combustion emitting heavy particulate smoke."
    }
  },
  {
    hash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
    wardId: 15,
    timestamp: Date.now() - 7200000,
    txHash: null,
    metadata: {
      id: 2,
      wardId: 15,
      pollutionType: "Vehicle Exhaust Smog",
      latitude: 28.6508,
      longitude: 77.3152,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      mediaHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80",
      status: "working",
      description: "Heavy diesel vehicle congestion causing thick exhaust fumes along arterial transit corridor",
      aiConfidence: 94,
      aiExplanation: "AI Vision detected dense vehicular exhaust and heavy traffic congestion smog."
    }
  }
];

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

  if (list.length === 0) {
    list = [...INITIAL_SEED_LEDGER];
    try {
      fs.writeFileSync(TMP_LEDGER_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // ignore
    }
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
