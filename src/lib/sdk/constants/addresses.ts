import { type Hex } from 'viem';
import { ChainId } from './const';
import { Token } from '../entities';
// export type BigintIsh = JSBI | bigint | string

export const MULTICALL_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0x709bf66fb11942da03a1f7bf59bfa99293f68db9',
};

export const LB_QUOTER_V22_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0x8d44834124a2b85c961231e2a5a3496b0adeb437',
};

export const LB_ROUTER_V22_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0x78b7d9236d2a3e0a1d176c7a4fc524c927cda1dd',
};

export const LB_FACTORY_V22_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0xcc8721b893166a7d222c9e88d3d581fe37b94d81',
};

export const LIQUIDITY_HELPER_V2_ADDRESS: { [chainId in ChainId]: Hex } = {
  [ChainId.MEMECORE_TESTNET]: '0x7f701264f99749b36b06ccdf5da4be6e8340211c',
};

export const WNATIVE = {
  [ChainId.MEMECORE_TESTNET]: new Token(ChainId.MEMECORE_TESTNET, '0x653e645e3d81a72e71328bc01a04002945e3ef7a', 18, 'WM', 'Wrapped M'),
};

export const NATIVE_SYMBOL = {
  [ChainId.MEMECORE_TESTNET]: 'M',
};

export const WAVAX = WNATIVE;
