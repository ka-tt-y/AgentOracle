import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, CheckCircle, Loader2, AlertTriangle, ExternalLink, Copy, Check, Zap, Sparkles, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import { parseEther, formatEther } from 'viem'
import { CONTRACTS, HealthMonitorABI, OracleTokenABI } from '../contracts'
import { prepareOnboard, notifyAgentRegistered } from '../api'
import BuyOracleWidget from '../components/BuyOracleWidget'

type RegistrationStep = 'idle' | 'approving' | 'registering' | 'success' | 'error'

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-gray-700/50 text-gray-400 hover:text-amber-400 transition-colors"
    >
      {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
    </button>
  )
}

export default function RegisterAgent() {
  const { address, isConnected } = useAccount()
  const navigate = useNavigate()
  const [agentName, setAgentName] = useState('')
  const [agentDescription, setAgentDescription] = useState('')
  const [agentImage, setAgentImage] = useState('')
  const [endpoint, setEndpoint] = useState('')
  const [stakeAmount, setStakeAmount] = useState('10')
  const [step, setStep] = useState<RegistrationStep>('idle')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const { mutateAsync } = useWriteContract()

  // Fetch ORACLE token balance
  const { data: oracleBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.OracleToken as `0x${string}`,
    abi: OracleTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  })

  const oracleBalanceFormatted = oracleBalance ? parseFloat(formatEther(oracleBalance as bigint)) : 0
  const hasEnoughBalance = oracleBalanceFormatted >= 10

  const handleRegister = async () => {
    if (!isConnected || !address) return setError('Connect your wallet first')
    if (!hasEnoughBalance) return setError('Insufficient ORACLE balance. You need at least 10 ORACLE to register.')
    if (!agentName || !endpoint) return setError('Fill in all required fields')

    setError(null)
    try {
      setStep('approving')
      setStatusMessage('Uploading agent card to IPFS & validating content...')

      const { uri } = await prepareOnboard({
        name: agentName,
        description: agentDescription,
        endpoint,
        capabilities: [],
        image: agentImage || undefined,
      })

      if (parseFloat(stakeAmount) > 0) {
        setStatusMessage('Requesting permission to transfer your stake...')
        await mutateAsync({
          address: CONTRACTS.OracleToken as `0x${string}`,
          abi: OracleTokenABI,
          functionName: 'approve',
          args: [CONTRACTS.HealthMonitor as `0x${string}`, parseEther(stakeAmount)],
        })
        setStatusMessage('Permission granted. Now registering your agent...')
      }

      setStep('registering')
      setStatusMessage('Minting identity NFT + staking tokens + enabling monitoring...')
      const registerTx = await mutateAsync({
        address: CONTRACTS.HealthMonitor as `0x${string}`,
        abi: HealthMonitorABI,
        functionName: 'onboardAgent',
        args: [uri, endpoint, parseEther(stakeAmount)],
      })
      setTxHash(registerTx)
      setStep('success')
      setStatusMessage('Agent registered successfully!')
      refetchBalance()

      // Seed the backend DB so the agent appears in the directory immediately
      // (otherwise it would wait up to 10 min for the next monitoring cycle)
      notifyAgentRegistered({
        txHash: registerTx,
        name: agentName,
        description: agentDescription,
        endpoint,
        owner: address!,
        image: agentImage || undefined,
        stakeAmount,
      })

      // Redirect to agent directory after 2 seconds
      setTimeout(() => {
        navigate('/directory', { state: { refresh: true } })
      }, 2000)
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'Registration failed')
      setStep('error')
    }
  }

  const registrationForm = (
    <div className="space-y-5">
      {/* ORACLE Balance Display */}
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center justify-between p-3 rounded-lg border ${hasEnoughBalance
              ? 'bg-green-900/20 border-green-700/30'
              : 'bg-red-900/20 border-red-700/30'
            }`}
        >
          <div className="flex items-center gap-2">
            <Wallet className={`w-4 h-4 ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`} />
            <span className="text-sm font-semibold text-gray-300">Your ORACLE Balance:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${hasEnoughBalance ? 'text-green-300' : 'text-red-300'}`}>
              {oracleBalanceFormatted.toFixed(2)} ORACLE
            </span>
            {!hasEnoughBalance && (
              <span className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded">Need 10+</span>
            )}
          </div>
        </motion.div>
      )}
      <div>
                      <h3 className="text-amber-400 font-semibold text-sm mb-3">Buy ORACLE tokens</h3>
                      <BuyOracleWidget onSuccess={refetchBalance} />
                    </div>

      <div>
        <label className="block text-amber-400 font-semibold mb-1.5 text-sm">Agent Name *</label>
        <input
          type="text"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="My Trading Agent"
          disabled={step !== 'idle' && step !== 'error'}
          className="w-full px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700/50 text-gray-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50 transition-colors"
        />
      </div>

      <div>
        <label className="block text-amber-400 font-semibold mb-1.5 text-sm">Description</label>
        <textarea
          value={agentDescription}
          onChange={(e) => setAgentDescription(e.target.value)}
          placeholder="What does your agent do? This is shown publicly."
          rows={2}
          disabled={step !== 'idle' && step !== 'error'}
          className="w-full px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700/50 text-gray-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50 resize-none transition-colors"
        />
      </div>

      <div>
        <label className="block text-amber-400 font-semibold mb-1.5 text-sm">Image URL (optional)</label>
        <input
          type="text"
          value={agentImage}
          onChange={(e) => setAgentImage(e.target.value)}
          placeholder="https://example.com/logo.png or ipfs://..."
          disabled={step !== 'idle' && step !== 'error'}
          className="w-full px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700/50 text-gray-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50 font-mono text-sm transition-colors"
        />
        <p className="text-gray-500 text-xs mt-1">HTTP URL or IPFS URI for your agent's logo/image.</p>
      </div>

      <div>
        <label className="block text-amber-400 font-semibold mb-1.5 text-sm">Health Endpoint *</label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://myagent.com/health"
          disabled={step !== 'idle' && step !== 'error'}
          className="w-full px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700/50 text-gray-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50 font-mono text-sm transition-colors"
        />
        <p className="text-gray-500 text-xs mt-1">Must return JSON with a status field. Checked every 10 minutes by AgentOracle.</p>
      </div>

      <div>
        <label className="block text-amber-400 font-semibold mb-1.5 text-sm">Stake Amount (ORACLE)</label>
        <input
          type="number"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          min="10"
          disabled={step !== 'idle' && step !== 'error'}
          className="w-full px-4 py-3 rounded-lg bg-gray-900/60 border border-gray-700/50 text-gray-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 disabled:opacity-50 transition-colors"
        />
        <p className="text-gray-500 text-xs mt-1">Minimum 10 ORACLE. Staked as collateral — returned when you disable monitoring.</p>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-lg bg-red-900/30 border border-red-700/40 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">{error}</span>
          </motion.div>
        )}

        {step !== 'idle' && step !== 'error' && step !== 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-lg bg-amber-900/30 border border-amber-700/40 flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            <span className="text-amber-300 text-sm">
              {statusMessage || (step === 'approving' ? 'Uploading to IPFS & approving spend cap...' : 'Minting identity + staking + enabling monitoring...')}
            </span>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-lg bg-green-900/30 border border-green-700/40">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-bold">Agent Registered Successfully!</span>
            </div>
            {txHash && (
              <a href={`https://monadexplorer.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-sm">
                <ExternalLink className="w-3.5 h-3.5" /> View on Monad Explorer
              </a>
            )}
            <p className="text-gray-400 text-xs mt-2">Redirecting to Agent Directory...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: step === 'idle' || step === 'error' ? 1.01 : 1 }}
        whileTap={{ scale: step === 'idle' || step === 'error' ? 0.99 : 1 }}
        onClick={handleRegister}
        disabled={!isConnected || !hasEnoughBalance || (step !== 'idle' && step !== 'error')}
        className="w-full py-3.5 bg-gradient-to-r from-red-800 to-amber-800 text-amber-100 font-bold rounded-lg hover:from-red-700 hover:to-amber-700 transition-all tracking-wide border border-amber-700/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {!isConnected ? 'CONNECT WALLET FIRST' :
          !hasEnoughBalance ? 'INSUFFICIENT ORACLE BALANCE' :
            step === 'idle' || step === 'error' ? <><Zap className="w-4 h-4" /> REGISTER AGENT</> :
              step === 'success' ? <><CheckCircle className="w-4 h-4" /> REGISTERED!</> :
                <><Loader2 className="w-4 h-4 animate-spin" /> PROCESSING...</>}
      </motion.button>
    </div>
  )

  return (
    <div className="min-h-screen py-8 md:py-16 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-3 bg-gradient-to-r from-red-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wider">
            REGISTER YOUR AGENT
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed">
            Give your AI agent a verifiable on-chain identity. Register, stake ORACLE, and let AgentOracle monitor and build trust for your agent 24/7.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8 grid sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-900/20 border border-indigo-700/20">
            <span className="w-7 h-7 rounded-full bg-indigo-800/60 flex items-center justify-center text-xs font-bold text-indigo-300 flex-shrink-0">1</span>
            <span className="text-sm text-gray-300"><strong className="text-indigo-300">Approve</strong> — set a spend cap so the contract can stake your ORACLE</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-900/20 border border-amber-700/20">
            <span className="w-7 h-7 rounded-full bg-amber-800/60 flex items-center justify-center text-xs font-bold text-amber-300 flex-shrink-0">2</span>
            <span className="text-sm text-gray-300"><strong className="text-amber-300">Register</strong> — mints NFT identity + stakes tokens + enables monitoring</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="p-6 rounded-xl bg-gradient-to-br from-gray-900/60 to-gray-800/30 border border-gray-700/30">
              <h2 className="text-lg font-bold text-amber-100 mb-5 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Register Agent
              </h2>
              {registrationForm}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-5">
            <div className="p-5 rounded-xl bg-gradient-to-br from-gray-900/40 to-amber-950/10 border border-amber-900/20">
              <h3 className="font-bold text-amber-200 text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> What happens when you register
              </h3>
              <ol className="space-y-2 text-sm text-gray-400">
                <li className="flex gap-2"><span className="text-amber-500 font-bold">1.</span> Metadata validated by AgentOracle & pinned to IPFS</li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">2.</span> ERC-8004 identity NFT minted to your wallet</li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">3.</span> ORACLE tokens staked as behavioral collateral</li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold">4.</span> 24/7 monitoring begins</li>
              </ol>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-gray-900/40 to-green-950/10 border border-green-900/20">
              <h3 className="font-bold text-green-300 text-sm mb-3">Health endpoint spec</h3>
              <p className="text-xs text-gray-400 mb-2">Your endpoint must respond to GET with JSON:</p>
              <pre className="text-xs text-gray-300 bg-gray-900/60 p-2 rounded font-mono">{`{ "status": "ok", "uptime": 99.9 }`}</pre>
              <p className="text-xs text-gray-500 mt-2">Checked every 5 min. Timeouts, errors, and spoofed data trigger slashing.</p>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-gray-900/40 to-gray-800/10 border border-gray-700/20">
              <h3 className="font-bold text-gray-300 text-sm mb-3">Contracts (Monad Mainnet)</h3>
              <div className="space-y-1.5 text-xs font-mono">
                {[
                  { label: 'HealthMonitor', addr: CONTRACTS.HealthMonitor },
                  { label: 'ORACLE Token', addr: CONTRACTS.OracleToken },
                  { label: 'IdentityRegistry', addr: CONTRACTS.IdentityRegistry },
                ].map((c) => (
                  <div key={c.label} className="flex items-center justify-between">
                    <span className="text-gray-500">{c.label}</span>
                    <div className="flex items-center gap-1">
                      <a href={`https://monadexplorer.com/address/${c.addr}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-amber-400">{c.addr.slice(0, 6)}...{c.addr.slice(-4)}</a>
                      <CopyBtn text={c.addr} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
