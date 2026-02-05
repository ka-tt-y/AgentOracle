import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACTS, ACADEMY_ABI, REPUTATION_ABI, MARKETPLACE_ABI, TOKEN_ABI } from './contracts'

export function useAgentStatus() {
  const { address } = useAccount()
  
  const { data: isEnrolled } = useReadContract({
    address: CONTRACTS.Academy,
    abi: ACADEMY_ABI,
    functionName: 'isEnrolled',
    args: address ? [address] : undefined,
  })

  const { data: isCertified } = useReadContract({
    address: CONTRACTS.Academy,
    abi: ACADEMY_ABI,
    functionName: 'hasCertification',
    args: address ? [address] : undefined,
  })

  const { data: certification } = useReadContract({
    address: CONTRACTS.Reputation,
    abi: REPUTATION_ABI,
    functionName: 'getCertification',
    args: address ? [address] : undefined,
    query: {
      enabled: !!isCertified,
    },
  })

  return {
    address,
    isEnrolled: !!isEnrolled,
    isCertified: !!isCertified,
    certification: certification ? {
      tier: ['UNRANKED', 'C', 'B', 'A', 'S'][Number(certification[0])] || 'UNRANKED',
      score: Number(certification[1]),
      jobsCompleted: Number(certification[2]),
      avgRating: Number(certification[3]) / 20, // Convert from 0-500 to 0-25, then /5 for stars
      specialty: certification[4],
    } : null,
  }
}

export function useAcademyStats() {
  const { data: enrolledCount } = useReadContract({
    address: CONTRACTS.Academy,
    abi: ACADEMY_ABI,
    functionName: 'getEnrolledCount',
  })

  const { data: entryFee } = useReadContract({
    address: CONTRACTS.Academy,
    abi: ACADEMY_ABI,
    functionName: 'entryFee',
  })

  return {
    enrolledCount: Number(enrolledCount || 0),
    entryFee: entryFee ? Number(entryFee) / 1e18 : 10,
  }
}

export function useMarketplace() {
  const { data: openJobIds } = useReadContract({
    address: CONTRACTS.Marketplace,
    abi: MARKETPLACE_ABI,
    functionName: 'getOpenJobs',
  })

  const { data: platformRevenue } = useReadContract({
    address: CONTRACTS.Marketplace,
    abi: MARKETPLACE_ABI,
    functionName: 'platformRevenue',
  })

  return {
    openJobCount: openJobIds?.length || 0,
    openJobIds: openJobIds || [],
    platformRevenue: platformRevenue ? Number(platformRevenue) / 1e18 : 0,
  }
}

export function useEnroll() {
  const { writeContract, data: hash } = useWriteContract()
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash })

  const enroll = async () => {
    // First approve tokens
    writeContract({
      address: CONTRACTS.AgencyToken,
      abi: TOKEN_ABI,
      functionName: 'approve',
      args: [CONTRACTS.Academy, BigInt(10 * 1e18)],
    })
    
    // Then enroll (would need to wait for approval first in production)
    setTimeout(() => {
      writeContract({
        address: CONTRACTS.Academy,
        abi: ACADEMY_ABI,
        functionName: 'enroll',
      })
    }, 2000)
  }

  return { enroll, isLoading, isSuccess }
}
