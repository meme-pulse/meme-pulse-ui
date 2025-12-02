'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance, useReadContracts } from 'wagmi';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { TOKEN_LIST } from './constants/tokens';
import { retroToast } from '@/components/ui/retro-toast';
import { TypingAnimation } from './components/magicui/typing-animation';
import TokenTicker from './components/token-ticker';
import { formatUnits } from 'viem';
import { formatNumber } from './lib/format';
import { Droplets, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

// FaucetToken ABI - only the functions we need
const FAUCET_TOKEN_ABI = [
  {
    inputs: [],
    name: 'faucet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getRemainingCooldown',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'faucetAmount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'cooldownPeriod',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Get faucet tokens from the token list
const FAUCET_TOKENS = TOKEN_LIST.tokens.filter((token) => token.tags?.includes('Faucet'));

function formatCooldown(seconds: number): string {
  if (seconds <= 0) return 'Ready';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

interface FaucetTokenCardProps {
  token: (typeof FAUCET_TOKENS)[0];
  userAddress: `0x${string}` | undefined;
  onClaimSuccess: () => void;
}

function FaucetTokenCard({ token, userAddress, onClaimSuccess }: FaucetTokenCardProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Read token balance
  const { data: balance, refetch: refetchBalance } = useBalance({
    address: userAddress,
    token: token.address,
  });

  // Read contract data (faucetAmount, cooldownPeriod, remainingCooldown)
  const { data: contractData, refetch: refetchContractData } = useReadContracts({
    contracts: [
      {
        address: token.address,
        abi: FAUCET_TOKEN_ABI,
        functionName: 'faucetAmount',
      },
      {
        address: token.address,
        abi: FAUCET_TOKEN_ABI,
        functionName: 'cooldownPeriod',
      },
      {
        address: token.address,
        abi: FAUCET_TOKEN_ABI,
        functionName: 'getRemainingCooldown',
        args: userAddress ? [userAddress] : undefined,
      },
    ],
    query: {
      enabled: !!userAddress,
    },
  });

  const faucetAmount = contractData?.[0]?.result as bigint | undefined;
  const cooldownPeriod = contractData?.[1]?.result as bigint | undefined;
  const initialCooldown = contractData?.[2]?.result as bigint | undefined;

  // Faucet write contract
  const { writeContract, data: txHash, isPending: isWritePending, reset } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle cooldown countdown
  useEffect(() => {
    if (initialCooldown !== undefined) {
      setCooldownRemaining(Number(initialCooldown));
    }
  }, [initialCooldown]);

  useEffect(() => {
    if (cooldownRemaining > 0) {
      const timer = setInterval(() => {
        setCooldownRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownRemaining]);

  // Handle successful transaction
  useEffect(() => {
    if (isConfirmed && txHash) {
      retroToast.success(`${token.symbol} Claimed!`, {
        description: `Successfully claimed ${faucetAmount ? formatNumber(Number(formatUnits(faucetAmount, token.decimals)), 2, 0) : ''} ${
          token.symbol
        }`,
      });
      // Refetch balance and cooldown
      refetchBalance();
      refetchContractData();
      onClaimSuccess();
      reset();
    }
  }, [isConfirmed, txHash, token.symbol, faucetAmount, token.decimals, refetchBalance, refetchContractData, onClaimSuccess, reset]);

  const handleClaim = () => {
    if (!userAddress) return;
    writeContract({
      address: token.address,
      abi: FAUCET_TOKEN_ABI,
      functionName: 'faucet',
    });
  };

  const isLoading = isWritePending || isConfirming;
  const canClaim = userAddress && cooldownRemaining === 0 && !isLoading;

  return (
    <div
      className="bg-figma-gray-bg p-4"
      style={{
        boxShadow:
          'inset -1px -1px 0px 0px #808088, inset 1px 1px 0px 0px #f9f9fa, inset -2px -2px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb',
      }}
    >
      {/* Token Header */}
      <div className="flex items-center gap-3 mb-4">
        <TokenTicker logoURI={token.logoURI} symbol={token.symbol} className="w-10 h-10 rounded-full bg-green-dark-600" />
        <div>
          <h3 className="font-roboto font-semibold text-figma-text-dark text-lg">{token.symbol}</h3>
          <p className="font-roboto text-figma-text-gray text-sm">{token.name}</p>
        </div>
      </div>

      {/* Token Info */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="font-roboto text-figma-text-gray text-sm">Your Balance</span>
          <span className="font-roboto text-figma-text-dark text-sm font-medium">
            {balance ? formatNumber(Number(formatUnits(balance.value, balance.decimals)), 4, 0) : '0'} {token.symbol}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-roboto text-figma-text-gray text-sm">Claim Amount</span>
          <span className="font-roboto text-figma-text-dark text-sm font-medium">
            {faucetAmount ? formatNumber(Number(formatUnits(faucetAmount, token.decimals)), 2, 0) : '-'} {token.symbol}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-roboto text-figma-text-gray text-sm">Cooldown</span>
          <span className="font-roboto text-figma-text-dark text-sm font-medium flex items-center gap-1">
            {cooldownPeriod !== undefined ? (
              <>
                <Clock className="w-3 h-3" />
                {formatCooldown(Number(cooldownPeriod))}
              </>
            ) : (
              '-'
            )}
          </span>
        </div>
      </div>

      {/* Status & Button */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {cooldownRemaining > 0 ? (
            <>
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="font-roboto text-yellow-600 text-sm font-medium">{formatCooldown(cooldownRemaining)}</span>
            </>
          ) : userAddress ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-roboto text-green-600 text-sm font-medium">Ready to Claim</span>
            </>
          ) : null}
        </div>

        <button
          onClick={handleClaim}
          disabled={!canClaim}
          className={`px-4 py-2 font-roboto text-sm font-medium flex items-center gap-2 transition-all ${
            canClaim
              ? 'bg-figma-purple text-white hover:bg-figma-purple/90 cursor-pointer'
              : 'bg-figma-gray-bg text-figma-text-gray cursor-not-allowed'
          }`}
          style={{
            boxShadow: canClaim
              ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
              : 'inset -1px -1px 0px 0px #808088, inset 1px 1px 0px 0px #f9f9fa',
          }}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isConfirming ? 'Confirming...' : 'Claiming...'}
            </>
          ) : (
            <>
              <Droplets className="w-4 h-4" />
              Claim
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function Faucet() {
  const { address, isConnected } = useAccount();
  const [claimKey, setClaimKey] = useState(0);

  const handleClaimSuccess = () => {
    setClaimKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060208]">
      {/* Space Background with Stars */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #060208 50%, #060208 100%)',
          }}
        />
        {/* Stars layer 1 - small stars */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 20px 30px, white, transparent),
              radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 90px 40px, white, transparent),
              radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 160px 120px, white, transparent),
              radial-gradient(1px 1px at 200px 50px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 250px 180px, white, transparent),
              radial-gradient(1px 1px at 300px 90px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 350px 30px, white, transparent),
              radial-gradient(1px 1px at 400px 150px, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 450px 60px, white, transparent),
              radial-gradient(1px 1px at 500px 200px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 550px 100px, white, transparent),
              radial-gradient(1px 1px at 600px 40px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 650px 170px, white, transparent),
              radial-gradient(1px 1px at 700px 80px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 750px 130px, white, transparent),
              radial-gradient(1px 1px at 800px 20px, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 850px 190px, white, transparent),
              radial-gradient(1px 1px at 900px 70px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 950px 140px, white, transparent),
              radial-gradient(1px 1px at 1000px 50px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 1050px 110px, white, transparent),
              radial-gradient(1px 1px at 1100px 30px, rgba(255,255,255,0.8), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '1200px 250px',
          }}
        />
        {/* Stars layer 2 - medium stars */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 100px 50px, white, transparent),
              radial-gradient(2px 2px at 220px 150px, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 340px 80px, white, transparent),
              radial-gradient(2px 2px at 460px 200px, rgba(255,255,255,0.8), transparent),
              radial-gradient(2px 2px at 580px 30px, white, transparent),
              radial-gradient(2px 2px at 700px 170px, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 820px 100px, white, transparent),
              radial-gradient(2px 2px at 940px 220px, rgba(255,255,255,0.8), transparent),
              radial-gradient(2px 2px at 1060px 60px, white, transparent),
              radial-gradient(2px 2px at 180px 250px, rgba(255,255,255,0.7), transparent),
              radial-gradient(2px 2px at 400px 300px, white, transparent),
              radial-gradient(2px 2px at 620px 280px, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 840px 320px, white, transparent),
              radial-gradient(2px 2px at 1000px 290px, rgba(255,255,255,0.8), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '1200px 400px',
          }}
        />
        {/* Cyan glow accent for faucet theme */}
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[400px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.3) 0%, transparent 70%)',
          }}
        />
      </div>

      <main className="relative z-10 max-w-screen-2xl mx-auto px-2 sm:px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="min-h-[42px] flex items-start justify-between">
            <div className="flex items-center gap-4">
              <TypingAnimation
                as="h1"
                className="text-white text-[42px] leading-[15.668px] tracking-[-1.68px] mb-0"
                style={{ fontFamily: '"Press Start 2P", cursive' }}
                duration={50}
              >
                TESTNET FAUCET
              </TypingAnimation>
              {/* Water droplet animation */}
              <div className="flex-shrink-0 opacity-80">
                <Droplets className="w-12 h-12 text-cyan-400 animate-pulse" />
              </div>
            </div>
          </div>
          <div className="min-h-[48px] mt-[38px]">
            <p className="font-roboto text-zinc-400 text-[16px] leading-normal max-w-[854px]">
              Claim testnet tokens for free to experiment with MemePulse on Memecore Testnet. Each token has a cooldown period between
              claims.
            </p>
          </div>
        </div>

        {/* Faucet Card */}
        <CardWithHeader title="Token Faucet" contentClassName="p-4">
          {/* Not Connected State */}
          {!isConnected && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Droplets className="w-16 h-16 text-figma-text-gray opacity-50" />
              <p className="font-roboto text-figma-text-gray text-lg">Connect your wallet to claim tokens</p>
              <ConnectButton />
            </div>
          )}

          {/* Connected State - Token Grid */}
          {isConnected && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" key={claimKey}>
              {FAUCET_TOKENS.map((token) => (
                <FaucetTokenCard key={token.address} token={token} userAddress={address} onClaimSuccess={handleClaimSuccess} />
              ))}
            </div>
          )}

          {/* Info Section */}
          <div
            className="mt-6 p-4 bg-figma-gray-bg"
            style={{
              boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
            }}
          >
            <h4 className="font-roboto font-semibold text-figma-text-dark text-sm mb-2 flex items-center gap-2">
              <span>ℹ️</span> How to use the Faucet
            </h4>
            <ul className="font-roboto text-figma-text-gray text-sm space-y-1">
              <li>• Connect your wallet to the Memecore Testnet</li>
              <li>• Click &quot;Claim&quot; on any token to receive testnet tokens</li>
              <li>• Each token has a cooldown period before you can claim again</li>
              <li>• Use these tokens to test swaps and liquidity pools</li>
            </ul>
          </div>
        </CardWithHeader>
      </main>
    </div>
  );
}

