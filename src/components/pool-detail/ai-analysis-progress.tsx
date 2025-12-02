import { useEffect, useState, useRef } from 'react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import type { PoolData } from '@/PoolDetail';
import { Check, Loader2 } from 'lucide-react';

interface AnalysisStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed';
}

interface AIAnalysisProgressProps {
  poolData: PoolData;
  onAnalysisComplete: () => void;
}

const initialSteps: AnalysisStep[] = [
  { id: 'data', label: 'Accessing On-Chain Data', status: 'loading' },
  { id: 'volatility', label: 'Analyzing Volatility', status: 'pending' },
  { id: 'liquidity', label: 'Analyzing Liquidity Depth', status: 'pending' },
  { id: 'complete', label: 'Analysis Completed', status: 'pending' },
];

export function AIAnalysisProgress({ poolData, onAnalysisComplete }: AIAnalysisProgressProps) {
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState<AnalysisStep[]>(initialSteps);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    const stepDuration = 1500; // 1.5 seconds per step
    const progressInterval = 40; // Update progress every 40ms

    // Progress animation
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        const increment = 100 / (steps.length * (stepDuration / progressInterval));
        const newProgress = prev + increment;

        if (newProgress >= 100) {
          clearInterval(progressTimer);
          return 100;
        }

        return newProgress;
      });
    }, progressInterval);

    // Step progression
    const stepTimer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        const nextStep = prev + 1;

        if (nextStep >= steps.length) {
          clearInterval(stepTimer);
          return prev;
        }

        // Update steps status
        setSteps((prevSteps) =>
          prevSteps.map((step, index) => {
            if (index < nextStep) return { ...step, status: 'completed' };
            if (index === nextStep) return { ...step, status: 'loading' };
            return step;
          })
        );

        return nextStep;
      });
    }, stepDuration);

    return () => {
      clearInterval(progressTimer);
      clearInterval(stepTimer);
    };
  }, [steps.length]);

  // Handle completion
  useEffect(() => {
    if (progress >= 100 && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      // Mark all steps as completed
      setSteps((prevSteps) => prevSteps.map((step) => ({ ...step, status: 'completed' })));
      // Wait a moment before navigating to results
      const timeout = setTimeout(() => {
        onAnalysisComplete();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [progress, onAnalysisComplete]);

  return (
    <CardWithHeader title="AI Analysis in Progress" contentClassName="p-0">
      <div className="space-y-0">
        {/* Pool Info */}
        <div
          className="bg-white mx-[10px] mt-[10px] p-4"
          style={{
            boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
          }}
        >
          <h2 className="font-tahoma text-[18px] font-bold text-[#1a1a1a] mb-2">
            {poolData.tokenX.symbol}-{poolData.tokenY.symbol} Pool
          </h2>
          <p className="text-[14px] text-[#666666] font-tahoma">Our AI researcher is analyzing on-chain data...</p>
        </div>

        {/* Progress Bar */}
        <div
          className="bg-white mx-[10px] mt-[10px] p-4"
          style={{
            boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
          }}
        >
          <div className="space-y-2">
            <div className="flex justify-between text-[14px] font-tahoma text-[#666666]">
              <span>Overall Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div
              className="h-[24px] bg-white relative overflow-hidden"
              style={{
                boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
              }}
            >
              <div
                className="h-full transition-all duration-100 ease-linear"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #170d2d 0%, #462886 100%)',
                }}
              />
            </div>
          </div>
        </div>

        {/* Analysis Steps */}
        <div
          className="bg-white mx-[10px] mt-[10px] p-4"
          style={{
            boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
          }}
        >
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 transition-all ${
                  step.status === 'completed' ? 'bg-figma-gray-table' : step.status === 'loading' ? 'bg-white' : 'bg-white opacity-60'
                }`}
                style={{
                  boxShadow:
                    step.status === 'completed'
                      ? 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088'
                      : 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                }}
              >
                <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                  {step.status === 'completed' && <Check className="w-5 h-5 text-green-600" />}
                  {step.status === 'loading' && <Loader2 className="w-5 h-5 text-figma-purple animate-spin" />}
                  {step.status === 'pending' && <div className="w-3 h-3 rounded-full border-2 border-[#808088]" />}
                </div>
                <span className="font-roboto text-[18px] text-[#121213]">
                  {step.label}
                  {step.status === 'loading' && '...'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tip Box */}
        <div
          className="bg-figma-gray-table mx-[10px] mt-[10px] mb-[10px] p-4"
          style={{
            boxShadow:
              'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-[14px]">💡</span>
            <p className="font-roboto text-[14px] text-black text-center leading-[18.75px]">
              Tip: Analysis typically takes 6-8 seconds. Our AI is reviewing real-time on-chain data to generate your personalized strategy.
            </p>
          </div>
        </div>
      </div>
    </CardWithHeader>
  );
}

