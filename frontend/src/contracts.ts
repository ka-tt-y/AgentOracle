// Contract addresses - UPDATE THESE AFTER DEPLOYMENT
export const CONTRACTS = {
  AgencyToken: '0x...' as `0x${string}`,
  Reputation: '0x...' as `0x${string}`,
  Academy: '0x...' as `0x${string}`,
  Marketplace: '0x...' as `0x${string}`,
}

// ABIs - Minimal versions for frontend
export const ACADEMY_ABI = [
  {
    name: 'isEnrolled',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'hasCertification',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getEnrolledCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'enroll',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'entryFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

export const REPUTATION_ABI = [
  {
    name: 'getCertification',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      { name: 'tier', type: 'uint8' },
      { name: 'academyScore', type: 'uint256' },
      { name: 'jobsCompleted', type: 'uint256' },
      { name: 'avgRating', type: 'uint256' },
      { name: 'specialty', type: 'string' },
    ],
  },
  {
    name: 'isCertified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
] as const

export const MARKETPLACE_ABI = [
  {
    name: 'getOpenJobs',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256[]' }],
  },
  {
    name: 'getJob',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [
      { name: 'client', type: 'address' },
      { name: 'assignedAgent', type: 'address' },
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'payment', type: 'uint256' },
      { name: 'status', type: 'uint8' },
      { name: 'deadline', type: 'uint256' },
      { name: 'rating', type: 'uint256' },
    ],
  },
  {
    name: 'acceptJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'platformRevenue',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const

export const TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const
