'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useTokenList, useLocalTokenList, type TokenListItem } from './hooks/use-token-list';
import { Token } from './lib/sdk';
import { NATIVE_TOKEN_ADDRESS, useTokensData } from './hooks/use-token-data';
import { usePublicClient, useChainId } from 'wagmi';
import { useTokenPrices } from './hooks/use-token-price';
import { erc20Abi, isAddress } from 'viem';
import { DEFAULT_CHAINID } from './constants';
import { formatNumber, formatUSDWithLocale } from './lib/format';

interface TokenSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectToken: (token: Token) => void;
  excludeTokenAddresses?: `0x${string}`[];
  onlyQuoteTokenAddresses?: `0x${string}`[];
  withoutNativeToken?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchTokenData(publicClient: { multicall: (args: any) => Promise<any> }, address: string): Promise<TokenListItem | null> {
  try {
    const data = await publicClient.multicall({
      contracts: [
        {
          address: address,
          abi: erc20Abi,
          functionName: 'name',
        },
        {
          address: address,
          abi: erc20Abi,
          functionName: 'symbol',
        },
        {
          address: address,
          abi: erc20Abi,
          functionName: 'decimals',
        },
      ],
    });
    return {
      chainId: DEFAULT_CHAINID,
      address: address as `0x${string}`,
      name: data[0].result as string,
      symbol: data[1].result as string,
      decimals: data[2].result as number,
      tags: ['Custom Added'],
      logoURI: '',
    };
  } catch (error) {
    console.log('error', error);
    return null;
  }
}

export default function TokenSelectionModal({
  isOpen,
  onClose,
  onSelectToken,
  excludeTokenAddresses,
  onlyQuoteTokenAddresses,
  withoutNativeToken,
}: TokenSelectionModalProps) {
  const [numberLocale] = useState(() => {
    try {
      return localStorage.getItem('number-locale') ?? navigator.language;
    } catch {
      return navigator.language;
    }
  });
  const publicClient = usePublicClient();
  const [localTokenList, setLocalTokenList] = useLocalTokenList();
  const { data: tokenPrices } = useTokenPrices({ addresses: null });
  const { data: tokenList, isLoading: isTokenListLoading, refetch: refetchTokenList } = useTokenList();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const chainId = useChainId();

  // tokenList already includes deduplicated localTokenList from the hook
  const concatenatedTokenList = tokenList;

  // Function to remove a custom token from localStorage
  const removeCustomToken = (address: string) => {
    setLocalTokenList((prev) => prev.filter((token) => token.address.toLowerCase() !== address.toLowerCase()));
    refetchTokenList();
  };

  const { data: tokenListData, refetch } = useTokensData({
    tokenAddresses:
      concatenatedTokenList
        ?.filter((token) => token.chainId === DEFAULT_CHAINID)
        .map((token) => token.address)
        .concat(NATIVE_TOKEN_ADDRESS) ?? [],
  });

  const filteredTokens = useMemo(
    () =>
      concatenatedTokenList
        ?.filter((token) => {
          if (excludeTokenAddresses && excludeTokenAddresses.map((address) => address.toLowerCase()).includes(token.address.toLowerCase()))
            return false;

          if (
            onlyQuoteTokenAddresses &&
            !onlyQuoteTokenAddresses.map((address) => address.toLowerCase()).includes(token.address.toLowerCase())
          )
            return false;

          const matchesSearch =
            token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.address.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesCategory = selectedCategory === 'All' || token.tags?.includes(selectedCategory);

          return matchesSearch && matchesCategory;
        })

        .sort((a, b) => {
          const aBalance = tokenListData?.[a.address]?.formattedBalance;
          const bBalance = tokenListData?.[b.address]?.formattedBalance;
          const aPrice = tokenPrices?.find((price) => price.tokenAddress.toLowerCase() === a.address.toLowerCase())?.priceUsd ?? 0;
          const bPrice = tokenPrices?.find((price) => price.tokenAddress.toLowerCase() === b.address.toLowerCase())?.priceUsd ?? 0;

          const aValue = Number(aBalance || 0) * Number(aPrice);
          const bValue = Number(bBalance || 0) * Number(bPrice);

          // 1st: Sort tokens with value by value (higher value on top)
          if (aValue > 0 && bValue > 0) {
            return bValue - aValue;
          }

          // 2nd: Sort tokens with zero value by priority (lower number on top)
          if (aValue === 0 && bValue === 0) {
            const tokenOrderBySymbol: Record<string, number> = {
              // Remove zeroAddress and use only actual token addresses
              ['0x5555555555555555555555555555555555555555'.toLowerCase()]: 1,
              ['0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb'.toLowerCase()]: 2,
              ['0xfd739d4e423301ce9385c1fb8850539d657c296d'.toLowerCase()]: 3,
              ['0x9fdbda0a5e284c32744d2f17ee5c74b284993463'.toLowerCase()]: 4,
              ['0xbe6727b535545c67d5caa73dea54865b92cf7907'.toLowerCase()]: 5,
              ['0x27ec642013bcb3d80ca3706599d3cda04f6f4452'.toLowerCase()]: 6,
              ['0x3b4575e689ded21caad31d64c4df1f10f3b2cedf'.toLowerCase()]: 7,
              ['0x068f321fa8fb9f0d135f290ef6a3e2813e1c8a29'.toLowerCase()]: 8,
              ['0x02c6a2fa58cc01a18b8d9e00ea48d65e4df26c70'.toLowerCase()]: 9,
              ['0xb50a96253abdf803d85efcdce07ad8becbc52bd5'.toLowerCase()]: 10,
              // Set BUDDY and feUSD-1 to lowest priority
              ['BUDDY']: 9999,
              ['feUSD-1']: 9999,
              // others: 999
            };

            const aPriority = tokenOrderBySymbol[a.address.toLowerCase()] ?? tokenOrderBySymbol[a.symbol] ?? 999;
            const bPriority = tokenOrderBySymbol[b.address.toLowerCase()] ?? tokenOrderBySymbol[b.symbol] ?? 999;

            return aPriority - bPriority;
          }

          // 3rd: Put tokens with value above tokens with zero value
          if (aValue > 0 && bValue === 0) return -1;
          if (aValue === 0 && bValue > 0) return 1;

          // 4th: Sort by priority when balance info is missing or undefined
          if (!aBalance && !bBalance) {
            const tokenOrderBySymbol: Record<string, number> = {
              // Remove zeroAddress and use only actual token addresses
              ['0x5555555555555555555555555555555555555555'.toLowerCase()]: 1,
              ['0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb'.toLowerCase()]: 2,
              ['0xfd739d4e423301ce9385c1fb8850539d657c296d'.toLowerCase()]: 3,
              ['0x9fdbda0a5e284c32744d2f17ee5c74b284993463'.toLowerCase()]: 4,
              ['0xbe6727b535545c67d5caa73dea54865b92cf7907'.toLowerCase()]: 5,
              ['0x27ec642013bcb3d80ca3706599d3cda04f6f4452'.toLowerCase()]: 6,
              ['0x3b4575e689ded21caad31d64c4df1f10f3b2cedf'.toLowerCase()]: 7,
              ['0x068f321fa8fb9f0d135f290ef6a3e2813e1c8a29'.toLowerCase()]: 8,
              ['0x02c6a2fa58cc01a18b8d9e00ea48d65e4df26c70'.toLowerCase()]: 9,
              ['0xb50a96253abdf803d85efcdce07ad8becbc52bd5'.toLowerCase()]: 10,
              // Set BUDDY and feUSD-1 to lowest priority
              ['BUDDY']: 9999,
              ['feUSD-1']: 9999,
              // others: 999
            };

            const aPriority = tokenOrderBySymbol[a.address.toLowerCase()] ?? tokenOrderBySymbol[a.symbol] ?? 999;
            const bPriority = tokenOrderBySymbol[b.address.toLowerCase()] ?? tokenOrderBySymbol[b.symbol] ?? 999;

            return aPriority - bPriority;
          }

          // 5th: Put tokens with balance info above tokens without balance info
          if (aBalance && !bBalance) return -1;
          if (!aBalance && bBalance) return 1;

          return 0;
        }),
    [concatenatedTokenList, excludeTokenAddresses, onlyQuoteTokenAddresses, searchTerm, selectedCategory, tokenListData, tokenPrices]
  );

  const handleTokenSelect = (token: Token) => {
    onSelectToken(token);
    onClose();
    setSearchTerm('');
  };
  const getUsdValue = (amount: string, address: string) => {
    const price = tokenPrices?.find((price) => price.tokenAddress.toLowerCase() === address.toLowerCase())?.priceUsd;
    if (!price) return '0';
    return formatUSDWithLocale(Number(amount) * Number(price), 6, 0, numberLocale);
  };

  // show only decimal 6
  const formatBalance = (balance: string, decimals = 6) => {
    return formatNumber(Number(balance), decimals, 0, numberLocale);
  };

  const [searchedERC20Token, setSearchedERC20Token] = useState<TokenListItem | null>(null);

  useEffect(() => {
    async function fetchTokenInfo() {
      if (
        isAddress(searchTerm) &&
        publicClient &&
        !concatenatedTokenList?.find((token) => token.address.toLowerCase() === searchTerm.toLowerCase())
      ) {
        const tokenData = await fetchTokenData(publicClient, searchTerm);
        if (tokenData) {
          setSearchedERC20Token(tokenData);
        }
      } else {
        setSearchedERC20Token(null);
      }
    }
    fetchTokenInfo();
  }, [concatenatedTokenList, publicClient, searchTerm]);

  function onAddToken() {
    if (!searchedERC20Token) return;
    const existsInList = concatenatedTokenList?.find((token) => token.address.toLowerCase() === searchedERC20Token.address.toLowerCase());
    const existsInLocal = localTokenList.find((token) => token.address.toLowerCase() === searchedERC20Token.address.toLowerCase());
    if (!existsInList && !existsInLocal) {
      setSearchedERC20Token(null);
      setLocalTokenList((prev) => [...prev, searchedERC20Token]);
      refetchTokenList();
    }
  }

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[600px] p-0 bg-card mt-10 sm:mt-0 border-border">
        <DialogHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-foreground">Select a token</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className=" p-2 sm:p-4 space-y-4 ">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, symbol or address"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          {isTokenListLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : (
            <>
              {/* Categories */}
              <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedCategory === 'All' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('All')}
                  className={
                    selectedCategory === 'All'
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      : 'border-border text-foreground hover:text-foreground hover:bg-muted'
                  }
                >
                  All
                </Button>
                {tokenList
                  ?.flatMap((token) => token.tags ?? [])
                  .filter((category, index, self): category is string => !!category && self.indexOf(category) === index)
                  .map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={`whitespace-nowrap ${
                        selectedCategory === category
                          ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                          : 'border-border text-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {category}
                    </Button>
                  ))}
              </div>

              {/* Token List */}
              <div className="max-h-80 overflow-y-auto space-y-2 token-list ">
                {onlyQuoteTokenAddresses || withoutNativeToken || !'hype'.includes(searchTerm.toLowerCase()) ? (
                  <> </>
                ) : (
                  <>
                    {(selectedCategory === 'All' || selectedCategory === 'LST') && (
                      <div
                        key={NATIVE_TOKEN_ADDRESS}
                        className="flex items-center justify-between p-2 sm:p-3 hover:bg-primary/10 rounded-lg cursor-pointer"
                        onClick={() => handleTokenSelect(new Token(chainId, NATIVE_TOKEN_ADDRESS, 18, 'HYPE', 'HYPE'))}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                            <img src={'/tokens/hype.png'} alt={'HYPE'} className="w-6 h-6 sm:w-8 sm:h-8" />
                          </div>
                          <div>
                            <div className="font-medium flex items-center gap-1">
                              <span>HYPE</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Native Token</div>
                          </div>
                        </div>
                        {tokenListData?.[NATIVE_TOKEN_ADDRESS]?.formattedBalance && (
                          <div className="text-right">
                            <div className="font-medium text-foreground">
                              {formatBalance(tokenListData?.[NATIVE_TOKEN_ADDRESS]?.formattedBalance ?? '0')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getUsdValue(
                                tokenListData?.[NATIVE_TOKEN_ADDRESS]?.formattedBalance,
                                tokenList?.find((token) => token.symbol === 'WHYPE')?.address ?? ''
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {filteredTokens?.map((token) => {
                  const isCustomToken = token.tags?.includes('Custom Added');
                  return (
                    <div
                      key={token.address}
                      className="flex items-center justify-between p-2 sm:p-3 hover:bg-primary/10 rounded-lg cursor-pointer group"
                      onClick={() => handleTokenSelect(new Token(token.chainId, token.address, token.decimals, token.symbol, token.name))}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                          {token.logoURI && <img src={token.logoURI} alt={token.symbol} className="w-6 h-6 sm:w-8 sm:h-8" />}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            <span>{token.symbol}</span>
                            {isCustomToken && <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Custom</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {tokenListData?.[token.address]?.formattedBalance && (
                          <div className="text-right">
                            <div className="font-medium text-foreground">
                              {formatBalance(tokenListData?.[token.address]?.formattedBalance ?? '0')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getUsdValue(tokenListData?.[token.address]?.formattedBalance ?? '0', token.address)}
                            </div>
                          </div>
                        )}
                        {isCustomToken && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCustomToken(token.address);
                            }}
                            className="p-1 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive transition-colors"
                            title="Remove custom token"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {/* can add token */}
          {searchedERC20Token && (
            <div className="flex items-center justify-between p-2 sm:p-3 hover:bg-primary/10 rounded-lg cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold"></div>
                <div>
                  <div className="font-medium text-foreground">{searchedERC20Token.symbol}</div>
                  <div className="text-xs text-muted-foreground">{searchedERC20Token.name}</div>
                </div>
              </div>
              {/* add to local token list */}
              <Button
                className="bg-primary text-primary-foreground px-4 py-1 hover:bg-primary/90"
                variant="ghost"
                size="sm"
                onClick={onAddToken}
              >
                Add
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
