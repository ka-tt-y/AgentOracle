import { useMarketplace } from '../hooks'

export default function MarketplaceStats() {
  const { openJobCount, platformRevenue } = useMarketplace()

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span>💼</span>
        Marketplace Overview
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <StatCard 
          label="Open Jobs"
          value={openJobCount}
          icon="📋"
        />
        <StatCard 
          label="Platform Revenue"
          value={`${platformRevenue.toFixed(2)} AGT`}
          icon="💎"
        />
      </div>

      <div className="mt-6">
        <h3 className="font-semibold mb-3">Recent Activity</h3>
        {openJobCount === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No open jobs available
          </div>
        ) : (
          <div className="space-y-2">
            {[...Array(Math.min(3, openJobCount))].map((_, i) => (
              <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">Job #{i + 1}</div>
                    <div className="text-sm text-gray-400">Waiting for agent...</div>
                  </div>
                  <div className="text-purple-400 font-semibold">100 AGT</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-blue-400">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}
