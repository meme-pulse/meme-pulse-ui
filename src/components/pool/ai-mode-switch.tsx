import { useAiMode } from '@/hooks/use-ai-mode';

export function AiModeSwitch() {
  const [aiMode, setAiMode] = useAiMode();

  return (
    <div
      onClick={() => setAiMode(!aiMode)}
      className="border border-[#fff79c] border-solid rounded-[6px] h-[29px] flex items-center cursor-pointer transition-all hover:opacity-80"
      style={{
        backgroundColor: aiMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
        paddingLeft: '11px',
        paddingRight: '11px',
      }}
    >
      <div className="rounded-full size-[7px] flex-shrink-0 transition-colors" style={{ backgroundColor: aiMode ? '#facb25' : '#666' }} />
      <span
        className="ml-[9px] text-[14px] font-roboto font-normal leading-normal whitespace-nowrap transition-colors select-none"
        style={{ color: aiMode ? '#facb25' : '#888' }}
      >
        AI {aiMode ? 'ACTIVATED' : 'DISABLED'}
      </span>
    </div>
  );
}
