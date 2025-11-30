// src/hooks/use-token-list.ts
import { useEffect } from 'react';
import { DEFAULT_CHAINID } from '@/constants';
import { TOKEN_LIST, type TokenListItem } from '@/constants/tokens';
import { useQuery } from '@tanstack/react-query';
import { useLocalStorage } from 'usehooks-ts';

// Re-export TokenListItem for convenience
export type { TokenListItem } from '@/constants/tokens';

// Custom hook for managing local token list with proper typing
export function useLocalTokenList() {
  return useLocalStorage<TokenListItem[]>('localTokenList', []);
}

export function useTokenList(targetChainId?: number) {
  const [localTokenList, setLocalTokenList] = useLocalStorage<TokenListItem[]>('localTokenList', []);
  const chainId = targetChainId || DEFAULT_CHAINID;

  // Auto-cleanup and migration: Remove duplicates and ensure 'Custom Added' tag
  useEffect(() => {
    const officialAddresses = new Set(
      TOKEN_LIST.tokens
        .filter((token) => token.chainId === chainId)
        .map((token) => token.address.toLowerCase())
    );

    let needsUpdate = false;

    const processedTokens = localTokenList
      .filter((token) => {
        // Remove tokens that exist in official list
        if (officialAddresses.has(token.address.toLowerCase())) {
          needsUpdate = true;
          return false;
        }
        return true;
      })
      .map((token) => {
        // Migration: Ensure all local tokens have 'Custom Added' tag
        if (!token.tags?.includes('Custom Added')) {
          needsUpdate = true;
          return {
            ...token,
            tags: ['Custom Added', ...(token.tags ?? [])],
          };
        }
        return token;
      });

    if (needsUpdate) {
      setLocalTokenList(processedTokens);
    }
  }, [chainId, localTokenList, setLocalTokenList]);

  return useQuery<TokenListItem[]>({
    queryKey: ['tokenList', chainId, localTokenList],
    queryFn: async () => {
      // Constants에서 토큰 리스트를 가져오고, 체인 ID로 필터링
      const filteredTokens = TOKEN_LIST.tokens.filter((token) => token.chainId === chainId);

      // 공식 토큰 주소 Set 생성
      const officialAddresses = new Set(filteredTokens.map((token) => token.address.toLowerCase()));

      // 로컬 토큰 중 공식 리스트에 없는 것만 필터링 (중복 방지)
      const uniqueLocalTokens = localTokenList.filter(
        (token) => token.chainId === chainId && !officialAddresses.has(token.address.toLowerCase())
      );

      // 공식 토큰과 로컬 커스텀 토큰 병합
      return [...filteredTokens, ...uniqueLocalTokens];
    },
  });
}
