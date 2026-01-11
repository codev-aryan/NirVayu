import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// ABI will be generated after compilation, but we define the interface here for ethers
const CONTRACT_ABI = [
  "function reportPollution(bytes32 _hash, uint256 _wardId) public",
  "function getReportsByWard(uint256 _wardId) public view returns (tuple(bytes32 hash, uint256 wardId, uint256 timestamp, address reporter)[])",
  "function verifyReport(bytes32 _hash) public view returns (bool)",
  "event ReportSubmitted(bytes32 indexed reportHash, uint256 indexed wardId, address indexed reporter)"
];

class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract | null = null;
  private contractAddress: string | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    // Hardhat first default private key
    this.wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", this.provider);
  }

  async deployContract() {
    try {
      console.log("[Blockchain] Attempting to connect to Hardhat node and deploy...");
      const factory = new ethers.ContractFactory(CONTRACT_ABI, "0x", this.wallet);
      // For demo purposes, we'll try to find an existing contract or deploy a new one
      // In a real hackathon demo, we'd have a persistent address
      const contract = await factory.deploy();
      await contract.waitForDeployment();
      this.contractAddress = await contract.getAddress();
      this.contract = new ethers.Contract(this.contractAddress, CONTRACT_ABI, this.wallet);
      console.log(`[Blockchain] Contract deployed at: ${this.contractAddress}`);
      return this.contractAddress;
    } catch (e) {
      console.error("[Blockchain] Error in deployment:", e);
    }
  }

  setContractAddress(address: string) {
    this.contractAddress = address;
    this.contract = new ethers.Contract(address, CONTRACT_ABI, this.wallet);
    console.log(`[Blockchain] Contract linked at: ${address}`);
  }

  async submitReport(reportHash: string, wardId: number) {
    if (!this.contract) throw new Error("Contract not initialized");
    
    console.log(`[Blockchain] Submitting report hash ${reportHash} for ward ${wardId}`);
    const tx = await this.contract.reportPollution(reportHash, wardId);
    const receipt = await tx.wait();
    console.log(`[Blockchain] Report verified in block ${receipt.blockNumber}. Tx: ${receipt.hash}`);
    return receipt.hash;
  }

  async verifyOnChain(reportHash: string) {
    if (!this.contract) return false;
    return await this.contract.verifyReport(reportHash);
  }
}

export const blockchainService = new BlockchainService();
