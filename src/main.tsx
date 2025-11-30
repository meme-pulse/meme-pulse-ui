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

export const hyperEVM = /*#__PURE__*/ defineChain({
  id: 999,
  name: 'HyperEVM',
  nativeCurrency: { name: 'HyperEVM', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: {
      name: 'HyperEVM Explorer',
      url: 'https://hyperevmscan.io/',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
});

export const hyperEVMTestnet = /*#__PURE__*/ defineChain({
  id: 998,
  name: 'HyperEVM Testnet',
  nativeCurrency: { name: 'HyperEVM', symbol: 'HYPE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hyperliquid-testnet.xyz/evm'] },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
    },
  },
});

export const customReadClient = createPublicClient({
  chain: hyperEVM,
  transport: fallback([
    http('https://hyperliquid-mainnet.g.alchemy.com/v2/HCCeCX1QHPnlyp3bB5nLz'),
    http('https://rpc.hyperliquid.xyz/evm'),
  ]),
});

const config = getDefaultConfig({
  appName: 'MemePulse',
  projectId: 'aedf2dab89e0558539df651afcb1baa7',
  chains: [hyperEVM, hyperEVMTestnet],
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
