// employee-badge.js - Sistema tesserini dipendenti
import { db } from "../common/firebase-config.js";
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { AuthService } from "../auth/auth.js";
import { showToast } from "../common/utils.js";

// Logging dettagliato per debug
const LOG_PREFIX = '🆔 [EmployeeBadge]';

class EmployeeBadgeManager {
  constructor() {
    this.currentUser = null;
    this.badgeData = null;
    this.companyData = null;
    this.isInitialized = false;
    this.initAttempts = 0;
    this.maxInitAttempts = 5;
    
    console.log(`${LOG_PREFIX} Costruttore inizializzato`);
  }

  async init() {
    this.initAttempts++;
    console.log(`${LOG_PREFIX} Tentativo inizializzazione #${this.initAttempts}`);
    
    if (this.isInitialized) {
      console.log(`${LOG_PREFIX} Già inizializzato, skip`);
      return;
    }
    
    if (this.initAttempts > this.maxInitAttempts) {
      console.error(`${LOG_PREFIX} Troppi tentativi di inizializzazione (${this.initAttempts})`);
      return;
    }
    
    this.currentUser = AuthService.getCurrentUser();
    console.log(`${LOG_PREFIX} Utente corrente:`, this.currentUser);
    
    if (!this.currentUser) {
      console.warn(`${LOG_PREFIX} Utente non autenticato, ritento tra 1 secondo...`);
      setTimeout(() => this.init(), 1000);
      return;
    }

    console.log(`${LOG_PREFIX} Inizializzazione per utente:`, this.currentUser);
    
    try {
      await this.loadCompanyData();
      await this.loadEmployeeBadgeData();
      this.setupBadgeButton();
      
      this.isInitialized = true;
      console.log(`${LOG_PREFIX} ✅ Inizializzazione completata con successo`);
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore durante inizializzazione:`, error);
      this.showError('Errore inizializzazione tesserino: ' + error.message);
    }
  }

  async loadCompanyData() {
    console.log(`${LOG_PREFIX} 🏢 Caricamento dati azienda...`);
    
    try {
      const docRef = doc(db, 'Data', 'companyInfo');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        this.companyData = docSnap.data();
        console.log(`${LOG_PREFIX} ✅ Dati azienda caricati:`, this.companyData);
      } else {
        console.warn(`${LOG_PREFIX} ⚠️ Documento companyInfo non trovato, uso default`);
        // Dati di default se non configurati
        this.companyData = {
          nomeAzienda: 'Artigea Srl',
          logoAzienda: '../assets/img/logo.png'
        };
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore caricamento dati azienda:`, error);
      this.companyData = {
        nomeAzienda: 'Artigea Srl',
        logoAzienda: '../assets/img/logo.png'
      };
    }
  }

  async loadEmployeeBadgeData() {
    console.log(`${LOG_PREFIX} 👤 Caricamento dati tesserino dipendente...`);
    
    try {
      const employeeId = this.currentUser.replaceAll(' ', '_');
      console.log(`${LOG_PREFIX} 🔍 ID dipendente generato:`, employeeId);
      
      const docRef = doc(db, 'EmployeeBadges', employeeId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        this.badgeData = docSnap.data();
        console.log(`${LOG_PREFIX} ✅ Dati tesserino caricati dal database:`, this.badgeData);
      } else {
        console.log(`${LOG_PREFIX} ⚠️ Nessun tesserino configurato per ${employeeId}, creo dati di default`);
        // Crea dati di base dal nome utente
        const [nome, cognome] = this.currentUser.split(' ');
        this.badgeData = {
          nome: nome || this.currentUser,
          cognome: cognome || '',
          dataNascita: '',
          codiceFiscale: '',
          numeroMatricola: '',
          foto: '../assets/img/badges/default-avatar.png'
        };
        console.log(`${LOG_PREFIX} 📝 Dati default creati:`, this.badgeData);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore caricamento dati tesserino:`, error);
      console.log(`${LOG_PREFIX} 🔧 Uso dati di fallback per tesserino`);
      const [nome, cognome] = this.currentUser.split(' ');
      this.badgeData = {
        nome: nome || this.currentUser,
        cognome: cognome || '',
        dataNascita: '',
        codiceFiscale: '',
        numeroMatricola: '',
        foto: '../assets/img/badges/default-avatar.png'
      };
    }
  }

  setupBadgeButton() {
    console.log(`${LOG_PREFIX} 🔘 Setup pulsante tesserino...`);
    
    // Trova un posto appropriato per il pulsante tesserino
    const userDisplay = document.getElementById('userDisplay');
    console.log(`${LOG_PREFIX} 🔍 Elemento userDisplay trovato:`, !!userDisplay);
    
    // Verifica che l'elemento esista e non sia già stato aggiunto il pulsante
    const existingBtn = document.getElementById('employeeBadgeBtn');
    console.log(`${LOG_PREFIX} 🔍 Pulsante esistente:`, !!existingBtn);
    
    if (userDisplay && userDisplay.parentElement && !existingBtn) {
      const badgeBtn = document.createElement('button');
      badgeBtn.id = 'employeeBadgeBtn';
      badgeBtn.className = 'btn btn-outline-light btn-sm me-2';
      badgeBtn.innerHTML = '<i class="fas fa-id-card me-1"></i><span class="d-none d-md-inline">Tesserino</span>';
      badgeBtn.title = 'Mostra tesserino dipendente';
      badgeBtn.addEventListener('click', () => this.showBadgeModal());
      
      userDisplay.parentElement.insertBefore(badgeBtn, userDisplay);
      console.log(`${LOG_PREFIX} ✅ Pulsante tesserino aggiunto alla navbar`);
    } else if (existingBtn) {
      console.log(`${LOG_PREFIX} ℹ️ Pulsante tesserino già presente`);
      // Assicurati che il listener sia attaccato
      existingBtn.onclick = () => this.showBadgeModal();
    } else if (!userDisplay) {
      console.warn(`${LOG_PREFIX} ⚠️ Elemento userDisplay non trovato, pulsante tesserino non aggiunto`);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Condizioni non soddisfatte per aggiungere pulsante`);
    }
  }

  showBadgeModal() {
    console.log(`${LOG_PREFIX} 🎭 Apertura modal tesserino...`);
    console.log(`${LOG_PREFIX} 📊 Stato dati:`, {
      hasCompanyData: !!this.companyData,
      hasBadgeData: !!this.badgeData,
      currentUser: this.currentUser
    });
    
    // Crea modal se non esiste
    let modal = document.getElementById('employeeBadgeModal');
    if (!modal) {
      console.log(`${LOG_PREFIX} 🏗️ Creazione modal tesserino...`);
      modal = document.createElement('div');
      modal.id = 'employeeBadgeModal';
      modal.className = 'modal fade badge-modal';
      modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-body">
              <div id="employeeBadgeContainer"></div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      console.log(`${LOG_PREFIX} ✅ Modal creato e aggiunto al DOM`);
      
      // Aggiungi listener per cleanup
      modal.addEventListener('hidden.bs.modal', () => {
        console.log(`${LOG_PREFIX} 🧹 Cleanup modal tesserino`);
        // Rimuovi backdrop residui
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Reset body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
    } else {
      console.log(`${LOG_PREFIX} ♻️ Modal già esistente, riutilizzo`);
    }

    // Renderizza il tesserino
    this.renderBadge();
    
    // Mostra il modal
    try {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
      console.log(`${LOG_PREFIX} ✅ Modal tesserino mostrato con successo`);
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore apertura modal tesserino:`, error);
      showToast('Errore nell\'apertura del tesserino', 'error');
    }
  }

  renderBadge() {
    console.log(`${LOG_PREFIX} 🎨 Inizio rendering tesserino...`);
    
    const container = document.getElementById('employeeBadgeContainer');
    if (!container) {
      console.error(`${LOG_PREFIX} ❌ Container tesserino non trovato nel DOM`);
      return;
    }
    
    console.log(`${LOG_PREFIX} 📊 Dati per rendering:`, {
      badgeData: this.badgeData,
      companyData: this.companyData,
      containerFound: !!container
    });

    // Validazione dati prima del rendering
    if (!this.badgeData) {
      console.error(`${LOG_PREFIX} ❌ badgeData è null/undefined`);
      container.innerHTML = '<div class="alert alert-danger">Errore: dati tesserino non disponibili</div>';
      return;
    }

    if (!this.companyData) {
      console.error(`${LOG_PREFIX} ❌ companyData è null/undefined`);
      container.innerHTML = '<div class="alert alert-danger">Errore: dati azienda non disponibili</div>';
      return;
    }

    // Prepara i percorsi delle immagini con fallback robusti
    const logoPath = this.companyData?.logoAzienda || '../assets/img/logo.png';
    const photoPath = this.badgeData?.foto || '../assets/img/badges/default-avatar.png';
    
    console.log(`${LOG_PREFIX} 🖼️ Percorsi immagini:`, {
      logo: logoPath,
      photo: photoPath
    });

    const badgeHtml = `
      <div class="employee-badge mx-auto">
        <div class="badge-header">
          <div class="d-flex align-items-center justify-content-center gap-2">
            <img src="${logoPath}" 
                 alt="Logo Azienda" 
                 class="company-logo"
                 onerror="console.error('${LOG_PREFIX} ❌ Errore caricamento logo:', this.src); this.src='../assets/img/logo.png';"
                 onload="console.log('${LOG_PREFIX} ✅ Logo caricato:', this.src);">
            <h6 class="company-name mb-0">${this.companyData?.nomeAzienda || 'Artigea Srl'}</h6>
          </div>
        </div>
        
        <div class="badge-body text-center">
          <img src="${photoPath}" 
               alt="Foto ${this.currentUser}" 
               class="employee-photo"
               onerror="console.error('${LOG_PREFIX} ❌ Errore caricamento foto dipendente:', this.src); this.src='../assets/img/badges/default-avatar.png';"
               onload="console.log('${LOG_PREFIX} ✅ Foto dipendente caricata:', this.src);">
          
          <div class="employee-name">
            ${this.badgeData?.nome || ''} ${this.badgeData?.cognome || ''}
          </div>
          
          <div class="employee-details mt-3">
            ${this.badgeData?.dataNascita ? `
            <div class="detail-row">
              <span class="detail-label">Nato il:</span>
              <span class="detail-value">${this.formatDate(this.badgeData.dataNascita)}</span>
            </div>
            ` : ''}
            
            ${this.badgeData?.codiceFiscale ? `
            <div class="detail-row">
              <span class="detail-label">C.F.:</span>
              <span class="detail-value">${this.badgeData.codiceFiscale}</span>
            </div>
            ` : ''}
            
            ${this.badgeData?.numeroMatricola ? `
            <div class="detail-row">
              <span class="detail-label">Matricola:</span>
              <span class="detail-value">${this.badgeData.numeroMatricola}</span>
            </div>
            ` : ''}
          </div>
          
          ${this.badgeData?.numeroMatricola ? `
          <div class="employee-id">
            ID: ${this.badgeData.numeroMatricola}
          </div>
          ` : ''}
        </div>
      </div>
      
      <div class="badge-action-buttons mt-4">
        <button type="button" class="badge-action-btn secondary" data-bs-dismiss="modal">
          <i class="fas fa-times"></i>
          Chiudi
        </button>
      </div>
    `;

    console.log(`${LOG_PREFIX} 📝 HTML tesserino generato, lunghezza:`, badgeHtml.length);
    container.innerHTML = badgeHtml;
    console.log(`${LOG_PREFIX} ✅ Tesserino renderizzato nel container`);
    
    // Verifica che il contenuto sia stato effettivamente inserito
    setTimeout(() => {
      const badge = container.querySelector('.employee-badge');
      console.log(`${LOG_PREFIX} 🔍 Verifica post-rendering:`, {
        badgeElement: !!badge,
        containerChildren: container.children.length,
        containerHTML: container.innerHTML.substring(0, 100) + '...'
      });
    }, 100);
  }

  formatDate(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return dateString;
    }
  }

  // Metodo per debug
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      currentUser: this.currentUser,
      hasBadgeData: !!this.badgeData,
      hasCompanyData: !!this.companyData,
      initAttempts: this.initAttempts,
      badgeData: this.badgeData,
      companyData: this.companyData
    };
  }

  showError(message) {
    console.error(`${LOG_PREFIX} 🚨 Errore:`, message);
    if (typeof showToast === 'function') {
      showToast(message, 'error');
    } else {
      console.error(`${LOG_PREFIX} ❌ showToast non disponibile, messaggio:`, message);
    }
  }
}

// Istanza globale
window.employeeBadgeManager = new EmployeeBadgeManager();

// API di debug globale
window.debugBadgeSystem = () => {
  console.log(`${LOG_PREFIX} 🐛 Debug Info:`, window.employeeBadgeManager.getDebugInfo());
  return window.employeeBadgeManager.getDebugInfo();
};

// Auto-inizializzazione
document.addEventListener('DOMContentLoaded', () => {
  console.log(`${LOG_PREFIX} 📄 DOM caricato, controllo pagina corrente...`);
  
  // Inizializza solo se siamo nella pagina dipendenti
  if (window.location.pathname.includes('timeEntry.html')) {
    console.log(`${LOG_PREFIX} ✅ Pagina timeEntry rilevata, avvio inizializzazione...`);
    
    // Aspetta che l'autenticazione sia completata
    const initBadgeSystem = async () => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryInit = async () => {
        attempts++;
        console.log(`${LOG_PREFIX} 🔄 Tentativo autenticazione ${attempts}/${maxAttempts}`);
        
        if (AuthService.getCurrentUser()) {
          console.log(`${LOG_PREFIX} 🔐 Autenticazione confermata, inizializzo tesserino`);
          await window.employeeBadgeManager.init();
          return true;
        }
        
        if (attempts < maxAttempts) {
          console.log(`${LOG_PREFIX} ⏳ Tentativo ${attempts}/${maxAttempts} - Attendo autenticazione...`);
          setTimeout(tryInit, 500);
        } else {
          console.warn(`${LOG_PREFIX} ⚠️ Timeout inizializzazione tesserino - autenticazione non completata`);
        }
        
        return false;
      };
      
      await tryInit();
    };
    
    // Avvia l'inizializzazione
    initBadgeSystem();
  } else {
    console.log(`${LOG_PREFIX} ℹ️ Non siamo nella pagina timeEntry, skip inizializzazione`);
  }
});

export { EmployeeBadgeManager };