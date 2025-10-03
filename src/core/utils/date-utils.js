/**
 * Date Utilities Module
 * Consolidates date formatting functions from utils.js and time-utilis.js
 */

export const DateUtils = {
  /**
   * Format date to ISO string (YYYY-MM-DD)
   * @param {Date|string} date - Date object or date string
   * @returns {string} ISO formatted date string
   */
  formatISO(date) {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  },

  /**
   * Format date to Italian format (DD/MM/YYYY)
   * @param {Date|string} date - Date object or date string
   * @returns {string} Italian formatted date string
   */
  formatItalian(date) {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
  },

  /**
   * Get month name from month string (YYYY-MM)
   * @param {string} monthString - Month string in format YYYY-MM
   * @returns {string} Italian month name
   */
  getMonthName(monthString) {
    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];

    if (!monthString || !monthString.includes('-')) return '';

    const [year, month] = monthString.split('-');
    const monthIndex = parseInt(month, 10) - 1;

    if (monthIndex < 0 || monthIndex > 11) return '';

    return `${monthNames[monthIndex]} ${year}`;
  },

  /**
   * Get current date in ISO format
   * @returns {string} Current date in YYYY-MM-DD format
   */
  getCurrentDateISO() {
    return this.formatISO(new Date());
  },

  /**
   * Get current month in format YYYY-MM
   * @returns {string} Current month in YYYY-MM format
   */
  getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  },

  /**
   * Parse date string to Date object
   * @param {string} dateString - Date string in various formats
   * @returns {Date|null} Date object or null if invalid
   */
  parseDate(dateString) {
    if (!dateString) return null;

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return null;

    return date;
  },

  /**
   * Check if date is valid
   * @param {Date|string} date - Date to validate
   * @returns {boolean} True if date is valid
   */
  isValidDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d instanceof Date && !isNaN(d.getTime());
  },

  /**
   * Get date range for a specific month
   * @param {string} monthString - Month in format YYYY-MM
   * @returns {{start: string, end: string}} Start and end dates in ISO format
   */
  getMonthRange(monthString) {
    if (!monthString || !monthString.includes('-')) {
      return { start: '', end: '' };
    }

    const [year, month] = monthString.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);

    return {
      start: this.formatISO(startDate),
      end: this.formatISO(endDate)
    };
  },

  /**
   * Format timestamp to readable string
   * @param {number|Date} timestamp - Timestamp or Date object
   * @returns {string} Formatted date and time string
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return '';

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);

    if (isNaN(date.getTime())) return '';

    return `${this.formatItalian(date)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
};
