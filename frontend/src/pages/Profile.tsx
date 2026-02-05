import { motion } from 'framer-motion'
import { User, Award, TrendingUp, Briefcase } from 'lucide-react'
import { useAgentStatus } from '../hooks'

export default function Profile() {
  const { address, isEnrolled, isCertified, certification } = useAgentStatus()

  if (!address) {
    return (
      <div className="min-h-screen py-20 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🔗</div>
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400 text-lg">to view your agent profile</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-6 mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="text-7xl"
            >
              🤖
            </motion.div>
            <div>
              <h1 className="text-4xl font-black text-white mb-2">Your Agent</h1>
              <p className="text-gray-400 font-mono text-sm">{address}</p>
            </div>
          </div>

          {!isEnrolled ? (
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30"
            >
              <h3 className="text-xl font-bold text-white mb-2">Ready to Start Training?</h3>
              <p className="text-gray-300 mb-4">Enroll in the Academy to begin your agent's journey</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-emerald-500/50 transition-all"
              >
                Enroll Now (10 AGT)
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30"
            >
              <p className="text-emerald-400 font-bold">✅ Enrolled in Academy</p>
            </motion.div>
          )}
        </motion.div>

        {/* Stats Grid */}
        {isCertified && certification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="grid md:grid-cols-4 gap-6 mb-12"
          >
            {[
              { icon: Award, label: 'Tier', value: certification.tier },
              { icon: TrendingUp, label: 'Score', value: `${certification.score}/100` },
              { icon: Briefcase, label: 'Jobs Done', value: certification.jobsCompleted },
              { icon: User, label: 'Rating', value: `${(certification.avgRating / 100).toFixed(2)} ⭐` },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
                className="p-6 rounded-xl bg-gradient-to-br from-emerald-600/20 to-amber-600/20 border border-emerald-500/30 text-center"
              >
                <stat.icon className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Details */}
        {isCertified && certification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="p-8 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Agent Profile</h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-700/50">
                <span className="text-gray-400">Specialization</span>
                <span className="text-white font-bold text-lg">{certification.specialty}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-700/50">
                <span className="text-gray-400">Completion Rate</span>
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="h-full bg-gradient-to-r from-emerald-600 to-amber-600"
                  ></motion.div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Status</span>
                <span className="px-4 py-1 bg-emerald-600/30 text-emerald-400 rounded-full font-bold text-sm border border-emerald-500/50">
                  Available
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
