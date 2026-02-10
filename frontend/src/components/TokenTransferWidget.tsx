// components/TokenTransferWidget.tsx - UI for test token transfers (via backend faucet)
import { useState } from 'react'
import { Loader2, CheckCircle, AlertTriangle, Send, Copy } from 'lucide-react'
import { requestFaucet } from '../api'
import { useAccount } from 'wagmi'

export default function TokenTransferWidget() {
  const { address, isConnected } = useAccount()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleTransfer = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)
    setTxHash(null)

    try {
      const result = await requestFaucet(address, 10)
      if (result.success && result.txHash) {
        setSuccess(true)
        setTxHash(result.txHash)
      } else {
        setError(result.error || 'Transfer failed')
      }
    } catch (err: any) {
      setError(err.message || 'Transfer failed')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="p-6 rounded-xl bg-gradient-to-br from-blue-900/30 to-indigo-900/20 border border-blue-700/30 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <Send className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-bold text-blue-100 tracking-wider">GET TEST TOKENS</h3>
      </div>

      <p className="text-gray-400 text-sm mb-4 font-medium">
        Get 10 ORACLE tokens transferred to your connected wallet for testing. Each agent registration requires at least 10 ORACLE.
      </p>

      <div className="space-y-3">

        {/* Transfer Button */}
        <button
          onClick={handleTransfer}
          disabled={loading || !isConnected}
          className="w-full px-4 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? 'Transferring...' : 'Transfer 10 ORACLE to My Wallet'}
        </button>

        {/* Status Messages */}
        {success && txHash && (
          <div className="p-3 rounded-lg bg-green-900/30 border border-green-700/50">
            <div className="flex items-center gap-2 text-green-300 font-bold mb-2">
              <CheckCircle className="w-4 h-4" />
              Transfer Successful!
            </div>
            <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded text-gray-300 text-xs font-mono break-all">
              <span className="flex-1">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
              <button
                onClick={copyToClipboard}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {copied && <p className="text-green-400 text-xs mt-1 font-medium">Copied to clipboard!</p>}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-900/30 border border-red-700/50 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm font-medium">{error}</p>
          </div>
        )}

        {!isConnected && (
          <div className="p-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-yellow-300 text-sm font-medium">Please connect your wallet to receive tokens</p>
          </div>
        )}
      </div>
    </div>
  )
}
