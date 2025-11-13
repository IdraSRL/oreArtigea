/**
 * UI Helpers Module
 * Consolidates UI feedback functions (toast, loader, progress) from utils.js
 */

export const UI = {
  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type: 'success', 'error', 'info', 'warning'
   * @param {number} duration - Duration in milliseconds (default: 3000)
   */
  showToast(message, type = 'info', duration = 3000) {
    const toastContainer = this._getOrCreateToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} show`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');

    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = message;

    toast.appendChild(toastBody);
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  },

  /**
   * Show success toast
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.showToast(message, 'success');
  },

  /**
   * Show error toast
   * @param {string} message - Error message
   */
  showError(message) {
    this.showToast(message, 'error', 5000);
  },

  /**
   * Show info toast
   * @param {string} message - Info message
   */
  showInfo(message) {
    this.showToast(message, 'info');
  },

  /**
   * Show warning toast
   * @param {string} message - Warning message
   */
  showWarning(message) {
    this.showToast(message, 'warning');
  },

  /**
   * Get or create toast container
   * @private
   */
  _getOrCreateToastContainer() {
    let container = document.getElementById('toast-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container position-fixed top-0 end-0 p-3';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    return container;
  },

  /**
   * Show loading spinner
   * @param {string} text - Loading text (optional)
   */
  showLoader(text = 'Caricamento...') {
    let loader = document.getElementById('global-loader');

    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'global-loader';
      loader.className = 'global-loader';
      loader.innerHTML = `
        <div class="loader-backdrop"></div>
        <div class="loader-content">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="loader-text mt-3">${text}</div>
        </div>
      `;
      document.body.appendChild(loader);
    } else {
      const loaderText = loader.querySelector('.loader-text');
      if (loaderText) {
        loaderText.textContent = text;
      }
    }

    loader.style.display = 'flex';
  },

  /**
   * Hide loading spinner
   */
  hideLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
      loader.style.display = 'none';
    }
  },

  /**
   * Show progress indicator
   * @param {string} message - Progress message
   */
  showProgress(message) {
    this.showLoader(message);
  },

  /**
   * Hide progress indicator
   */
  hideProgress() {
    this.hideLoader();
  },

  /**
   * Show confirmation dialog
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback when confirmed
   * @param {Function} onCancel - Callback when cancelled (optional)
   */
  confirm(message, onConfirm, onCancel = null) {
    if (window.confirm(message)) {
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    } else {
      if (typeof onCancel === 'function') {
        onCancel();
      }
    }
  },

  /**
   * Disable form elements
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   */
  disableForm(formOrSelector) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (!form) return;

    const elements = form.querySelectorAll('input, select, textarea, button');
    elements.forEach(element => {
      element.disabled = true;
    });
  },

  /**
   * Enable form elements
   * @param {HTMLFormElement|string} formOrSelector - Form element or selector
   */
  enableForm(formOrSelector) {
    const form = typeof formOrSelector === 'string'
      ? document.querySelector(formOrSelector)
      : formOrSelector;

    if (!form) return;

    const elements = form.querySelectorAll('input, select, textarea, button');
    elements.forEach(element => {
      element.disabled = false;
    });
  },

  /**
   * Scroll to element smoothly
   * @param {string|HTMLElement} elementOrSelector - Element or selector
   */
  scrollTo(elementOrSelector) {
    const element = typeof elementOrSelector === 'string'
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;

    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  },

  /**
   * Highlight element temporarily
   * @param {string|HTMLElement} elementOrSelector - Element or selector
   * @param {number} duration - Duration in milliseconds (default: 2000)
   */
  highlight(elementOrSelector, duration = 2000) {
    const element = typeof elementOrSelector === 'string'
      ? document.querySelector(elementOrSelector)
      : elementOrSelector;

    if (!element) return;

    element.classList.add('highlight-flash');

    setTimeout(() => {
      element.classList.remove('highlight-flash');
    }, duration);
  }
};
