import { Percent } from '../entities/fractions/percent';
import { type Hex } from 'viem';

export interface LBPair {
  binStep: number;
  LBPair: Hex;
  createdByOwner: boolean;
  ignoredForRouting: boolean;
}

export interface LBPairReservesAndId {
  reserveX: bigint;
  reserveY: bigint;
  activeId: number;
}

export interface LBPairFeeParameters {
  baseFactor: number;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  variableFeeControl: number;
  protocolShare: number;
  maxVolatilityAccumulator: number;
}

export interface LBPairFeePercent {
  baseFeePct: Percent;
  variableFeePct: Percent;
}

export interface LiquidityParametersStruct {
  tokenX: string;
  tokenY: string;
  binStep: bigint;
  amountX: bigint;
  amountY: bigint;
  amountXMin: bigint;
  amountYMin: bigint;
  activeIdDesired: bigint;
  idSlippage: bigint;
  deltaIds: bigint[];
  distributionX: bigint[];
  distributionY: bigint[];
  to: string;
  deadline: bigint;
}

export interface BinReserves {
  reserveX: bigint;
  reserveY: bigint;
}

export enum LiquidityDistribution {
  SPOT,
  CURVE,
  BID_ASK,
}

export interface LiquidityDistributionParams {
  deltaIds: number[];
  distributionX: bigint[];
  distributionY: bigint[];
}
