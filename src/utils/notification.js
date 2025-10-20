/**
 * Notification Utilities - Unified toast/notification system
 * Consolidates toast.js and notification functions from utils.js
 * Uses Bootstrap Toast for consistent UI
 */

let toastContainer = null;

/**
 * Get or create toast container
 * @returns {HTMLElement} Toast container element
 */
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toastContainer');
  }

  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
    toastContainer.style.zIndex = '9999';
    document.body.appendChild(toastContainer);
  }

  return toastContainer;
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'success', 'danger', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showToast(message, type = 'info', duration = 3000) {
  const container = getToastContainer();

  const bgClass = type === 'error' ? 'danger' : type;

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${bgClass} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  container.appendChild(toast);

  if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
    const bsToast = new bootstrap.Toast(toast, { delay: duration });
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', () => {
      toast.remove();
    });
  } else {
    setTimeout(() => {
      toast.remove();
    }, duration);
  }
}

/**
 * Show success toast
 * @param {string} message - Success message
 * @param {number} duration - Duration in milliseconds
 */
export function showSuccess(message, duration = 3000) {
  showToast(message, 'success', duration);
}

/**
 * Show error toast
 * @param {string} message - Error message
 * @param {number} duration - Duration in milliseconds
 */
export function showError(message, duration = 3000) {
  showToast(message, 'danger', duration);
}

/**
 * Show warning toast
 * @param {string} message - Warning message
 * @param {number} duration - Duration in milliseconds
 */
export function showWarning(message, duration = 3000) {
  showToast(message, 'warning', duration);
}

/**
 * Show info toast
 * @param {string} message - Info message
 * @param {number} duration - Duration in milliseconds
 */
export function showInfo(message, duration = 3000) {
  showToast(message, 'info', duration);
}

let progressContainer = null;

/**
 * Show loading progress overlay
 * @param {string} text - Loading message
 */
export function showProgress(text = 'Caricamento...') {
  if (!progressContainer) {
    progressContainer = document.createElement('div');
    progressContainer.id = 'progressContainer';
    progressContainer.className = 'progress-container';
    progressContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      backdrop-filter: blur(5px);
    `;
    document.body.appendChild(progressContainer);
  }

  progressContainer.style.display = 'flex';
  progressContainer.innerHTML = `
    <div class="text-center text-light">
      <div class="spinner-border mb-3" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div>${text}</div>
    </div>
  `;
}

/**
 * Hide loading progress overlay
 */
export function hideProgress() {
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
}

/**
 * Show a confirmation dialog
 * @param {string} message - Confirmation message
 * @returns {boolean} True if user confirmed
 */
export function showConfirm(message) {
  return window.confirm(message);
}

/**
 * Show an alert dialog
 * @param {string} message - Alert message
 */
export function showAlert(message) {
  window.alert(message);
}

export const NotificationUtils = {
  showToast,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showProgress,
  hideProgress,
  showConfirm,
  showAlert
};
