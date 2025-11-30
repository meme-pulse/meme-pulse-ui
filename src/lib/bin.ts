export function getPriceFromId(binId: number, binStep: number): number {
  /**
   * Convert a binId to the underlying price.
   *
   * @param binId - Bin Id.
   * @param binStep - binStep of the pair.
   * @return Price of the bin.
   */

  return (1 + binStep / 10_000) ** (binId - 8388608);
}

export function getIdFromPrice(price: number, binStep: number): number {
  /**
   * Convert a price to the underlying binId.
   *
   * @param price - Price of the bin.
   * @param binStep - BinStep of the pair.
   * @return BinId of the underlying bin.
   */

  return Math.trunc(Math.log(price) / Math.log(1 + binStep / 10_000)) + 8388608;
}
