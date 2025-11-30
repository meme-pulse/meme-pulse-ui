import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { erc20Abi, maxUint256, zeroAddress } from 'viem';
import { useAccount, useContractWrite, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from './ui/button';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

type Props = {
  tokenAddress: `0x${string}`;
  spenderAddress: `0x${string}`;
  amountInBigInt: bigint;
  disabled?: boolean;
  symbol?: string;
  onSuccess?: () => void;
};

function ApproveButton({ tokenAddress, spenderAddress, amountInBigInt, disabled, symbol, onSuccess }: Props) {
  const { address } = useAccount();
  const { writeContractAsync } = useContractWrite();

  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | null>(null);

  const [approveType, setApproveType] = useState<'one-time' | 'unlimited'>('one-time');
  //
  const [status, setStatus] = useState<
    'idle' | 'fetchingAllowance' | 'enoughAllowance' | 'needApprove' | 'approving' | 'waitingForApproveConfirmation' | 'success' | 'error'
  >('idle');

  const {
    data: allowanceData,
    isLoading: isAllowanceLoading,
    isSuccess: isAllowanceSuccess,
    refetch: refetchAllowance,
  } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, spenderAddress],
    query: {
      enabled: !!address && tokenAddress !== zeroAddress,
    },
  });

  const handleApprove = async () => {
    // requiredAllowance is the minimum allowance required for swap
    try {
      setStatus('approving');
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, approveType === 'one-time' ? amountInBigInt : maxUint256],
      });
      toast.success(`Approve transaction sent`, {
        description: `Please wait for the transaction to be confirmed`,
        action: {
          label: 'View on Explorer',
          onClick: () => {
            window.open(`https://hyperevmscan.io/tx/${hash}`, '_blank');
          },
        },
      });
      setApproveTxHash(hash);
      // writeApprove doesn't return transaction hash immediately, so we need to track it through data
      setStatus('waitingForApproveConfirmation');
    } catch {
      toast.error(`Failed to approve`, {
        description: `Please try again`,
      });
      console.log('error');
      setStatus('error');
    }
  };

  const {
    // data: approveReceipt,
    isLoading: isApproveConfirming,
    isSuccess: isApproveConfirmed,
  } = useWaitForTransactionReceipt({
    hash: approveTxHash as `0x${string}`,
    query: {
      enabled: !!approveTxHash,
    },
  });
  useEffect(() => {
    if (isApproveConfirmed) {
      refetchAllowance();
      toast.success(`Approve transaction confirmed`);
      onSuccess?.();
    }
  }, [isApproveConfirmed]);

  useEffect(() => {
    if (isAllowanceLoading) {
      setStatus('fetchingAllowance');
    }
    if (isAllowanceSuccess) {
      if (allowanceData === amountInBigInt || allowanceData >= amountInBigInt) {
        setStatus('enoughAllowance');
      } else {
        setStatus('needApprove');
      }
    }
    if (isApproveConfirming) {
      setStatus('waitingForApproveConfirmation');
    }
  }, [isAllowanceLoading, isApproveConfirmed, isApproveConfirming, isAllowanceSuccess, allowanceData, amountInBigInt]);
  // native don't need approve
  if (tokenAddress === zeroAddress || !address || status === 'enoughAllowance' || disabled) return null;

  return (
    <div className="flex items-center justify-between  mb-4 relative">
      <Button
        className="w-full h-12 text-lg bg-accent-primary hover:bg-accent-primary text-surface-default  hover:bg-opacity-80 "
        disabled={!address || status === 'waitingForApproveConfirmation' || status === 'approving'}
        onClick={handleApprove}
      >
        {status === 'approving' || status === 'waitingForApproveConfirmation' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          `Approve ${symbol ? symbol : ''}`
        )}
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            className="absolute right-0 text-text-primary hover:text-text-primary  w-[48px] h-12 flex items-center justify-center  bg-accent-primary disabled:bg-transparent "
            disabled={!address || status === 'waitingForApproveConfirmation' || status === 'approving'}
          >
            <ChevronDown className="w-4 h-4 text-green-dark-950" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-surface-muted border-none p-0">
          <div className="flex  gap-2 cursor-pointer  hover:bg-surface-elevated transition-colors p-4" onClick={() => setApproveType('one-time')}>
            {approveType === 'one-time' ? <Check className="w-8 h-8 pb-2" /> : <Check className="w-8 h-8 pb-2 text-transparent" />}
            <div className="text-text-primary flex flex-col gap-2">
              <div>Approve one-time only</div>
              <div className="text-text-secondary">Grant permission to spend exact amount for this transaction only.</div>
            </div>
          </div>
          <div className="flex  gap-2 cursor-pointer hover:bg-surface-elevated transition-colors p-4 " onClick={() => setApproveType('unlimited')}>
            {approveType === 'unlimited' ? <Check className="w-8 h-8 pb-2" /> : <Check className="w-8 h-8 pb-2 text-transparent" />}
            <div className="text-text-primary flex flex-col gap-2">
              <div>Approve unlimited amount</div>
              <div className="text-text-secondary">Grant permission to spend exact amount for this transaction only.</div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default ApproveButton;
