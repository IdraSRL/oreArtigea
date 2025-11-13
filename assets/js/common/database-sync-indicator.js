/**
 * Database Sync Indicator
 * Indicatore di sincronizzazione database ottimizzato per smartphone
 */

import { db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';

export class DatabaseSyncIndicator {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncStatus = 'unknown'; // 'synced', 'syncing', 'error', 'offline'
    this.lastSyncTime = null;
    this.indicator = null;
    this.checkInterval = null;
    this.currentPage = this.detectCurrentPage();
    this.requiredData = this.getRequiredDataForPage();
    this.loadedData = {};
    this.errors = [];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    this.createIndicator();
    this.setupConnectionMonitoring();
    this.startPeriodicCheck();
    this.performInitialCheck();
    this.isInitialized = true;
  }

  detectCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('timeEntry.html')) return 'timeEntry';
    if (path.includes('admin.html')) return 'admin';
    if (path.includes('login.html')) return 'login';
    return 'other';
  }

  getRequiredDataForPage() {
    switch (this.currentPage) {
      case 'timeEntry':
        return [
          { key: 'employees', collection: 'Data', doc: 'employees', field: 'employees' },
          { key: 'appartamenti', collection: 'Data', doc: 'appartamenti', field: 'appartamenti' },
          { key: 'uffici', collection: 'Data', doc: 'uffici', field: 'uffici' },
          { key: 'bnb', collection: 'Data', doc: 'bnb', field: 'bnb' },
          { key: 'bnbNomi', collection: 'Data', doc: 'bnbNomi', field: 'bnbNomi' }
        ];
      case 'admin':
        return [
          { key: 'employees', collection: 'Data', doc: 'employees', field: 'employees' },
          { key: 'products', collection: 'Products', type: 'collection' }
        ];
      case 'login':
        return [
          { key: 'employees', collection: 'Data', doc: 'employees', field: 'employees' },
          { key: 'masterPassword', collection: 'Data', doc: 'masterPassword', field: 'password' }
        ];
      default:
        return [];
    }
  }

  createIndicator() {
    // Rimuovi indicatore esistente
    const existing = document.getElementById('dbSyncIndicator');
    if (existing) existing.remove();

    this.indicator = document.createElement('div');
    this.indicator.id = 'dbSyncIndicator';
    this.indicator.className = 'db-sync-indicator';
    this.indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1050;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      min-width: 80px;
      text-align: center;
      user-select: none;
    `;

    // Click per mostrare dettagli
    this.indicator.addEventListener('click', () => this.showDetailsModal());
    
    document.body.appendChild(this.indicator);
    this.updateIndicatorUI();
  }

  updateIndicatorUI() {
    if (!this.indicator) return;

    const statusConfig = {
      synced: {
        bg: 'linear-gradient(45deg, #10b981, #059669)',
        color: '#ffffff',
        icon: 'fas fa-check-circle',
        text: 'Sync',
        pulse: false
      },
      syncing: {
        bg: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
        color: '#ffffff',
        icon: 'fas fa-sync-alt fa-spin',
        text: 'Sync...',
        pulse: true
      },
      error: {
        bg: 'linear-gradient(45deg, #ef4444, #dc2626)',
        color: '#ffffff',
        icon: 'fas fa-exclamation-triangle',
        text: 'Errore',
        pulse: true
      },
      offline: {
        bg: 'linear-gradient(45deg, #f59e0b, #d97706)',
        color: '#ffffff',
        icon: 'fas fa-wifi-slash',
        text: 'Offline',
        pulse: false
      }
    };

    const config = statusConfig[this.syncStatus] || statusConfig.error;
    
    this.indicator.style.background = config.bg;
    this.indicator.style.color = config.color;
    this.indicator.innerHTML = `
      <i class="${config.icon}" style="margin-right: 4px;"></i>
      <span>${config.text}</span>
    `;

    // Animazione pulse per stati critici
    if (config.pulse) {
      this.indicator.style.animation = 'pulse 2s infinite';
    } else {
      this.indicator.style.animation = 'none';
    }
    
    // Log per debug
    console.log(`🔄 Indicatore aggiornato: ${this.syncStatus}`);

    // Aggiungi stili CSS se non esistono
    if (!document.getElementById('dbSyncIndicatorStyles')) {
      const style = document.createElement('style');
      style.id = 'dbSyncIndicatorStyles';
      style.textContent = `
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .db-sync-indicator:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }
        
        @media (max-width: 768px) {
          .db-sync-indicator {
            top: 8px !important;
            right: 8px !important;
            font-size: 0.7rem !important;
            padding: 6px 10px !important;
            min-width: 70px !important;
          }
        }
        
        @media (max-width: 480px) {
          .db-sync-indicator {
            top: 5px !important;
            right: 5px !important;
            font-size: 0.65rem !important;
            padding: 5px 8px !important;
            min-width: 60px !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  setupConnectionMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🟢 Connessione ripristinata');
      this.performSyncCheck();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.syncStatus = 'offline';
      this.updateIndicatorUI();
      console.log('🔴 Connessione persa');
    });
  }

  startPeriodicCheck() {
    // Check ogni 60 secondi per ridurre il carico
    this.checkInterval = setInterval(() => {
      this.performSyncCheck();
    }, 60000);

    // Check iniziale ritardato per permettere il caricamento della pagina
    setTimeout(() => {
      console.log('🔄 Avvio controllo sincronizzazione database...');
      this.performSyncCheck();
    }, 3000);
  }

  async performInitialCheck() {
    await this.performSyncCheck();
  }

  async performSyncCheck() {
    if (!this.isOnline) {
      this.syncStatus = 'offline';
      this.updateIndicatorUI();
      return;
    }

    this.syncStatus = 'syncing';
    this.updateIndicatorUI();
    this.errors = [];
    this.loadedData = {};

    try {
      // Test connessione Firebase
      await this.testFirebaseConnection();
      
      // Verifica dati richiesti per la pagina corrente
      await this.checkRequiredData();
      
      // Verifica integrità dati specifici
      await this.checkDataIntegrity();
      
      if (this.errors.length === 0) {
        this.syncStatus = 'synced';
        this.lastSyncTime = new Date();
        console.log('✅ Database sincronizzato correttamente');
      } else {
        this.syncStatus = 'error';
        console.warn('⚠️ Errori di sincronizzazione:', this.errors);
        this.showErrorNotification();
      }
      
    } catch (error) {
      console.error('❌ Errore check sincronizzazione:', error);
      this.syncStatus = 'error';
      this.errors.push(`Errore connessione: ${error.message}`);
      this.showErrorNotification();
    }

    this.updateIndicatorUI();
  }

  async testFirebaseConnection() {
    try {
      const testRef = doc(db, 'Data', 'employees');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const docSnap = await getDoc(testRef);
      clearTimeout(timeoutId);
      
      if (!docSnap.exists()) {
        throw new Error('Documento di test non trovato');
      }
      
      console.log('✅ Connessione Firebase testata con successo');
      
    } catch (error) {
      console.error('❌ Test connessione Firebase fallito:', error);
      throw new Error('Connessione Firebase fallita');
    }
  }

  async checkRequiredData() {
    const promises = this.requiredData.map(async (dataSpec) => {
      try {
        if (dataSpec.type === 'collection') {
          // Verifica collezione
          const querySnapshot = await getDocs(collection(db, dataSpec.collection));
          const data = [];
          querySnapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
          
          this.loadedData[dataSpec.key] = data;
          
          if (data.length === 0) {
            this.errors.push(`Collezione ${dataSpec.collection} vuota`);
          }
        } else {
          // Verifica documento
          const docRef = doc(db, dataSpec.collection, dataSpec.doc);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            this.errors.push(`Documento ${dataSpec.collection}/${dataSpec.doc} non trovato`);
            return;
          }
          
          const data = docSnap.data();
          const fieldData = dataSpec.field ? data[dataSpec.field] : data;
          
          this.loadedData[dataSpec.key] = fieldData;
          
          if (!fieldData || (Array.isArray(fieldData) && fieldData.length === 0)) {
            this.errors.push(`Campo ${dataSpec.field || 'data'} vuoto in ${dataSpec.collection}/${dataSpec.doc}`);
          }
        }
      } catch (error) {
        this.errors.push(`Errore caricamento ${dataSpec.key}: ${error.message}`);
      }
    });

    await Promise.all(promises);
  }

  async checkDataIntegrity() {
    // Controlli specifici per pagina
    switch (this.currentPage) {
      case 'timeEntry':
        this.checkTimeEntryIntegrity();
        break;
      case 'admin':
        this.checkAdminIntegrity();
        break;
      case 'login':
        this.checkLoginIntegrity();
        break;
    }
  }

  checkTimeEntryIntegrity() {
    // Verifica che le attività abbiano il formato corretto
    ['appartamenti', 'uffici', 'bnb'].forEach(type => {
      const activities = this.loadedData[type];
      if (Array.isArray(activities)) {
        activities.forEach((activity, index) => {
          if (typeof activity === 'string') {
            const parts = activity.split('|');
            if (parts.length !== 2 || !parts[1] || isNaN(parseInt(parts[1]))) {
              this.errors.push(`Attività ${type}[${index}] formato non valido: ${activity}`);
            }
          } else if (typeof activity === 'object') {
            if (!activity.nome || (!activity.minuti && activity.minuti !== 0)) {
              this.errors.push(`Attività ${type}[${index}] manca nome o minuti`);
            }
          }
        });
      }
    });

    // Verifica dipendenti
    const employees = this.loadedData.employees;
    if (Array.isArray(employees)) {
      employees.forEach((emp, index) => {
        const name = typeof emp === 'string' ? emp : emp.name;
        if (!name || name.trim() === '') {
          this.errors.push(`Dipendente[${index}] senza nome valido`);
        }
      });
    }

    // Verifica BnB nomi
    const bnbNomi = this.loadedData.bnbNomi;
    if (Array.isArray(bnbNomi) && bnbNomi.length === 0) {
      this.errors.push('Lista BnB vuota - i bigliettini non funzioneranno');
    }
  }

  checkAdminIntegrity() {
    // Verifica prodotti per valutazioni
    const products = this.loadedData.products;
    if (Array.isArray(products)) {
      products.forEach((product, index) => {
        if (!product.name || !product.tagMarca || !product.tagTipo) {
          this.errors.push(`Prodotto[${index}] manca dati essenziali`);
        }
      });
    }
  }

  checkLoginIntegrity() {
    const employees = this.loadedData.employees;
    if (Array.isArray(employees)) {
      const validEmployees = employees.filter(emp => {
        const name = typeof emp === 'string' ? emp : emp.name;
        const password = typeof emp === 'string' ? null : emp.password;
        return name && name.trim() !== '';
      });
      
      if (validEmployees.length === 0) {
        this.errors.push('Nessun dipendente valido trovato per il login');
      }
    }

    const masterPassword = this.loadedData.masterPassword;
    if (!masterPassword || masterPassword.trim() === '') {
      this.errors.push('Password master admin non configurata');
    }
  }

  showDetailsModal() {
    let modal = document.getElementById('dbSyncDetailsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dbSyncDetailsModal';
      modal.className = 'modal fade';
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content bg-dark text-light">
            <div class="modal-header border-secondary">
              <h5 class="modal-title">
                <i class="fas fa-database me-2"></i>Stato Sincronizzazione Database
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body" id="dbSyncDetailsBody">
              <!-- Contenuto generato dinamicamente -->
            </div>
            <div class="modal-footer border-secondary">
              <button type="button" class="btn btn-primary" onclick="dbSyncIndicator.forceCheck()">
                <i class="fas fa-sync me-1"></i>Verifica Ora
              </button>
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Chiudi</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    
    this.updateDetailsModal();
    new bootstrap.Modal(modal).show();
  }

  updateDetailsModal() {
    const body = document.getElementById('dbSyncDetailsBody');
    if (!body) return;

    const statusIcon = {
      synced: 'fas fa-check-circle text-success',
      syncing: 'fas fa-sync-alt fa-spin text-primary',
      error: 'fas fa-exclamation-triangle text-danger',
      offline: 'fas fa-wifi-slash text-warning'
    };

    const statusText = {
      synced: 'Sincronizzato',
      syncing: 'Sincronizzazione in corso...',
      error: 'Errori rilevati',
      offline: 'Offline'
    };

    let content = `
      <div class="mb-3">
        <h6 class="text-primary">Stato Generale</h6>
        <div class="d-flex align-items-center mb-2">
          <i class="${statusIcon[this.syncStatus]} me-2"></i>
          <span>${statusText[this.syncStatus]}</span>
        </div>
        <div class="small text-muted">
          Pagina: <strong>${this.currentPage}</strong><br>
          Ultimo controllo: <strong>${this.lastSyncTime ? this.lastSyncTime.toLocaleTimeString('it-IT') : 'Mai'}</strong>
        </div>
      </div>
    `;

    // Dati caricati
    if (Object.keys(this.loadedData).length > 0) {
      content += `
        <div class="mb-3">
          <h6 class="text-primary">Dati Caricati</h6>
          <div class="small">
            ${Object.entries(this.loadedData).map(([key, data]) => {
              const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
              const icon = count > 0 ? 'fas fa-check text-success' : 'fas fa-times text-danger';
              return `<div><i class="${icon} me-1"></i>${key}: ${count} elementi</div>`;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Errori
    if (this.errors.length > 0) {
      content += `
        <div class="mb-3">
          <h6 class="text-danger">Errori Rilevati (${this.errors.length})</h6>
          <div class="alert alert-danger py-2">
            <div class="small">
              ${this.errors.map(error => `<div>• ${error}</div>`).join('')}
            </div>
          </div>
        </div>
      `;
    }

    // Suggerimenti
    content += `
      <div class="alert alert-info py-2">
        <div class="small">
          <i class="fas fa-lightbulb me-1"></i>
          <strong>Suggerimenti:</strong><br>
          • Se vedi errori, ricarica la pagina<br>
          • In caso di problemi persistenti, contatta l'amministratore<br>
          • L'indicatore si aggiorna automaticamente ogni 30 secondi
        </div>
      </div>
    `;

    body.innerHTML = content;
  }

  showErrorNotification() {
    // Mostra notifica solo per errori critici
    if (this.errors.some(error => 
      error.includes('dipendenti') || 
      error.includes('attività') || 
      error.includes('connessione')
    )) {
      this.showToast(
        'Problemi di sincronizzazione rilevati. Clicca sull\'indicatore per dettagli.',
        'warning',
        5000
      );
    }
  }

  showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'sync-toast';
    toast.style.cssText = `
      position: fixed;
      top: 60px;
      right: 10px;
      z-index: 1060;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 0.8rem;
      font-weight: 500;
      max-width: 280px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideInRight 0.3s ease-out;
    `;

    const backgrounds = {
      success: 'linear-gradient(45deg, #10b981, #059669)',
      warning: 'linear-gradient(45deg, #f59e0b, #d97706)',
      error: 'linear-gradient(45deg, #ef4444, #dc2626)',
      info: 'linear-gradient(45deg, #3b82f6, #1d4ed8)'
    };

    toast.style.background = backgrounds[type] || backgrounds.info;
    toast.innerHTML = `
      <div class="d-flex align-items-start">
        <i class="fas fa-${type === 'success' ? 'check' : type === 'warning' ? 'exclamation-triangle' : type === 'error' ? 'times' : 'info'}-circle me-2 mt-1"></i>
        <div>${message}</div>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, duration);

    // Aggiungi stili per animazioni se non esistono
    if (!document.getElementById('syncToastStyles')) {
      const style = document.createElement('style');
      style.id = 'syncToastStyles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
        @media (max-width: 768px) {
          .sync-toast {
            top: 50px !important;
            right: 8px !important;
            max-width: 250px !important;
            font-size: 0.75rem !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  async forceCheck() {
    console.log('🔄 Verifica forzata sincronizzazione...');
    await this.performSyncCheck();
    this.updateDetailsModal();
  }

  // Metodi pubblici per integrazione con altre parti del sistema
  isDataLoaded(dataKey) {
    return this.loadedData[dataKey] && 
           (Array.isArray(this.loadedData[dataKey]) ? 
            this.loadedData[dataKey].length > 0 : 
            !!this.loadedData[dataKey]);
  }

  getLoadedData(dataKey) {
    return this.loadedData[dataKey];
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  getErrors() {
    return [...this.errors];
  }

  isSynced() {
    return this.syncStatus === 'synced';
  }

  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.indicator) {
      this.indicator.remove();
      this.indicator = null;
    }
    
    const modal = document.getElementById('dbSyncDetailsModal');
    if (modal) modal.remove();
    
    const styles = document.getElementById('dbSyncIndicatorStyles');
    if (styles) styles.remove();
    
    const toastStyles = document.getElementById('syncToastStyles');
    if (toastStyles) toastStyles.remove();
    
    this.isInitialized = false;
  }
}

// Istanza globale
const dbSyncIndicator = new DatabaseSyncIndicator();

// API globale
window.dbSyncIndicator = dbSyncIndicator;

// Auto-inizializzazione
document.addEventListener('DOMContentLoaded', () => {
  // Ritarda l'inizializzazione per permettere al resto della pagina di caricarsi
  setTimeout(() => {
    dbSyncIndicator.init();
  }, 2000);
});

// Cleanup quando si cambia pagina
window.addEventListener('beforeunload', () => {
  dbSyncIndicator.destroy();
});

// Export singolo per evitare duplicati
export { dbSyncIndicator };