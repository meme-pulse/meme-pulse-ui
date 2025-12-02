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
      logoURI: '/token_m.svg',
    },
    // Faucet tokens
    {
      chainId: 43522,
      address: '0xe0ded31e74bbf97f17c2c508eb334fd884bc63f2',
      decimals: 18,
      name: 'Memetern',
      symbol: 'MXT',
      tags: ['Faucet'],
      logoURI: 'https://cdn.memex.xyz/memex/dev/v1/mrc-20/211852/MXT.gif',
    },
    {
      chainId: 43522,
      address: '0xbb7e42237a7f9776f80b2edea127d90cdcbc2cd1',
      decimals: 18,
      name: 'Bunana',
      symbol: 'BUNANA',
      tags: ['Faucet'],
      logoURI: 'https://cdn.memex.xyz/memex/dev/v1/mrc-20/817032/BUNANA.png',
    },
    {
      chainId: 43522,
      address: '0x47800771d4514737a71016a70786e1ec09c1ccb1',
      decimals: 18,
      name: 'Bubu',
      symbol: 'BUBU',
      tags: ['Faucet'],
      logoURI: 'https://cdn.memex.xyz/memex/dev/v1/mrc-20/781830/BUBU.jpeg',
    },
    {
      chainId: 43522,
      address: '0x7066ad8f6c4d3e5a78fa6725a8999a2bd62e5a41',
      decimals: 18,
      name: 'LIFT',
      symbol: 'LIFT',
      tags: ['Faucet'],
      logoURI: 'https://cdn.memex.xyz/memex/dev/v1/mrc-20/3434/LIFT.png',
    },
    {
      chainId: 43522,
      address: '0x239ceecfdeb71c2607f5936df2a0545bd3afecfe',
      decimals: 18,
      name: 'Crik',
      symbol: 'CRIK',
      tags: ['Faucet'],
      logoURI: 'https://cdn.memex.xyz/memex/dev/v1/mrc-20/819858/CRIK.png',
    },
    // Other tokens (not in faucet)
    {
      chainId: 43522,
      address: '0x6547c6304dcc991e7d0d0f964c4ae8c71dee9862',
      decimals: 18,
      name: 'MGOLD',
      symbol: 'MGOLD',
      logoURI: '/token_mgold.svg',
    },
    {
      chainId: 43522,
      address: '0x1d37d159d3761b074dda538871b7c0fa24e9ccb0',
      decimals: 18,
      name: 'PEPE',
      symbol: 'PEPE',
      logoURI: '/token_pepe.svg',
    },
    {
      chainId: 43522,
      address: '0x174c1c1c54ec8d66fbf6b67970343adcd442058f',
      decimals: 18,
      name: 'DMOON',
      symbol: 'DMOON',
      logoURI: '/token_dmoon.svg',
    },
    {
      chainId: 43522,
      address: '0xa7551e01db2379f73eaeb7bf5175b7355edb2fc2',
      decimals: 18,
      name: 'SSTAR',
      symbol: 'SSTAR',
      logoURI: '/token_sstar.svg',
    },
    {
      chainId: 43522,
      address: '0x6b697cdcc5ca791d6bd32056d66ffb181d9a2375',
      decimals: 18,
      name: 'WOJAK',
      symbol: 'WOJAK',
      logoURI: '/token_wojak.svg',
    },
  ],
};
