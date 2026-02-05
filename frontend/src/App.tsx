import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './wagmi'
import Layout from './components/Layout'
import Home from './pages/Home'
import RegisterAgent from './pages/RegisterAgent'
import RegisterManagedAgent from './pages/RegisterManagedAgent'
import AgentDirectory from './pages/AgentDirectory'
import Profile from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import './index.css'

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<RegisterAgent />} />
              <Route path="/register-managed" element={<RegisterManagedAgent />} />
              <Route path="/directory" element={<AgentDirectory />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
