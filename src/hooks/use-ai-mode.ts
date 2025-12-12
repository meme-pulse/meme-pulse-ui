import { useLocalStorage } from 'usehooks-ts';

export function useAiMode() {
  const [aiMode, setAiMode] = useLocalStorage('ai-mode', false);

  return [aiMode, setAiMode] as const;
}
