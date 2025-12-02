import { useEffect, useState } from 'react';
import { retroToast } from '@/components/ui/retro-toast';
import { erc20Abi, maxUint256, zeroAddress } from 'viem';
import { useAccount, useContractWrite, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
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

// Windows 95 retro box shadow styles
const retroRaisedShadow =
  'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088';

function ApproveButton({ tokenAddress, spenderAddress, amountInBigInt, disabled, symbol, onSuccess }: Props) {
  const { address } = useAccount();
  const { writeContractAsync } = useContractWrite();

  const [approveTxHash, setApproveTxHash] = useState<`0x${string}` | null>(null);

  const [approveType, setApproveType] = useState<'one-time' | 'unlimited'>('one-time');
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
    try {
      setStatus('approving');
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress, approveType === 'one-time' ? amountInBigInt : maxUint256],
      });
      retroToast.success(`Approve transaction sent`, {
        description: `Please wait for the transaction to be confirmed`,
        action: {
          label: 'View on Explorer',
          onClick: () => {
            window.open(`https://insectarium.blockscout.memecore.com/tx/${hash}`, '_blank');
          },
        },
      });
      setApproveTxHash(hash);
      setStatus('waitingForApproveConfirmation');
    } catch {
      retroToast.error(`Failed to approve`, {
        description: `Please try again`,
      });
      console.log('error');
      setStatus('error');
    }
  };

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash as `0x${string}`,
    query: {
      enabled: !!approveTxHash,
    },
  });

  useEffect(() => {
    if (isApproveConfirmed) {
      refetchAllowance();
      retroToast.success(`Approve transaction confirmed`);
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
    <div className="flex items-center justify-between mb-4 relative">
      <button
        className="w-full h-[59px] bg-figma-gray-table font-roboto text-[#121213] text-[18px] disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ boxShadow: retroRaisedShadow }}
        disabled={!address || status === 'waitingForApproveConfirmation' || status === 'approving'}
        onClick={handleApprove}
      >
        {status === 'approving' || status === 'waitingForApproveConfirmation' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          `Approve ${symbol ? symbol : ''}`
        )}
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="absolute right-0 w-[48px] h-[59px] flex items-center justify-center bg-figma-gray-table disabled:bg-transparent"
            style={{ boxShadow: retroRaisedShadow }}
            disabled={!address || status === 'waitingForApproveConfirmation' || status === 'approving'}
          >
            <ChevronDown className="w-4 h-4 text-[#121213]" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0 border-0"
          style={{
            backgroundColor: '#dbdae0',
            boxShadow:
              'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8',
          }}
        >
          <div className="flex gap-2 cursor-pointer hover:bg-[#e8e8e8] transition-colors p-4" onClick={() => setApproveType('one-time')}>
            {approveType === 'one-time' ? (
              <Check className="w-8 h-8 pb-2 text-[#121213]" />
            ) : (
              <Check className="w-8 h-8 pb-2 text-transparent" />
            )}
            <div className="text-[#121213] flex flex-col gap-2">
              <div className="font-roboto font-semibold">Approve one-time only</div>
              <div className="font-roboto text-figma-text-gray text-[14px]">
                Grant permission to spend exact amount for this transaction only.
              </div>
            </div>
          </div>
          <div className="flex gap-2 cursor-pointer hover:bg-[#e8e8e8] transition-colors p-4" onClick={() => setApproveType('unlimited')}>
            {approveType === 'unlimited' ? (
              <Check className="w-8 h-8 pb-2 text-[#121213]" />
            ) : (
              <Check className="w-8 h-8 pb-2 text-transparent" />
            )}
            <div className="text-[#121213] flex flex-col gap-2">
              <div className="font-roboto font-semibold">Approve unlimited amount</div>
              <div className="font-roboto text-figma-text-gray text-[14px]">
                Grant unlimited permission. Faster future transactions but less secure.
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default ApproveButton;
