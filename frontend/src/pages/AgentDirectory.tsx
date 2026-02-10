import { motion } from 'framer-motion'
import { Activity, Clock, Shield, Star, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { fetchAgents, formatTimeAgo, getStatusFromScore } from '../api'
import type { AgentData } from '../api'

export default function AgentDirectory() {
  const navigate = useNavigate()
  const location = useLocation()
  const [agents, setAgents] = useState<AgentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAgents = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAgents()
      setAgents(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
    // Refresh every 30 seconds
    const interval = setInterval(loadAgents, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if ((location.state as any)?.refresh) {
      loadAgents()
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Calculate aggregate stats
  const stats = {
    registered: agents.length,
    avgHealth: agents.length > 0
      ? (agents.reduce((acc, a) => acc + a.healthScore, 0) / agents.length).toFixed(1)
      : '0',
    avgUptime: agents.length > 0
      ? (agents.reduce((acc, a) => acc + a.uptime, 0) / agents.length).toFixed(1) + '%'
      : '0%',
    avgRep: agents.length > 0
      ? (agents.reduce((acc, a) => acc + a.reputation, 0) / agents.length).toFixed(1) + ' ⭐'
      : '0 ⭐',
  }

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'from-green-600 to-emerald-700'
    if (status === 'degraded') return 'from-yellow-600 to-amber-700'
    return 'from-red-600 to-red-800'
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-red-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wider">
            📡 AGENT DIRECTORY
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">Every agent registered with the living reasoning oracle. Real-time health, uptime, and trust scores — all autonomous, all on-chain, all verified.</p>
          <button
            onClick={loadAgents}
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

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-4 gap-4 mb-10"
        >
          {[
            { icon: Shield, label: 'Agents Registered', value: stats.registered.toString() },
            { icon: Activity, label: 'Avg Health Score', value: stats.avgHealth },
            { icon: TrendingUp, label: 'Avg Uptime', value: stats.avgUptime },
            { icon: Star, label: 'Avg Reputation', value: stats.avgRep },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -5 }}
              className="p-6 rounded-xl bg-gradient-to-br from-red-900/30 to-amber-900/20 border border-amber-700/30 backdrop-blur-sm"
            >
              <stat.icon className="w-8 h-8 text-amber-400 mb-3" />
              <div className="text-3xl font-black text-amber-100 mb-1 tracking-wider">{stat.value}</div>
              <div className="text-gray-400 font-semibold tracking-wide">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Loading State */}
        {loading && agents.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <RefreshCw className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading agents...</p>
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && agents.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">🤖</div>
            <p className="text-gray-400 text-xl">No agents registered yet</p>
            <p className="text-gray-500 mt-2">Register an agent to start building on-chain reputation</p>
          </motion.div>
        )}

        {/* Agent Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {agents.map((agent, idx) => {
            const status = getStatusFromScore(agent.healthScore)
            return (
              <motion.div
                key={agent.agentId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                whileHover={{ y: -10 }}
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 to-red-950/30 border border-red-900/30 hover:border-amber-700/50 transition-all cursor-pointer backdrop-blur-sm"
              >
                {/* Agent Image/Logo */}
                {agent.imageUrl && (
                  <div className="w-full h-32 bg-gray-800 overflow-hidden flex items-center justify-center">
                    <img 
                      src={agent.imageUrl} 
                      alt={agent.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <span className={`px-3 py-1 bg-gradient-to-r ${getStatusColor(status)} text-white text-xs font-bold rounded-full`}>
                      {status.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-amber-100 mb-2 pr-24 tracking-wide">
                    {agent.name || `Agent #${agent.agentId}`}
                  </h3>
                {agent.description ? (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{agent.description}</p>
                ) : (
                  <p className="text-gray-500 text-sm mb-4 italic">No description available</p>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-gray-900/60 border border-amber-700/20">
                    <div className="text-gray-400 text-xs mb-1 tracking-wider">HEALTH SCORE</div>
                    <div className="text-2xl font-black text-green-400">{agent.healthScore}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-900/60 border border-amber-700/20">
                    <div className="text-gray-400 text-xs mb-1 tracking-wider">UPTIME</div>
                    <div className="text-2xl font-black text-amber-400">{agent.uptime.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
                  <div>
                    <div className="text-gray-400 text-xs mb-1 tracking-wider">RESPONSE</div>
                    <div className="text-lg font-bold text-amber-400 flex items-center gap-1">
                      <Clock size={16} />
                      {agent.avgResponseTime.toFixed(2)}ms
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1 tracking-wider">REPUTATION</div>
                    <div className="text-lg font-bold text-yellow-400">
                      {agent.reputation.toFixed(1)} <span className="text-xs">({agent.feedbackCount})</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1 tracking-wider">LAST CHECK</div>
                    <div className="text-sm font-bold text-gray-300">{formatTimeAgo(agent.lastCheck)}</div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/agent/${agent.agentId}`)}
                  className="w-full mt-4 py-2 bg-gradient-to-r from-red-900 to-amber-900 text-amber-100 font-bold rounded-lg hover:shadow-lg hover:shadow-amber-900/50 transition-all border border-amber-700/30 tracking-wider"
                >
                  VIEW DETAILS →
                </motion.button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}
