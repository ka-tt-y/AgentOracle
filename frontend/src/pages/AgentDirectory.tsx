import { motion } from 'framer-motion'
import { Activity, Clock, Shield, Star, TrendingUp } from 'lucide-react'

export default function AgentDirectory() {
  const agents = [
    {
      id: 1,
      name: 'AlphaBot3000',
      owner: '0x1234...5678',
      healthScore: 98,
      uptime: 99.87,
      avgResponseTime: 45,
      reputation: 4.8,
      feedbacks: 42,
      lastCheck: '2min ago',
      status: 'healthy',
    },
    {
      id: 2,
      name: 'QuantumTrader',
      owner: '0x9abc...def0',
      healthScore: 95,
      uptime: 99.12,
      avgResponseTime: 78,
      reputation: 4.9,
      feedbacks: 68,
      lastCheck: '1min ago',
      status: 'healthy',
    },
    {
      id: 3,
      name: 'DefiOracle',
      owner: '0x5678...1234',
      healthScore: 72,
      uptime: 94.33,
      avgResponseTime: 156,
      reputation: 4.3,
      feedbacks: 31,
      lastCheck: '8min ago',
      status: 'degraded',
    },
    {
      id: 4,
      name: 'SpeedDaemon',
      owner: '0xabcd...ef01',
      healthScore: 100,
      uptime: 100.0,
      avgResponseTime: 23,
      reputation: 5.0,
      feedbacks: 15,
      lastCheck: '30sec ago',
      status: 'healthy',
    },
  ]

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
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-red-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wider">
            📡 AGENT DIRECTORY
          </h1>
          <p className="text-xl text-gray-300 font-medium">Browse verified agents with health monitoring</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-4 gap-6 mb-12"
        >
          {[
            { icon: Shield, label: 'Registered', value: '1,247' },
            { icon: Activity, label: 'Avg Health', value: '94.2' },
            { icon: TrendingUp, label: 'Avg Uptime', value: '98.3%' },
            { icon: Star, label: 'Avg Rep', value: '4.8 ⭐' },
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

        {/* Agent Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 gap-6"
        >
          {agents.map((agent, idx) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              whileHover={{ y: -10 }}
              className="group relative p-6 rounded-2xl bg-gradient-to-br from-gray-900/80 to-red-950/30 border border-red-900/30 hover:border-amber-700/50 transition-all cursor-pointer backdrop-blur-sm"
            >
              <div className="absolute top-4 right-4 flex gap-2">
                <span className={`px-3 py-1 bg-gradient-to-r ${getStatusColor(agent.status)} text-white text-xs font-bold rounded-full`}>
                  {agent.status.toUpperCase()}
                </span>
              </div>

              <h3 className="text-2xl font-bold text-amber-100 mb-2 pr-24 tracking-wide">{agent.name}</h3>
              <p className="text-gray-400 text-sm mb-4 font-mono font-medium">{agent.owner}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 rounded-lg bg-gray-900/60 border border-amber-700/20">
                  <div className="text-gray-400 text-xs mb-1 tracking-wider">HEALTH SCORE</div>
                  <div className="text-2xl font-black text-green-400">{agent.healthScore}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-900/60 border border-amber-700/20">
                  <div className="text-gray-400 text-xs mb-1 tracking-wider">UPTIME</div>
                  <div className="text-2xl font-black text-amber-400">{agent.uptime}%</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700/50">
                <div>
                  <div className="text-gray-400 text-xs mb-1 tracking-wider">RESPONSE</div>
                  <div className="text-lg font-bold text-amber-400 flex items-center gap-1">
                    <Clock size={16} />
                    {agent.avgResponseTime}ms
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1 tracking-wider">REPUTATION</div>
                  <div className="text-lg font-bold text-yellow-400">
                    {agent.reputation} <span className="text-xs">({agent.feedbacks})</span>
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-xs mb-1 tracking-wider">LAST CHECK</div>
                  <div className="text-sm font-bold text-gray-300">{agent.lastCheck}</div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-4 py-2 bg-gradient-to-r from-red-900 to-amber-900 text-amber-100 font-bold rounded-lg hover:shadow-lg hover:shadow-amber-900/50 transition-all border border-amber-700/30 tracking-wider"
              >
                VIEW DETAILS →
              </motion.button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
