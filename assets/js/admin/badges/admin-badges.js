// admin-badges.js - Gestione tesserini nel pannello admin
import { db } from "../../common/firebase-config.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { FirestoreService } from "../../common/firestore-service.js";
import { showToast } from "../../common/utils.js";

class AdminBadgeManager {
  constructor() {
    this.employees = [];
    this.selectedEmployee = null;
    this.companyData = null;
    this.badgeData = {};
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    
    this.setupEventListeners();
    await this.loadEmployees();
    await this.loadCompanyData();
    await this.loadAllBadgeData();
    this.renderEmployeeList();
    this.renderCompanyForm();
    this.isInitialized = true;
  }

  setupEventListeners() {
    const refreshBtn = document.getElementById('refreshBadgesBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
    }

    const saveCompanyBtn = document.getElementById('saveCompanyDataBtn');
    if (saveCompanyBtn) {
      saveCompanyBtn.addEventListener('click', () => this.saveCompanyData());
    }

    const saveBadgeBtn = document.getElementById('saveBadgeDataBtn');
    if (saveBadgeBtn) {
      saveBadgeBtn.addEventListener('click', () => this.saveBadgeData());
    }

    // Preview immagine dipendente
    const photoInput = document.getElementById('employeePhotoFile');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => this.handlePhotoPreview(e));
    }

    // Preview logo azienda
    const logoInput = document.getElementById('companyLogoFile');
    if (logoInput) {
      logoInput.addEventListener('change', (e) => this.handleLogoPreview(e));
    }

    // Auto-aggiornamento preview quando cambiano i dati
    const formInputs = document.querySelectorAll('#badgeForm input, #badgeForm select');
    formInputs.forEach(input => {
      input.addEventListener('input', () => this.updateBadgePreview());
    });

    const companyInputs = document.querySelectorAll('#companyForm input');
    companyInputs.forEach(input => {
      input.addEventListener('input', () => this.updateBadgePreview());
    });
  }

  async loadEmployees() {
    try {
      this.employees = await FirestoreService.getEmployees();
      this.employees.sort((a, b) => a.name.localeCompare(b.name, 'it'));
    } catch (error) {
      console.error('Errore caricamento dipendenti:', error);
      this.showError('Errore nel caricamento dei dipendenti');
    }
  }

  async loadCompanyData() {
    try {
      const docRef = doc(db, 'Data', 'companyInfo');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        this.companyData = docSnap.data();
      } else {
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

  async loadAllBadgeData() {
    try {
      const querySnapshot = await getDocs(collection(db, 'EmployeeBadges'));
      this.badgeData = {};
      
      querySnapshot.forEach((doc) => {
        this.badgeData[doc.id] = doc.data();
      });
    } catch (error) {
      console.error('Errore caricamento dati tesserini:', error);
    }
  }

  renderEmployeeList() {
    const container = document.getElementById('employeeListContainer');
    if (!container) return;

    if (this.employees.length === 0) {
      container.innerHTML = '<div class="alert alert-warning">Nessun dipendente trovato</div>';
      return;
    }

    const listHtml = this.employees.map(employee => {
      const employeeId = employee.name.replaceAll(' ', '_');
      const badgeInfo = this.badgeData[employeeId];
      const hasCompleteData = badgeInfo && badgeInfo.nome && badgeInfo.cognome && badgeInfo.numeroMatricola;
      
      return `
        <div class="employee-list-item" data-employee-id="${employeeId}" data-employee-name="${employee.name}">
          <div class="employee-info">
            <img src="${badgeInfo?.foto || '../assets/img/badges/default-avatar.png'}" 
                 alt="Foto ${employee.name}" class="employee-photo-small"
                 onerror="this.src='../assets/img/badges/default-avatar.png'">
            <div class="flex-grow-1">
              <div class="employee-name-small">${employee.name}</div>
              <div class="employee-id-small">
                ${badgeInfo?.numeroMatricola ? `Matricola: ${badgeInfo.numeroMatricola}` : 'Dati incompleti'}
              </div>
            </div>
            <div class="text-end">
              <i class="fas fa-${hasCompleteData ? 'check-circle text-success' : 'exclamation-triangle text-warning'}"></i>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = listHtml;

    // Aggiungi event listeners
    container.querySelectorAll('.employee-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const employeeId = item.dataset.employeeId;
        const employeeName = item.dataset.employeeName;
        this.selectEmployee(employeeId, employeeName);
      });
    });
  }

  selectEmployee(employeeId, employeeName) {
    this.selectedEmployee = { id: employeeId, name: employeeName };
    
    // Aggiorna selezione visiva
    document.querySelectorAll('.employee-list-item').forEach(item => {
      item.classList.remove('selected');
    });
    document.querySelector(`[data-employee-id="${employeeId}"]`).classList.add('selected');
    
    // Carica dati nel form
    this.loadEmployeeDataIntoForm();
    this.updateBadgePreview();
  }

  loadEmployeeDataIntoForm() {
    if (!this.selectedEmployee) return;
    
    const badgeInfo = this.badgeData[this.selectedEmployee.id] || {};
    const [defaultNome, defaultCognome] = this.selectedEmployee.name.split(' ');
    
    // Popola il form
    document.getElementById('employeeNome').value = badgeInfo.nome || defaultNome || '';
    document.getElementById('employeeCognome').value = badgeInfo.cognome || defaultCognome || '';
    document.getElementById('employeeDataNascita').value = badgeInfo.dataNascita || '';
    document.getElementById('employeeCodiceFiscale').value = badgeInfo.codiceFiscale || '';
    document.getElementById('employeeNumeroMatricola').value = badgeInfo.numeroMatricola || '';
    document.getElementById('employeePhoto').value = badgeInfo.foto ? badgeInfo.foto.split('/').pop() : '';
    
    // Reset file input
    const fileInput = document.getElementById('employeePhotoFile');
    if (fileInput) fileInput.value = '';
    
    // Nascondi preview se presente
    const preview = document.getElementById('photoPreview');
    if (preview) preview.style.display = 'none';
  }

  renderCompanyForm() {
    if (!this.companyData) return;
    
    document.getElementById('companyName').value = this.companyData.nomeAzienda || '';
    document.getElementById('companyLogo').value = this.companyData.logoAzienda ? this.companyData.logoAzienda.split('/').pop() : '';
  }

  handlePhotoPreview(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('photoPreview');
    const previewImg = document.getElementById('previewPhotoImg');
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.showError('Seleziona un file immagine valido');
        event.target.value = '';
        preview.style.display = 'none';
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        this.showError('L\'immagine è troppo grande. Massimo 5MB consentiti.');
        event.target.value = '';
        preview.style.display = 'none';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
        this.updateBadgePreview();
      };
      reader.readAsDataURL(file);
      
      // Pulisci il campo manuale
      document.getElementById('employeePhoto').value = '';
    } else {
      preview.style.display = 'none';
    }
  }

  handleLogoPreview(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('logoPreview');
    const previewImg = document.getElementById('previewLogoImg');
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.showError('Seleziona un file immagine valido');
        event.target.value = '';
        preview.style.display = 'none';
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        this.showError('L\'immagine è troppo grande. Massimo 5MB consentiti.');
        event.target.value = '';
        preview.style.display = 'none';
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        preview.style.display = 'block';
        this.updateBadgePreview();
      };
      reader.readAsDataURL(file);
      
      // Pulisci il campo manuale
      document.getElementById('companyLogo').value = '';
    } else {
      preview.style.display = 'none';
    }
  }

  updateBadgePreview() {
    if (!this.selectedEmployee) return;
    
    const previewContainer = document.getElementById('badgePreviewContainer');
    if (!previewContainer) return;

    // Raccogli dati dal form
    const formData = this.collectFormData();
    const companyData = this.collectCompanyData();
    
    const badgeHtml = `
      <div class="employee-badge">
        <div class="badge-header">
          <div class="d-flex align-items-center justify-content-center gap-2">
            <img src="${companyData.logoAzienda}" alt="Logo" class="company-logo"
                 onerror="this.src='../assets/img/logo.png'">
            <h6 class="company-name mb-0">${companyData.nomeAzienda}</h6>
          </div>
        </div>
        
        <div class="badge-body text-center">
          <img src="${formData.foto}" alt="Foto dipendente" class="employee-photo"
               onerror="this.src='../assets/img/badges/default-avatar.png'">
          
          <div class="employee-name">
            ${formData.nome} ${formData.cognome}
          </div>
          
          <div class="employee-details mt-3">
            ${formData.dataNascita ? `
            <div class="detail-row">
              <span class="detail-label">Nato il:</span>
              <span class="detail-value">${this.formatDate(formData.dataNascita)}</span>
            </div>
            ` : ''}
            
            ${formData.codiceFiscale ? `
            <div class="detail-row">
              <span class="detail-label">C.F.:</span>
              <span class="detail-value">${formData.codiceFiscale}</span>
            </div>
            ` : ''}
            
            ${formData.numeroMatricola ? `
            <div class="detail-row">
              <span class="detail-label">Matricola:</span>
              <span class="detail-value">${formData.numeroMatricola}</span>
            </div>
            ` : ''}
          </div>
          
          ${formData.numeroMatricola ? `
          <div class="employee-id">
            ID: ${formData.numeroMatricola}
          </div>
          ` : ''}
        </div>
      </div>
    `;

    previewContainer.innerHTML = badgeHtml;
  }

  collectFormData() {
    const photoFile = document.getElementById('employeePhotoFile').files[0];
    const photoPreview = document.getElementById('previewPhotoImg');
    
    let photoSrc = document.getElementById('employeePhoto').value;
    if (photoFile && photoPreview) {
      photoSrc = photoPreview.src;
    } else if (photoSrc) {
      photoSrc = `../assets/img/badges/${photoSrc}`;
    } else {
      photoSrc = '../assets/img/badges/default-avatar.png';
    }

    return {
      nome: document.getElementById('employeeNome').value.trim(),
      cognome: document.getElementById('employeeCognome').value.trim(),
      dataNascita: document.getElementById('employeeDataNascita').value,
      codiceFiscale: document.getElementById('employeeCodiceFiscale').value.trim().toUpperCase(),
      numeroMatricola: document.getElementById('employeeNumeroMatricola').value.trim(),
      foto: photoSrc
    };
  }

  collectCompanyData() {
    const logoFile = document.getElementById('companyLogoFile').files[0];
    const logoPreview = document.getElementById('previewLogoImg');
    
    let logoSrc = document.getElementById('companyLogo').value;
    if (logoFile && logoPreview) {
      logoSrc = logoPreview.src;
    } else if (logoSrc) {
      logoSrc = `../assets/img/badges/${logoSrc}`;
    } else {
      logoSrc = '../assets/img/logo.png';
    }

    return {
      nomeAzienda: document.getElementById('companyName').value.trim(),
      logoAzienda: logoSrc
    };
  }

  async saveCompanyData() {
    const saveBtn = document.getElementById('saveCompanyDataBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';

    try {
      const companyData = this.collectCompanyData();
      
      if (!companyData.nomeAzienda) {
        this.showError('Il nome dell\'azienda è obbligatorio');
        return;
      }

      // Upload logo se necessario
      const logoFile = document.getElementById('companyLogoFile').files[0];
      if (logoFile) {
        const uploadResult = await this.uploadBadgeImage(logoFile, 'company-logo');
        if (uploadResult.success) {
          companyData.logoAzienda = uploadResult.filePath;
        } else {
          this.showError('Errore upload logo: ' + uploadResult.message);
          return;
        }
      }

      await setDoc(doc(db, 'Data', 'companyInfo'), {
        ...companyData,
        updatedAt: serverTimestamp()
      });

      this.companyData = companyData;
      this.showSuccess('Dati azienda salvati con successo!');
      this.updateBadgePreview();

    } catch (error) {
      console.error('Errore salvataggio dati azienda:', error);
      this.showError('Errore nel salvataggio dei dati azienda');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }

  async saveBadgeData() {
    if (!this.selectedEmployee) {
      this.showError('Seleziona un dipendente prima di salvare');
      return;
    }

    const saveBtn = document.getElementById('saveBadgeDataBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Salvando...';

    try {
      const badgeData = this.collectFormData();
      
      if (!badgeData.nome || !badgeData.cognome) {
        this.showError('Nome e cognome sono obbligatori');
        return;
      }

      // Upload foto se necessario
      const photoFile = document.getElementById('employeePhotoFile').files[0];
      if (photoFile) {
        const fileId = `${this.selectedEmployee.id}-photo`;
        const uploadResult = await this.uploadBadgeImage(photoFile, fileId);
        if (uploadResult.success) {
          badgeData.foto = uploadResult.filePath;
        } else {
          this.showError('Errore upload foto: ' + uploadResult.message);
          return;
        }
      }

      await setDoc(doc(db, 'EmployeeBadges', this.selectedEmployee.id), {
        ...badgeData,
        employeeName: this.selectedEmployee.name,
        updatedAt: serverTimestamp()
      });

      this.badgeData[this.selectedEmployee.id] = badgeData;
      this.showSuccess(`Tesserino di ${this.selectedEmployee.name} salvato con successo!`);
      this.renderEmployeeList(); // Aggiorna la lista
      this.updateBadgePreview();

    } catch (error) {
      console.error('Errore salvataggio tesserino:', error);
      this.showError('Errore nel salvataggio del tesserino');
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }

  async uploadBadgeImage(file, fileId) {
    const apiPath = '../api/upload-badge-image.php';
    const formData = new FormData();
    formData.append('badgeImage', file);
    formData.append('fileId', fileId);

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Errore server HTTP ${response.status}`
        };
      }

      const responseText = await response.text();
      
      if (responseText.includes('<br />') || responseText.includes('<?php')) {
        return {
          success: false,
          message: 'Errore del server PHP'
        };
      }
      
      const result = JSON.parse(responseText);
      return result;
      
    } catch (error) {
      return {
        success: false,
        message: `Errore durante l'upload: ${error.message}`
      };
    }
  }

  formatDate(dateString) {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('it-IT');
    } catch {
      return dateString;
    }
  }

  async refresh() {
    const refreshBtn = document.getElementById('refreshBadgesBtn');
    if (refreshBtn) {
      const originalText = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Aggiornamento...';
      refreshBtn.disabled = true;

      await this.loadEmployees();
      await this.loadCompanyData();
      await this.loadAllBadgeData();
      this.renderEmployeeList();
      this.renderCompanyForm();
      
      if (this.selectedEmployee) {
        this.loadEmployeeDataIntoForm();
        this.updateBadgePreview();
      }

      refreshBtn.innerHTML = originalText;
      refreshBtn.disabled = false;
    }
  }

  showSuccess(message) {
    showToast(message, 'success');
  }

  showError(message) {
    showToast(message, 'error');
  }
}

// Istanza globale
window.adminBadgeManager = new AdminBadgeManager();

// Inizializza quando la tab viene attivata
document.addEventListener('DOMContentLoaded', () => {
  const badgesTab = document.getElementById('badges-tab');
  let badgeManager = null;

  if (badgesTab) {
    badgesTab.addEventListener('shown.bs.tab', async () => {
      if (!badgeManager) {
        badgeManager = window.adminBadgeManager;
        await badgeManager.init();
      }
    });
  }
});

export { AdminBadgeManager };