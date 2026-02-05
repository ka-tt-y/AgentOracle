import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { motion } from 'framer-motion'
import { Wallet, LogOut } from 'lucide-react'

export default function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="flex flex-col gap-2">
        <div className="px-3 py-2 bg-red-950/30 rounded-lg border border-amber-900/30">
          <span className="text-xs text-amber-500 font-bold tracking-wider">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => disconnect()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-900/60 to-red-800/60 text-red-200 rounded-lg font-bold text-sm tracking-wider border border-red-700/40 hover:border-red-600/60 transition-all duration-300"
        >
          <LogOut className="w-4 h-4" />
          <span>DISCONNECT</span>
        </motion.button>
      </div>
    )
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => connect({ connector: connectors[0] })}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-900/60 to-amber-900/60 text-amber-200 rounded-xl font-bold tracking-wider border border-amber-700/40 hover:border-amber-600/60 transition-all duration-300 shadow-lg shadow-amber-900/20 hover:shadow-amber-800/40"
    >
      <Wallet className="w-5 h-5" />
      <span>CONNECT</span>
    </motion.button>
  )
}
