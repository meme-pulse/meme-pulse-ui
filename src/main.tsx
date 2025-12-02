import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import '@rainbow-me/rainbowkit/styles.css';

import { getDefaultConfig, RainbowKitProvider, type Theme } from '@rainbow-me/rainbowkit';
import { win95Theme } from './lib/rainbowkit-theme';
import { coinbaseWallet, injectedWallet, safeWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from './components/ui/tooltip';
import { createPublicClient, defineChain, fallback } from 'viem';
import { NuqsAdapter } from 'nuqs/adapters/react';

export const memecoreTestnet = /*#__PURE__*/ defineChain({
  id: 43522,
  name: 'Memecore Testnet',
  nativeCurrency: { name: 'Memecore', symbol: 'M', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.insectarium.memecore.net'] },
  },
  blockExplorers: {
    default: {
      name: 'Memecore Explorer',
      url: 'https://insectarium.blockscout.memecore.com',
    },
  },
  contracts: {
    multicall3: {
      address: '0x709bf66fb11942da03a1f7bf59bfa99293f68db9',
    },
  },
});

export const customReadClient = createPublicClient({
  chain: memecoreTestnet,
  transport: fallback([http('https://rpc.insectarium.memecore.net')]),
});

const config = getDefaultConfig({
  appName: 'MemePulse',
  projectId: 'aedf2dab89e0558539df651afcb1baa7',
  chains: [memecoreTestnet],
  ssr: false,
  wallets: [
    {
      groupName: 'Safe',
      wallets: [safeWallet],
    },
    {
      groupName: 'Popular',
      wallets: [injectedWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NuqsAdapter>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider modalSize="compact" theme={win95Theme as Theme}>
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </NuqsAdapter>
  </StrictMode>
);
