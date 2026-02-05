import { http, createConfig } from 'wagmi'
import { monadTestnet } from './chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected(),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
})
