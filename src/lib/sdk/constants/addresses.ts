import { type Hex } from 'viem';
import { ChainId } from './const';
import { Token } from '../entities';
// export type BigintIsh = JSBI | bigint | string

export const MULTICALL_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.HYPEREVM]: '0xcA11bde05977b3631167028862bE2a173976CA11',
};

export const LB_QUOTER_V22_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.HYPEREVM]: '0x55375D4aA7F33583a75190D6991781De06BA85b0',
};

export const LB_ROUTER_V22_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.HYPEREVM]: '0x4044e34336e41B9653931C4E0717587837993cA2',
};

export const LB_FACTORY_V22_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.HYPEREVM]: '0x4A1EFb00B4Ad1751FC870C6125d917C3f1586600',
};

export const LIQUIDITY_HELPER_V2_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.HYPEREVM]: '0x4f9Ad8Fb8E1250fDcdd45d9ED23B6993E5177C54',
};

export const WNATIVE = {
  [ChainId.HYPEREVM]: new Token(ChainId.HYPEREVM, '0x5555555555555555555555555555555555555555', 18, 'WHYPE', 'Wrapped HYPE'),
};

export const NATIVE_SYMBOL = {
  [ChainId.HYPEREVM]: 'HYPE',
};

export const WAVAX = WNATIVE;
