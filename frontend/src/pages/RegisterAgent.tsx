import { motion } from 'framer-motion'
import { UserPlus, Shield, Activity, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export default function RegisterAgent() {
  const [agentName, setAgentName] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [stakeAmount, setStakeAmount] = useState('1000')

  const steps = [
    {
      title: 'Create Identity',
      description: 'Mint ERC-8004 agent NFT with metadata',
      icon: '🆔',
      color: 'from-red-900 to-red-700',
    },
    {
      title: 'Stake Tokens',
      description: 'Lock AUTH tokens for monitoring eligibility',
      icon: '🔒',
      color: 'from-amber-900 to-amber-700',
    },
    {
      title: 'Enable Monitoring',
      description: 'Start 24/7 health checks and uptime tracking',
      icon: '📡',
      color: 'from-yellow-800 to-orange-700',
    },
  ]

  const handleRegister = () => {
    // TODO: Connect to contracts
    console.log('Registering agent:', { agentName, endpoint, stakeAmount })
  }

  return (
    <div className="min-h-screen py-16 px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-red-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wider">
            🤖 REGISTER AGENT
          </h1>
          <p className="text-xl text-gray-300 font-medium">Create your verified agent identity on ERC-8004</p>
        </motion.div>

        {/* Enrollment Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {[
            { icon: UserPlus, label: 'Min Stake', value: '1000 AUTH' },
            { icon: Shield, label: 'Identity Type', value: 'ERC-721' },
            { icon: Activity, label: 'Check Freq', value: '5 min' },
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

        {/* Registration Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -10 }}
              className={`group relative p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-red-950/30 border border-red-900/30 hover:border-amber-700/50 transition-all backdrop-blur-sm`}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${step.color} opacity-0 group-hover:opacity-15 transition-all`}></div>

              <div className="text-6xl mb-4 relative z-10">{step.icon}</div>

              <h3 className="text-2xl font-bold text-amber-100 mb-2 tracking-wide relative z-10">{step.title}</h3>
              <p className="text-gray-400 mb-4 font-medium relative z-10">{step.description}</p>

              <div className="flex items-center text-amber-400 font-bold text-sm tracking-wider relative z-10">
                <CheckCircle className="w-4 h-4 mr-2" />
                STEP {idx + 1}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-red-950/30 border border-amber-700/30 backdrop-blur-sm">
            <h2 className="text-3xl font-black text-amber-100 mb-6 tracking-wider">AGENT DETAILS</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-amber-400 font-bold mb-2 tracking-wider">AGENT NAME</label>
                <input
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="My Trading Agent"
                  className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-amber-700/30 text-gray-200 font-medium focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-amber-400 font-bold mb-2 tracking-wider">HEALTH ENDPOINT</label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://myagent.com/health"
                  className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-amber-700/30 text-gray-200 font-medium focus:border-amber-500 focus:outline-none"
                />
                <p className="text-gray-500 text-sm mt-1 font-medium">Must respond with {"{"}"status": "ok"{"}"}</p>
              </div>

              <div>
                <label className="block text-amber-400 font-bold mb-2 tracking-wider">STAKE AMOUNT (AUTH)</label>
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="1000"
                  min="1000"
                  className="w-full px-4 py-3 rounded-xl bg-gray-900/50 border border-amber-700/30 text-gray-200 font-medium focus:border-amber-500 focus:outline-none"
                />
                <p className="text-gray-500 text-sm mt-1 font-medium">Minimum: 1000 AUTH</p>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRegister}
                className="w-full px-8 py-4 bg-gradient-to-r from-red-900 to-amber-900 text-amber-100 font-bold rounded-xl hover:shadow-2xl transition-all text-lg tracking-wider border-2 border-amber-700/30"
              >
                REGISTER NOW →
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-red-950/40 to-amber-950/30 border border-amber-700/30 backdrop-blur-sm"
        >
          <h2 className="text-2xl font-black text-amber-100 mb-6 flex items-center gap-3 tracking-wider">
            <CheckCircle className="w-8 h-8 text-amber-400" />
            REGISTRATION BENEFITS
          </h2>

          <div className="space-y-3">
            {[
              '✅ Verifiable on-chain identity (ERC-721 NFT)',
              '✅ 24/7 health monitoring & uptime tracking',
              '✅ Reputation building via feedback system',
              '✅ Validation hooks for TEE/zk attestations',
              '✅ Agent card on IPFS with metadata',
              '✅ Composable with other ERC-8004 services'
            ].map((benefit, idx) => (
                <motion.div
                  key={idx}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  className="flex items-center gap-3 p-3 bg-gray-900/60 rounded-lg border border-red-900/30 hover:border-amber-700/50 transition-all"
                >
                  <CheckCircle className="w-5 h-5 text-amber-400" />
                  <span className="text-amber-100 font-bold tracking-wide">{benefit}</span>
                </motion.div>
              )
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
