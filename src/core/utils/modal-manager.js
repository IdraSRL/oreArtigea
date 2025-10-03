/**
 * Modal Manager Module
 * Consolidates modal handling logic from admin.html, timeEntry.html and other files
 */

export class ModalManager {
  /**
   * Show modal by ID
   * @param {string} modalId - Modal element ID
   * @param {Object} options - Modal options (optional)
   */
  static show(modalId, options = {}) {
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
      console.error(`Modal with ID '${modalId}' not found`);
      return null;
    }

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const modal = new bootstrap.Modal(modalElement, {
        backdrop: options.backdrop !== undefined ? options.backdrop : true,
        keyboard: options.keyboard !== undefined ? options.keyboard : true,
        focus: options.focus !== undefined ? options.focus : true
      });

      modal.show();

      if (options.onShown) {
        modalElement.addEventListener('shown.bs.modal', options.onShown, { once: true });
      }

      if (options.onHidden) {
        modalElement.addEventListener('hidden.bs.modal', options.onHidden, { once: true });
      }

      return modal;
    } else {
      modalElement.style.display = 'block';
      modalElement.classList.add('show');
      document.body.classList.add('modal-open');

      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade show';
      backdrop.id = `${modalId}-backdrop`;
      document.body.appendChild(backdrop);

      return {
        hide: () => this.hide(modalId)
      };
    }
  }

  /**
   * Hide modal by ID
   * @param {string} modalId - Modal element ID
   */
  static hide(modalId) {
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
      console.error(`Modal with ID '${modalId}' not found`);
      return;
    }

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    } else {
      modalElement.style.display = 'none';
      modalElement.classList.remove('show');
      document.body.classList.remove('modal-open');

      const backdrop = document.getElementById(`${modalId}-backdrop`);
      if (backdrop) {
        backdrop.remove();
      }
    }
  }

  /**
   * Show confirmation modal
   * @param {Object} config - Configuration object
   * @param {string} config.title - Modal title
   * @param {string} config.message - Modal message
   * @param {Function} config.onConfirm - Callback when confirmed
   * @param {Function} config.onCancel - Callback when cancelled (optional)
   * @param {string} config.confirmText - Confirm button text (default: 'Conferma')
   * @param {string} config.cancelText - Cancel button text (default: 'Annulla')
   * @param {string} config.confirmClass - Confirm button class (default: 'btn-primary')
   */
  static confirm(config) {
    const {
      title = 'Conferma',
      message,
      onConfirm,
      onCancel = null,
      confirmText = 'Conferma',
      cancelText = 'Annulla',
      confirmClass = 'btn-primary'
    } = config;

    let confirmModal = document.getElementById('confirmModal');

    if (!confirmModal) {
      confirmModal = this._createConfirmModal();
    }

    const titleElement = confirmModal.querySelector('.modal-title');
    const bodyElement = confirmModal.querySelector('.modal-body');
    const confirmBtn = confirmModal.querySelector('.btn-confirm');
    const cancelBtn = confirmModal.querySelector('.btn-cancel');

    if (titleElement) titleElement.textContent = title;
    if (bodyElement) bodyElement.innerHTML = message;
    if (confirmBtn) {
      confirmBtn.textContent = confirmText;
      confirmBtn.className = `btn ${confirmClass} btn-confirm`;
    }
    if (cancelBtn) cancelBtn.textContent = cancelText;

    const handleConfirm = () => {
      this.hide('confirmModal');
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
      cleanup();
    };

    const handleCancel = () => {
      this.hide('confirmModal');
      if (typeof onCancel === 'function') {
        onCancel();
      }
      cleanup();
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);

    this.show('confirmModal', {
      backdrop: 'static',
      onHidden: cleanup
    });
  }

  /**
   * Create confirm modal element
   * @private
   */
  static _createConfirmModal() {
    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'confirmModalLabel');
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="confirmModalLabel">Conferma</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            Sei sicuro di voler procedere?
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-cancel" data-bs-dismiss="modal">Annulla</button>
            <button type="button" class="btn btn-primary btn-confirm">Conferma</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  /**
   * Show alert modal
   * @param {Object} config - Configuration object
   * @param {string} config.title - Modal title
   * @param {string} config.message - Modal message
   * @param {Function} config.onClose - Callback when closed (optional)
   * @param {string} config.closeText - Close button text (default: 'Chiudi')
   * @param {string} config.type - Alert type: 'info', 'success', 'warning', 'danger' (default: 'info')
   */
  static alert(config) {
    const {
      title = 'Attenzione',
      message,
      onClose = null,
      closeText = 'Chiudi',
      type = 'info'
    } = config;

    let alertModal = document.getElementById('alertModal');

    if (!alertModal) {
      alertModal = this._createAlertModal();
    }

    const titleElement = alertModal.querySelector('.modal-title');
    const bodyElement = alertModal.querySelector('.modal-body');
    const closeBtn = alertModal.querySelector('.btn-close-alert');
    const headerElement = alertModal.querySelector('.modal-header');

    if (titleElement) titleElement.textContent = title;
    if (bodyElement) bodyElement.innerHTML = message;
    if (closeBtn) closeBtn.textContent = closeText;

    if (headerElement) {
      headerElement.className = `modal-header bg-${type} text-white`;
    }

    const handleClose = () => {
      this.hide('alertModal');
      if (typeof onClose === 'function') {
        onClose();
      }
      closeBtn.removeEventListener('click', handleClose);
    };

    closeBtn.addEventListener('click', handleClose);

    this.show('alertModal', {
      onHidden: handleClose
    });
  }

  /**
   * Create alert modal element
   * @private
   */
  static _createAlertModal() {
    const modal = document.createElement('div');
    modal.id = 'alertModal';
    modal.className = 'modal fade';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'alertModalLabel');
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="alertModalLabel">Attenzione</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            Messaggio di avviso
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary btn-close-alert" data-bs-dismiss="modal">Chiudi</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  /**
   * Clean up all modals (remove backdrops, reset state)
   */
  static cleanup() {
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());

    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
      modal.classList.remove('show');
    });

    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  /**
   * Get modal instance
   * @param {string} modalId - Modal element ID
   * @returns {Object|null} Bootstrap modal instance or null
   */
  static getInstance(modalId) {
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
      return null;
    }

    if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
      return bootstrap.Modal.getInstance(modalElement);
    }

    return null;
  }

  /**
   * Toggle modal (show if hidden, hide if shown)
   * @param {string} modalId - Modal element ID
   */
  static toggle(modalId) {
    const modalElement = document.getElementById(modalId);

    if (!modalElement) {
      console.error(`Modal with ID '${modalId}' not found`);
      return;
    }

    if (modalElement.classList.contains('show')) {
      this.hide(modalId);
    } else {
      this.show(modalId);
    }
  }
}
