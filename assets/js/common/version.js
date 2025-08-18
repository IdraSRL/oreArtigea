/**
 * Sistema di Versioning Centralizzato
 * Definisce la versione dell'applicazione per il cache-busting
 */

// Versione principale dell'applicazione
export const APP_VERSION = '2.25.0';

// Informazioni aggiuntive
export const BUILD_DATE = '2025-01-27-restructured';
export const BUILD_INFO = {
  version: APP_VERSION,
  buildDate: BUILD_DATE,
  description: 'Sistema Gestione Ore e Bigliettini BnB - Ristrutturato con pulsanti attività admin'
};

/**
 * Ottiene la versione corrente
 */
export function getCurrentVersion() {
  return APP_VERSION;
}

/**
 * Verifica se è necessario un aggiornamento
 */
export function checkVersionUpdate() {
  const storedVersion = localStorage.getItem('app_version');
  const currentVersion = APP_VERSION;
  
  if (storedVersion && storedVersion !== currentVersion) {
    console.log(`🔄 Versione aggiornata da ${storedVersion} a ${currentVersion}`);
    localStorage.setItem('app_version', currentVersion);
    return true;
  }
  
  if (!storedVersion) {
    localStorage.setItem('app_version', currentVersion);
  }
  
  return false;
}

/**
 * Mostra la versione nell'interfaccia
 */
export function displayVersion() {
  const versionElements = document.querySelectorAll('.version-display');
  versionElements.forEach(el => {
    el.textContent = `v${APP_VERSION}`;
  });
}

// Auto-inizializzazione
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', displayVersion);
}