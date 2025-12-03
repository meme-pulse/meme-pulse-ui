'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

// Windows 95 retro box shadow styles
const retroWindowShadow =
  'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8';
const retroInputShadow = 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa';
const retroRaisedShadow =
  'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088';
const retroListShadow = 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa';

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
      const storedLocale = localStorage.getItem('number-locale');
      const locale = storedLocale ?? navigator.language;

      // Validate locale format - basic check for valid BCP 47 format
      if (locale && typeof locale === 'string' && locale.trim()) {
        const trimmedLocale = locale.trim();
        // Basic pattern check: at least 2 characters, can contain hyphens
        const localePattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?(-[a-z0-9]{5,8})?(-[a-z0-9]{1,8})*$/i;
        if (localePattern.test(trimmedLocale)) {
          // Try to validate it's actually supported
          try {
            new Intl.NumberFormat(trimmedLocale);
            return trimmedLocale;
          } catch {
            // Fall back to navigator.language or default
            return navigator.language || 'en-US';
          }
        }
      }

      // Fallback to navigator.language or default
      return navigator.language || 'en-US';
    } catch {
      return navigator.language || 'en-US';
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

          // 2nd: Sort tokens with zero value alphabetically by symbol
          if (aValue === 0 && bValue === 0) {
            return a.symbol.localeCompare(b.symbol);
          }

          // 3rd: Put tokens with value above tokens with zero value
          if (aValue > 0 && bValue === 0) return -1;
          if (aValue === 0 && bValue > 0) return 1;

          // 4th: Sort alphabetically by symbol when balance info is missing
          if (!aBalance && !bBalance) {
            return a.symbol.localeCompare(b.symbol);
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
    if (!price) return '$0';
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

  // Get unique categories from token list
  const categories = useMemo(() => {
    return (
      tokenList
        ?.flatMap((token) => token.tags ?? [])
        .filter((category, index, self): category is string => !!category && self.indexOf(category) === index) ?? []
    );
  }, [tokenList]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[520px] max-h-[600px] p-1 mt-10 sm:mt-0 border-0 bg-figma-gray-bg"
        style={{ boxShadow: retroWindowShadow }}
      >
        {/* Windows 95 Title Bar */}
        <div
          className="h-[24px] relative flex items-center"
          style={{
            background: 'linear-gradient(90deg, #170d2d 0%, #462886 100%)',
          }}
        >
          <div className="absolute left-[6px] top-[2px] w-4 h-[19px] flex items-center justify-center">
            <img src="/pixel_pulse_white.png" alt="logo" className="w-4 h-[19px] object-contain" />
          </div>
          <span className="absolute left-[24px] top-1/2 -translate-y-1/2 font-roboto text-white text-[12px] leading-[14px]">
            Select a token
          </span>
        </div>

        {/* Modal Content */}
        <div className="p-3 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, symbol or address"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-[35px] pl-10 pr-3 bg-white text-figma-text-dark text-[14px] font-roboto placeholder:text-gray-400 outline-none"
              style={{ boxShadow: retroInputShadow }}
            />
          </div>

          {isTokenListLoading ? (
            <div className="flex items-center justify-center h-[300px]">
              <span className="text-figma-text-dark text-[12px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                Loading...
              </span>
            </div>
          ) : (
            <>
              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`h-[28px] px-4 font-roboto text-[14px] ${
                    selectedCategory === 'All' ? 'bg-figma-purple text-white' : 'bg-figma-gray-table text-figma-text-dark'
                  }`}
                  style={{
                    boxShadow:
                      selectedCategory === 'All' ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa' : retroRaisedShadow,
                  }}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`h-[28px] px-4 font-roboto text-[14px] whitespace-nowrap ${
                      selectedCategory === category ? 'bg-figma-purple text-white' : 'bg-figma-gray-table text-figma-text-dark'
                    }`}
                    style={{
                      boxShadow:
                        selectedCategory === category
                          ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                          : retroRaisedShadow,
                    }}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Token List Container */}
              <div className="bg-white max-h-[367px] overflow-y-auto" style={{ boxShadow: retroListShadow }}>
                {/* Native Token (M) */}
                {!onlyQuoteTokenAddresses && !withoutNativeToken && 'm'.includes(searchTerm.toLowerCase()) && (
                  <>
                    {(selectedCategory === 'All' || selectedCategory === 'LST') && (
                      <div
                        key={NATIVE_TOKEN_ADDRESS}
                        className="flex items-center justify-between px-4 py-3 hover:bg-figma-gray-bg cursor-pointer border-b border-gray-100"
                        onClick={() => handleTokenSelect(new Token(chainId, NATIVE_TOKEN_ADDRESS, 18, 'M', 'Memecore'))}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-[30px] h-[30px] rounded-full overflow-hidden bg-figma-gray-table flex items-center justify-center">
                            <img src="/token_m.svg" alt="M" className="w-[30px] h-[30px]" />
                          </div>
                          <div>
                            <div className="font-roboto text-figma-text-dark text-[14px] font-medium">M</div>
                            <div className="font-roboto text-figma-text-gray text-[12px]">Native Token</div>
                          </div>
                        </div>
                        {tokenListData?.[NATIVE_TOKEN_ADDRESS]?.formattedBalance && (
                          <div className="text-right">
                            <div className="text-figma-text-dark text-[12px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                              {formatBalance(tokenListData?.[NATIVE_TOKEN_ADDRESS]?.formattedBalance ?? '0')}
                            </div>
                            <div className="text-figma-text-gray text-[10px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                              {getUsdValue(
                                tokenListData?.[NATIVE_TOKEN_ADDRESS]?.formattedBalance,
                                tokenList?.find((token) => token.symbol === 'WM')?.address ?? ''
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Token List Items */}
                {filteredTokens?.map((token) => {
                  const isCustomToken = token.tags?.includes('Custom Added');
                  return (
                    <div
                      key={token.address}
                      className="flex items-center justify-between px-4 py-3 hover:bg-figma-gray-bg cursor-pointer border-b border-gray-100 group"
                      onClick={() => handleTokenSelect(new Token(token.chainId, token.address, token.decimals, token.symbol, token.name))}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-[30px] h-[30px] rounded-full overflow-hidden bg-figma-gray-table flex items-center justify-center">
                          {token.logoURI ? (
                            <img src={token.logoURI} alt={token.symbol} className="w-[30px] h-[30px]" />
                          ) : (
                            <span className="text-figma-text-dark text-[16px] font-medium">{token.symbol?.charAt(0) ?? '?'}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-roboto text-figma-text-dark text-[14px] font-medium flex items-center gap-2">
                            {token.symbol}
                            {isCustomToken && <span className="text-[10px] text-figma-text-gray bg-figma-gray-table px-1.5 py-0.5">Custom</span>}
                          </div>
                          <div className="font-roboto text-figma-text-gray text-[12px]">{token.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-figma-text-dark text-[12px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                            {tokenListData?.[token.address]?.formattedBalance
                              ? formatBalance(tokenListData?.[token.address]?.formattedBalance ?? '0')
                              : '0'}
                          </div>
                          <div className="text-figma-text-gray text-[10px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                            {tokenListData?.[token.address]?.formattedBalance
                              ? getUsdValue(tokenListData?.[token.address]?.formattedBalance ?? '0', token.address)
                              : '$0'}
                          </div>
                        </div>
                        {isCustomToken && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCustomToken(token.address);
                            }}
                            className="p-1 hover:bg-red-100 text-figma-text-gray hover:text-red-600 transition-colors"
                            title="Remove custom token"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty State */}
                {filteredTokens?.length === 0 && !searchedERC20Token && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search className="w-8 h-8 text-figma-text-gray mb-2" />
                    <span className="font-roboto text-figma-text-gray text-[14px]">No tokens found</span>
                  </div>
                )}
              </div>

              {/* Add Custom Token */}
              {searchedERC20Token && (
                <div className="bg-white flex items-center justify-between px-4 py-3" style={{ boxShadow: retroListShadow }}>
                  <div className="flex items-center gap-3">
                    <div className="w-[30px] h-[30px] rounded-full overflow-hidden bg-figma-gray-table flex items-center justify-center">
                      <span className="text-figma-text-dark text-[16px] font-medium">{searchedERC20Token.symbol?.charAt(0) ?? '?'}</span>
                    </div>
                    <div>
                      <div className="font-roboto text-figma-text-dark text-[14px] font-medium">{searchedERC20Token.symbol}</div>
                      <div className="font-roboto text-figma-text-gray text-[12px]">{searchedERC20Token.name}</div>
                    </div>
                  </div>
                  <button
                    onClick={onAddToken}
                    className="h-[28px] px-4 bg-figma-purple text-white font-roboto text-[14px]"
                    style={{
                      boxShadow: 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa',
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
