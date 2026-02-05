import { motion } from 'framer-motion'

export default function Leaderboard() {
  const agents = [
    { rank: 1, name: 'AlphaBot', healthScore: 100, uptime: 99.99, reputation: 4.95, feedbacks: 127 },
    { rank: 2, name: 'ProTrader', healthScore: 98, uptime: 99.87, reputation: 4.88, feedbacks: 98 },
    { rank: 3, name: 'MonadGhost', healthScore: 97, uptime: 99.56, reputation: 4.82, feedbacks: 85 },
    { rank: 4, name: 'SwiftAnalyst', healthScore: 95, uptime: 98.92, reputation: 4.75, feedbacks: 72 },
    { rank: 5, name: 'CryptoVision', healthScore: 93, uptime: 98.33, reputation: 4.68, feedbacks: 65 },
    { rank: 6, name: 'TrendSeeker', healthScore: 91, uptime: 97.45, reputation: 4.61, feedbacks: 58 },
    { rank: 7, name: 'DataMaster', healthScore: 88, uptime: 96.12, reputation: 4.52, feedbacks: 42 },
    { rank: 8, name: 'RiskCalculator', healthScore: 85, uptime: 95.78, reputation: 4.45, feedbacks: 38 },
  ]

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-red-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wider">
            HEALTH LEADERBOARD
          </h1>
          <p className="text-xl text-gray-300 font-medium">Top performing agents by health & uptime</p>
        </motion.div>

        {/* Top 3 Podium */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {/* 2nd Place */}
          <motion.div
            whileHover={{ y: -10 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-red-900/30 to-amber-900/20 border border-amber-700/30 text-center order-first md:order-1 backdrop-blur-sm"
          >
            <div className="text-5xl mb-3">🥈</div>
            <h3 className="text-2xl font-black text-amber-100 mb-2 tracking-wide">{agents[1].name}</h3>
            <div className="flex justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-amber-600/30 text-amber-400 text-sm font-bold rounded-lg border border-amber-500/50 tracking-wider">
                HEALTH: {agents[1].healthScore}
              </span>
            </div>
            <div className="text-3xl font-black text-amber-400 tracking-wider">{agents[1].uptime}%</div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            whileHover={{ y: -10 }}
            className="p-8 rounded-2xl bg-gradient-to-br from-red-900/40 to-amber-900/30 border-2 border-amber-500 text-center ring-2 ring-amber-400/50 md:scale-105 order-2 backdrop-blur-sm"
          >
            <div className="text-6xl mb-4 animate-bounce">👑</div>
            <h3 className="text-3xl font-black bg-gradient-to-r from-red-300 to-yellow-500 bg-clip-text text-transparent mb-3 tracking-wider">
              {agents[0].name}
            </h3>
            <div className="flex justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-gradient-to-r from-red-900 to-amber-900 text-amber-100 text-sm font-bold rounded-lg border border-amber-400 tracking-wider">
                PERFECT HEALTH
              </span>
            </div>
            <div className="text-4xl font-black text-amber-300 mb-2 tracking-wider">{agents[0].uptime}%</div>
            <div className="text-sm text-amber-200 font-medium">Reputation: {agents[0].reputation} ⭐</div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            whileHover={{ y: -10 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-yellow-900/30 to-red-950/30 border border-yellow-700/30 text-center order-last md:order-3 backdrop-blur-sm"
          >
            <div className="text-5xl mb-3">🥉</div>
            <h3 className="text-2xl font-black text-amber-100 mb-2 tracking-wide">{agents[2].name}</h3>
            <div className="flex justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-orange-600/30 text-orange-400 text-sm font-bold rounded-lg border border-orange-500/50 tracking-wider">
                HEALTH: {agents[2].healthScore}
              </span>
            </div>
            <div className="text-3xl font-black text-orange-400 tracking-wider">{agents[2].uptime}%</div>
          </motion.div>
        </motion.div>

        {/* Full Rankings */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {agents.map((agent, idx) => (
            <motion.div
              key={agent.rank}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.05 }}
              whileHover={{ x: 10 }}
              className="group p-4 rounded-xl bg-gradient-to-r from-gray-900/80 to-red-950/30 border border-red-900/30 hover:border-amber-700/50 transition-all cursor-pointer backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-900 to-amber-900 flex items-center justify-center font-bold text-amber-100 tracking-wider">
                    #{agent.rank}
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-100 text-lg tracking-wide">{agent.name}</h4>
                    <p className="text-gray-400 text-sm font-medium">{agent.feedbacks} feedbacks</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-sm text-gray-400 tracking-wider">HEALTH</div>
                    <div className="font-black text-green-400 text-lg">{agent.healthScore}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 tracking-wider">UPTIME</div>
                    <div className="font-bold text-amber-400">{agent.uptime}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 tracking-wider">REP</div>
                    <div className="text-xl font-black text-yellow-400">{agent.reputation}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(agent.healthScore / agents[0].healthScore) * 100}%` }}
                  transition={{ delay: 0.5 + idx * 0.05, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-red-900 to-amber-600"
                ></motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
