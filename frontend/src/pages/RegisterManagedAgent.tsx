import { motion } from 'framer-motion'
import { Sparkles, Key, CheckCircle, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import axios from 'axios'

interface ManagedRegistrationResult {
  success: boolean
  apiKey?: string
  agentId?: string
  message?: string
  error?: string
}

export default function RegisterManagedAgent() {
  const [formData, setFormData] = useState({
    name: '',
    endpoint: '',
    email: '',
    description: '',
    capabilities: '',
    initialStake: '1000',
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ManagedRegistrationResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setResult(null)

    try {
      const response = await axios.post<ManagedRegistrationResult>(
        'http://localhost:4000/api/register/managed',
        {
          name: formData.name,
          endpoint: formData.endpoint,
          email: formData.email || undefined,
          description: formData.description || undefined,
          capabilities: formData.capabilities
            ? formData.capabilities.split(',').map((s) => s.trim())
            : undefined,
          initialStake: formData.initialStake,
        }
      )

      setResult(response.data)
    } catch (error: any) {
      setResult({
        success: false,
        error: error.response?.data?.error || error.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-16 px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-yellow-400" />
            <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              MANAGED AGENT
            </h1>
          </div>
          <p className="text-2xl text-gray-300 font-bold mb-2">
            No Wallet? No Problem! 🚀
          </p>
          <p className="text-lg text-gray-400">
            Register without blockchain knowledge - we handle everything for you
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12"
        >
          <div className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 rounded-xl p-6 border border-yellow-700/30">
            <div className="text-3xl mb-2">⚡</div>
            <div className="font-bold text-yellow-300 mb-1">Zero Crypto Knowledge</div>
            <div className="text-sm text-gray-400">No wallets, gas, or transactions</div>
          </div>
          <div className="bg-gradient-to-br from-amber-900/30 to-yellow-900/30 rounded-xl p-6 border border-amber-700/30">
            <div className="text-3xl mb-2">🔑</div>
            <div className="font-bold text-amber-300 mb-1">Simple API Key</div>
            <div className="text-sm text-gray-400">Familiar authentication method</div>
          </div>
          <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 rounded-xl p-6 border border-orange-700/30">
            <div className="text-3xl mb-2">✅</div>
            <div className="font-bold text-orange-300 mb-1">Full Benefits</div>
            <div className="text-sm text-gray-400">Same trust & monitoring as native</div>
          </div>
        </motion.div>

        {/* Registration Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 border border-yellow-700/30 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Agent Name */}
            <div>
              <label className="block text-sm font-bold text-yellow-300 mb-2">
                Agent Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="CustomerSupportBot"
                className="w-full px-4 py-3 bg-black/50 border border-yellow-700/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
              />
            </div>

            {/* Health Endpoint */}
            <div>
              <label className="block text-sm font-bold text-yellow-300 mb-2">
                Health Check Endpoint *
              </label>
              <input
                type="url"
                required
                value={formData.endpoint}
                onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
                placeholder="https://mybot.com/health"
                className="w-full px-4 py-3 bg-black/50 border border-yellow-700/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL where we'll check your agent's health
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-yellow-300 mb-2">
                Contact Email (optional)
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="dev@mybot.com"
                className="w-full px-4 py-3 bg-black/50 border border-yellow-700/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-bold text-yellow-300 mb-2">
                Description (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does your agent do?"
                rows={3}
                className="w-full px-4 py-3 bg-black/50 border border-yellow-700/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20 resize-none"
              />
            </div>

            {/* Capabilities */}
            <div>
              <label className="block text-sm font-bold text-yellow-300 mb-2">
                Capabilities (optional)
              </label>
              <input
                type="text"
                value={formData.capabilities}
                onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
                placeholder="customer-support, ticket-triage, sentiment-analysis"
                className="w-full px-4 py-3 bg-black/50 border border-yellow-700/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated list of skills
              </p>
            </div>

            {/* Initial Stake */}
            <div>
              <label className="block text-sm font-bold text-yellow-300 mb-2">
                Initial Stake (AUTH tokens)
              </label>
              <input
                type="number"
                min="1000"
                step="100"
                value={formData.initialStake}
                onChange={(e) => setFormData({ ...formData, initialStake: e.target.value })}
                className="w-full px-4 py-3 bg-black/50 border border-yellow-700/30 rounded-lg text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: 1000 AUTH (we'll provide this for you!)
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-500 hover:from-yellow-400 hover:via-amber-400 hover:to-orange-400 text-black font-black text-lg rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-yellow-500/50"
            >
              {isLoading ? '🔄 Registering On-Chain...' : '✨ Register Managed Agent'}
            </button>
          </form>
        </motion.div>

        {/* Result Display */}
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8"
          >
            {result.success ? (
              <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl p-8 border border-green-500/50">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <h2 className="text-2xl font-black text-green-300">
                    Registration Successful! 🎉
                  </h2>
                </div>

                <div className="space-y-4">
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Agent ID</div>
                    <div className="text-xl font-bold text-green-300">#{result.agentId}</div>
                  </div>

                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="w-5 h-5 text-yellow-400" />
                      <div className="text-sm text-gray-400">Your API Key</div>
                    </div>
                    <div className="font-mono text-sm bg-black/50 p-3 rounded border border-yellow-700/30 break-all text-yellow-300">
                      {result.apiKey}
                    </div>
                    <div className="text-xs text-red-400 mt-2">
                      ⚠️ Save this now! You cannot retrieve it later.
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 rounded-lg p-4 border border-yellow-700/30">
                    <div className="font-bold text-yellow-300 mb-2">Next Steps:</div>
                    <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                      <li>Store your API key securely</li>
                      <li>Include header "X-API-Key" in all requests</li>
                      <li>Use /api/managed/health to check status</li>
                      <li>No blockchain knowledge needed!</li>
                    </ol>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 rounded-2xl p-8 border border-red-500/50">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                  <h2 className="text-2xl font-black text-red-300">Registration Failed</h2>
                </div>
                <div className="text-gray-300">{result.error || result.message}</div>
              </div>
            )}
          </motion.div>
        )}

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-8 border border-gray-700/30"
        >
          <h3 className="text-2xl font-black text-yellow-300 mb-6">How It Works</h3>
          
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-black font-black rounded-full flex items-center justify-center">
                1
              </div>
              <div>
                <div className="font-bold text-yellow-300 mb-1">We Generate Your API Key</div>
                <div className="text-sm text-gray-400">
                  Secure 256-bit key for authentication - no wallet needed
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-black font-black rounded-full flex items-center justify-center">
                2
              </div>
              <div>
                <div className="font-bold text-yellow-300 mb-1">We Register You On-Chain</div>
                <div className="text-sm text-gray-400">
                  AuthUptime handles all blockchain transactions for you
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-black font-black rounded-full flex items-center justify-center">
                3
              </div>
              <div>
                <div className="font-bold text-yellow-300 mb-1">You Get Full Benefits</div>
                <div className="text-sm text-gray-400">
                  Identity NFT, health monitoring, reputation - just like native agents
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-500 text-black font-black rounded-full flex items-center justify-center">
                4
              </div>
              <div>
                <div className="font-bold text-yellow-300 mb-1">Use Simple API</div>
                <div className="text-sm text-gray-400">
                  All interactions through REST API with your API key
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
