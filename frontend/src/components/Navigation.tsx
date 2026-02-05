import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, UserPlus, Users, User, TrendingUp, Zap, Sparkles } from 'lucide-react'
import ConnectButton from './ConnectButton'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/register', label: 'Register', icon: UserPlus },
  { path: '/register-managed', label: 'Managed', icon: Sparkles, highlight: true },
  { path: '/directory', label: 'Directory', icon: Users },
  { path: '/leaderboard', label: 'Leaderboard', icon: TrendingUp },
  { path: '/profile', label: 'Profile', icon: User },
]

export default function Navigation() {
  const location = useLocation()

  return (
    <nav className="fixed top-0 left-0 h-screen w-64 z-50 hidden md:flex flex-col bg-slate-900/40 backdrop-blur-xl border-r border-red-900/30">
      <div className="p-6 border-b border-red-900/30">
        <Link to="/" className="flex items-center space-x-3 group">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="p-2 bg-gradient-to-br from-red-900/50 to-amber-900/50 rounded-lg group-hover:shadow-lg group-hover:shadow-amber-900/50 transition-all"
          >
            <Zap className="w-6 h-6 text-amber-400" />
          </motion.div>
          <div>
            <span className="text-2xl font-bold bg-gradient-to-r from-red-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wider">
              AUTH
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
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-red-900/40 to-amber-900/40 text-amber-300 shadow-lg shadow-amber-900/20 border border-amber-700/30'
                      : item.highlight
                      ? 'bg-gradient-to-r from-yellow-900/20 to-orange-900/20 text-yellow-300 hover:from-yellow-900/30 hover:to-orange-900/30 border border-yellow-700/30'
                      : 'text-gray-400 hover:text-amber-300 hover:bg-red-900/20 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    isActive ? 'text-amber-400' : 
                    item.highlight ? 'text-yellow-400' :
                    'text-gray-500 group-hover:text-amber-400'
                  } transition-colors`} />
                  <span className="font-bold text-lg tracking-wide">{item.label}</span>
                  {item.highlight && !isActive && (
                    <span className="absolute -top-1 -right-1 px-2 py-0.5 bg-yellow-500 text-black text-xs font-black rounded-full">NEW</span>
                  )}
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
    </nav>
  )
}
