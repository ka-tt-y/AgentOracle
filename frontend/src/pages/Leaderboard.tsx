import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { fetchLeaderboard } from '../api'
import type { LeaderboardEntry } from '../api'

export default function Leaderboard() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLeaderboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLeaderboard()
      setAgents(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaderboard()
    // Refresh every 60 seconds
    const interval = setInterval(loadLeaderboard, 60000)
    return () => clearInterval(interval)
  }, [])

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
          <p className="text-xl text-gray-300 font-medium">Agents ranked by health score and the most reliable get the most trust</p>
          <button
            onClick={loadLeaderboard}
            disabled={loading}
            className="mt-4 px-4 py-2 bg-amber-900/50 hover:bg-amber-800/50 text-amber-300 rounded-lg flex items-center gap-2 mx-auto transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 p-4 rounded-xl bg-red-900/30 border border-red-700/50 flex items-center gap-3"
          >
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <span className="text-red-300">{error}</span>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && agents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <RefreshCw className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading leaderboard...</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && agents.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-gray-400 text-xl">No agents on leaderboard yet</p>
            <p className="text-gray-500 mt-2">Register your agent to compete!</p>
          </motion.div>
        )}

        {/* Top 3 Podium - only show if we have data */}
        {agents.length >= 3 && (
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {/* 2nd Place */}
          <motion.div
            whileHover={{ y: -10 }}
            onClick={() => navigate(`/agent/${agents[1].agentId}`)}
            className="p-6 rounded-2xl bg-gradient-to-br from-red-900/30 to-amber-900/20 border border-amber-700/30 text-center order-first md:order-1 backdrop-blur-sm cursor-pointer"
          >
            <div className="text-5xl mb-3">🥈</div>
            <h3 className="text-2xl font-black text-amber-100 mb-2 tracking-wide">
              {agents[1].name || `Agent #${agents[1].agentId}`}
            </h3>
            <div className="flex justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-amber-600/30 text-amber-400 text-sm font-bold rounded-lg border border-amber-500/50 tracking-wider">
                HEALTH: {agents[1].healthScore}
              </span>
            </div>
            <div className="text-3xl font-black text-amber-400 tracking-wider">{agents[1].uptime.toFixed(1)}%</div>
          </motion.div>

          {/* 1st Place */}
          <motion.div
            whileHover={{ y: -10 }}
            onClick={() => navigate(`/agent/${agents[0].agentId}`)}
            className="p-8 rounded-2xl bg-gradient-to-br from-red-900/40 to-amber-900/30 border-2 border-amber-500 text-center ring-2 ring-amber-400/50 md:scale-105 order-2 backdrop-blur-sm cursor-pointer"
          >
            <div className="text-6xl mb-4 animate-bounce">👑</div>
            <h3 className="text-3xl font-black bg-gradient-to-r from-red-300 to-yellow-500 bg-clip-text text-transparent mb-3 tracking-wider">
              {agents[0].name || `Agent #${agents[0].agentId}`}
            </h3>
            <div className="flex justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-gradient-to-r from-red-900 to-amber-900 text-amber-100 text-sm font-bold rounded-lg border border-amber-400 tracking-wider">
                {agents[0].healthScore === 100 ? 'PERFECT HEALTH' : `HEALTH: ${agents[0].healthScore}`}
              </span>
            </div>
            <div className="text-4xl font-black text-amber-300 mb-2 tracking-wider">{agents[0].uptime.toFixed(1)}%</div>
            <div className="text-sm text-amber-200 font-medium">Reputation: {agents[0].reputation.toFixed(1)} ⭐</div>
          </motion.div>

          {/* 3rd Place */}
          <motion.div
            whileHover={{ y: -10 }}
            onClick={() => navigate(`/agent/${agents[2].agentId}`)}
            className="p-6 rounded-2xl bg-gradient-to-br from-yellow-900/30 to-red-950/30 border border-yellow-700/30 text-center order-last md:order-3 backdrop-blur-sm cursor-pointer"
          >
            <div className="text-5xl mb-3">🥉</div>
            <h3 className="text-2xl font-black text-amber-100 mb-2 tracking-wide">
              {agents[2].name || `Agent #${agents[2].agentId}`}
            </h3>
            <div className="flex justify-center gap-2 mb-4">
              <span className="px-3 py-1 bg-orange-600/30 text-orange-400 text-sm font-bold rounded-lg border border-orange-500/50 tracking-wider">
                HEALTH: {agents[2].healthScore}
              </span>
            </div>
            <div className="text-3xl font-black text-orange-400 tracking-wider">{agents[2].uptime.toFixed(1)}%</div>
          </motion.div>
        </motion.div>
        )}

        {/* Full Rankings */}
        {agents.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          {agents.map((agent, idx) => (
            <motion.div
              key={agent.agentId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.05 }}
              whileHover={{ x: 10 }}
              onClick={() => navigate(`/agent/${agent.agentId}`)}
              className="group p-4 rounded-xl bg-gradient-to-r from-gray-900/80 to-red-950/30 border border-red-900/30 hover:border-amber-700/50 transition-all cursor-pointer backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-900 to-amber-900 flex items-center justify-center font-bold text-amber-100 tracking-wider">
                    #{agent.rank}
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-100 text-lg tracking-wide">
                      {agent.name || `Agent #${agent.agentId}`}
                    </h4>
                    <p className="text-gray-400 text-sm font-medium">{agent.feedbackCount} feedbacks</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-sm text-gray-400 tracking-wider">HEALTH</div>
                    <div className="font-black text-green-400 text-lg">{agent.healthScore}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 tracking-wider">UPTIME</div>
                    <div className="font-bold text-amber-400">{agent.uptime.toFixed(1)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-400 tracking-wider">REP</div>
                    <div className="text-xl font-black text-yellow-400">{agent.reputation.toFixed(1)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${agents[0] ? (agent.healthScore / agents[0].healthScore) * 100 : 0}%` }}
                  transition={{ delay: 0.5 + idx * 0.05, duration: 0.8 }}
                  className="h-full bg-gradient-to-r from-red-900 to-amber-600"
                ></motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        )}
      </div>
    </div>
  )
}
