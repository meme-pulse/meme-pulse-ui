// locale will be stored in local storage
// 1. en-US which is default, format 123,456.789, using comma to separate the thousands, and dot to separate the decimal
// 5. fr-FR, format 123 456,789 -> using empty space to separate the thousands, and comma to separate the decimal
// 6. de-DE, format 123.456,789 -> using dot to separate the thousands, and comma to separate the decimal
export function formatNumber(
  number: number | string,
  maximumFractionDigits: number = 2,
  minimumFractionDigits: number = 0,
  locale: string = 'en-US'
) {
  try {
    const num = Number(number);
    if (isNaN(Number(num)) || Math.abs(Number(num)) < 0.000001) {
      return '0';
    }

    const formatter = new Intl.NumberFormat(locale);
    const formattedParts = formatter.formatToParts(12345.67);
    const decimalSeparator = formattedParts.find((p) => p.type === 'decimal')?.value || '.';

    const [integerPart, decimalPart] = String(num).split('.');

    const formattedIntegerPart = Number(integerPart).toLocaleString(locale);

    let formattedDecimalPart = '';
    if (decimalPart) {
      const slicedDecimalPart = decimalPart.slice(0, maximumFractionDigits);
      const paddedDecimalPart = slicedDecimalPart.padEnd(minimumFractionDigits, '0');
      formattedDecimalPart = `${decimalSeparator}${paddedDecimalPart}`;
    } else if (minimumFractionDigits > 0) {
      formattedDecimalPart = `${decimalSeparator}${'0'.repeat(minimumFractionDigits)}`;
    }

    return `${formattedIntegerPart}${formattedDecimalPart === decimalSeparator ? '' : formattedDecimalPart}`;
  } catch (error) {
    console.error(error);
    return '0';
  }
}

// number foramt en-US based.
export function formatStringOnlyLocale(number: string, locale: string = 'en-US') {
  try {
    const formatter = new Intl.NumberFormat(locale);
    const [integerPart, decimalPart] = String(number).split('.');
    const formattedParts = formatter.formatToParts(12345.67);
    const decimalSeparator = formattedParts.find((p) => p.type === 'decimal')?.value || '.';
    // const groupSeparator = formattedParts.find((p) => p.type === 'group')?.value || ',';
    const formattedIntegerPart = Number(integerPart).toLocaleString(locale);
    const formattedDecimalPart = decimalPart ? `${decimalSeparator}${decimalPart}` : '';
    return `${formattedIntegerPart}${formattedDecimalPart === decimalSeparator ? '' : formattedDecimalPart}`;
  } catch (error) {
    console.error(error);
    return '0';
  }
}
// export function formatNumber(
//   number: number | string,
//   maximumFractionDigits: number = 2,
//   minimumFractionDigits: number = 0,
//   locale: string = 'en-US'
// ) {
//   try {
//     const num = Number(number);
//     if (isNaN(num)) {
//       return '0';
//     }

//     if (num > 0 && num < 0.01) {
//       maximumFractionDigits = 6;
//     }

//     const formatter = new Intl.NumberFormat(locale, {
//       minimumFractionDigits: minimumFractionDigits,
//       maximumFractionDigits: maximumFractionDigits,
//     });

//     return formatter.format(num);
//   } catch (error) {
//     console.error(error);
//     return '0';
//   }
// }
export function formatUSDWithLocale(
  number: number,
  maximumFractionDigits: number = 2,
  minimumFractionDigits: number = 0,
  locale: string = 'en-US'
) {
  try {
    const formattedNumber = number.toLocaleString(locale, {
      maximumFractionDigits,
      minimumFractionDigits,
    });

    return `$${formattedNumber}`;
  } catch (error) {
    console.error(error);
    return '$0';
  }
}

export const getNumberValue = (typedAmount: string, locale: string): number => {
  const formatter = new Intl.NumberFormat(locale);
  const parts = formatter.formatToParts(12345.67);

  const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value || '.';
  const groupSeparator = parts.find((p) => p.type === 'group')?.value || ',';

  let cleanedAmount = typedAmount;

  if (/\s/.test(groupSeparator)) {
    cleanedAmount = cleanedAmount.replace(/\s/g, '');
  } else {
    cleanedAmount = cleanedAmount.replace(new RegExp(`\\${groupSeparator}`, 'g'), '');
  }

  cleanedAmount = cleanedAmount.replace(decimalSeparator, '.');

  return Number(cleanedAmount);
};

export const getNumberStringValue = (typedAmount: string, locale: string): string => {
  const formatter = new Intl.NumberFormat(locale);
  const parts = formatter.formatToParts(12345.67);

  const decimalSeparator = parts.find((p) => p.type === 'decimal')?.value || '.';
  const groupSeparator = parts.find((p) => p.type === 'group')?.value || ',';

  let cleanedAmount = typedAmount;

  if (/\s/.test(groupSeparator)) {
    cleanedAmount = cleanedAmount.replace(/\s/g, '');
  } else {
    cleanedAmount = cleanedAmount.replace(new RegExp(`\\${groupSeparator}`, 'g'), '');
  }

  cleanedAmount = cleanedAmount.replace(decimalSeparator, '.');

  return cleanedAmount;
};
