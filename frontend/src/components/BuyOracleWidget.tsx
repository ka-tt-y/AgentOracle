// components/BuyOracleWidget.tsx — Buy ORACLE tokens on nad.fun
import { useState, useEffect } from 'react'
import { Loader2, ExternalLink, TrendingUp, Coins, RefreshCw } from 'lucide-react'
import { getOracleQuote } from '../api'
import { useAccount } from 'wagmi'

const NADFUN_TOKEN = '0x3CFea8267fa10A9ebA76Dd84A23Ac94efcA07777'
const BUY_URL = `https://nad.fun/tokens/${NADFUN_TOKEN}`

interface QuoteData {
  oracleOut: string
  monIn: string
  buyUrl: string
  graduated: boolean
  progress: number
  tokenSymbol: string
}

export default function BuyOracleWidget({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { isConnected } = useAccount()
  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [monAmount, setMonAmount] = useState('0.5')

  const fetchQuote = async () => {
    setLoadingQuote(true)
    try {
      const data = await getOracleQuote(monAmount)
      setQuote(data)
    } catch {
      // silently fail — quote is optional info
      setQuote(null)
    } finally {
      setLoadingQuote(false)
    }
  }

  useEffect(() => {
    fetchQuote()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuyClick = () => {
    window.open(BUY_URL, '_blank', 'noopener,noreferrer')
    // After user returns from nad.fun, trigger a balance refresh
    const interval = setInterval(() => {
      onSuccess?.()
    }, 5000) // refresh balance every 5s for 30s after opening nad.fun
    setTimeout(() => clearInterval(interval), 30000)
  }

  return (
    <div className="p-6 rounded-xl bg-gradient-to-br from-red-900/30 to-red-300/20 border border-red-700/30 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <Coins className="w-5 h-5 text-red-400" />
        <h3 className="text-lg font-bold text-red-100 tracking-wider">BUY ORACLE</h3>
        <span className="ml-auto text-xs text-gray-500 bg-gray-800/60 px-2 py-0.5 rounded-full">
          via nad.fun
        </span>
      </div>

      <p className="text-gray-400 text-sm mb-4 font-medium">
        Purchase ORACLE tokens on nad.fun using MON. Each agent registration requires at least <strong className="text-red-300">10 ORACLE</strong>.
      </p>

      {/* Price Quote */}
      {quote && (
        <div className="mb-4 p-3 rounded-lg bg-gray-900/50 border border-gray-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 uppercase tracking-wider">Estimated Rate</span>
            <button
              onClick={fetchQuote}
              disabled={loadingQuote}
              className="text-gray-500 hover:text-red-400 transition-colors"
              title="Refresh quote"
            >
              <RefreshCw className={`w-3 h-3 ${loadingQuote ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-400" />
            <span className="text-red-300 font-bold">
              {parseFloat(quote.monIn).toFixed(2)} MON ≈ {parseFloat(quote.oracleOut).toFixed(2)} ORACLE
            </span>
          </div>
          {!quote.graduated && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Bonding Curve Progress</span>
                <span>{quote.progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-red-500 to-red-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(quote.progress, 100)}%` }}
                />
              </div>
            </div>
          )}
          {quote.graduated && (
            <span className="text-xs text-red-400 mt-1 inline-block">✓ Graduated to DEX</span>
          )}
        </div>
      )}

      {loadingQuote && !quote && (
        <div className="mb-4 flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading price...
        </div>
      )}

      {/* Custom amount input */}
      <div className="mb-4">
        <label className="block text-xs text-gray-500 mb-1">MON Amount (for quote)</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={monAmount}
            onChange={(e) => setMonAmount(e.target.value)}
            min="0.01"
            step="0.1"
            className="flex-1 px-3 py-2 rounded-lg bg-gray-900/60 border border-gray-700/50 text-gray-200 text-sm focus:border-red-500 focus:outline-none"
            placeholder="0.5"
          />
          <button
            onClick={fetchQuote}
            disabled={loadingQuote}
            className="px-3 py-2 rounded-lg bg-gray-800 text-gray-300 text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {loadingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Quote'}
          </button>
        </div>
      </div>

      {/* Buy Button */}
      <button
        onClick={handleBuyClick}
        disabled={!isConnected}
        className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-red-800 to-amber-800 text-amber-100 font-bold hover:from-red-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        <ExternalLink className="w-4 h-4" />
        Buy ORACLE on nad.fun
      </button>


      {!isConnected && (
        <div className="mt-3 p-3 rounded-lg bg-yellow-900/30 border border-yellow-700/50 flex items-start gap-2">
          <span className="text-yellow-300 text-sm font-medium">Connect your wallet first to check balance</span>
        </div>
      )}
    </div>
  )
}
