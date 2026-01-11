
// Client-side Blockchain Simulation for Immutable Ledger
class Block {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = '';
  }

  async calculateHash() {
    const dataString = this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce;
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async mineBlock(difficulty) {
    this.hash = await this.calculateHash();
    while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
      this.nonce++;
      this.hash = await this.calculateHash();
    }
  }
}

class Blockchain {
  constructor() {
    this.chain = [];
    this.difficulty = 2;
  }

  async initialize() {
    const savedChain = localStorage.getItem('pollution_blockchain');
    if (savedChain) {
      try {
        const parsed = JSON.parse(savedChain);
        this.chain = parsed;
        if (this.chain.length === 0) await this.createGenesis();
      } catch (e) {
        await this.createGenesis();
      }
    } else {
      await this.createGenesis();
    }
  }

  async createGenesis() {
    const block = new Block(0, Date.now(), { type: "genesis" }, "0");
    await block.mineBlock(this.difficulty);
    this.chain = [block];
    this.save();
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  async addBlock(data) {
    const prevBlock = this.getLatestBlock();
    const newBlock = new Block(this.chain.length, Date.now(), data, prevBlock.hash);
    await newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);
    this.save();
    return newBlock;
  }

  save() {
    localStorage.setItem('pollution_blockchain', JSON.stringify(this.chain));
  }

  isValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const prev = this.chain[i-1];
      if (current.previousHash !== prev.hash) return false;
    }
    return true;
  }

  getComplaints() {
    const complaintsMap = new Map();
    const statusUpdates = [];

    this.chain.forEach(block => {
      if (block.data.type === 'complaint') {
        complaintsMap.set(block.data.id, { ...block.data, blockIndex: block.index, timestamp: block.timestamp, hash: block.hash });
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

    return Array.from(complaintsMap.values());
  }
}

export const pollutionBlockchain = new Blockchain();
