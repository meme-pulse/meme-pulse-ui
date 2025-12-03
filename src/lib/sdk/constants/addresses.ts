import { type Hex } from 'viem';
import { ChainId } from './const';
import { Token } from '../entities';
// export type BigintIsh = JSBI | bigint | string

export const MULTICALL_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0x709bf66fb11942da03a1f7bf59bfa99293f68db9',
};

export const LB_QUOTER_V22_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0x070c29cdf290c3681a25e3258cc1cdaa0a97300b',
};

export const LB_ROUTER_V22_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0x467777edb64b83e3b883eb7ec8a2b291888ed67b',
};

export const LB_FACTORY_V22_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0x1b279b36995a5afbb75d82187f0025ffef4572ed',
};

export const LIQUIDITY_HELPER_V2_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0xb4c4c4b4833e74fc60d74482ec729c60c1e65dc6',
};

export const WNATIVE = {
  [ChainId.MEMECORE_TESTNET]: new Token(ChainId.MEMECORE_TESTNET, '0x653e645e3d81a72e71328bc01a04002945e3ef7a', 18, 'WM', 'Wrapped M'),
};

export const NATIVE_SYMBOL = {
  [ChainId.MEMECORE_TESTNET]: 'M',
};

export const WAVAX = WNATIVE;
