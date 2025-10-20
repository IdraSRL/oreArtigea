/**
 * Time Calculation Utilities - Unified time handling functions
 * Consolidates time-calculator.js and time-utilis.js
 */

/**
 * Calculate total minutes from activities array
 * Supports two formats:
 * - Format 1: { minutes, multiplier, people }
 * - Format 2: { minuti, moltiplicatore, persone }
 *
 * @param {Array} activities - Array of activity objects
 * @returns {number} Total minutes
 */
export function calculateTotalMinutes(activities) {
  if (!Array.isArray(activities)) return 0;

  return activities.reduce((total, activity) => {
    const minutes = Number(activity.minutes || activity.minuti || 0);
    const multiplier = Number(activity.multiplier || activity.moltiplicatore || 1);
    const people = Number(activity.people || activity.persone || 1);

    if (people === 0) return total;

    return total + (minutes * multiplier) / people;
  }, 0);
}

/**
 * Format minutes to hours and minutes object
 * @param {number} totalMinutes - Total minutes
 * @returns {{hours: number, minutes: number, formatted: string}} Hours and minutes
 */
export function formatHoursMinutes(totalMinutes) {
  const rounded = Math.round(totalMinutes);
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  const formatted = `${hours}:${minutes.toString().padStart(2, '0')}`;

  return { hours, minutes, formatted };
}

/**
 * Format minutes to hours string (e.g., "2h 30m")
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted string
 */
export function formatMinutesToHoursString(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}

/**
 * Convert minutes to decimal hours
 * @param {number} minutes - Total minutes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Decimal hours
 */
export function minutesToHours(minutes, decimals = 2) {
  const hours = minutes / 60;
  return Number(hours.toFixed(decimals));
}

/**
 * Format decimal hours
 * @param {number} hours - Decimal hours
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Formatted decimal hours
 */
export function formatDecimalHours(hours, decimals = 2) {
  return Number(parseFloat(hours).toFixed(decimals));
}

/**
 * Convert hours to minutes
 * @param {number} hours - Hours (can be decimal)
 * @returns {number} Total minutes
 */
export function hoursToMinutes(hours) {
  return Math.round(hours * 60);
}

/**
 * Parse time string to minutes (e.g., "2h 30m" -> 150)
 * @param {string} timeString - Time string in format "Xh Ym"
 * @returns {number} Total minutes
 */
export function parseTimeString(timeString) {
  if (!timeString || typeof timeString !== 'string') return 0;

  const match = timeString.match(/(\d+)h\s*(\d+)m/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }

  return 0;
}

/**
 * Format time from minutes (HH:MM format)
 * @param {number} minutes - Total minutes
 * @returns {string} Time in HH:MM format
 */
export function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Parse HH:MM format to minutes
 * @param {string} timeString - Time string in HH:MM format
 * @returns {number} Total minutes
 */
export function parseHHMM(timeString) {
  if (!timeString || typeof timeString !== 'string') return 0;

  const match = timeString.match(/(\d+):(\d+)/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
  }

  return 0;
}

/**
 * Add minutes to a time string
 * @param {string} timeString - Time string in HH:MM format
 * @param {number} minutesToAdd - Minutes to add
 * @returns {string} New time in HH:MM format
 */
export function addMinutesToTime(timeString, minutesToAdd) {
  const currentMinutes = parseHHMM(timeString);
  const newMinutes = currentMinutes + minutesToAdd;
  return formatTime(newMinutes);
}

/**
 * Calculate duration between two times
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {number} Duration in minutes
 */
export function calculateDuration(startTime, endTime) {
  const startMinutes = parseHHMM(startTime);
  const endMinutes = parseHHMM(endTime);

  let duration = endMinutes - startMinutes;

  if (duration < 0) {
    duration += 24 * 60;
  }

  return duration;
}

/**
 * Validate time string format (HH:MM)
 * @param {string} timeString - Time string to validate
 * @returns {boolean} True if valid
 */
export function isValidTimeFormat(timeString) {
  if (!timeString || typeof timeString !== 'string') return false;
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(timeString);
}

/**
 * Round minutes to nearest interval
 * @param {number} minutes - Minutes to round
 * @param {number} interval - Interval to round to (default: 15)
 * @returns {number} Rounded minutes
 */
export function roundToInterval(minutes, interval = 15) {
  return Math.round(minutes / interval) * interval;
}

export const TimeUtils = {
  calculateTotalMinutes,
  formatHoursMinutes,
  formatMinutesToHoursString,
  minutesToHours,
  formatDecimalHours,
  hoursToMinutes,
  parseTimeString,
  formatTime,
  parseHHMM,
  addMinutesToTime,
  calculateDuration,
  isValidTimeFormat,
  roundToInterval
};
