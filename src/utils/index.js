/**
 * Utilities Index - Central export point for all utility modules
 * Import utilities from this file for better maintainability
 */

export * from './date.js';
export * from './time.js';
export * from './format.js';
export * from './validation.js';
export * from './notification.js';

import { DateUtils } from './date.js';
import { TimeUtils } from './time.js';
import { FormatUtils } from './format.js';
import { ValidationUtils } from './validation.js';
import { NotificationUtils } from './notification.js';

export {
  DateUtils,
  TimeUtils,
  FormatUtils,
  ValidationUtils,
  NotificationUtils
};

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));

  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry(fn, maxAttempts = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function attempt() {
      attempts++;
      fn()
        .then(resolve)
        .catch(error => {
          if (attempts >= maxAttempts) {
            reject(error);
          } else {
            setTimeout(attempt, delay);
          }
        });
    }

    attempt();
  });
}

export function groupBy(array, key) {
  if (!Array.isArray(array)) return {};

  return array.reduce((result, item) => {
    const groupKey = typeof key === 'function' ? key(item) : item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
}

export function sortBy(array, key, order = 'asc') {
  if (!Array.isArray(array)) return [];

  return [...array].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key];
    const bVal = typeof key === 'function' ? key(b) : b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

export function uniqueBy(array, key) {
  if (!Array.isArray(array)) return [];

  const seen = new Set();
  return array.filter(item => {
    const k = typeof key === 'function' ? key(item) : item[key];
    if (seen.has(k)) {
      return false;
    }
    seen.add(k);
    return true;
  });
}

export function chunk(array, size) {
  if (!Array.isArray(array)) return [];

  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return {};

  return keys.reduce((result, key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}

export function omit(obj, keys) {
  if (!obj || typeof obj !== 'object') return {};

  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

export const Utils = {
  debounce,
  throttle,
  deepClone,
  isEmpty,
  generateUUID,
  sleep,
  retry,
  groupBy,
  sortBy,
  uniqueBy,
  chunk,
  pick,
  omit,
  ...DateUtils,
  ...TimeUtils,
  ...FormatUtils,
  ...ValidationUtils,
  ...NotificationUtils
};
