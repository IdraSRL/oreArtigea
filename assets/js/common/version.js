/**
 * Sistema di Versioning Centralizzato
 * Definisce la versione dell'applicazione per il cache-busting
 *
 * ════════════════════════════════════════════════════════════════════════════
 * 🔄 COME AGGIORNARE LA VERSIONE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * 1. Modifica il numero di versione qui sotto (APP_VERSION)
 * 2. Aggiorna la BUILD_DATE con la data corrente
 * 3. Aggiorna la description in BUILD_INFO
 * 4. Salva il file
 *
 * ⚠️  IMPORTANTE: Quando cambi la versione, tutti gli utenti riceveranno
 *     automaticamente un refresh della pagina al prossimo caricamento e
 *     tutte le risorse CSS e JS verranno ricaricate ignorando la cache.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * 📋 FORMATO VERSIONE: MAJOR.MINOR.PATCH
 * ════════════════════════════════════════════════════════════════════════════
 *
 * - MAJOR: Cambiamenti incompatibili o ristrutturazioni complete
 * - MINOR: Nuove funzionalità retrocompatibili
 * - PATCH: Bug fix e miglioramenti minori
 *
 * Esempio:
 *   2.26.0 → 2.26.1  (bug fix)
 *   2.26.1 → 2.27.0  (nuova feature)
 *   2.27.0 → 3.0.0   (breaking changes)
 *
 * ════════════════════════════════════════════════════════════════════════════
 */

// Versione principale dell'applicazione
export const APP_VERSION = '2.27.0';

// Informazioni aggiuntive
export const BUILD_DATE = '2025-10-03';
export const BUILD_INFO = {
  version: APP_VERSION,
  buildDate: BUILD_DATE,
  description: 'Sistema Gestione Ore e Bigliettini BnB - Badge dipendente ridisegnato + sistema cache-busting migliorato'
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