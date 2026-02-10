// ─── Contract Addresses ──────────────────────────────────────────────
// Set via environment variables or defaults to latest deployment
export const CONTRACTS = {
  OracleToken: import.meta.env.VITE_ORACLE_TOKEN,
  IdentityRegistry: import.meta.env.VITE_IDENTITY_REGISTRY,
  ReputationRegistry: import.meta.env.VITE_REPUTATION_REGISTRY,
  HealthMonitor: import.meta.env.VITE_HEALTH_MONITOR,
} as const;

// ─── ABIs ────────────────────────────────────────────────────────────

// OracleToken (ERC-20 token - ORACLE)
export const OracleTokenABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// IdentityRegistry (ERC-8004 / ERC-721)
export const IdentityRegistryABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'metadataURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// HealthMonitor (the main registration + monitoring contract)
export const HealthMonitorABI = [
  // One-transaction onboarding (recommended)
  {
    name: 'onboardAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentURI', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'stakeAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  // Legacy multi-step registration
  {
    name: 'registerForMonitoring',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'endpoint', type: 'string' },
      { name: 'stakeAmount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'addStake',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'disableMonitoring',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [],
  },
  // Read functions
  {
    name: 'getHealthData',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'healthScore', type: 'uint8' },
          { name: 'lastCheckTimestamp', type: 'uint256' },
          { name: 'totalChecks', type: 'uint256' },
          { name: 'successfulChecks', type: 'uint256' },
          { name: 'failedChecks', type: 'uint256' },
          { name: 'totalResponseTime', type: 'uint256' },
          { name: 'consecutiveFailures', type: 'uint256' },
          { name: 'isMonitored', type: 'bool' },
          { name: 'stakedAmount', type: 'uint256' },
          { name: 'endpoint', type: 'string' },
        ],
      },
    ],
  },
  {
    name: 'getHealthScore',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'getUptimePercentage',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAverageResponseTime',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getAgentTrustSummary',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'healthScore', type: 'uint8' },
      { name: 'uptimePercentage', type: 'uint256' },
      { name: 'avgResponseTime', type: 'uint256' },
      { name: 'reputationMean', type: 'int256' },
      { name: 'isActive', type: 'bool' },
      { name: 'status', type: 'string' },
    ],
  },
  {
    name: 'minStakeAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Events
  {
    type: 'event',
    name: 'MonitoringEnabled',
    inputs: [
      { indexed: true, name: 'agentId', type: 'uint256' },
      { indexed: false, name: 'endpoint', type: 'string' },
      { indexed: false, name: 'stakedAmount', type: 'uint256' },
    ],
  },
] as const;

// ReputationRegistry
export const ReputationRegistryABI = [
  {
    name: 'submitFeedback',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'score', type: 'int128' },
      { name: 'category', type: 'uint8' },
      { name: 'tag', type: 'string' },
      { name: 'refId', type: 'string' },
      { name: 'comment', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getSummary',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      { name: 'count', type: 'uint256' },
      { name: 'sum', type: 'int256' },
      { name: 'mean', type: 'int256' },
      { name: 'lastUpdated', type: 'uint256' },
    ],
  },
] as const;

// ─── Type Helpers ────────────────────────────────────────────────────
export type ContractName = keyof typeof CONTRACTS;
export type ContractAddress = `0x${string}`;

export function getContractAddress(name: ContractName): ContractAddress {
  return CONTRACTS[name] as ContractAddress;
}
