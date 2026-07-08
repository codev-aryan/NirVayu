
// Client-side Blockchain Simulation for Immutable Ledger
export class Block {
  index: number;
  timestamp: number;
  data: any;
  previousHash: string;
  nonce: number;
  hash: string;

  constructor(index: number, timestamp: number, data: any, previousHash: string = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = '';
  }

  async calculateHash(): Promise<string> {
    const dataString = this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const cryptoObj = window.crypto;
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async mineBlock(difficulty: number): Promise<void> {
    this.hash = await this.calculateHash();
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
      this.nonce++;
      this.hash = await this.calculateHash();
    }
  }
}

export class Blockchain {
  chain: Block[];
  difficulty: number;

  constructor() {
    this.chain = [];
    this.difficulty = 2;
  }

  async initialize(): Promise<void> {
    const savedChain = localStorage.getItem('pollution_blockchain');
    if (savedChain) {
      try {
        const parsed = JSON.parse(savedChain);
        // Re-instantiate blocks to ensure methods exist
        this.chain = parsed.map((b: any) => {
          const block = new Block(b.index, b.timestamp, b.data, b.previousHash);
          block.nonce = b.nonce;
          block.hash = b.hash;
          return block;
        });
        if (this.chain.length === 0) await this.createGenesis();
      } catch (e) {
        await this.createGenesis();
      }
    } else {
      await this.createGenesis();
    }
  }

  async createGenesis(): Promise<void> {
    const block = new Block(0, Date.now(), { type: "genesis" }, "0");
    await block.mineBlock(this.difficulty);
    this.chain = [block];
    this.save();
  }

  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  async addBlock(data: any): Promise<Block> {
    const prevBlock = this.getLatestBlock();
    const newBlock = new Block(this.chain.length, Date.now(), data, prevBlock.hash);
    await newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    this.save();
    return newBlock;
  }

  save(): void {
    localStorage.setItem('pollution_blockchain', JSON.stringify(this.chain));
  }

  isValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const prev = this.chain[i-1];
      if (current.previousHash !== prev.hash) return false;
    }
    return true;
  }

  getComplaints(): any[] {
    const complaintsMap = new Map();
    const statusUpdates: any[] = [];

    this.chain.forEach(block => {
      if (block.data.type === 'complaint') {
        complaintsMap.set(block.data.id, { 
          ...block.data, 
          blockIndex: block.index, 
          timestamp: block.timestamp, 
          hash: block.hash,
          status: block.data.status || 'pending',
          authorityNotes: block.data.authorityNotes || ''
        });
      } else if (block.data.type === 'status_update') {
        statusUpdates.push(block.data);
      }
    });

    statusUpdates.forEach(update => {
      if (complaintsMap.has(update.complaintId)) {
        const c = complaintsMap.get(update.complaintId);
        c.status = update.newStatus;
        c.authorityNotes = update.notes;
        if (update.newStatus === 'resolved') c.resolvedAt = update.updatedAt;
      }
    });

    return Array.from(complaintsMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }
}

export const pollutionBlockchain = new Blockchain();
