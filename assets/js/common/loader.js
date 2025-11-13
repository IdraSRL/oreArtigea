/**
 * Cache-Busting Loader System
 * Sistema di caricamento dinamico con cache-busting automatico
 */

(async function() {
  'use strict';

  let APP_VERSION = null;
  let isVersionLoaded = false;

  /**
   * Carica la versione da version.js
   */
  async function loadVersion() {
    try {
      const versionModule = await import('./version.js?cache=' + Date.now());
      APP_VERSION = versionModule.APP_VERSION;
      console.log(`🚀 Versione caricata: ${APP_VERSION}`);
    } catch (error) {
      console.warn('⚠️ Errore caricamento versione, uso timestamp:', error);
      APP_VERSION = Date.now().toString();
    }
    isVersionLoaded = true;
    return APP_VERSION;
  }

  /**
   * Controlla se la versione è cambiata e forza reload
   */
  function checkForVersionUpdate(version) {
    const stored = localStorage.getItem('app_version');
    if (stored && stored !== version) {
      console.log(`🔄 Versione cambiata da ${stored} a ${version}`);
      console.log('🧹 Pulizia cache del browser...');

      // Pulisci la cache del browser
      clearBrowserCache();

      // Aggiorna la versione salvata
      localStorage.setItem('app_version', version);

      console.log('🔄 Ricaricamento pagina per applicare la nuova versione...');

      // Forza il reload completo senza cache
      window.location.reload(true);
      return true;
    }
    if (!stored) {
      localStorage.setItem('app_version', version);
    }
    return false;
  }

  /**
   * Pulisce la cache del browser
   */
  function clearBrowserCache() {
    try {
      // Pulisci Service Worker cache se presente
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.unregister();
            console.log('🗑️ Service Worker unregistered');
          });
        });
      }

      // Pulisci cache storage se disponibile
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
            console.log(`🗑️ Cache eliminata: ${name}`);
          });
        });
      }

      console.log('✅ Cache del browser pulita');
    } catch (error) {
      console.warn('⚠️ Errore durante pulizia cache:', error);
    }
  }

  /**
   * Aggiunge parametro versione solo a risorse interne
   */
  function addVersionParam(url) {
    try {
      const urlObj = new URL(url, location.href);
      
      // Non versionare risorse esterne
      if (urlObj.origin !== location.origin) return url;
      
      // Non versionare se già ha parametri di versione
      if (urlObj.search.includes('v=')) return url;
      
      const separator = urlObj.search ? '&' : '?';
      return url + `${separator}v=${APP_VERSION}`;
    } catch (error) {
      return url;
    }
  }

  /**
   * Cache-busting per CSS
   */
  function bustCSS() {
    let cssCount = 0;
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('http') && !href.includes('v=')) {
        const cleanHref = href.split('?')[0];
        const newHref = addVersionParam(cleanHref);

        // Forza il reload del CSS creando un nuovo elemento
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.href = newHref;

        // Copia altri attributi se presenti
        if (link.media) newLink.media = link.media;
        if (link.type) newLink.type = link.type;

        // Sostituisci il vecchio con il nuovo
        link.parentNode.insertBefore(newLink, link.nextSibling);
        link.remove();

        cssCount++;
      }
    });
    console.log(`📄 CSS aggiornati: ${cssCount} file`);
  }

  /**
   * Cache-busting per JavaScript
   */
  function bustJS() {
  let jsCount = 0;
  document.querySelectorAll('script[src]').forEach((script) => {
    const srcAttr = script.getAttribute('src');
    if (!srcAttr) return;

    // Salta il loader e le risorse esterne (http/https)
    if (srcAttr.includes('loader.js')) return;
    if (/^https?:\/\//i.test(srcAttr)) return;

    // Costruisci un nuovo elemento <script> clonato preservando TUTTI gli attributi
    const cleanSrc = srcAttr.split('?')[0];
    const cloned = document.createElement('script');

    // Copia tutti gli attributi dall'originale
    for (const { name, value } of Array.from(script.attributes)) {
      if (name.toLowerCase() === 'src') continue; // lo settiamo dopo con il param di versione
      cloned.setAttribute(name, value);
    }

    // Assicurati che type venga applicato PRIMA di src (per evitare che il browser esegua come script classico)
    const typeAttr = (script.getAttribute('type') || '').trim();
    if (typeAttr) cloned.setAttribute('type', typeAttr);

    // Imposta src con il parametro di versione
    cloned.setAttribute('src', addVersionParam(cleanSrc));

    // Mantieni anche async/defer/crossorigin/integrity/referrerpolicy se presenti (già copiati sopra)
    script.replaceWith(cloned);
    jsCount++;
  });
  console.log(`📜 JS aggiornati: ${jsCount} file`);
}


  /**
   * Cache-busting per altre risorse
   */
  function bustOther() {
    let otherCount = 0;
    document.querySelectorAll('iframe[src], img[src]').forEach(el => {
      const src = el.getAttribute('src');
      
      // Solo risorse relative
      if (src && !src.startsWith('http') && src.trim()) {
        const cleanSrc = src.split('?')[0];
        el.src = addVersionParam(cleanSrc);
        otherCount++;
      }
    });
    if (otherCount > 0) {
      console.log(`🖼️ Altre risorse aggiornate: ${otherCount} file`);
    }
  }

  /**
   * Aggiorna visualizzazione versione nell'UI
   */
  function updateUI() {
    document.querySelectorAll('.version-display').forEach(el => {
      el.textContent = `v${APP_VERSION}`;
    });
    console.log(`✅ UI aggiornata con versione ${APP_VERSION}`);
  }

  /**
   * Inizializzazione principale
   */
  async function init() {
    console.log('🚀 Inizializzazione sistema cache-busting...');

    await loadVersion();

    if (checkForVersionUpdate(APP_VERSION)) {
      return; // Reload in corso
    }

    bustCSS();
    bustJS();
    bustOther();
    updateUI();

    // Monitora nuovi CSS/JS aggiunti dinamicamente
    observeDynamicResources();

    console.log('✅ Cache-busting completato');
  }

  /**
   * Osserva l'aggiunta dinamica di nuove risorse
   */
  function observeDynamicResources() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // Gestisci nuovi CSS
          if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
            const href = node.getAttribute('href');
            if (href && !href.startsWith('http') && !href.includes('v=')) {
              const cleanHref = href.split('?')[0];
              node.href = addVersionParam(cleanHref);
              console.log(`📄 CSS dinamico versionato: ${cleanHref}`);
            }
          }

          // Gestisci nuovi JS
          if (node.tagName === 'SCRIPT' && node.src) {
            const src = node.getAttribute('src');
            if (src && !src.startsWith('http') && !src.includes('v=') && !src.includes('loader.js')) {
              const cleanSrc = src.split('?')[0];
              node.src = addVersionParam(cleanSrc);
              console.log(`📜 JS dinamico versionato: ${cleanSrc}`);
            }
          }
        });
      });
    });

    observer.observe(document.head, {
      childList: true,
      subtree: true
    });

    // Osserva anche il body per risorse caricate dinamicamente
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    console.log('👁️ Observer per risorse dinamiche attivato');
  }

  // Avvio del sistema
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // API di debug globale
  window.cacheBustingSystem = {
    getVersion: () => APP_VERSION,
    isLoaded: () => isVersionLoaded,
    getStoredVersion: () => localStorage.getItem('app_version'),
    clearCache: () => {
      localStorage.removeItem('app_version');
      console.log('🗑️ Cache versione pulita');
    },
    clearAllCache: () => {
      clearBrowserCache();
      localStorage.removeItem('app_version');
      console.log('🗑️ Tutta la cache pulita');
    },
    forceReload: () => {
      console.log('🔄 Reload forzato...');
      window.location.reload(true);
    },
    forceUpdate: () => {
      console.log('🔄 Forzatura aggiornamento...');
      localStorage.removeItem('app_version');
      clearBrowserCache();
      setTimeout(() => window.location.reload(true), 500);
    },
    listResources: () => {
      const resources = {
        css: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href),
        js: Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
      };
      console.table(resources);
      return resources;
    }
  };

  console.log('🎯 Sistema cache-busting inizializzato');
  console.log('💡 API disponibili:');
  console.log('   - cacheBustingSystem.getVersion() - Ottieni versione corrente');
  console.log('   - cacheBustingSystem.getStoredVersion() - Ottieni versione salvata');
  console.log('   - cacheBustingSystem.clearCache() - Pulisci cache versione');
  console.log('   - cacheBustingSystem.clearAllCache() - Pulisci tutta la cache');
  console.log('   - cacheBustingSystem.forceUpdate() - Forza aggiornamento completo');
  console.log('   - cacheBustingSystem.listResources() - Lista tutte le risorse');
})();