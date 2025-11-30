// locale will be stored in local storage
// 1. en-US which is default, format 123,456.789, using comma to separate the thousands, and dot to separate the decimal
// 5. fr-FR, format 123 456,789 -> using empty space to separate the thousands, and comma to separate the decimal
// 6. de-DE, format 123.456,789 -> using dot to separate the thousands, and comma to separate the decimal

/**
 * Validates and sanitizes a locale string to ensure it's safe for use with Intl APIs
 * Returns 'en-US' as fallback if the locale is invalid
 */
function validateLocale(locale: string | null | undefined): string {
  const defaultLocale = 'en-US';

  if (!locale || typeof locale !== 'string') {
    return defaultLocale;
  }

  // Trim whitespace
  const trimmedLocale = locale.trim();

  if (!trimmedLocale) {
    return defaultLocale;
  }

  // Basic validation: check if it's a valid BCP 47 language tag format
  // Pattern: language[-script][-region][-variant]
  // Examples: en, en-US, zh-Hans-CN, etc.
  const localePattern = /^[a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2})?(-[a-z0-9]{5,8})?(-[a-z0-9]{1,8})*$/i;

  if (!localePattern.test(trimmedLocale)) {
    console.warn(`Invalid locale format: "${locale}". Falling back to "${defaultLocale}"`);
    return defaultLocale;
  }

  // Try to create an Intl.NumberFormat to verify the locale is actually supported
  try {
    new Intl.NumberFormat(trimmedLocale);
    return trimmedLocale;
  } catch (error) {
    console.warn(`Locale "${trimmedLocale}" is not supported. Falling back to "${defaultLocale}"`);
    return defaultLocale;
  }
}

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

    const validLocale = validateLocale(locale);
    const formatter = new Intl.NumberFormat(validLocale);
    const formattedParts = formatter.formatToParts(12345.67);
    const decimalSeparator = formattedParts.find((p) => p.type === 'decimal')?.value || '.';

    const [integerPart, decimalPart] = String(num).split('.');

    const formattedIntegerPart = Number(integerPart).toLocaleString(validLocale);

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
    const validLocale = validateLocale(locale);
    const formatter = new Intl.NumberFormat(validLocale);
    const [integerPart, decimalPart] = String(number).split('.');
    const formattedParts = formatter.formatToParts(12345.67);
    const decimalSeparator = formattedParts.find((p) => p.type === 'decimal')?.value || '.';
    // const groupSeparator = formattedParts.find((p) => p.type === 'group')?.value || ',';
    const formattedIntegerPart = Number(integerPart).toLocaleString(validLocale);
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
    const validLocale = validateLocale(locale);
    const formattedNumber = number.toLocaleString(validLocale, {
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
  const validLocale = validateLocale(locale);
  const formatter = new Intl.NumberFormat(validLocale);
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
  const validLocale = validateLocale(locale);
  const formatter = new Intl.NumberFormat(validLocale);
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
