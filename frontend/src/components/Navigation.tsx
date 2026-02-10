import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, UserPlus, Users, TrendingUp, Menu, X } from 'lucide-react'
import { useState } from 'react'
import ConnectButton from './ConnectButton'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/register', label: 'Register', icon: UserPlus },
  { path: '/directory', label: 'Directory', icon: Users },
  { path: '/leaderboard', label: 'Leaderboard', icon: TrendingUp },
]

export default function Navigation() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-6 border-b border-red-900/30">
        <Link to="/" className="flex items-center space-x-3 group" onClick={onNavigate}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="w-12 h-12 flex items-center justify-center flex-shrink-0"
          >
            <img src="/image.png" alt="AgentOracle" className="w-full h-full object-contain drop-shadow-lg" />
          </motion.div>
          <div>
            <span className="text-2xl font-bold bg-gradient-to-r from-red-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wider">
              AgentOracle
            </span>
            <p className="text-xs text-amber-600/80 font-semibold tracking-wide">MONAD NETWORK</p>
          </div>
        </Link>
      </div>
      
      <div className="flex-1 flex flex-col justify-between p-4">
        <div className="space-y-2">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-red-900/40 to-amber-900/40 text-amber-300 shadow-lg shadow-amber-900/20 border border-amber-700/30'
                      : 'text-gray-400 hover:text-amber-300 hover:bg-red-900/20 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    isActive ? 'text-amber-400' : 'text-gray-500 group-hover:text-amber-400'
                  } transition-colors`} />
                  <span className="font-bold text-lg tracking-wide">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50"
                    />
                  )}
                </Link>
              </motion.div>
            )
          })}
        </div>
        
        <div className="pt-4 border-t border-red-900/30">
          <ConnectButton />
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="fixed top-0 left-0 h-screen w-64 z-50 hidden md:flex flex-col bg-slate-900/40 backdrop-blur-xl border-r border-red-900/30">
        <NavContent />
      </nav>

      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 md:hidden flex items-center justify-between px-4 py-3 bg-slate-900/80 backdrop-blur-xl border-b border-red-900/30">
        <Link to="/" className="flex items-center space-x-2">
          <img src="/image.png" alt="AgentOracle" className="w-8 h-8 object-contain drop-shadow-lg" />
          <span className="text-lg font-bold bg-gradient-to-r from-red-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wider">
            AgentOracle
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg bg-red-900/30 text-amber-400 hover:bg-red-900/50 transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.nav
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-screen w-72 z-50 flex flex-col bg-slate-900/95 backdrop-blur-xl border-r border-red-900/30 md:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-red-900/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <NavContent onNavigate={() => setMobileOpen(false)} />
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
