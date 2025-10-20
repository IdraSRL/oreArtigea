/**
 * Formatting Utilities - Generic formatting functions
 */

/**
 * Format currency to Italian format (€)
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: EUR)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'EUR') {
  if (amount === null || amount === undefined || isNaN(amount)) return '€ 0,00';

  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format number to Italian format
 * @param {number} number - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted number string
 */
export function formatNumber(number, decimals = 0) {
  if (number === null || number === undefined || isNaN(number)) return '0';

  return new Intl.NumberFormat('it-IT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
}

/**
 * Format percentage
 * @param {number} value - Value to format (0-100 or 0-1)
 * @param {boolean} isDecimal - True if value is 0-1, false if 0-100
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, isDecimal = false, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';

  const percent = isDecimal ? value * 100 : value;
  return `${formatNumber(percent, decimals)}%`;
}

/**
 * Format file size to human readable format
 * @param {number} bytes - Size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || isNaN(bytes)) return 'N/A';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalize first letter of each word
 * @param {string} str - String to capitalize
 * @returns {string} Title case string
 */
export function titleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated string
 */
export function truncate(str, maxLength, suffix = '...') {
  if (!str || typeof str !== 'string') return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Generate safe ID from text (kebab-case)
 * @param {string} text - Text to convert
 * @returns {string} Safe ID string
 */
export function generateSafeId(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

/**
 * Generate slug from text
 * @param {string} text - Text to convert
 * @returns {string} Slug string
 */
export function generateSlug(text) {
  return generateSafeId(text);
}

/**
 * Format phone number to Italian format
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '';

  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }

  if (cleaned.length === 11 && cleaned.startsWith('39')) {
    return `+39 ${cleaned.substring(2, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
  }

  return phone;
}

/**
 * Format fiscal code to uppercase and remove spaces
 * @param {string} fiscalCode - Fiscal code
 * @returns {string} Formatted fiscal code
 */
export function formatFiscalCode(fiscalCode) {
  if (!fiscalCode || typeof fiscalCode !== 'string') return '';
  return fiscalCode.trim().toUpperCase().replace(/\s/g, '');
}

/**
 * Format VAT number
 * @param {string} vat - VAT number
 * @returns {string} Formatted VAT number
 */
export function formatVAT(vat) {
  if (!vat || typeof vat !== 'string') return '';
  const cleaned = vat.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{5})(\d{6})/, '$1 $2');
  }
  return vat;
}

/**
 * Format IBAN
 * @param {string} iban - IBAN
 * @returns {string} Formatted IBAN
 */
export function formatIBAN(iban) {
  if (!iban || typeof iban !== 'string') return '';
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
}

/**
 * Pluralize word based on count
 * @param {number} count - Count
 * @param {string} singular - Singular form
 * @param {string} plural - Plural form
 * @returns {string} Pluralized string
 */
export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

/**
 * Format list to string with conjunction
 * @param {string[]} items - Array of items
 * @param {string} conjunction - Conjunction word (default: 'e')
 * @returns {string} Formatted list string
 */
export function formatList(items, conjunction = 'e') {
  if (!Array.isArray(items) || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  const last = items[items.length - 1];
  const rest = items.slice(0, -1);
  return `${rest.join(', ')} ${conjunction} ${last}`;
}

/**
 * Remove accents from string
 * @param {string} str - String with accents
 * @returns {string} String without accents
 */
export function removeAccents(str) {
  if (!str || typeof str !== 'string') return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Pad string with leading zeros
 * @param {number|string} value - Value to pad
 * @param {number} length - Target length
 * @returns {string} Padded string
 */
export function padZero(value, length = 2) {
  return String(value).padStart(length, '0');
}

/**
 * Format JSON for display
 * @param {any} obj - Object to format
 * @param {number} indent - Indentation spaces
 * @returns {string} Formatted JSON string
 */
export function formatJSON(obj, indent = 2) {
  try {
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return String(obj);
  }
}

/**
 * Parse JSON safely
 * @param {string} str - JSON string
 * @param {any} defaultValue - Default value if parsing fails
 * @returns {any} Parsed object or default value
 */
export function parseJSON(str, defaultValue = null) {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
}

/**
 * Format address to single line
 * @param {object} address - Address object
 * @returns {string} Formatted address string
 */
export function formatAddress(address) {
  if (!address || typeof address !== 'object') return '';

  const parts = [
    address.street,
    address.city,
    address.province,
    address.postalCode,
    address.country
  ].filter(Boolean);

  return parts.join(', ');
}

export const FormatUtils = {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatFileSize,
  capitalize,
  titleCase,
  truncate,
  generateSafeId,
  generateSlug,
  formatPhoneNumber,
  formatFiscalCode,
  formatVAT,
  formatIBAN,
  pluralize,
  formatList,
  removeAccents,
  padZero,
  formatJSON,
  parseJSON,
  formatAddress
};
