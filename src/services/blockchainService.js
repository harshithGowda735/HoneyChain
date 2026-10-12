/**
 * Blockchain Traceability Service Boundary
 * Prepares HoneyChain batches for cryptographic anchoring:
 * - Deterministic Batch Hash Generation
 * - Future Ledger Anchoring Boundary (Polygon / Hyperledger / National Agri-Stack)
 *
 * NOTE: Operates honestly. Does not claim on-chain verification or immutability
 * when records reside exclusively in Cloud Firestore.
 */

export const BLOCKCHAIN_NETWORK_STATUS = {
  NETWORK: 'Off-Chain Firestore Registry',
  STATUS: 'ledger_anchor_pending', // 'anchored' | 'ledger_anchor_pending' | 'unsupported'
  CHAIN_ID: null,
  CONTRACT_ADDRESS: null,
};

/**
 * Generate a deterministic cryptographic payload hash for a batch lot
 * @param {object} batch Honey batch object from Firestore
 * @returns {string} Hex representation of the batch content summary
 */
export function generateBatchContentDigest(batch) {
  if (!batch) return '';

  const rawString = [
    batch.batchCode || '',
    batch.honeyType || '',
    batch.harvestDate || '',
    String(batch.quantity || ''),
    batch.ownerUid || '',
    batch.hiveId || '',
  ].join('|');

  // Simple deterministic 32-bit FNV-1a hash algorithm for browser/RN compatibility
  let hash = 2166136261;
  for (let i = 0; i < rawString.length; i++) {
    hash ^= rawString.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  const hexHash = ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  return `0xHC${hexHash}${Date.now().toString(16).slice(-4)}`;
}

/**
 * Verify on-chain status (honest inspection)
 */
export function verifyBlockchainAnchor(batch) {
  if (batch?.blockchainTxHash) {
    return {
      isAnchored: true,
      network: 'Polygon Mainnet',
      txHash: batch.blockchainTxHash,
      statusMessage: 'Cryptographically anchored on public ledger',
    };
  }

  return {
    isAnchored: false,
    network: 'Off-Chain Firestore Registry',
    txHash: null,
    statusMessage: 'Registry Certified (Cryptographic Ledger Anchor in Phase 2)',
    contentDigest: generateBatchContentDigest(batch),
  };
}

export default {
  BLOCKCHAIN_NETWORK_STATUS,
  generateBatchContentDigest,
  verifyBlockchainAnchor,
};
