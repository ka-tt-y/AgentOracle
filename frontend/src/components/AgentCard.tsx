import { useAgentStatus } from '../hooks'

export default function AgentCard() {
  const { address, isEnrolled, isCertified, certification } = useAgentStatus()

  if (!address) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <p className="text-gray-400 text-center">Connect wallet to see agent status</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-6 border border-purple-700/30">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>🤖</span>
        Agent Status
      </h2>

      <div className="space-y-3">
        <StatusRow label="Address" value={`${address.slice(0, 8)}...${address.slice(-6)}`} />
        <StatusRow 
          label="Enrolled" 
          value={isEnrolled ? '✅ Yes' : '❌ Not enrolled'}
          highlight={isEnrolled}
        />
        <StatusRow 
          label="Certified" 
          value={isCertified ? '✅ Certified' : '⏳ Pending'}
          highlight={isCertified}
        />

        {isCertified && certification && (
          <>
            <div className="border-t border-gray-700 my-4"></div>
            <StatusRow label="Tier" value={certification.tier} highlight />
            <StatusRow label="Academy Score" value={`${certification.score}/100`} />
            <StatusRow label="Jobs Completed" value={certification.jobsCompleted} />
            <StatusRow label="Average Rating" value={`${(certification.avgRating / 100).toFixed(2)} ⭐`} />
            <StatusRow label="Specialty" value={certification.specialty} />
          </>
        )}

        {!isEnrolled && (
          <button className="w-full mt-4 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors">
            Enroll in Academy (10 AGT)
          </button>
        )}
      </div>
    </div>
  )
}

function StatusRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span className={highlight ? 'text-purple-400 font-semibold' : 'text-white'}>{value}</span>
    </div>
  )
}
