import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { formatEther } from 'viem'
import {
  ArrowLeft,
  Activity,
  Clock,
  Shield,
  Star,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Power,
  Loader2,
} from 'lucide-react'
import { fetchTrustReport, formatTimeAgo, getStatusFromScore, notifyAgentUnregistered } from '../api'
import type { TrustReport } from '../api'
import { CONTRACTS, IdentityRegistryABI, HealthMonitorABI } from '../contracts'

export default function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const { address, isConnected } = useAccount()
  const [report, setReport] = useState<TrustReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUnregisterConfirm, setShowUnregisterConfirm] = useState(false)

  // Check if connected wallet owns this agent
  const { data: ownerAddress } = useReadContract({
    address: CONTRACTS.IdentityRegistry as `0x${string}`,
    abi: IdentityRegistryABI,
    functionName: 'ownerOf',
    args: agentId ? [BigInt(agentId)] : undefined,
  })

  const isOwner = isConnected && address && ownerAddress && 
    address.toLowerCase() === (ownerAddress as string).toLowerCase()

  // Unregister (disable monitoring) transaction
  const { 
    writeContract: unregister, 
    data: unregisterHash,
    isPending: isUnregistering,
    error: unregisterError,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isUnregistered } = useWaitForTransactionReceipt({
    hash: unregisterHash,
  })

  const handleUnregister = () => {
    if (!agentId) return
    unregister({
      address: CONTRACTS.HealthMonitor as `0x${string}`,
      abi: HealthMonitorABI,
      functionName: 'disableMonitoring',
      args: [BigInt(agentId)],
    })
  }

  // After successful unregister, notify backend and redirect
  useEffect(() => {
    if (isUnregistered && agentId) {
      setShowUnregisterConfirm(false)
      // Notify backend to immediately remove from directory
      notifyAgentUnregistered(agentId).then(() => {
        // Redirect to directory after short delay
        setTimeout(() => navigate('/directory', { state: { refresh: true } }), 1000)
      })
    }
  }, [isUnregistered])

  const loadReport = async () => {
    if (!agentId) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTrustReport(agentId)
      setReport(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load agent details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
    const interval = setInterval(loadReport, 30000)
    return () => clearInterval(interval)
  }, [agentId])

  const getStatusColor = (status: string) => {
    if (status === 'healthy') return 'from-green-600 to-emerald-700'
    if (status === 'degraded') return 'from-yellow-600 to-amber-700'
    return 'from-red-600 to-red-800'
  }

  const getDecisionIcon = (decision: string) => {
    if (decision === 'healthy' || decision === 'approve') {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    }
    if (decision === 'warning' || decision === 'pending') {
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    }
    return <XCircle className="w-4 h-4 text-red-400" />
  }

  if (loading && !report) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-amber-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading agent details...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="p-8 rounded-xl bg-red-900/30 border border-red-700/50 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-300 text-xl">{error || 'Agent not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  const status = getStatusFromScore(report.healthScore)

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-amber-400 hover:text-amber-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Directory
        </button>

        {/* Agent Image/Logo Hero */}
        {report.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-48 rounded-2xl overflow-hidden mb-8 border border-amber-700/30 shadow-xl"
          >
            <img 
              src={report.imageUrl} 
              alt={report.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).parentElement?.style.setProperty('display', 'none')
              }}
            />
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-black text-amber-100 tracking-wider mb-2">
                {`Agent #${report.name}` || `Agent #${report.agentId}`}
              </h1>
              {report.description && (
                <p className="text-gray-300 mt-3 max-w-2xl leading-relaxed">{report.description}</p>
              )}
            </div>
            <span className={`px-4 py-2 bg-gradient-to-r ${getStatusColor(status)} text-white font-bold rounded-full`}>
              {status.toUpperCase()}
            </span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-4 gap-4 mb-8"
        >
          <div className="p-5 rounded-xl bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-700/30">
            <Activity className="w-6 h-6 text-green-400 mb-2" />
            <div className="text-3xl font-black text-green-400 mb-1">{report.healthScore}</div>
            <div className="text-gray-400 text-sm">Health Score</div>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-amber-900/30 to-yellow-900/20 border border-amber-700/30">
            <TrendingUp className="w-6 h-6 text-amber-400 mb-2" />
            <div className="text-3xl font-black text-amber-400 mb-1">{report.uptime.toFixed(1)}%</div>
            <div className="text-gray-400 text-sm">Uptime</div>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border border-blue-700/30">
            <Clock className="w-6 h-6 text-blue-400 mb-2" />
            <div className="text-3xl font-black text-blue-400 mb-1">{report.avgResponseTime.toFixed(2)}ms</div>
            <div className="text-gray-400 text-sm">Avg Response</div>
          </div>
          <div className="p-5 rounded-xl bg-gradient-to-br from-yellow-900/30 to-orange-900/20 border border-yellow-700/30">
            <Star className="w-6 h-6 text-yellow-400 mb-2" />
            <div className="text-3xl font-black text-yellow-400 mb-1">{report.reputation.toFixed(1)}</div>
            <div className="text-gray-400 text-sm">Reputation</div>
          </div>
        </motion.div>

        {/* Check Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30">
            <Shield className="w-5 h-5 text-gray-400 mb-2" />
            <div className="text-2xl font-bold text-gray-200">{report.totalChecks}</div>
            <div className="text-gray-500 text-sm">Total Checks</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30">
            <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
            <div className="text-2xl font-bold text-green-400">{report.successfulChecks}</div>
            <div className="text-gray-500 text-sm">Successful</div>
          </div>
          <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30">
            <XCircle className="w-5 h-5 text-red-400 mb-2" />
            <div className="text-2xl font-bold text-red-400">{report.totalChecks - report.successfulChecks}</div>
            <div className="text-gray-500 text-sm">Failed</div>
          </div>
        </motion.div>

        {/* Trust Narrative */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-xl bg-gradient-to-br from-purple-900/30 to-indigo-900/20 border border-purple-700/30 mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-purple-300 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Trust Assessment
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              report.narrative.riskLevel === 'low' ? 'bg-green-900/50 text-green-400' :
              report.narrative.riskLevel === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
              'bg-red-900/50 text-red-400'
            }`}>
              {report.narrative.riskLevel.toUpperCase()} RISK
            </span>
          </div>
          
          <p className="text-gray-300 leading-relaxed mb-4 italic text-sm border-l-2 border-purple-500/50 pl-3">
            This assessment was generated entirely by our AI oracle. No humans involved.
          </p>
          
          <p className="text-gray-300 leading-relaxed mb-4">{report.narrative.summary}</p>
          
          {report.narrative.strengths.length > 0 && (
            <div className="mb-3">
              <h4 className="text-green-400 font-semibold mb-2">✅ Strengths</h4>
              <ul className="text-gray-400 space-y-1 ml-4">
                {report.narrative.strengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          )}
          
          {report.narrative.concerns.length > 0 && (
            <div className="mb-3">
              <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Concerns</h4>
              <ul className="text-gray-400 space-y-1 ml-4">
                {report.narrative.concerns.map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-purple-900/30 rounded-lg">
            <span className="text-purple-300 font-semibold">Recommendation: </span>
            <span className="text-gray-300">{report.narrative.recommendation}</span>
          </div>
        </motion.div>

        {/* Trends */}
        {report.trends && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid md:grid-cols-3 gap-4 mb-8"
          >
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30">
              <div className="text-gray-400 text-xs mb-1 tracking-wider">AVG RESPONSE</div>
              <div className="text-xl font-bold text-blue-400">{report.trends.avgResponseTime.toFixed(2)}ms</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30">
              <div className="text-gray-400 text-xs mb-1 tracking-wider">STD DEVIATION</div>
              <div className="text-xl font-bold text-gray-200">{report.trends.stdDeviation.toFixed(2)}ms</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30">
              <div className="text-gray-400 text-xs mb-1 tracking-wider">RECENT TREND</div>
              <div className={`text-xl font-bold ${
                report.trends.recentTrend === 'improving' ? 'text-green-400' :
                report.trends.recentTrend === 'declining' ? 'text-red-400' :
                'text-gray-400'
              }`}>
                {report.trends.recentTrend === 'improving' ? '📈' : 
                 report.trends.recentTrend === 'declining' ? '📉' : '➡️'} {report.trends.recentTrend}
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Health History */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-6 rounded-xl bg-gray-900/50 border border-gray-700/30"
        >
          <h2 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            Recent Health Checks
          </h2>

          {report.recentHealth && report.recentHealth.length > 0 ? (
            <div className="space-y-2">
              {report.recentHealth.slice(0, 10).map((check, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700/30"
                >
                  <div className="flex items-center gap-3">
                    {getDecisionIcon(check.decision)}
                    <span className="text-gray-300 font-medium capitalize">{check.decision}</span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="text-amber-400 font-bold">Score: {check.score}</span>
                    <span className="text-gray-500 text-sm">{formatTimeAgo(check.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No health checks recorded yet</p>
          )}
        </motion.div>


        {/* Last Check */}
        {report.lastCheck && (
          <div className="mt-8 text-center text-gray-500">
            Last updated: {formatTimeAgo(report.lastCheck)}
            <button
              onClick={loadReport}
              disabled={loading}
              className="ml-4 text-amber-400 hover:text-amber-300"
            >
              <RefreshCw className={`w-4 h-4 inline ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {/* Owner Actions - Unregister */}
        {isOwner && report.isMonitored && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 p-6 rounded-xl bg-red-900/20 border border-red-700/30"
          >
            <h3 className="text-lg font-bold text-red-300 mb-2 flex items-center gap-2">
              <Power className="w-5 h-5" />
              Owner Actions
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              You own this agent. You can unregister it to stop monitoring and reclaim your staked ORACLE tokens.
            </p>
            <button
              onClick={() => setShowUnregisterConfirm(true)}
              className="px-6 py-3 bg-red-700/50 hover:bg-red-700/70 border border-red-600/50 text-red-200 font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <Power className="w-5 h-5" />
              Unregister Agent
            </button>
          </motion.div>
        )}

        {/* Unregister Confirmation Modal */}
        {showUnregisterConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gray-900 border border-red-700/50 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Unregister Agent?
              </h3>
              <p className="text-gray-300 mb-4">
                This will disable monitoring for <strong className="text-amber-400">{report.name || `Agent #${agentId}`}</strong> and return your staked tokens.
              </p>
              {report.stakedAmount && BigInt(report.stakedAmount) > 0n && (
                <p className="text-green-400 mb-4 p-3 bg-green-900/30 rounded-lg">
                  💰 You will receive <strong>{formatEther(BigInt(report.stakedAmount))} ORACLE</strong> back
                </p>
              )}
              {unregisterError && (
                <p className="text-red-400 mb-4 p-3 bg-red-900/30 rounded-lg text-sm">
                  Error: {unregisterError.message}
                </p>
              )}
              {isConfirming && unregisterHash && (
                <p className="text-blue-400 mb-4 p-3 bg-blue-900/30 rounded-lg text-sm">
                  ⏳ Transaction submitted!{' '}
                  <a
                    href={`https://monadexplorer.com/tx/${unregisterHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-300"
                  >
                    View on Explorer
                  </a>
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUnregisterConfirm(false)}
                  disabled={isUnregistering || isConfirming}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUnregister}
                  disabled={isUnregistering || isConfirming}
                  className="flex-1 px-4 py-3 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUnregistering || isConfirming ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isConfirming ? 'Confirming...' : 'Signing...'}
                    </>
                  ) : (
                    <>
                      <Power className="w-5 h-5" />
                      Confirm Unregister
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
