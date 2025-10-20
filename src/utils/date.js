/**
 * Date Utilities - Unified date handling functions
 * Consolidates date-helpers.js, date-utils.js, and date functions from utils.js
 */

const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

const DAY_NAMES_IT = [
  'Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'
];

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {Date|string|number} date - Date object, date string, or timestamp
 * @returns {string} ISO formatted date string
 */
export function formatDateISO(date) {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format date with custom format
 * @param {Date|string} date - Date object or date string
 * @param {string} format - Format string: 'YYYY-MM-DD', 'DD/MM/YYYY', 'DD-MM-YYYY'
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  switch (format) {
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'DD-MM-YYYY':
      return `${day}-${month}-${year}`;
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Format date to Italian format (DD/MM/YYYY)
 * @param {Date|string} date - Date object or date string
 * @returns {string} Italian formatted date string
 */
export function formatDateItalian(date) {
  if (!date) return '';

  const d = date instanceof Date ? date : new Date(date);

  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Format date to ISO string with time
 * @param {Date|string} date - Date object or date string
 * @returns {string} ISO formatted date-time string
 */
export function formatISO(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

/**
 * Format timestamp to readable string (DD/MM/YYYY HH:MM)
 * @param {number|Date} timestamp - Timestamp or Date object
 * @returns {string} Formatted date and time string
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return '';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

  if (isNaN(date.getTime())) return '';

  const dateStr = formatDateItalian(date);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Get today's date as ISO string
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export function getTodayString() {
  return formatDateISO(new Date());
}

/**
 * Get current date in ISO format (alias for getTodayString)
 * @returns {string} Current date in YYYY-MM-DD format
 */
export function getCurrentDateISO() {
  return getTodayString();
}

/**
 * Get month string from date (YYYY-MM)
 * @param {Date|string} date - Date object or date string
 * @returns {string} Month string in YYYY-MM format
 */
export function getMonthString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get current month string (YYYY-MM)
 * @returns {string} Current month in YYYY-MM format
 */
export function getCurrentMonthString() {
  return getMonthString(new Date());
}

/**
 * Get month name in Italian
 * @param {number|string} monthNumberOrString - Month number (1-12) or month string (YYYY-MM)
 * @returns {string} Italian month name
 */
export function getMonthName(monthNumberOrString) {
  if (typeof monthNumberOrString === 'string' && monthNumberOrString.includes('-')) {
    const [year, month] = monthNumberOrString.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11) return '';
    return `${MONTH_NAMES_IT[monthIndex]} ${year}`;
  }

  const monthIndex = parseInt(monthNumberOrString, 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return '';
  return MONTH_NAMES_IT[monthIndex];
}

/**
 * Get day name in Italian
 * @param {number} dayNumber - Day number (0-6, where 0 is Sunday)
 * @returns {string} Italian day name
 */
export function getDayName(dayNumber) {
  if (dayNumber < 0 || dayNumber > 6) return '';
  return DAY_NAMES_IT[dayNumber];
}

/**
 * Get number of days in a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} Number of days in the month
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Parse date string to Date object
 * @param {string} dateString - Date string in various formats
 * @returns {Date|null} Date object or null if invalid
 */
export function parseDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Check if date is valid
 * @param {Date|string} date - Date to validate
 * @returns {boolean} True if date is valid
 */
export function isValidDate(date) {
  if (!date) return false;
  const d = date instanceof Date ? date : new Date(date);
  return !isNaN(d.getTime());
}

/**
 * Get date range for a specific month
 * @param {string} monthString - Month in format YYYY-MM
 * @returns {{start: string, end: string}} Start and end dates in ISO format
 */
export function getMonthRange(monthString) {
  if (!monthString || !monthString.includes('-')) {
    return { start: '', end: '' };
  }

  const [year, month] = monthString.split('-');
  const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
  const endDate = new Date(parseInt(year), parseInt(month), 0);

  return {
    start: formatDateISO(startDate),
    end: formatDateISO(endDate)
  };
}

/**
 * Compare two dates (ignoring time)
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 */
export function compareDates(date1, date2) {
  const d1 = formatDateISO(date1);
  const d2 = formatDateISO(date2);

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  return formatDateISO(date) === getTodayString();
}

/**
 * Add days to a date
 * @param {Date|string} date - Starting date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date
 */
export function addDays(date, days) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get start of month
 * @param {Date|string} date - Date
 * @returns {Date} First day of the month
 */
export function getStartOfMonth(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Get end of month
 * @param {Date|string} date - Date
 * @returns {Date} Last day of the month
 */
export function getEndOfMonth(date = new Date()) {
  const d = date instanceof Date ? new Date(date) : new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export const DateUtils = {
  formatDateISO,
  formatDate,
  formatDateItalian,
  formatISO,
  formatTimestamp,
  getTodayString,
  getCurrentDateISO,
  getMonthString,
  getCurrentMonthString,
  getMonthName,
  getDayName,
  getDaysInMonth,
  parseDate,
  isValidDate,
  getMonthRange,
  compareDates,
  isToday,
  addDays,
  getStartOfMonth,
  getEndOfMonth
};
