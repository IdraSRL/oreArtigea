// employee-badge.js - Sistema tesserini dipendenti
import { db } from "../common/firebase-config.js";
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { AuthService } from "../auth/auth.js";
import { showToast } from "../common/utils.js";

class EmployeeBadgeManager {
  constructor() {
    this.currentUser = null;
    this.badgeData = null;
    this.companyData = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    
    this.currentUser = AuthService.getCurrentUser();
    if (!this.currentUser) {
      console.warn('Utente non autenticato per tesserino');
      return;
    }

    console.log('🆔 Inizializzazione tesserino per:', this.currentUser);
    
    await this.loadCompanyData();
    await this.loadEmployeeBadgeData();
    this.setupBadgeButton();
    
    console.log('✅ Tesserino inizializzato con successo');
    this.isInitialized = true;
  }

  async loadCompanyData() {
    try {
      const docRef = doc(db, 'Data', 'companyInfo');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        this.companyData = docSnap.data();
      } else {
        // Dati di default se non configurati
        this.companyData = {
          nomeAzienda: 'Artigea Srl',
          logoAzienda: '../assets/img/logo.png'
        };
      }
    } catch (error) {
      console.error('Errore caricamento dati azienda:', error);
      this.companyData = {
        nomeAzienda: 'Artigea Srl',
        logoAzienda: '../assets/img/logo.png'
      };
    }
  }

  async loadEmployeeBadgeData() {
    try {
      const employeeId = this.currentUser.replaceAll(' ', '_');
      console.log('🔍 Caricamento dati tesserino per ID:', employeeId);
      
      const docRef = doc(db, 'EmployeeBadges', employeeId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        this.badgeData = docSnap.data();
        console.log('✅ Dati tesserino caricati:', this.badgeData);
      } else {
        console.log('⚠️ Nessun tesserino configurato, uso dati di default');
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
      }
    } catch (error) {
      console.error('Errore caricamento dati tesserino:', error);
      console.log('🔧 Uso dati di fallback per tesserino');
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
    // Trova un posto appropriato per il pulsante tesserino
    const userDisplay = document.getElementById('userDisplay');
    
    // Verifica che l'elemento esista e non sia già stato aggiunto il pulsante
    if (userDisplay && userDisplay.parentElement && !document.getElementById('employeeBadgeBtn')) {
      const badgeBtn = document.createElement('button');
      badgeBtn.id = 'employeeBadgeBtn';
      badgeBtn.className = 'btn btn-outline-light btn-sm me-2';
      badgeBtn.innerHTML = '<i class="fas fa-id-card me-1"></i><span class="d-none d-md-inline">Tesserino</span>';
      badgeBtn.title = 'Mostra tesserino dipendente';
      badgeBtn.addEventListener('click', () => this.showBadgeModal());
      
      userDisplay.parentElement.insertBefore(badgeBtn, userDisplay);
      console.log('✅ Pulsante tesserino aggiunto alla navbar');
    } else if (!userDisplay) {
      console.warn('⚠️ Elemento userDisplay non trovato, pulsante tesserino non aggiunto');
    }
  }

  showBadgeModal() {
    console.log('🎭 Apertura modal tesserino');
    
    // Crea modal se non esiste
    let modal = document.getElementById('employeeBadgeModal');
    if (!modal) {
      console.log('🏗️ Creazione modal tesserino');
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
      
      // Aggiungi listener per cleanup
      modal.addEventListener('hidden.bs.modal', () => {
        console.log('🧹 Cleanup modal tesserino');
        // Rimuovi backdrop residui
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Reset body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
    }

    // Renderizza il tesserino
    this.renderBadge();
    
    // Mostra il modal
    try {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
      console.log('✅ Modal tesserino mostrato');
    } catch (error) {
      console.error('❌ Errore apertura modal tesserino:', error);
      showToast('Errore nell\'apertura del tesserino', 'error');
    }
  }

  renderBadge() {
    const container = document.getElementById('employeeBadgeContainer');
    if (!container) {
      console.error('❌ Container tesserino non trovato');
      return;
    }
    
    console.log('🎨 Rendering tesserino con dati:', this.badgeData);
    console.log('🏢 Dati azienda:', this.companyData);

    const badgeHtml = `
      <div class="employee-badge mx-auto">
        <div class="badge-header">
          <div class="d-flex align-items-center justify-content-center gap-2">
            <img src="${this.companyData?.logoAzienda || '../assets/img/logo.png'}" alt="Logo" class="company-logo"
                 onerror="this.src='../assets/img/logo.png'">
            <h6 class="company-name mb-0">${this.companyData?.nomeAzienda || 'Artigea Srl'}</h6>
          </div>
        </div>
        
        <div class="badge-body text-center">
          <img src="${this.badgeData?.foto || '../assets/img/badges/default-avatar.png'}" alt="Foto dipendente" class="employee-photo"
               onerror="this.src='../assets/img/badges/default-avatar.png'">
          
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

    container.innerHTML = badgeHtml;
    console.log('✅ Tesserino renderizzato con successo');
  }

  formatDate(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return dateString;
    }
  }
}

// Istanza globale
window.employeeBadgeManager = new EmployeeBadgeManager();

// Auto-inizializzazione
document.addEventListener('DOMContentLoaded', () => {
  // Inizializza solo se siamo nella pagina dipendenti
  if (window.location.pathname.includes('timeEntry.html')) {
    // Aspetta che l'autenticazione sia completata
    const initBadgeSystem = async () => {
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryInit = async () => {
        attempts++;
        
        if (AuthService.getCurrentUser()) {
          console.log('🔐 Autenticazione confermata, inizializzo tesserino');
          await window.employeeBadgeManager.init();
          return true;
        }
        
        if (attempts < maxAttempts) {
          console.log(`⏳ Tentativo ${attempts}/${maxAttempts} - Attendo autenticazione...`);
          setTimeout(tryInit, 500);
        } else {
          console.warn('⚠️ Timeout inizializzazione tesserino - autenticazione non completata');
        }
        
        return false;
      };
      
      await tryInit();
    };
    
    // Avvia l'inizializzazione
    initBadgeSystem();
  }
});

export { EmployeeBadgeManager };