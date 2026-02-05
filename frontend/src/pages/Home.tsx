import { motion } from 'framer-motion'
import { Zap, Code, Rocket, Shield } from 'lucide-react'

export default function Home() {
  const features = [
    {
      icon: Shield,
      title: 'Verified Identity',
      description: 'ERC-8004 compliant agent identities',
      color: 'from-red-900 to-red-700',
    },
    {
      icon: Code,
      title: 'Health Monitoring',
      description: '24/7 uptime tracking & health scores',
      color: 'from-amber-900 to-amber-700',
    },
    {
      icon: Rocket,
      title: 'High Performance',
      description: '10,000+ TPS on Monad Testnet',
      color: 'from-yellow-800 to-orange-700',
    },
    {
      icon: Zap,
      title: 'Trust Signals',
      description: 'Reputation & validation for reliability',
      color: 'from-red-800 to-amber-800',
    },
  ]

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className="min-h-screen px-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 px-4">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-900/20 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-amber-900/20 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h1 className="text-5xl md:text-7xl font-black mb-6 bg-gradient-to-r from-red-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wider">
            TRUSTLESS AGENT IDENTITY
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 leading-relaxed font-medium">
            Authentication, health monitoring, and reputation for the agentic economy. ERC-8004 compliant identity registry with 24/7 uptime tracking on Monad.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.a
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(217, 119, 6, 0.5)' }}
              whileTap={{ scale: 0.95 }}
              href="/register"
              className="px-8 py-4 bg-gradient-to-r from-red-900 to-amber-900 text-amber-100 font-bold rounded-xl hover:shadow-2xl transition-all text-lg tracking-wider border-2 border-amber-700/30"
            >
              REGISTER AGENT →
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="/directory"
              className="px-8 py-4 border-2 border-amber-600 text-amber-400 font-bold rounded-xl hover:bg-amber-600/10 transition-all text-lg tracking-wider"
            >
              VIEW DIRECTORY
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-16 bg-gradient-to-r from-red-300 to-yellow-500 bg-clip-text text-transparent tracking-wider">
            WHY AUTHUPTIME?
          </h2>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={idx}
                  variants={item}
                  whileHover={{ y: -10 }}
                  className="group relative p-6 rounded-2xl bg-gradient-to-br from-gray-900/80 to-red-950/30 border border-red-900/30 hover:border-amber-700/50 transition-all backdrop-blur-sm"
                >
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-all`}></div>

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-2.5 mb-4 shadow-lg`}>
                    <Icon className="w-full h-full text-amber-100" />
                  </div>

                  <h3 className="text-xl font-bold text-amber-100 mb-2 tracking-wide">{feature.title}</h3>
                  <p className="text-gray-400 font-medium">{feature.description}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-gradient-to-b from-red-950/20 to-transparent">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-16 bg-gradient-to-r from-red-300 to-yellow-500 bg-clip-text text-transparent tracking-wider">
            4-STEP JOURNEY
          </h2>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {[
              { num: '1', title: 'REGISTER', desc: 'Create agent identity NFT', color: 'from-red-900 to-red-700' },
              { num: '2', title: 'STAKE', desc: 'Lock AUTH tokens', color: 'from-amber-900 to-amber-700' },
              { num: '3', title: 'MONITOR', desc: '24/7 health tracking', color: 'from-yellow-800 to-orange-700' },
              { num: '4', title: 'BUILD TRUST', desc: 'Earn reputation', color: 'from-orange-800 to-red-800' },
            ].map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.2 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-lg shadow-amber-900/50 font-black text-2xl text-amber-100 border-2 border-amber-700/30`}
                  >
                    {step.num}
                  </motion.div>
                  <h3 className="font-bold text-lg text-amber-100 text-center tracking-wide">{step.title}</h3>
                  <p className="text-gray-400 text-sm text-center font-medium">{step.desc}</p>
                </div>

                {idx < 3 && (
                  <div className="hidden md:block absolute top-10 left-1/2 w-full h-1 bg-gradient-to-r from-amber-700/50 to-transparent -z-10"></div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { label: 'Network', value: 'MONAD', icon: '⚡' },
              { label: 'Throughput', value: '10K+ TPS', icon: '🚀' },
              { label: 'Token', value: 'AGT', icon: '💎' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-red-950/30 border border-amber-900/30 text-center backdrop-blur-sm"
              >
                <div className="text-5xl mb-4">{stat.icon}</div>
                <div className="text-gray-400 text-sm mb-2 tracking-wider font-semibold">{stat.label}</div>
                <div className="text-3xl font-black bg-gradient-to-r from-red-300 to-yellow-500 bg-clip-text text-transparent tracking-wider">
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
