export interface TokenListItem {
  chainId: number;
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  tags?: string[];
}

export interface TokenListResponse {
  tokens: TokenListItem[];
}

// Memecore Testnet Token List
export const TOKEN_LIST: TokenListResponse = {
  tokens: [
    {
      chainId: 43522,
      address: '0x653e645e3d81a72e71328bc01a04002945e3ef7a',
      decimals: 18,
      name: 'Wrapped M',
      symbol: 'WM',
      tags: ['Top'],
      logoURI: '/token_default.svg',
    },
    {
      chainId: 43522,
      address: '0x6547c6304dcc991e7d0d0f964c4ae8c71dee9862',
      decimals: 18,
      name: 'MGOLD',
      symbol: 'MGOLD',
      tags: ['Faucet'],
      logoURI: '/token_default.svg',
    },
    {
      chainId: 43522,
      address: '0x1d37d159d3761b074dda538871b7c0fa24e9ccb0',
      decimals: 18,
      name: 'PEPE',
      symbol: 'PEPE',
      tags: ['Faucet'],
      logoURI: '/token_default.svg',
    },
    {
      chainId: 43522,
      address: '0x174c1c1c54ec8d66fbf6b67970343adcd442058f',
      decimals: 18,
      name: 'DMOON',
      symbol: 'DMOON',
      tags: ['Faucet'],
      logoURI: '/token_default.svg',
    },
    {
      chainId: 43522,
      address: '0xa7551e01db2379f73eaeb7bf5175b7355edb2fc2',
      decimals: 18,
      name: 'SSTAR',
      symbol: 'SSTAR',
      tags: ['Faucet'],
      logoURI: '/token_default.svg',
    },
    {
      chainId: 43522,
      address: '0x6b697cdcc5ca791d6bd32056d66ffb181d9a2375',
      decimals: 18,
      name: 'WOJAK',
      symbol: 'WOJAK',
      tags: ['Faucet'],
      logoURI: '/token_default.svg',
    },
  ],
};
