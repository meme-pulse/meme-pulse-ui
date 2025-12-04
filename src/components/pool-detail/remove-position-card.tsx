import { useState, useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAccount, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { useLocalStorage } from 'usehooks-ts';
import { retroToast } from '@/components/ui/retro-toast';

import type { PoolData } from '@/PoolDetail';
import { useUserLiquidityBinIds } from '@/hooks/use-user-liquidity-bin-ids';
import { useBinAllowance } from '@/hooks/use-allowance';
import { useActiveId } from '@/hooks/use-active-id';
import { useTokenList } from '@/hooks/use-token-list';
import { useTokensData } from '@/hooks/use-token-data';
import { DualRangeSlider } from '../ui/dual-range-slider';
import TokenTicker from '../token-ticker';
import { formatNumber } from '@/lib/format';
import { getPriceFromId } from '@/lib/bin';
import { DEFAULT_CHAINID } from '@/constants';
import { LIQUIDITY_HELPER_V2_ADDRESS, LiquidityHelperV2ABI, LB_ROUTER_V22_ADDRESS, LBRouterV22ABI, LBPairV21ABI, WNATIVE } from '@/lib/sdk';
import { zeroAddress } from 'viem';

interface RemovePositionCardProps {
  poolData: PoolData;
  yBaseCurrency: boolean;
  setYBaseCurrency: (yBaseCurrency: boolean) => void;
}

interface UserBinAmount {
  binId: number;
  tokenXAmount: number;
  tokenYAmount: number;
  tokenXAmountBigInt: bigint;
  tokenYAmountBigInt: bigint;
  amount: bigint;
}

export function RemovePositionCard({ poolData, yBaseCurrency }: RemovePositionCardProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [liquidityTolerance] = useLocalStorage('liquidity-tolerance', 0.1);
  const [binCountLimit] = useLocalStorage('bin-count-limit', '0');

  const { data: tokenListData } = useTokenList();
  const activeId = useActiveId(poolData.pairAddress as `0x${string}`, poolData.activeBinId);

  const [isNativeOut, setIsNativeOut] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [withdrawTab, setWithdrawTab] = useState<'both' | 'tokenX' | 'tokenY'>('both');
  const [withdrawPriceRange, setWithdrawPriceRange] = useState<[number, number]>([0, 0]);

  // Fetch user token balances for refetch after remove
  const { refetch: refetchTokenBalanceData } = useTokensData({
    tokenAddresses: [poolData.tokenX.address as `0x${string}`, poolData.tokenY.address as `0x${string}`, zeroAddress],
    enabled: true,
  });

  // Fetch user's liquidity bin IDs
  const {
    data: myBinIds,
    isFetched: isMyBinIdsFetched,
    refetch: refetchMyBinIds,
  } = useUserLiquidityBinIds({
    poolAddress: poolData.pairAddress,
    userAddress: address || '',
    enabled: !!address,
    select: (data: number[]) => data.sort((a, b) => Number(a) - Number(b)),
  });

  // Initialize withdraw price range when bin IDs are fetched
  useEffect(() => {
    if (myBinIds && myBinIds.length > 0) {
      setWithdrawPriceRange([0, myBinIds.length - 1]);
    }
  }, [myBinIds]);

  // Convert bin IDs to BigInt for contract call (uint256[])
  const binIdsAsBigInt = useMemo(() => {
    if (!myBinIds || myBinIds.length === 0) return [];
    return myBinIds.map((id) => BigInt(id));
  }, [myBinIds]);

  // Fetch bin liquidity amounts
  const { data: binLiquidityAmounts, refetch: refetchBinLiquidityAmounts, error: binLiquidityError, status: binLiquidityStatus } = useReadContract({
    address: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
    abi: LiquidityHelperV2ABI,
    functionName: 'getAmountsOf',
    args: [poolData.pairAddress as `0x${string}`, address as `0x${string}`, binIdsAsBigInt],
    query: {
      enabled: binIdsAsBigInt.length > 0 && !!address,
    },
  });

  // Fetch bin shares amounts
  const { data: binSharesAmounts, refetch: refetchBinSharesAmounts, error: binSharesError, status: binSharesStatus } = useReadContract({
    address: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
    abi: LiquidityHelperV2ABI,
    functionName: 'getSharesOf',
    args: [poolData.pairAddress as `0x${string}`, address as `0x${string}`, binIdsAsBigInt],
    query: {
      enabled: binIdsAsBigInt.length > 0 && !!address,
    },
  });

  // Debug logs for remove position card
  console.log('[RemovePositionCard] Debug Info:', {
    myBinIds,
    myBinIdsTypes: myBinIds?.slice(0, 3).map((id) => typeof id),
    binIdsAsBigInt: binIdsAsBigInt.slice(0, 3).map(String),
    binLiquidityAmounts,
    binLiquidityError: binLiquidityError?.message || binLiquidityError,
    binLiquidityStatus,
    binSharesAmounts,
    binSharesError: binSharesError?.message || binSharesError,
    binSharesStatus,
    poolAddress: poolData.pairAddress,
    userAddress: address,
    queryEnabled: binIdsAsBigInt.length > 0 && !!address,
  });

  // Calculate user bins amounts
  const userBinsAmounts = useMemo<UserBinAmount[]>(() => {
    if (!binLiquidityAmounts || !binSharesAmounts || !myBinIds) return [];
    const amounts = binLiquidityAmounts as unknown as bigint[][];
    const shares = binSharesAmounts as unknown as bigint[];
    return myBinIds.map((binId: number, index: number) => ({
      binId,
      tokenXAmount: Number(amounts[0][index]),
      tokenYAmount: Number(amounts[1][index]),
      tokenXAmountBigInt: amounts[0][index],
      tokenYAmountBigInt: amounts[1][index],
      amount: shares[index],
    }));
  }, [binLiquidityAmounts, binSharesAmounts, myBinIds]);

  // Calculate total position values
  const totalPositionValue = useMemo(() => {
    const tokenXAmount = userBinsAmounts.reduce((acc, bin) => acc + bin.tokenXAmount, 0) / 10 ** poolData.tokenX.decimals;
    const tokenYAmount = userBinsAmounts.reduce((acc, bin) => acc + bin.tokenYAmount, 0) / 10 ** poolData.tokenY.decimals;
    return { tokenXAmount, tokenYAmount };
  }, [userBinsAmounts, poolData.tokenX.decimals, poolData.tokenY.decimals]);

  // Calculate remove liquidity input based on selected tab and range
  const removeLiquidityInput = useMemo(() => {
    const currentTimeInSec = Math.floor(Date.now() / 1000);

    if (withdrawTab === 'both') {
      const selectedBins = userBinsAmounts.slice(withdrawPriceRange[0], withdrawPriceRange[1] + 1);
      const tokenXAmount = selectedBins.reduce((acc, bin) => acc + bin.tokenXAmount, 0) / 10 ** poolData.tokenX.decimals;
      const tokenYAmount = selectedBins.reduce((acc, bin) => acc + bin.tokenYAmount, 0) / 10 ** poolData.tokenY.decimals;

      return {
        tokenX: poolData.tokenX.address,
        tokenY: poolData.tokenY.address,
        binStep: poolData.lbBinStep,
        amountXmin: 0,
        amountYmin: 0,
        ids: selectedBins.filter((bin) => bin.amount > 0n).map((bin) => bin.binId),
        amounts: selectedBins.filter((bin) => bin.amount > 0n).map((bin) => bin.amount),
        to: address as `0x${string}`,
        deadline: currentTimeInSec + 3600,
        tokenXAmount,
        tokenYAmount,
        bins: selectedBins.filter((bin) => bin.amount > 0n),
      };
    }

    if (withdrawTab === 'tokenX') {
      // Filter bins with price higher than active bin (binId > activeId)
      const filteredBins = userBinsAmounts.filter((bin) => bin.binId > activeId && bin.amount > 0n);
      const tokenXAmount = filteredBins.reduce((acc, bin) => acc + bin.tokenXAmount, 0) / 10 ** poolData.tokenX.decimals;
      const tokenYAmount = filteredBins.reduce((acc, bin) => acc + bin.tokenYAmount, 0) / 10 ** poolData.tokenY.decimals;

      return {
        tokenX: poolData.tokenX.address,
        tokenY: poolData.tokenY.address,
        binStep: poolData.lbBinStep,
        amountXmin: 0,
        amountYmin: 0,
        ids: filteredBins.map((bin) => bin.binId),
        amounts: filteredBins.map((bin) => bin.amount),
        to: address as `0x${string}`,
        deadline: currentTimeInSec + 3600,
        tokenXAmount,
        tokenYAmount,
        bins: filteredBins,
      };
    }

    // withdrawTab === 'tokenY'
    // Filter bins with price lower than active bin (binId < activeId)
    const filteredBins = userBinsAmounts.filter((bin) => bin.binId < activeId && bin.amount > 0n);
    const tokenXAmount = filteredBins.reduce((acc, bin) => acc + bin.tokenXAmount, 0) / 10 ** poolData.tokenX.decimals;
    const tokenYAmount = filteredBins.reduce((acc, bin) => acc + bin.tokenYAmount, 0) / 10 ** poolData.tokenY.decimals;

    return {
      tokenX: poolData.tokenX.address,
      tokenY: poolData.tokenY.address,
      binStep: poolData.lbBinStep,
      amountXmin: 0,
      amountYmin: 0,
      ids: filteredBins.map((bin) => bin.binId),
      amounts: filteredBins.map((bin) => bin.amount),
      to: address as `0x${string}`,
      deadline: currentTimeInSec + 3600,
      tokenXAmount,
      tokenYAmount,
      bins: filteredBins,
    };
  }, [address, activeId, poolData, userBinsAmounts, withdrawPriceRange, withdrawTab]);

  // Calculate price range for display
  const minWithdrawPriceWithDecimals = useMemo(() => {
    if (myBinIds && myBinIds.length > 0 && withdrawPriceRange[0] < myBinIds.length) {
      const price = getPriceFromId(myBinIds[withdrawPriceRange[0]], poolData.lbBinStep);
      return yBaseCurrency
        ? (1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
        : price * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
    }
    return 0;
  }, [poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals, withdrawPriceRange, myBinIds, yBaseCurrency]);

  const maxWithdrawPriceWithDecimals = useMemo(() => {
    if (myBinIds && myBinIds.length > 0 && withdrawPriceRange[1] < myBinIds.length) {
      const price = getPriceFromId(myBinIds[withdrawPriceRange[1]], poolData.lbBinStep);
      return yBaseCurrency
        ? (1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
        : price * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
    }
    return 0;
  }, [poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals, withdrawPriceRange, myBinIds, yBaseCurrency]);

  // Calculate "Remove All" input (for simple mode)
  const removeAllInput = useMemo(() => {
    const currentTimeInSec = Math.floor(Date.now() / 1000);
    const allBins = userBinsAmounts.filter((bin) => bin.amount > 0n);
    const tokenXAmount = allBins.reduce((acc, bin) => acc + bin.tokenXAmount, 0) / 10 ** poolData.tokenX.decimals;
    const tokenYAmount = allBins.reduce((acc, bin) => acc + bin.tokenYAmount, 0) / 10 ** poolData.tokenY.decimals;

    return {
      tokenX: poolData.tokenX.address,
      tokenY: poolData.tokenY.address,
      binStep: poolData.lbBinStep,
      amountXmin: 0,
      amountYmin: 0,
      ids: allBins.map((bin) => bin.binId),
      amounts: allBins.map((bin) => bin.amount),
      to: address as `0x${string}`,
      deadline: currentTimeInSec + 3600,
      tokenXAmount,
      tokenYAmount,
      bins: allBins,
    };
  }, [address, poolData, userBinsAmounts]);

  // Calculate remove all chunks for batch processing
  const removeAllChunks = useMemo(() => {
    if (!removeAllInput || !removeAllInput.ids.length) return [];

    const binLimit = Number(binCountLimit);
    const ids = removeAllInput.ids;
    const amounts = removeAllInput.amounts;
    const bins = removeAllInput.bins;

    if (!binLimit || ids.length <= binLimit) {
      return [removeAllInput];
    }

    const chunks = [];
    for (let i = 0; i < ids.length; i += binLimit) {
      const currentTimeInSec = Math.floor(Date.now() / 1000);
      const liquidityToleranceFrom10000 = BigInt((10000 - liquidityTolerance * 100).toFixed(0));
      const chunkBins = bins.slice(i, i + binLimit);

      const amountXmin =
        (chunkBins.map((bin) => bin.tokenXAmountBigInt).reduce((acc, curr) => acc + curr, 0n) * liquidityToleranceFrom10000) / 10000n;
      const amountYmin =
        (chunkBins.map((bin) => bin.tokenYAmountBigInt).reduce((acc, curr) => acc + curr, 0n) * liquidityToleranceFrom10000) / 10000n;

      chunks.push({
        ...removeAllInput,
        ids: ids.slice(i, i + binLimit),
        amounts: amounts.slice(i, i + binLimit),
        deadline: currentTimeInSec + 3600,
        amountXmin,
        amountYmin,
      });
    }
    return chunks;
  }, [removeAllInput, binCountLimit, liquidityTolerance]);

  // Bin approval
  const { allowance: binApproved, refetchAllowance: refetchBinApproved } = useBinAllowance(poolData.pairAddress);
  const [isApproveBinLoading, setIsApproveBinLoading] = useState(false);
  const [approveBinTxHash, setApproveBinTxHash] = useState<`0x${string}` | null>(null);

  const handleApproveBinCall = async () => {
    try {
      setIsApproveBinLoading(true);
      const hash = await writeContractAsync({
        address: poolData.pairAddress as `0x${string}`,
        abi: LBPairV21ABI,
        functionName: 'approveForAll',
        args: [LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID], true],
      });
      retroToast.success('Approval transaction sent', {
        action: {
          label: 'View on Explorer',
          onClick: () => window.open(`https://insectarium.blockscout.memecore.com/tx/${hash}`, '_blank'),
        },
      });
      setApproveBinTxHash(hash);
    } catch (error) {
      console.error(error);
      retroToast.error('Failed to approve');
      setIsApproveBinLoading(false);
    }
  };

  // Wait for approve transaction receipt
  const { isSuccess: isApproveConfirmed, isError: isApproveConfirmationError } = useWaitForTransactionReceipt({
    hash: approveBinTxHash as `0x${string}`,
    query: {
      enabled: !!approveBinTxHash,
    },
  });

  useEffect(() => {
    if (isApproveConfirmed && approveBinTxHash) {
      retroToast.success('Approval confirmed');
      refetchBinApproved();
      setIsApproveBinLoading(false);
      setApproveBinTxHash(null);
    }
  }, [isApproveConfirmed, approveBinTxHash, refetchBinApproved]);

  useEffect(() => {
    if (isApproveConfirmationError && approveBinTxHash) {
      retroToast.error('Approval transaction failed');
      setIsApproveBinLoading(false);
      setApproveBinTxHash(null);
    }
  }, [isApproveConfirmationError, approveBinTxHash]);

  // Remove liquidity state
  const [isRemoveLiquidityLoading, setIsRemoveLiquidityLoading] = useState<
    'idle' | 'removeLiquidity' | 'waitingForRemoveLiquidityConfirmation'
  >('idle');
  const [removeLiquidityTxHash, setRemoveLiquidityTxHash] = useState<`0x${string}` | null>(null);
  const [currentRemoveLiquidityBatch, setCurrentRemoveLiquidityBatch] = useState(0);
  const [totalRemoveLiquidityBatches, setTotalRemoveLiquidityBatches] = useState(0);

  // Calculate remove liquidity chunks for batch processing
  const removeLiquidityChunks = useMemo(() => {
    if (!removeLiquidityInput || !removeLiquidityInput.ids.length) return [];

    const binLimit = Number(binCountLimit);
    const ids = removeLiquidityInput.ids;
    const amounts = removeLiquidityInput.amounts;
    const bins = removeLiquidityInput.bins;

    if (!binLimit || ids.length <= binLimit) {
      return [removeLiquidityInput];
    }

    const chunks = [];
    for (let i = 0; i < ids.length; i += binLimit) {
      const currentTimeInSec = Math.floor(Date.now() / 1000);
      const liquidityToleranceFrom10000 = BigInt((10000 - liquidityTolerance * 100).toFixed(0));
      const chunkBins = bins.slice(i, i + binLimit);

      const amountXmin =
        (chunkBins.map((bin) => bin.tokenXAmountBigInt).reduce((acc, curr) => acc + curr, 0n) * liquidityToleranceFrom10000) / 10000n;
      const amountYmin =
        (chunkBins.map((bin) => bin.tokenYAmountBigInt).reduce((acc, curr) => acc + curr, 0n) * liquidityToleranceFrom10000) / 10000n;

      chunks.push({
        ...removeLiquidityInput,
        ids: ids.slice(i, i + binLimit),
        amounts: amounts.slice(i, i + binLimit),
        deadline: currentTimeInSec + 3600,
        amountXmin,
        amountYmin,
      });
    }
    return chunks;
  }, [removeLiquidityInput, binCountLimit, liquidityTolerance]);

  // Send remove liquidity transaction
  const sendNextRemoveLiquidityTransaction = async (index: number) => {
    if (index >= removeLiquidityChunks.length) {
      const message =
        totalRemoveLiquidityBatches > 1
          ? `Remove Liquidity completed (${totalRemoveLiquidityBatches} batches)`
          : 'Remove Liquidity transaction confirmed';
      retroToast.success(message);
      setIsRemoveLiquidityLoading('idle');
      setCurrentRemoveLiquidityBatch(0);
      setTotalRemoveLiquidityBatches(0);
      refetchTokenBalanceData();
      refetchBinLiquidityAmounts();
      refetchBinSharesAmounts();
      setTimeout(() => {
        refetchMyBinIds();
      }, 2000);
      return;
    }

    try {
      setIsRemoveLiquidityLoading('removeLiquidity');
      const chunk = removeLiquidityChunks[index];

      const isNative = isNativeOut;
      const isTokenXNative = poolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address;
      const isTokenYNative = poolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address;

      const functionName = isNative ? 'removeLiquidityNATIVE' : 'removeLiquidity';
      const args =
        isNative && isTokenXNative
          ? [chunk.tokenY, chunk.binStep, chunk.amountXmin, chunk.amountYmin, chunk.ids, chunk.amounts, chunk.to, chunk.deadline]
          : isNative && isTokenYNative
          ? [chunk.tokenX, chunk.binStep, chunk.amountXmin, chunk.amountYmin, chunk.ids, chunk.amounts, chunk.to, chunk.deadline]
          : [
              chunk.tokenX,
              chunk.tokenY,
              chunk.binStep,
              chunk.amountXmin,
              chunk.amountYmin,
              chunk.ids,
              chunk.amounts,
              chunk.to,
              chunk.deadline,
            ];

      const simulatedGas = await publicClient?.estimateContractGas({
        account: address as `0x${string}`,
        address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
        abi: LBRouterV22ABI,
        functionName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: args as any,
      });

      const hash = await writeContractAsync({
        address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
        abi: LBRouterV22ABI,
        functionName,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args: args as any,
        gas: simulatedGas ? (simulatedGas * 120n) / 100n : undefined,
      });

      retroToast.success(`Remove Liquidity transaction ${index + 1} of ${removeLiquidityChunks.length} sent`, {
        action: {
          label: 'View on Explorer',
          onClick: () => window.open(`https://insectarium.blockscout.memecore.com/tx/${hash}`, '_blank'),
        },
      });

      setRemoveLiquidityTxHash(hash);
      setCurrentRemoveLiquidityBatch(index + 1);
      setIsRemoveLiquidityLoading('waitingForRemoveLiquidityConfirmation');
    } catch (error) {
      console.error(error);
      retroToast.error('Failed to remove liquidity', {
        description: `Transaction ${index + 1} failed. Please try again.`,
      });
      setIsRemoveLiquidityLoading('idle');
      setCurrentRemoveLiquidityBatch(0);
      setTotalRemoveLiquidityBatches(0);
      refetchTokenBalanceData();
      refetchBinLiquidityAmounts();
      refetchBinSharesAmounts();
      setTimeout(() => {
        refetchMyBinIds();
      }, 2000);
    }
  };

  // Handle remove liquidity button click
  const handleRemoveLiquidityContractCall = async () => {
    if (!removeLiquidityInput || removeLiquidityInput.ids.length === 0) {
      retroToast.error('No liquidity to remove');
      return;
    }

    setRemoveLiquidityTxHash(null);
    setCurrentRemoveLiquidityBatch(0);
    setTotalRemoveLiquidityBatches(removeLiquidityChunks.length);
    sendNextRemoveLiquidityTransaction(0);
  };

  // Handle "Remove All" button click
  const handleRemoveAll = () => {
    if (myBinIds && myBinIds.length > 0) {
      setWithdrawPriceRange([0, myBinIds.length - 1]);
    }
  };

  // Wait for transaction receipt
  const { isSuccess: isRemoveLiquidityConfirmed, isError: isRemoveLiquidityConfirmationError } = useWaitForTransactionReceipt({
    hash: removeLiquidityTxHash as `0x${string}`,
    query: {
      enabled: !!removeLiquidityTxHash,
    },
  });

  useEffect(() => {
    if (isRemoveLiquidityConfirmed) {
      sendNextRemoveLiquidityTransaction(currentRemoveLiquidityBatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRemoveLiquidityConfirmed]);

  useEffect(() => {
    if (isRemoveLiquidityConfirmationError) {
      retroToast.error('Failed to remove liquidity', {
        description: 'Please try again',
      });
      setIsRemoveLiquidityLoading('idle');
    }
  }, [isRemoveLiquidityConfirmationError]);

  // Check if pool contains native token
  const hasNativeToken =
    poolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address || poolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address;

  // No positions state
  if (!isMyBinIdsFetched) {
    return (
      <div
        className="text-center py-12 bg-figma-gray-table"
        style={{
          boxShadow:
            'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
        }}
      >
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-figma-purple" />
        <p className="font-roboto text-figma-text-gray mt-2">Loading positions...</p>
      </div>
    );
  }

  if (!myBinIds || myBinIds.length === 0) {
    return (
      <div
        className="text-center py-12 bg-figma-gray-table"
        style={{
          boxShadow:
            'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
        }}
      >
        <p className="font-roboto text-figma-text-gray">You have no liquidity positions in this pool.</p>
      </div>
    );
  }

  // Handle "Exit All" button click (simple mode)
  const handleExitAll = async () => {
    if (!removeAllInput || removeAllInput.ids.length === 0) {
      retroToast.error('No liquidity to remove');
      return;
    }

    // Use removeAllChunks for the transaction
    setRemoveLiquidityTxHash(null);
    setCurrentRemoveLiquidityBatch(0);
    setTotalRemoveLiquidityBatches(removeAllChunks.length);

    // Send using removeAllChunks
    const sendExitAllTransaction = async (index: number) => {
      if (index >= removeAllChunks.length) {
        const message = removeAllChunks.length > 1 ? `Exit completed (${removeAllChunks.length} batches)` : 'Exit completed';
        retroToast.success(message);
        setIsRemoveLiquidityLoading('idle');
        setCurrentRemoveLiquidityBatch(0);
        setTotalRemoveLiquidityBatches(0);
        refetchTokenBalanceData();
        refetchBinLiquidityAmounts();
        refetchBinSharesAmounts();
        setTimeout(() => {
          refetchMyBinIds();
        }, 2000);
        return;
      }

      try {
        setIsRemoveLiquidityLoading('removeLiquidity');
        const chunk = removeAllChunks[index];

        const isNative = isNativeOut;
        const isTokenXNative = poolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address;
        const isTokenYNative = poolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address;

        const functionName = isNative ? 'removeLiquidityNATIVE' : 'removeLiquidity';
        const args =
          isNative && isTokenXNative
            ? [chunk.tokenY, chunk.binStep, chunk.amountXmin, chunk.amountYmin, chunk.ids, chunk.amounts, chunk.to, chunk.deadline]
            : isNative && isTokenYNative
            ? [chunk.tokenX, chunk.binStep, chunk.amountXmin, chunk.amountYmin, chunk.ids, chunk.amounts, chunk.to, chunk.deadline]
            : [
                chunk.tokenX,
                chunk.tokenY,
                chunk.binStep,
                chunk.amountXmin,
                chunk.amountYmin,
                chunk.ids,
                chunk.amounts,
                chunk.to,
                chunk.deadline,
              ];

        const simulatedGas = await publicClient?.estimateContractGas({
          account: address as `0x${string}`,
          address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
          abi: LBRouterV22ABI,
          functionName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: args as any,
        });

        const hash = await writeContractAsync({
          address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
          abi: LBRouterV22ABI,
          functionName,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: args as any,
          gas: simulatedGas ? (simulatedGas * 120n) / 100n : undefined,
        });

        retroToast.success(`Transaction ${index + 1} of ${removeAllChunks.length} sent`, {
          action: {
            label: 'View on Explorer',
            onClick: () => window.open(`https://insectarium.blockscout.memecore.com/tx/${hash}`, '_blank'),
          },
        });

        setRemoveLiquidityTxHash(hash);
        setCurrentRemoveLiquidityBatch(index + 1);
        setIsRemoveLiquidityLoading('waitingForRemoveLiquidityConfirmation');
      } catch (error) {
        console.error(error);
        retroToast.error('Failed to exit position', {
          description: `Transaction ${index + 1} failed. Please try again.`,
        });
        setIsRemoveLiquidityLoading('idle');
        setCurrentRemoveLiquidityBatch(0);
        setTotalRemoveLiquidityBatches(0);
        refetchTokenBalanceData();
        refetchBinLiquidityAmounts();
        refetchBinSharesAmounts();
        setTimeout(() => {
          refetchMyBinIds();
        }, 2000);
      }
    };

    sendExitAllTransaction(0);
  };

  return (
    <div className="space-y-4">
      {/* Position Summary */}
      <div
        className="p-4 bg-figma-gray-table"
        style={{
          boxShadow:
            'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
        }}
      >
        <div className="font-roboto font-semibold text-[#030303] text-[14px] mb-3">Your Position</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <TokenTicker
              symbol={poolData.tokenX.symbol}
              logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI}
              className="w-5 h-5"
            />
            <span className="font-roboto font-medium text-[#030303] text-[14px]">
              {formatNumber(totalPositionValue.tokenXAmount, 4, 0, numberLocale)} {poolData.tokenX.symbol}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TokenTicker
              symbol={poolData.tokenY.symbol}
              logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI}
              className="w-5 h-5"
            />
            <span className="font-roboto font-medium text-[#030303] text-[14px]">
              {formatNumber(totalPositionValue.tokenYAmount, 4, 0, numberLocale)} {poolData.tokenY.symbol}
            </span>
          </div>
        </div>
        <div className="text-xs text-figma-text-gray mt-2 font-roboto">
          Bins: {myBinIds.length} | Range: {formatNumber(minWithdrawPriceWithDecimals, 4, 0, numberLocale)} -{' '}
          {formatNumber(maxWithdrawPriceWithDecimals, 4, 0, numberLocale)}
        </div>
      </div>

      {/* Native Token Toggle */}
      {hasNativeToken && (
        <div className="flex items-center justify-between">
          <span className="font-roboto text-[13px] text-figma-text-gray">Receive as M (native)</span>
          <button
            type="button"
            onClick={() => setIsNativeOut(!isNativeOut)}
            className={`px-3 py-1 font-roboto text-[12px] font-semibold transition-colors ${
              isNativeOut ? 'bg-figma-purple text-white' : 'bg-figma-gray-table text-[#030303] hover:bg-[#d0d0d4]'
            }`}
            style={{
              boxShadow: isNativeOut
                ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                : 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
            }}
          >
            {isNativeOut ? 'ON' : 'OFF'}
          </button>
        </div>
      )}

      {/* Simple Mode: Exit All */}
      {!showAdvanced && (
        <div className="space-y-4">
          {/* You will receive (all) */}
          <div
            className="p-4 bg-figma-gray-table"
            style={{
              boxShadow:
                'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
            }}
          >
            <div className="font-roboto font-semibold text-[#030303] text-[14px] mb-3">You will receive:</div>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <TokenTicker
                  symbol={poolData.tokenX.symbol}
                  logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI}
                  className="w-5 h-5"
                />
                <span className="font-roboto font-semibold text-[#030303] text-[16px]">
                  {formatNumber(totalPositionValue.tokenXAmount, 4, 0, numberLocale)}
                </span>
              </div>
              <span className="text-figma-purple font-bold">+</span>
              <div className="flex items-center gap-2">
                <TokenTicker
                  symbol={poolData.tokenY.symbol}
                  logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI}
                  className="w-5 h-5"
                />
                <span className="font-roboto font-semibold text-[#030303] text-[16px]">
                  {formatNumber(totalPositionValue.tokenYAmount, 4, 0, numberLocale)}
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-[12px] font-roboto">
              <div className="flex justify-between">
                <span className="text-figma-text-gray">Slippage Tolerance</span>
                <span className="text-[#030303]">{liquidityTolerance}%</span>
              </div>
            </div>
          </div>

          {/* Action Buttons for Simple Mode */}
          <div className="space-y-2">
            {/* Approve Button */}
            {!binApproved && (
              <button
                type="button"
                className={`w-full h-12 font-roboto font-semibold text-[14px] transition-colors ${
                  isApproveBinLoading
                    ? 'bg-figma-gray-table text-figma-text-gray cursor-not-allowed'
                    : 'bg-figma-purple text-white hover:bg-figma-purple/90 cursor-pointer'
                }`}
                style={{
                  boxShadow: isApproveBinLoading
                    ? 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088'
                    : 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa',
                }}
                onClick={handleApproveBinCall}
                disabled={isApproveBinLoading}
              >
                {isApproveBinLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Approve to continue'}
              </button>
            )}

            {/* Exit All Button */}
            <button
              type="button"
              className={`w-full h-12 font-roboto font-semibold text-[14px] transition-colors ${
                !binApproved ||
                isRemoveLiquidityLoading === 'removeLiquidity' ||
                isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation'
                  ? 'bg-figma-gray-table text-figma-text-gray cursor-not-allowed'
                  : 'bg-[#ff6b6b] text-white hover:bg-[#ff5252] cursor-pointer'
              }`}
              style={{
                boxShadow:
                  !binApproved ||
                  isRemoveLiquidityLoading === 'removeLiquidity' ||
                  isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation'
                    ? 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088'
                    : 'inset -1px -1px 0px 0px #d32f2f, inset 1px 1px 0px 0px #ff8a80, inset -2px -2px 0px 0px #b71c1c, inset 2px 2px 0px 0px #ffb3b3',
              }}
              onClick={handleExitAll}
              disabled={
                !binApproved ||
                isRemoveLiquidityLoading === 'removeLiquidity' ||
                isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation'
              }
            >
              {isRemoveLiquidityLoading === 'removeLiquidity' || isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation' ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {totalRemoveLiquidityBatches > 1 && (
                    <span>
                      {currentRemoveLiquidityBatch}/{totalRemoveLiquidityBatches}
                    </span>
                  )}
                </div>
              ) : removeAllChunks.length > 1 ? (
                `Exit All (${removeAllChunks.length} txs)`
              ) : (
                'Exit All'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Advanced Options Toggle */}
      <button
        type="button"
        onClick={() => {
          setShowAdvanced(!showAdvanced);
          // Reset to "both" tab and full range when opening advanced
          if (!showAdvanced) {
            setWithdrawTab('both');
            if (myBinIds && myBinIds.length > 0) {
              setWithdrawPriceRange([0, myBinIds.length - 1]);
            }
          }
        }}
        className="w-full flex items-center justify-center gap-2 py-2 font-roboto font-semibold text-[13px] text-[#030303] bg-figma-gray-table hover:bg-[#d0d0d4] transition-colors"
        style={{
          boxShadow: 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
        }}
      >
        {showAdvanced ? (
          <>
            <ChevronUp className="w-4 h-4" />
            Hide Advanced Options
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            Advanced Options
          </>
        )}
      </button>

      {/* Advanced Mode */}
      {showAdvanced && (
        <>
          {/* Remove Tabs */}
          <Tabs value={withdrawTab} onValueChange={(value) => setWithdrawTab(value as 'both' | 'tokenX' | 'tokenY')} className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-1 bg-transparent p-0 h-auto">
              <TabsTrigger
                value="both"
                className="px-3 py-2 font-roboto text-[12px] data-[state=active]:bg-figma-purple data-[state=active]:text-white bg-figma-gray-table text-[#030303]"
                style={{
                  boxShadow:
                    withdrawTab === 'both'
                      ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                      : 'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                }}
              >
                Remove Both
              </TabsTrigger>
              <TabsTrigger
                value="tokenX"
                className="px-3 py-2 font-roboto text-[12px] data-[state=active]:bg-figma-purple data-[state=active]:text-white bg-figma-gray-table text-[#030303]"
                style={{
                  boxShadow:
                    withdrawTab === 'tokenX'
                      ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                      : 'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                }}
              >
                {poolData.tokenX.symbol}
              </TabsTrigger>
              <TabsTrigger
                value="tokenY"
                className="px-3 py-2 font-roboto text-[12px] data-[state=active]:bg-figma-purple data-[state=active]:text-white bg-figma-gray-table text-[#030303]"
                style={{
                  boxShadow:
                    withdrawTab === 'tokenY'
                      ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                      : 'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                }}
              >
                {poolData.tokenY.symbol}
              </TabsTrigger>
            </TabsList>

            {/* Remove Both Tab */}
            <TabsContent value="both" className="mt-4 space-y-4">
              {removeLiquidityInput?.ids?.length === 0 ? (
                <div
                  className="text-center py-8 bg-figma-gray-table"
                  style={{
                    boxShadow:
                      'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                  }}
                >
                  <p className="font-roboto text-figma-text-gray">No liquidity in selected range.</p>
                </div>
              ) : (
                <>
                  {/* Price Range Section */}
                  <div
                    className="p-4 bg-figma-gray-table"
                    style={{
                      boxShadow:
                        'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-roboto font-semibold text-[#030303] text-[14px]">Select Range</span>
                      <button
                        type="button"
                        onClick={handleRemoveAll}
                        className="px-3 py-1 bg-[#22c55e] hover:bg-[#16a34a] font-roboto font-semibold text-[12px] text-white transition-colors"
                        style={{
                          boxShadow: 'inset -1px -1px 0px 0px #16a34a, inset 1px 1px 0px 0px #4ade80, inset -2px -2px 0px 0px #15803d, inset 2px 2px 0px 0px #86efac',
                        }}
                      >
                        Select All
                      </button>
                    </div>

                    {/* Slider */}
                    <div className="px-2 mb-4">
                      <DualRangeSlider
                        value={withdrawPriceRange}
                        onValueChange={(value) => setWithdrawPriceRange([value[0], value[1]])}
                        min={0}
                        max={(myBinIds?.length ?? 1) - 1}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Price Values */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="font-roboto text-[11px] text-figma-text-gray">Min Price</div>
                        <div className="font-roboto font-medium text-[#030303] text-[13px]">
                          {formatNumber(yBaseCurrency ? maxWithdrawPriceWithDecimals : minWithdrawPriceWithDecimals, 4, 0, numberLocale)}
                        </div>
                      </div>
                      <div>
                        <div className="font-roboto text-[11px] text-figma-text-gray">Bins</div>
                        <div className="font-roboto font-medium text-[#030303] text-[13px]">
                          {withdrawPriceRange[1] - withdrawPriceRange[0] + 1}
                        </div>
                      </div>
                      <div>
                        <div className="font-roboto text-[11px] text-figma-text-gray">Max Price</div>
                        <div className="font-roboto font-medium text-[#030303] text-[13px]">
                          {formatNumber(yBaseCurrency ? minWithdrawPriceWithDecimals : maxWithdrawPriceWithDecimals, 4, 0, numberLocale)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* You will receive */}
                  <div
                    className="p-4 bg-figma-gray-table"
                    style={{
                      boxShadow:
                        'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                    }}
                  >
                    <div className="font-roboto font-semibold text-[#030303] text-[14px] mb-3">You will receive:</div>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <TokenTicker
                          symbol={poolData.tokenX.symbol}
                          logoURI={
                            tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI
                          }
                          className="w-5 h-5"
                        />
                        <span className="font-roboto font-semibold text-[#030303] text-[16px]">
                          {formatNumber(removeLiquidityInput.tokenXAmount, 4, 0, numberLocale)}
                        </span>
                      </div>
                      <span className="text-figma-purple font-bold">+</span>
                      <div className="flex items-center gap-2">
                        <TokenTicker
                          symbol={poolData.tokenY.symbol}
                          logoURI={
                            tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI
                          }
                          className="w-5 h-5"
                        />
                        <span className="font-roboto font-semibold text-[#030303] text-[16px]">
                          {formatNumber(removeLiquidityInput.tokenYAmount, 4, 0, numberLocale)}
                        </span>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-[12px] font-roboto">
                      <div className="flex justify-between">
                        <span className="text-figma-text-gray">Slippage Tolerance</span>
                        <span className="text-[#030303]">{liquidityTolerance}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-figma-text-gray">Min Expected {poolData.tokenX.symbol}</span>
                        <span className="text-[#030303]">
                          {formatNumber(removeLiquidityInput.tokenXAmount * (1 - liquidityTolerance / 100), 4, 0, numberLocale)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-figma-text-gray">Min Expected {poolData.tokenY.symbol}</span>
                        <span className="text-[#030303]">
                          {formatNumber(removeLiquidityInput.tokenYAmount * (1 - liquidityTolerance / 100), 4, 0, numberLocale)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Remove TokenX Tab */}
            <TabsContent value="tokenX" className="mt-4 space-y-4">
              <div
                className="p-3 bg-[#895bf5]/10"
                style={{
                  boxShadow: 'inset -1px -1px 0px 0px #895bf5, inset 1px 1px 0px 0px #895bf5',
                }}
              >
                <p className="font-roboto text-[12px] text-[#030303]">
                  Remove <span className="font-semibold text-figma-purple">{poolData.tokenX.symbol}</span> from bins with prices{' '}
                  <span className="font-semibold">higher</span> than active bin. Tokens in active bin will remain.
                </p>
              </div>

              {removeLiquidityInput?.ids?.length === 0 ? (
                <div
                  className="text-center py-8 bg-figma-gray-table"
                  style={{
                    boxShadow:
                      'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                  }}
                >
                  <p className="font-roboto text-figma-text-gray">No {poolData.tokenX.symbol} liquidity above active bin.</p>
                </div>
              ) : (
                <div
                  className="p-4 bg-figma-gray-table"
                  style={{
                    boxShadow:
                      'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                  }}
                >
                  <div className="font-roboto font-semibold text-[#030303] text-[14px] mb-3">You will receive:</div>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <TokenTicker
                      symbol={poolData.tokenX.symbol}
                      logoURI={
                        tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI
                      }
                      className="w-6 h-6"
                    />
                    <span className="font-roboto font-semibold text-[#030303] text-[18px]">
                      {formatNumber(removeLiquidityInput.tokenXAmount, 4, 0, numberLocale)} {poolData.tokenX.symbol}
                    </span>
                  </div>
                  <div className="text-[12px] font-roboto">
                    <div className="flex justify-between">
                      <span className="text-figma-text-gray">Min Expected</span>
                      <span className="text-[#030303]">
                        {formatNumber(removeLiquidityInput.tokenXAmount * (1 - liquidityTolerance / 100), 4, 0, numberLocale)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Remove TokenY Tab */}
            <TabsContent value="tokenY" className="mt-4 space-y-4">
              <div
                className="p-3 bg-[#895bf5]/10"
                style={{
                  boxShadow: 'inset -1px -1px 0px 0px #895bf5, inset 1px 1px 0px 0px #895bf5',
                }}
              >
                <p className="font-roboto text-[12px] text-[#030303]">
                  Remove <span className="font-semibold text-figma-purple">{poolData.tokenY.symbol}</span> from bins with prices{' '}
                  <span className="font-semibold">lower</span> than active bin. Tokens in active bin will remain.
                </p>
              </div>

              {removeLiquidityInput?.ids?.length === 0 ? (
                <div
                  className="text-center py-8 bg-figma-gray-table"
                  style={{
                    boxShadow:
                      'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                  }}
                >
                  <p className="font-roboto text-figma-text-gray">No {poolData.tokenY.symbol} liquidity below active bin.</p>
                </div>
              ) : (
                <div
                  className="p-4 bg-figma-gray-table"
                  style={{
                    boxShadow:
                      'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                  }}
                >
                  <div className="font-roboto font-semibold text-[#030303] text-[14px] mb-3">You will receive:</div>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <TokenTicker
                      symbol={poolData.tokenY.symbol}
                      logoURI={
                        tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI
                      }
                      className="w-6 h-6"
                    />
                    <span className="font-roboto font-semibold text-[#030303] text-[18px]">
                      {formatNumber(removeLiquidityInput.tokenYAmount, 4, 0, numberLocale)} {poolData.tokenY.symbol}
                    </span>
                  </div>
                  <div className="text-[12px] font-roboto">
                    <div className="flex justify-between">
                      <span className="text-figma-text-gray">Min Expected</span>
                      <span className="text-[#030303]">
                        {formatNumber(removeLiquidityInput.tokenYAmount * (1 - liquidityTolerance / 100), 4, 0, numberLocale)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons for Advanced Mode */}
          {removeLiquidityInput?.ids?.length > 0 && (
            <div className="space-y-2">
              {/* Approve Button */}
              {!binApproved && (
                <button
                  type="button"
                  className={`w-full h-12 font-roboto font-semibold text-[14px] transition-colors ${
                    isApproveBinLoading
                      ? 'bg-figma-gray-table text-figma-text-gray cursor-not-allowed'
                      : 'bg-figma-purple text-white hover:bg-figma-purple/90 cursor-pointer'
                  }`}
                  style={{
                    boxShadow: isApproveBinLoading
                      ? 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088'
                      : 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa',
                  }}
                  onClick={handleApproveBinCall}
                  disabled={isApproveBinLoading}
                >
                  {isApproveBinLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Approve to continue'}
                </button>
              )}

              {/* Remove Liquidity Button */}
              <button
                type="button"
                className={`w-full h-12 font-roboto font-semibold text-[14px] transition-colors ${
                  !binApproved ||
                  isRemoveLiquidityLoading === 'removeLiquidity' ||
                  isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation'
                    ? 'bg-figma-gray-table text-figma-text-gray cursor-not-allowed'
                    : 'bg-[#ff6b6b] text-white hover:bg-[#ff5252] cursor-pointer'
                }`}
                style={{
                  boxShadow:
                    !binApproved ||
                    isRemoveLiquidityLoading === 'removeLiquidity' ||
                    isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation'
                      ? 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088'
                      : 'inset -1px -1px 0px 0px #d32f2f, inset 1px 1px 0px 0px #ff8a80, inset -2px -2px 0px 0px #b71c1c, inset 2px 2px 0px 0px #ffb3b3',
                }}
                onClick={handleRemoveLiquidityContractCall}
                disabled={
                  !binApproved ||
                  isRemoveLiquidityLoading === 'removeLiquidity' ||
                  isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation'
                }
              >
                {isRemoveLiquidityLoading === 'removeLiquidity' || isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation' ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {totalRemoveLiquidityBatches > 1 && (
                      <span>
                        {currentRemoveLiquidityBatch}/{totalRemoveLiquidityBatches}
                      </span>
                    )}
                  </div>
                ) : removeLiquidityChunks.length > 1 ? (
                  `Remove Liquidity (${removeLiquidityChunks.length} txs)`
                ) : (
                  'Remove Liquidity'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
