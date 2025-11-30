import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAccount, useContractWrite, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from './ui/button';
import { Info, Loader2 } from 'lucide-react';
import { LB_ROUTER_V22_ADDRESS } from '../lib/sdk';
import { DEFAULT_CHAINID } from '@/constants';
import { LBRouterV22ABI } from '../lib/sdk';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { WNATIVE } from '../lib/sdk';

type Props = {
  inputAmountXAvailable: boolean;
  inputAmountYAvailable: boolean;
  typedAmountX: string;
  typedAmountY: string;
  amountXBalance: string;
  amountYBalance: string;
  addLiquidityInput: {
    tokenX: `0x${string}`;
    tokenY: `0x${string}`;
    binStep: number;
    amountX: string;
    amountY: string;
    amountXMin: string;
    amountYMin: string;
    activeIdDesired: number;
    idSlippage: number;
    deltaIds: number[];
    distributionX: bigint[];
    distributionY: bigint[];
    to: `0x${string}` | undefined;
    refundTo: `0x${string}` | undefined;
    deadline: number;
  };
  onSuccess: () => void;
  tokenXSymbol: string;
  tokenYSymbol: string;
  isNativeIn: boolean;

  binCountLimit?: number;
  onFail?: () => void;
};

function AddLiquidityButton({
  inputAmountXAvailable,
  inputAmountYAvailable,
  typedAmountX,
  typedAmountY,
  addLiquidityInput,
  onSuccess,
  tokenXSymbol,
  tokenYSymbol,
  amountXBalance,
  amountYBalance,
  binCountLimit,
  isNativeIn,
  onFail,
}: Props) {
  const { address } = useAccount();
  const { writeContractAsync } = useContractWrite();

  const [addLiquidityTxHash, setAddLiquidityTxHash] = useState<`0x${string}` | null>(null);
  const [currentTxIndex, setCurrentTxIndex] = useState(0); // for multiple txs

  //
  const [status, setStatus] = useState<'idle' | 'disabled' | 'addLiquidity' | 'waitingForAddLiquidityConfirmation' | 'success' | 'error'>(
    'idle'
  );

  const handleAddLiquidity = async () => {
    setAddLiquidityTxHash(null);
    setCurrentTxIndex(0);
    sendNextTransaction(0);
    // try {
    //   setStatus('addLiquidity');
    //   const hash = await writeContractAsync({
    //     address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID],
    //     abi: jsonAbis.LBRouterV22ABI,
    //     functionName: 'addLiquidity',
    //     args: [addLiquidityInput],
    //   });
    //   toast.success(`Add Liquidity transaction sent`, {
    //     description: `Please wait for the transaction to be confirmed`,
    //     action: {
    //       label: 'View on Explorer',
    //       onClick: () => {
    //         window.open(`https://hyperevmscan.io/tx/${hash}`, '_blank');
    //       },
    //     },
    //   });
    //   setAddLiquidityTxHash(hash);
    //   // writeApprove doesn't return transaction hash immediately, so we need to track it through data
    //   setStatus('waitingForAddLiquidityConfirmation');
    // } catch {
    //   toast.error(`Failed to add liquidity`, {
    //     description: `Please try again`,
    //   });
    //   console.log('error');
    //   setStatus('error');
    // }
  };

  const addLiquidityChunks = useMemo(() => {
    // If binCountLimit doesn't exist, or deltaIds is smaller than binCountLimit, return original
    if (!binCountLimit || addLiquidityInput.deltaIds.length <= binCountLimit) {
      return [addLiquidityInput];
    }
    const chunks = [];
    const deltaIds = addLiquidityInput.deltaIds;
    const distributionX = addLiquidityInput.distributionX;
    const distributionY = addLiquidityInput.distributionY;

    // Parse original amountX and amountY as BigInt for recalculation
    const originalAmountX = BigInt(addLiquidityInput.amountX);
    const originalAmountY = BigInt(addLiquidityInput.amountY);

    // Calculate the ratio of amountXMin, amountYMin compared to original amountX, amountY
    // To apply the same slippage tolerance to all chunks
    const xMinRatio = originalAmountX > 0 ? (BigInt(addLiquidityInput.amountXMin) * BigInt(1e18)) / originalAmountX : BigInt(0);
    const yMinRatio = originalAmountY > 0 ? (BigInt(addLiquidityInput.amountYMin) * BigInt(1e18)) / originalAmountY : BigInt(0);

    for (let i = 0; i < deltaIds.length; i += binCountLimit) {
      const slicedDeltaIds = deltaIds.slice(i, i + binCountLimit);
      const slicedDistributionX = distributionX.slice(i, i + binCountLimit);
      const slicedDistributionY = distributionY.slice(i, i + binCountLimit);

      const sumOriginalDistX = slicedDistributionX.reduce((acc, val) => acc + val, BigInt(0));
      const sumOriginalDistY = slicedDistributionY.reduce((acc, val) => acc + val, BigInt(0));

      const normarlizedDistributionX = slicedDistributionX.map((val) => (val > 0 ? (val * BigInt(1e18)) / sumOriginalDistX : BigInt(0)));
      const normarlizedDistributionY = slicedDistributionY.map((val) => (val > 0 ? (val * BigInt(1e18)) / sumOriginalDistY : BigInt(0)));

      // Each chunk's amountX, amountY is the same as the sum of the divided distribution arrays
      const chunkAmountX = slicedDistributionX.reduce((acc, val) => acc + (val * originalAmountX) / BigInt(1e18), BigInt(0));
      const chunkAmountY = slicedDistributionY.reduce((acc, val) => acc + (val * originalAmountY) / BigInt(1e18), BigInt(0));

      chunks.push({
        ...addLiquidityInput,
        deltaIds: slicedDeltaIds,
        distributionX: normarlizedDistributionX,
        distributionY: normarlizedDistributionY,
        amountX: chunkAmountX.toString(),
        amountY: chunkAmountY.toString(),
        amountXMin: ((chunkAmountX * xMinRatio) / BigInt(1e18)).toString(),
        amountYMin: ((chunkAmountY * yMinRatio) / BigInt(1e18)).toString(),
      });
    }
    return chunks;
  }, [addLiquidityInput, binCountLimit]);

  const sendNextTransaction = async (index: number) => {
    if (index >= addLiquidityChunks.length) {
      // All transactions completed successfully
      onSuccess();
      toast.success(`All Add Liquidity transactions confirmed`);
      setStatus('idle');
      return;
    }

    try {
      setStatus('addLiquidity');
      const chunk = addLiquidityChunks[index];
      const contractParamsObj = isNativeIn
        ? {
            address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID],
            abi: LBRouterV22ABI,
            functionName: 'addLiquidityNATIVE' as any,
            args: [chunk],
            value:
              chunk.amountX !== '0' && chunk.tokenX === WNATIVE[DEFAULT_CHAINID].address && chunk.amountX !== '0'
                ? BigInt(chunk.amountX)
                : chunk.amountY !== '0' && chunk.tokenY === WNATIVE[DEFAULT_CHAINID].address && chunk.amountY !== '0'
                ? BigInt(chunk.amountY)
                : BigInt(0),
          }
        : {
            address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID],
            abi: LBRouterV22ABI,
            functionName: 'addLiquidity' as any,
            args: [chunk],
          };

      const hash = await writeContractAsync({
        ...(contractParamsObj as any),
      });

      toast.success(`Add Liquidity transaction ${index + 1} of ${addLiquidityChunks.length} sent`, {
        action: { label: 'View on Explorer', onClick: () => window.open(`https://hyperevmscan.io/tx/${hash}`, '_blank') },
      });
      setAddLiquidityTxHash(hash);
      setCurrentTxIndex(index + 1);
      setStatus('waitingForAddLiquidityConfirmation');
    } catch (e) {
      console.error(e);
      toast.error(`Failed to add liquidity`, { description: `Transaction ${index + 1} failed. Please try again.` });
      setStatus('error');
      onFail?.();
    }
  };

  const { isSuccess: isAddLiquidityConfirmed, isError: isAddLiquidityConfirmationError } = useWaitForTransactionReceipt({
    hash: addLiquidityTxHash as `0x${string}`,
    query: {
      enabled: !!addLiquidityTxHash,
    },
  });
  useEffect(() => {
    if (isAddLiquidityConfirmed) {
      sendNextTransaction(currentTxIndex);
      // onSuccess();
      // toast.success(`Add Liquidity transaction confirmed`);
      // setStatus('idle');
    }
  }, [isAddLiquidityConfirmed]);

  useEffect(() => {
    if (isAddLiquidityConfirmationError) {
      toast.error(`Failed to add liquidity`, {
        description: `Please try again`,
      });
      setStatus('idle');
    }
  }, [isAddLiquidityConfirmationError]);

  const addLiquidityButtonMemo = useMemo(() => {
    if (inputAmountXAvailable && !Number(typedAmountX)) {
      return { text: `Enter ${tokenXSymbol} Amount`, disabled: true };
    }

    if (inputAmountYAvailable && !Number(typedAmountY)) {
      return { text: `Enter ${tokenYSymbol} Amount`, disabled: true };
    }

    if (Number(typedAmountX) > Number(amountXBalance) && inputAmountXAvailable) {
      return { text: `Insufficient ${tokenXSymbol} Balance`, disabled: true };
    }

    if (Number(typedAmountY) > Number(amountYBalance) && inputAmountYAvailable) {
      return { text: `Insufficient ${tokenYSymbol} Balance`, disabled: true };
    }

    if (addLiquidityChunks.length > 1) {
      if (status === 'addLiquidity' || status === 'waitingForAddLiquidityConfirmation') {
        return { text: `Adding Liquidity... (${currentTxIndex} / ${addLiquidityChunks.length})`, disabled: true };
      }
      return { text: `Add Liquidity (${addLiquidityChunks.length} transactions)`, disabled: false };
    }
    if (binCountLimit && addLiquidityInput.deltaIds.length > binCountLimit) {
      return { text: `Max ${binCountLimit} Bins`, disabled: true };
    }

    return { text: 'Add Liquidity', disabled: false };
  }, [
    inputAmountXAvailable,
    typedAmountX,
    inputAmountYAvailable,
    typedAmountY,
    amountXBalance,
    amountYBalance,
    addLiquidityChunks.length,
    binCountLimit,
    addLiquidityInput.deltaIds.length,
    tokenXSymbol,
    tokenYSymbol,
    status,
    currentTxIndex,
  ]);

  return (
    <>
      {addLiquidityChunks.length > 1 && !addLiquidityButtonMemo.disabled && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" className="w-full">
              <Info className="h-4 w-4" />
              Why Send Multiple Transactions?
            </Button>
          </TooltipTrigger>
          <TooltipContent asChild>
            <div className="text-center text-body-sm   bg-surface-muted text-text-primary">
              <span className="font-bold">HyperEVM has 2M gas limit.</span>
              <br />
              <br />
              <span className="font-bold">If you want to send 1 transactions, please select a smaller(15 bins) range.</span>
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      <Button
        className="w-full h-12 text-lg bg-primary hover:bg-primary/80 text-secondary mb-4"
        disabled={
          !address || status === 'waitingForAddLiquidityConfirmation' || status === 'addLiquidity' || addLiquidityButtonMemo.disabled
        }
        onClick={handleAddLiquidity}
      >
        {status === 'addLiquidity' || status === 'waitingForAddLiquidityConfirmation' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          addLiquidityButtonMemo.text
        )}
      </Button>
    </>
  );
}

export default AddLiquidityButton;
