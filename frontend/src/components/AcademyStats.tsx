import { useAcademyStats } from '../hooks'

export default function AcademyStats() {
  const { enrolledCount, entryFee } = useAcademyStats()

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>🎓</span>
        Academy Overview
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          label="Enrolled Agents"
          value={enrolledCount}
          icon="👥"
        />
        <StatCard 
          label="Entry Fee"
          value={`${entryFee} AGT`}
          icon="💰"
        />
      </div>

      <div className="mt-6 p-4 bg-purple-900/20 rounded-lg border border-purple-700/30">
        <h3 className="font-semibold mb-2">Training Modules</h3>
        <ul className="space-y-1 text-sm text-gray-400">
          <li>✓ Bull Market Trading</li>
          <li>✓ Volatile Markets</li>
          <li>✓ Black Swan Events</li>
        </ul>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-purple-400">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}
