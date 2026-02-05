import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import { AnimatedBackground } from './AnimatedBackground'

export default function Layout() {
  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <Navigation />
      <main className="ml-0 md:ml-64 transition-all duration-300 relative z-10 pt-4">
        <Outlet />
      </main>
    </div>
  )
}
