/**
 * Validation Utilities - Centralized validation functions
 */

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number (Italian format)
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone format
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^(\+39)?[0-9]{9,10}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Validate Italian fiscal code (Codice Fiscale)
 * @param {string} fiscalCode - Fiscal code to validate
 * @returns {boolean} True if valid fiscal code format
 */
export function isValidFiscalCode(fiscalCode) {
  if (!fiscalCode || typeof fiscalCode !== 'string') return false;
  const fiscalCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;
  return fiscalCodeRegex.test(fiscalCode.trim().toUpperCase());
}

/**
 * Validate Italian VAT number (Partita IVA)
 * @param {string} vat - VAT number to validate
 * @returns {boolean} True if valid VAT format
 */
export function isValidVAT(vat) {
  if (!vat || typeof vat !== 'string') return false;
  const cleanVat = vat.replace(/[\s]/g, '');
  const vatRegex = /^[0-9]{11}$/;
  return vatRegex.test(cleanVat);
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 */
export function isValidURL(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate required field (not empty)
 * @param {any} value - Value to validate
 * @returns {boolean} True if not empty
 */
export function isRequired(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @returns {boolean} True if length is within range
 */
export function isValidLength(value, min = 0, max = Infinity) {
  if (!value || typeof value !== 'string') return false;
  const length = value.trim().length;
  return length >= min && length <= max;
}

/**
 * Validate number range
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if within range
 */
export function isInRange(value, min = -Infinity, max = Infinity) {
  const num = Number(value);
  if (isNaN(num)) return false;
  return num >= min && num <= max;
}

/**
 * Validate integer
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid integer
 */
export function isInteger(value) {
  const num = Number(value);
  return Number.isInteger(num);
}

/**
 * Validate positive number
 * @param {any} value - Value to validate
 * @returns {boolean} True if positive number
 */
export function isPositive(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0;
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date format
 */
export function isValidDateString(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validate time string format (HH:MM)
 * @param {string} timeString - Time string to validate
 * @returns {boolean} True if valid time format
 */
export function isValidTimeString(timeString) {
  if (!timeString || typeof timeString !== 'string') return false;
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {object} options - Validation options
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validatePassword(password, options = {}) {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSpecialChars = false
  } = options;

  const errors = [];

  if (!password || typeof password !== 'string') {
    errors.push('Password è obbligatoria');
    return { valid: false, errors };
  }

  if (password.length < minLength) {
    errors.push(`Password deve essere di almeno ${minLength} caratteri`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password deve contenere almeno una lettera maiuscola');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password deve contenere almeno una lettera minuscola');
  }

  if (requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password deve contenere almeno un numero');
  }

  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password deve contenere almeno un carattere speciale');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate form data against rules
 * @param {object} data - Form data object
 * @param {object} rules - Validation rules object
 * @returns {{valid: boolean, errors: object}} Validation result
 */
export function validateForm(data, rules) {
  const errors = {};
  let valid = true;

  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field];
    const fieldErrors = [];

    if (fieldRules.required && !isRequired(value)) {
      fieldErrors.push('Campo obbligatorio');
    }

    if (value && fieldRules.email && !isValidEmail(value)) {
      fieldErrors.push('Email non valida');
    }

    if (value && fieldRules.phone && !isValidPhone(value)) {
      fieldErrors.push('Telefono non valido');
    }

    if (value && fieldRules.fiscalCode && !isValidFiscalCode(value)) {
      fieldErrors.push('Codice fiscale non valido');
    }

    if (value && fieldRules.vat && !isValidVAT(value)) {
      fieldErrors.push('Partita IVA non valida');
    }

    if (value && fieldRules.url && !isValidURL(value)) {
      fieldErrors.push('URL non valido');
    }

    if (fieldRules.minLength && !isValidLength(value, fieldRules.minLength)) {
      fieldErrors.push(`Minimo ${fieldRules.minLength} caratteri`);
    }

    if (fieldRules.maxLength && !isValidLength(value, 0, fieldRules.maxLength)) {
      fieldErrors.push(`Massimo ${fieldRules.maxLength} caratteri`);
    }

    if (fieldRules.min !== undefined && !isInRange(value, fieldRules.min)) {
      fieldErrors.push(`Valore minimo ${fieldRules.min}`);
    }

    if (fieldRules.max !== undefined && !isInRange(value, -Infinity, fieldRules.max)) {
      fieldErrors.push(`Valore massimo ${fieldRules.max}`);
    }

    if (fieldRules.integer && value && !isInteger(value)) {
      fieldErrors.push('Deve essere un numero intero');
    }

    if (fieldRules.positive && value && !isPositive(value)) {
      fieldErrors.push('Deve essere un numero positivo');
    }

    if (fieldRules.custom && typeof fieldRules.custom === 'function') {
      const customError = fieldRules.custom(value, data);
      if (customError) {
        fieldErrors.push(customError);
      }
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      valid = false;
    }
  }

  return { valid, errors };
}

/**
 * Sanitize string (remove HTML tags)
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Normalize string (trim, lowercase, remove extra spaces)
 * @param {string} str - String to normalize
 * @returns {string} Normalized string
 */
export function normalizeString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

export const ValidationUtils = {
  isValidEmail,
  isValidPhone,
  isValidFiscalCode,
  isValidVAT,
  isValidURL,
  isRequired,
  isValidLength,
  isInRange,
  isInteger,
  isPositive,
  isValidDateString,
  isValidTimeString,
  validatePassword,
  validateForm,
  sanitizeString,
  normalizeString
};
