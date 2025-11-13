// utils.js - Utility functions centralizzate

/**
 * Formatta una data in formato ISO (YYYY-MM-DD)
 */
export function formatISO(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${y}-${m}-${d}`;
}

/**
 * Formatta una data per la visualizzazione italiana
 */
export function formatItalianDate(date) {
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Ottiene il nome del mese in italiano
 */
export function getMonthName(monthString) {
  const [year, month] = monthString.split('-');
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long'
  });
}

/**
 * Debounce function per ottimizzare le chiamate
 */
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

/**
 * Mostra un toast di notifica
 */
export function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;

  const backgrounds = {
    success: 'linear-gradient(45deg, #10b981, #059669)',
    warning: 'linear-gradient(45deg, #f59e0b, #d97706)',
    error: 'linear-gradient(45deg, #ef4444, #dc2626)',
    info: 'linear-gradient(45deg, #3b82f6, #1d4ed8)'
  };

  toast.style.background = backgrounds[type] || backgrounds.info;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Mostra/nasconde overlay di caricamento
 */
export function showProgress(text) {
  let progressContainer = document.getElementById('progressContainer');
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
  
  progressContainer.innerHTML = `
    <div class="text-center text-light">
      <div class="spinner-border mb-3" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div>${text}</div>
    </div>
  `;
}

export function hideProgress() {
  const progressContainer = document.getElementById('progressContainer');
  if (progressContainer) {
    progressContainer.remove();
  }
}

/**
 * Valida un indirizzo email
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Genera un ID sicuro da una stringa
 */
export function generateSafeId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
}