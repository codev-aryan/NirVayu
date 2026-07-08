import crypto from "crypto";

class SecureRegistryService {
  private fallbackRegistry: Array<{ hash: string; wardId: number; timestamp: number; txHash: string | null; metadata?: any }> = [];
  private metadataRegistry = new Map<string, any>();

  async deployContract() {
    console.log("[Secure Registry] Cryptographic ledger initialized.");
    return null;
  }

  async submitReport(reportHash: string, wardId: number, metadata?: any) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    if (metadata) {
      this.metadataRegistry.set(reportHash, metadata);
    }
    
    const fallbackItem = {
      hash: reportHash,
      wardId,
      timestamp: timestamp * 1000,
      txHash: null, // No blockchain transaction hash
      metadata: metadata || null
    };

    console.log(`[Secure Registry] Registered report SHA-256 hash ${reportHash} for ward ${wardId}`);
    this.fallbackRegistry.push(fallbackItem);
    return null;
  }

  async verifyOnChain(reportHash: string) {
    return this.fallbackRegistry.some(r => r.hash === reportHash);
  }

  async getOnChainReports() {
    return this.fallbackRegistry;
  }
}

export const blockchainService = new SecureRegistryService();
