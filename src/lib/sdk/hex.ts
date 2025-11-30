import { CurrencyAmount } from './entities/fractions/currencyAmount';
import { getAddress } from 'viem';

// warns if addresses are not checksummed
export function validateAndParseAddress(address: string): string {
  try {
    const checksummedAddress = getAddress(address);
    // console.warn(address === checksummedAddress, `${address} is not checksummed.`);
    return checksummedAddress;
  } catch (error) {
    console.error(`${address} is not a valid address.`, error);
    return address;
  }
}

/**
 * Converts currency amount into hex encoding
 *
 * @param {CurrencyAmount} currencyAmount
 * @returns {string}
 */
export function toHex(currencyAmount: CurrencyAmount) {
  return `0x${currencyAmount.raw.toString(16)}`;
}

/**
 * Returns true if the string value is zero in hex
 *
 * @param {string} hexNumberString
 * @returns {boolean}
 */
export function isZero(hexNumberString: string) {
  return /^0x0*$/.test(hexNumberString);
}

export const ZERO_HEX = '0x0';
