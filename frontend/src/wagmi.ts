import { http, createConfig } from 'wagmi'
import { monadMainnet } from './chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [monadMainnet],
  connectors: [
    injected(),
  ],
  transports: {
    [monadMainnet.id]: http(),
  },
})
