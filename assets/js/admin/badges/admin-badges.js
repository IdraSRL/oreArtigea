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

// Logging dettagliato per debug admin badges
const LOG_PREFIX = '🛠️ [AdminBadges]';

class AdminBadgeManager {
  constructor() {
    this.employees = [];
    this.selectedEmployee = null;
    this.companyData = null;
    this.badgeData = {};
    this.isInitialized = false;
    
    console.log(`${LOG_PREFIX} Costruttore inizializzato`);
  }

  async init() {
    console.log(`${LOG_PREFIX} Inizio inizializzazione...`);
    
    if (this.isInitialized) {
      console.log(`${LOG_PREFIX} Già inizializzato, skip`);
      return;
    }
    
    // Verifica che gli elementi DOM necessari esistano
    const requiredElements = [
      'employeeListContainer',
      'badgePreviewContainer'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    console.log(`${LOG_PREFIX} 🔍 Controllo elementi DOM:`, {
      required: requiredElements,
      missing: missingElements,
      found: requiredElements.filter(id => document.getElementById(id))
    });
    
    if (missingElements.length > 0) {
      console.error(`${LOG_PREFIX} ❌ Elementi DOM mancanti:`, missingElements);
      this.showError('Interfaccia tesserini non completamente caricata. Riprova tra qualche secondo.');
      return;
    }
    
    try {
      console.log(`${LOG_PREFIX} 🔧 Setup event listeners...`);
      this.setupEventListeners();
      
      console.log(`${LOG_PREFIX} 👥 Caricamento dipendenti...`);
      await this.loadEmployees();
      
      console.log(`${LOG_PREFIX} 🏢 Caricamento dati azienda...`);
      await this.loadCompanyData();
      
      console.log(`${LOG_PREFIX} 🆔 Caricamento dati tesserini...`);
      await this.loadAllBadgeData();
      
      console.log(`${LOG_PREFIX} 🎨 Rendering interfaccia...`);
      this.renderEmployeeList();
      this.renderCompanyForm();
      
      this.isInitialized = true;
      console.log(`${LOG_PREFIX} ✅ Inizializzazione completata con successo`);
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore durante inizializzazione:`, error);
      this.showError('Errore inizializzazione admin tesserini: ' + error.message);
    }
  }

  setupEventListeners() {
    console.log(`${LOG_PREFIX} 🔧 Setup event listeners...`);
    
    const refreshBtn = document.getElementById('refreshBadgesBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refresh());
      console.log(`${LOG_PREFIX} ✅ Listener refresh aggiunto`);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Pulsante refresh non trovato`);
    }

    const saveCompanyBtn = document.getElementById('saveCompanyDataBtn');
    if (saveCompanyBtn) {
      saveCompanyBtn.addEventListener('click', () => this.saveCompanyData());
      console.log(`${LOG_PREFIX} ✅ Listener save company aggiunto`);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Pulsante save company non trovato`);
    }

    const saveBadgeBtn = document.getElementById('saveBadgeDataBtn');
    if (saveBadgeBtn) {
      saveBadgeBtn.addEventListener('click', () => this.saveBadgeData());
      console.log(`${LOG_PREFIX} ✅ Listener save badge aggiunto`);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Pulsante save badge non trovato`);
    }

    // Preview immagine dipendente
    const photoInput = document.getElementById('employeePhotoFile');
    if (photoInput) {
      photoInput.addEventListener('change', (e) => this.handlePhotoPreview(e));
      console.log(`${LOG_PREFIX} ✅ Listener photo preview aggiunto`);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Input photo non trovato`);
    }

    // Preview logo azienda
    const logoInput = document.getElementById('companyLogoFile');
    if (logoInput) {
      logoInput.addEventListener('change', (e) => this.handleLogoPreview(e));
      console.log(`${LOG_PREFIX} ✅ Listener logo preview aggiunto`);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Input logo non trovato`);
    }

    // Auto-aggiornamento preview quando cambiano i dati
    const formInputs = document.querySelectorAll('#badgeForm input, #badgeForm select');
    console.log(`${LOG_PREFIX} 🔍 Form inputs trovati:`, formInputs.length);
    formInputs.forEach(input => {
      input.addEventListener('input', () => this.updateBadgePreview());
    });

    const companyInputs = document.querySelectorAll('#companyForm input');
    console.log(`${LOG_PREFIX} 🔍 Company inputs trovati:`, companyInputs.length);
    companyInputs.forEach(input => {
      input.addEventListener('input', () => this.updateBadgePreview());
    });
  }

  async loadEmployees() {
    console.log(`${LOG_PREFIX} 👥 Caricamento lista dipendenti...`);
    
    try {
      this.employees = await FirestoreService.getEmployees();
      this.employees.sort((a, b) => a.name.localeCompare(b.name, 'it'));
      console.log(`${LOG_PREFIX} ✅ Dipendenti caricati:`, this.employees.length);
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore caricamento dipendenti:`, error);
      this.showError('Errore nel caricamento dei dipendenti');
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

  async loadAllBadgeData() {
    console.log(`${LOG_PREFIX} 🆔 Caricamento tutti i dati tesserini...`);
    
    try {
      const querySnapshot = await getDocs(collection(db, 'EmployeeBadges'));
      this.badgeData = {};
      
      querySnapshot.forEach((doc) => {
        this.badgeData[doc.id] = doc.data();
      });
      
      console.log(`${LOG_PREFIX} ✅ Dati tesserini caricati:`, Object.keys(this.badgeData).length);
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore caricamento dati tesserini:`, error);
    }
  }

  renderEmployeeList() {
    console.log(`${LOG_PREFIX} 🎨 Rendering lista dipendenti...`);
    
    const container = document.getElementById('employeeListContainer');
    if (!container) return;

    if (this.employees.length === 0) {
      console.warn(`${LOG_PREFIX} ⚠️ Nessun dipendente da mostrare`);
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
                 onerror="console.warn('${LOG_PREFIX} ⚠️ Errore caricamento foto lista:', this.src); this.src='../assets/img/badges/default-avatar.png';"
                 onload="console.log('${LOG_PREFIX} ✅ Foto lista caricata per ${employee.name}');">
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
    console.log(`${LOG_PREFIX} ✅ Lista dipendenti renderizzata: ${this.employees.length} elementi`);

    // Aggiungi event listeners
    container.querySelectorAll('.employee-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const employeeId = item.dataset.employeeId;
        const employeeName = item.dataset.employeeName;
        console.log(`${LOG_PREFIX} 👤 Dipendente selezionato:`, { employeeId, employeeName });
        this.selectEmployee(employeeId, employeeName);
      });
    });
  }

  selectEmployee(employeeId, employeeName) {
    console.log(`${LOG_PREFIX} 🎯 Selezione dipendente:`, { employeeId, employeeName });
    
    this.selectedEmployee = { id: employeeId, name: employeeName };
    
    // Aggiorna selezione visiva
    document.querySelectorAll('.employee-list-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`[data-employee-id="${employeeId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
      console.log(`${LOG_PREFIX} ✅ Elemento selezionato evidenziato`);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Elemento da selezionare non trovato:`, employeeId);
    }
    
    // Carica dati nel form
    this.loadEmployeeDataIntoForm();
    this.updateBadgePreview();
  }

  loadEmployeeDataIntoForm() {
    console.log(`${LOG_PREFIX} 📝 Caricamento dati nel form per:`, this.selectedEmployee);
    
    if (!this.selectedEmployee) return;
    
    const badgeInfo = this.badgeData[this.selectedEmployee.id] || {};
    const [defaultNome, defaultCognome] = this.selectedEmployee.name.split(' ');
    
    console.log(`${LOG_PREFIX} 📊 Dati badge per form:`, badgeInfo);
    
    // Popola il form con controlli di sicurezza
    const elements = {
      employeeNome: badgeInfo.nome || defaultNome || '',
      employeeCognome: badgeInfo.cognome || defaultCognome || '',
      employeeDataNascita: badgeInfo.dataNascita || '',
      employeeCodiceFiscale: badgeInfo.codiceFiscale || '',
      employeeNumeroMatricola: badgeInfo.numeroMatricola || '',
      employeePhoto: badgeInfo.foto ? badgeInfo.foto.split('/').pop() : ''
    };
    
    console.log(`${LOG_PREFIX} 📝 Elementi da popolare:`, elements);
    
    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.value = value;
        console.log(`${LOG_PREFIX} ✅ Campo ${id} popolato con:`, value);
      } else {
        console.warn(`${LOG_PREFIX} ⚠️ Elemento ${id} non trovato nel DOM`);
      }
    });
    
    // Reset file input
    const fileInput = document.getElementById('employeePhotoFile');
    if (fileInput) {
      fileInput.value = '';
      console.log(`${LOG_PREFIX} 🔄 File input resettato`);
    }
    
    // Nascondi preview se presente
    const preview = document.getElementById('photoPreview');
    if (preview) {
      preview.style.display = 'none';
      console.log(`${LOG_PREFIX} 👁️ Preview nascosto`);
    }
  }

  renderCompanyForm() {
    console.log(`${LOG_PREFIX} 🏢 Rendering form azienda...`);
    
    if (!this.companyData) {
      console.warn(`${LOG_PREFIX} ⚠️ Dati azienda non disponibili per renderCompanyForm`);
      return;
    }
    
    const companyNameEl = document.getElementById('companyName');
    const companyLogoEl = document.getElementById('companyLogo');
    
    if (companyNameEl) {
      companyNameEl.value = this.companyData.nomeAzienda || '';
      console.log(`${LOG_PREFIX} ✅ Nome azienda impostato:`, this.companyData.nomeAzienda);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Elemento companyName non trovato nel DOM`);
    }
    
    if (companyLogoEl) {
      companyLogoEl.value = this.companyData.logoAzienda ? this.companyData.logoAzienda.split('/').pop() : '';
      console.log(`${LOG_PREFIX} ✅ Logo azienda impostato:`, companyLogoEl.value);
    } else {
      console.warn(`${LOG_PREFIX} ⚠️ Elemento companyLogo non trovato nel DOM`);
    }
  }

  handlePhotoPreview(event) {
    console.log(`${LOG_PREFIX} 📸 Gestione preview foto...`);
    
    const file = event.target.files[0];
    const previewImg = document.getElementById('previewPhotoImg');
    const previewPlaceholder = document.getElementById('previewPhotoPlaceholder');
    
    console.log(`${LOG_PREFIX} 📊 Stato preview:`, {
      hasFile: !!file,
      hasPreviewImg: !!previewImg,
      hasPlaceholder: !!previewPlaceholder
    });
    
    if (file) {
      console.log(`${LOG_PREFIX} 📁 File selezionato:`, {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      if (!file.type.startsWith('image/')) {
        console.error(`${LOG_PREFIX} ❌ Tipo file non valido:`, file.type);
        this.showError('Seleziona un file immagine valido');
        event.target.value = '';
        if (previewImg) previewImg.classList.add('d-none');
        if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        console.error(`${LOG_PREFIX} ❌ File troppo grande:`, file.size);
        this.showError('L\'immagine è troppo grande. Massimo 5MB consentiti.');
        event.target.value = '';
        if (previewImg) previewImg.classList.add('d-none');
        if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log(`${LOG_PREFIX} ✅ File letto con successo, aggiorno preview`);
        if (previewImg) {
          previewImg.src = e.target.result;
          previewImg.classList.remove('d-none');
          console.log(`${LOG_PREFIX} 🖼️ Preview img src impostato`);
        }
        if (previewPlaceholder) previewPlaceholder.classList.add('d-none');
        this.updateBadgePreview();
      };
      reader.onerror = (e) => {
        console.error(`${LOG_PREFIX} ❌ Errore lettura file:`, e);
        this.showError('Errore nella lettura del file');
      };
      reader.readAsDataURL(file);
      
      // Pulisci il campo manuale
      const manualInput = document.getElementById('employeePhoto');
      if (manualInput) {
        manualInput.value = '';
        console.log(`${LOG_PREFIX} 🔄 Campo manuale pulito`);
      }
    } else {
      console.log(`${LOG_PREFIX} 🚫 Nessun file selezionato, nascondo preview`);
      if (previewImg) previewImg.classList.add('d-none');
      if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
    }
  }

  handleLogoPreview(event) {
    console.log(`${LOG_PREFIX} 🏢 Gestione preview logo...`);
    
    const file = event.target.files[0];
    const previewImg = document.getElementById('previewLogoImg');
    const previewPlaceholder = document.getElementById('previewLogoPlaceholder');
    
    if (file) {
      console.log(`${LOG_PREFIX} 📁 Logo file selezionato:`, {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      if (!file.type.startsWith('image/')) {
        console.error(`${LOG_PREFIX} ❌ Tipo logo non valido:`, file.type);
        this.showError('Seleziona un file immagine valido');
        event.target.value = '';
        if (previewImg) previewImg.classList.add('d-none');
        if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        console.error(`${LOG_PREFIX} ❌ Logo troppo grande:`, file.size);
        this.showError('L\'immagine è troppo grande. Massimo 5MB consentiti.');
        event.target.value = '';
        if (previewImg) previewImg.classList.add('d-none');
        if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log(`${LOG_PREFIX} ✅ Logo letto con successo`);
        if (previewImg) {
          previewImg.src = e.target.result;
          previewImg.classList.remove('d-none');
        }
        if (previewPlaceholder) previewPlaceholder.classList.add('d-none');
        this.updateBadgePreview();
      };
      reader.readAsDataURL(file);
      
      // Pulisci il campo manuale
      const manualInput = document.getElementById('companyLogo');
      if (manualInput) manualInput.value = '';
    } else {
      if (previewImg) previewImg.classList.add('d-none');
      if (previewPlaceholder) previewPlaceholder.classList.remove('d-none');
    }
  }

  updateBadgePreview() {
    console.log(`${LOG_PREFIX} 🔄 Aggiornamento preview tesserino...`);
    
    if (!this.selectedEmployee) return;
    
    const previewContainer = document.getElementById('badgePreviewContainer');
    if (!previewContainer) {
      console.error(`${LOG_PREFIX} ❌ Container preview non trovato`);
      return;
    }

    // Raccogli dati dal form
    const formData = this.collectFormData();
    const companyData = this.collectCompanyData();
    
    console.log(`${LOG_PREFIX} 📊 Dati per preview:`, { formData, companyData });
    
    const badgeHtml = `
      <div class="employee-badge">
        <div class="badge-header">
          <div class="d-flex align-items-center justify-content-center gap-2">
            <img src="${companyData.logoAzienda}" 
                 alt="Logo Azienda" 
                 class="company-logo"
                 onerror="console.warn('${LOG_PREFIX} ⚠️ Errore logo preview:', this.src); this.src='../assets/img/logo.png';"
                 onload="console.log('${LOG_PREFIX} ✅ Logo preview caricato');">
            <h6 class="company-name mb-0">${companyData.nomeAzienda}</h6>
          </div>
        </div>
        
        <div class="badge-body text-center">
          <img src="${formData.foto}" 
               alt="Foto ${this.selectedEmployee.name}" 
               class="employee-photo"
               onerror="console.warn('${LOG_PREFIX} ⚠️ Errore foto preview:', this.src); this.src='../assets/img/badges/default-avatar.png';"
               onload="console.log('${LOG_PREFIX} ✅ Foto preview caricata');">
          
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

    console.log(`${LOG_PREFIX} 📝 HTML preview generato, lunghezza:`, badgeHtml.length);
    previewContainer.innerHTML = badgeHtml;
    console.log(`${LOG_PREFIX} ✅ Preview aggiornato nel container`);
  }

  collectFormData() {
    console.log(`${LOG_PREFIX} 📊 Raccolta dati form...`);
    
    const photoFile = document.getElementById('employeePhotoFile').files[0];
    const photoPreview = document.getElementById('previewPhotoImg');
    
    let photoSrc = document.getElementById('employeePhoto').value;
    
    console.log(`${LOG_PREFIX} 📸 Stato foto:`, {
      hasPhotoFile: !!photoFile,
      hasPhotoPreview: !!photoPreview,
      manualPhotoSrc: photoSrc
    });
    
    // Controlli di sicurezza per gli elementi DOM
    const nomeEl = document.getElementById('employeeNome');
    const cognomeEl = document.getElementById('employeeCognome');
    const dataNascitaEl = document.getElementById('employeeDataNascita');
    const codiceFiscaleEl = document.getElementById('employeeCodiceFiscale');
    const numeroMatricolaEl = document.getElementById('employeeNumeroMatricola');
    
    if (photoFile && photoPreview) {
      photoSrc = photoPreview.src;
      console.log(`${LOG_PREFIX} 📸 Uso preview foto file`);
    } else if (photoSrc) {
      photoSrc = `../assets/img/badges/${photoSrc}`;
      console.log(`${LOG_PREFIX} 📸 Uso foto manuale:`, photoSrc);
    } else {
      photoSrc = '../assets/img/badges/default-avatar.png';
      console.log(`${LOG_PREFIX} 📸 Uso foto default`);
    }

    const formData = {
      nome: nomeEl ? nomeEl.value.trim() : '',
      cognome: cognomeEl ? cognomeEl.value.trim() : '',
      dataNascita: dataNascitaEl ? dataNascitaEl.value : '',
      codiceFiscale: codiceFiscaleEl ? codiceFiscaleEl.value.trim().toUpperCase() : '',
      numeroMatricola: numeroMatricolaEl ? numeroMatricolaEl.value.trim() : '',
      foto: photoSrc
    };
    
    console.log(`${LOG_PREFIX} 📊 Dati form raccolti:`, formData);
    return formData;
  }

  collectCompanyData() {
    console.log(`${LOG_PREFIX} 🏢 Raccolta dati azienda...`);
    
    const logoFile = document.getElementById('companyLogoFile').files[0];
    const logoPreview = document.getElementById('previewLogoImg');
    
    let logoSrc = document.getElementById('companyLogo').value;
    
    // Controllo di sicurezza per l'elemento nome azienda
    const companyNameEl = document.getElementById('companyName');
    
    if (logoFile && logoPreview) {
      logoSrc = logoPreview.src;
      console.log(`${LOG_PREFIX} 🏢 Uso preview logo file`);
    } else if (logoSrc) {
      logoSrc = `../assets/img/badges/${logoSrc}`;
      console.log(`${LOG_PREFIX} 🏢 Uso logo manuale:`, logoSrc);
    } else {
      logoSrc = '../assets/img/logo.png';
      console.log(`${LOG_PREFIX} 🏢 Uso logo default`);
    }

    const companyData = {
      nomeAzienda: companyNameEl ? companyNameEl.value.trim() : 'Artigea Srl',
      logoAzienda: logoSrc
    };
    
    console.log(`${LOG_PREFIX} 🏢 Dati azienda raccolti:`, companyData);
    return companyData;
  }

  async saveCompanyData() {
    console.log(`${LOG_PREFIX} 💾 Salvataggio dati azienda...`);
    
    const saveBtn = document.getElementById('saveCompanyDataBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.classList.add('badge-loading');

    try {
      const companyData = this.collectCompanyData();
      
      if (!companyData.nomeAzienda) {
        console.error(`${LOG_PREFIX} ❌ Nome azienda mancante`);
        this.showError('Il nome dell\'azienda è obbligatorio');
        return;
      }

      // Upload logo se necessario
      const logoFile = document.getElementById('companyLogoFile').files[0];
      if (logoFile) {
        console.log(`${LOG_PREFIX} 📤 Upload logo in corso...`);
        const uploadResult = await this.uploadBadgeImage(logoFile, 'company-logo');
        if (uploadResult.success) {
          companyData.logoAzienda = uploadResult.filePath;
          console.log(`${LOG_PREFIX} ✅ Logo caricato:`, uploadResult.filePath);
        } else {
          console.error(`${LOG_PREFIX} ❌ Errore upload logo:`, uploadResult.message);
          this.showError('Errore upload logo: ' + uploadResult.message);
          return;
        }
      }

      await setDoc(doc(db, 'Data', 'companyInfo'), {
        ...companyData,
        updatedAt: serverTimestamp()
      });

      this.companyData = companyData;
      console.log(`${LOG_PREFIX} ✅ Dati azienda salvati con successo`);
      this.showSuccess('Dati azienda salvati con successo!');
      this.updateBadgePreview();

    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore salvataggio dati azienda:`, error);
      this.showError('Errore nel salvataggio dei dati azienda');
    } finally {
      saveBtn.disabled = false;
      saveBtn.classList.remove('badge-loading');
    }
  }

  async saveBadgeData() {
    console.log(`${LOG_PREFIX} 💾 Salvataggio dati tesserino...`);
    
    if (!this.selectedEmployee) {
      console.error(`${LOG_PREFIX} ❌ Nessun dipendente selezionato`);
      this.showError('Seleziona un dipendente prima di salvare');
      return;
    }

    const saveBtn = document.getElementById('saveBadgeDataBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.classList.add('badge-loading');

    try {
      const badgeData = this.collectFormData();
      
      if (!badgeData.nome || !badgeData.cognome) {
        console.error(`${LOG_PREFIX} ❌ Dati obbligatori mancanti:`, { nome: badgeData.nome, cognome: badgeData.cognome });
        this.showError('Nome e cognome sono obbligatori');
        return;
      }

      // Upload foto se necessario
      const photoFile = document.getElementById('employeePhotoFile').files[0];
      if (photoFile) {
        console.log(`${LOG_PREFIX} 📤 Upload foto in corso...`);
        const fileId = `${this.selectedEmployee.id}-photo`;
        const uploadResult = await this.uploadBadgeImage(photoFile, fileId);
        if (uploadResult.success) {
          badgeData.foto = uploadResult.filePath;
          console.log(`${LOG_PREFIX} ✅ Foto caricata:`, uploadResult.filePath);
        } else {
          console.error(`${LOG_PREFIX} ❌ Errore upload foto:`, uploadResult.message);
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
      console.log(`${LOG_PREFIX} ✅ Tesserino salvato con successo per:`, this.selectedEmployee.name);
      this.showSuccess(`Tesserino di ${this.selectedEmployee.name} salvato con successo!`);
      this.renderEmployeeList(); // Aggiorna la lista
      this.updateBadgePreview();

    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore salvataggio tesserino:`, error);
      this.showError('Errore nel salvataggio del tesserino');
    } finally {
      saveBtn.disabled = false;
      saveBtn.classList.remove('badge-loading');
    }
  }

  async uploadBadgeImage(file, fileId) {
    console.log(`${LOG_PREFIX} 📤 Upload immagine:`, { fileName: file.name, fileId });
    
    // Determina il percorso corretto dell'API
    let apiPath;
    if (window.location.pathname.includes('/pages/')) {
      apiPath = '../api/upload-badge-image.php';
    } else {
      apiPath = 'api/upload-badge-image.php';
    }
    
    console.log(`${LOG_PREFIX} 🛤️ Percorso API determinato:`, apiPath);
    
    const formData = new FormData();
    formData.append('badgeImage', file);
    formData.append('fileId', fileId);

    try {
      // Mostra indicatore di caricamento
      this.showUploadProgress(true);
      
      console.log(`${LOG_PREFIX} 🌐 Invio richiesta upload...`);
      const response = await fetch(apiPath, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        console.error(`${LOG_PREFIX} ❌ Risposta HTTP non OK:`, response.status);
        this.showUploadProgress(false);
        return {
          success: false,
          message: `Errore server HTTP ${response.status}. Verifica che il server PHP sia configurato correttamente e che la cartella assets/img/badges/ sia scrivibile.`
        };
      }

      const responseText = await response.text();
      console.log(`${LOG_PREFIX} 📄 Risposta server ricevuta, lunghezza:`, responseText.length);
      console.log(`${LOG_PREFIX} 📄 Contenuto risposta:`, responseText.substring(0, 200));
      
      // Verifica se la risposta contiene HTML di errore PHP
      if (responseText.includes('<br />') || responseText.includes('<?php') || responseText.includes('<html>')) {
        console.error(`${LOG_PREFIX} ❌ Risposta contiene HTML di errore PHP`);
        console.error(`${LOG_PREFIX} 📄 Risposta completa:`, responseText);
        this.showUploadProgress(false);
        return {
          success: false,
          message: 'Errore del server PHP. Verifica che il file upload-badge-image.php sia presente e funzionante.'
        };
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
        console.log(`${LOG_PREFIX} ✅ Risposta JSON parsata:`, result);
      } catch (parseError) {
        console.error(`${LOG_PREFIX} ❌ Errore parsing JSON:`, parseError);
        console.error(`${LOG_PREFIX} 📄 Risposta che ha causato errore:`, responseText);
        this.showUploadProgress(false);
        return {
          success: false,
          message: 'Risposta del server non valida. Controlla i log del server PHP.'
        };
      }
      
      this.showUploadProgress(false);
      
      // Log del risultato per debug
      if (result.success) {
        console.log(`${LOG_PREFIX} ✅ Upload completato con successo:`, result);
      } else {
        console.error(`${LOG_PREFIX} ❌ Upload fallito:`, result);
      }
      
      return result;
      
    } catch (error) {
      console.error(`${LOG_PREFIX} ❌ Errore durante upload:`, error);
      this.showUploadProgress(false);
      
      // Se l'errore è di rete, potrebbe essere un problema di configurazione server
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return {
          success: false,
          message: 'Errore di connessione al server. Verifica che il server web sia avviato e che il file PHP sia accessibile.'
        };
      }
      
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
    console.log(`${LOG_PREFIX} 🔄 Refresh dati...`);
    
    const refreshBtn = document.getElementById('refreshBadgesBtn');
    if (refreshBtn) {
      const originalText = refreshBtn.innerHTML;
      refreshBtn.classList.add('badge-loading');
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

      refreshBtn.classList.remove('badge-loading');
      refreshBtn.disabled = false;
      console.log(`${LOG_PREFIX} ✅ Refresh completato`);
    }
  }

  showSuccess(message) {
    console.log(`${LOG_PREFIX} ✅ Successo:`, message);
    showToast(message, 'success');
  }

  showError(message) {
    console.error(`${LOG_PREFIX} 🚨 Errore:`, message);
    showToast(message, 'error');
  }

  showUploadProgress(show) {
    console.log(`${LOG_PREFIX} 📊 Upload progress:`, show ? 'SHOW' : 'HIDE');
    
    const containers = document.querySelectorAll('.logo-dropzone, .photo-dropzone');
    console.log(`${LOG_PREFIX} 🔍 Container upload trovati:`, containers.length);
    
    containers.forEach(container => {
      let progressEl = container.querySelector('.upload-progress');
      
      if (show && !progressEl) {
        progressEl = document.createElement('div');
        progressEl.className = 'upload-progress';
        progressEl.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: white;
          font-weight: 600;
          z-index: 10;
        `;
        progressEl.innerHTML = `
          <div class="spinner-border spinner-border-sm me-2"></div>
          <span>Caricamento...</span>
        `;
        container.appendChild(progressEl);
        console.log(`${LOG_PREFIX} ✅ Progress indicator aggiunto`);
      } else if (!show && progressEl) {
        progressEl.remove();
        console.log(`${LOG_PREFIX} 🗑️ Progress indicator rimosso`);
      }
    });
  }
}

// Istanza globale
window.adminBadgeManager = new AdminBadgeManager();

// API di debug globale per admin
window.debugAdminBadgeSystem = () => {
  const manager = window.adminBadgeManager;
  const debugInfo = {
    isInitialized: manager.isInitialized,
    employeesCount: manager.employees.length,
    selectedEmployee: manager.selectedEmployee,
    hasCompanyData: !!manager.companyData,
    badgeDataKeys: Object.keys(manager.badgeData),
    companyData: manager.companyData,
    employees: manager.employees.slice(0, 3) // Solo primi 3 per brevità
  };
  console.log(`${LOG_PREFIX} 🐛 Admin Debug Info:`, debugInfo);
  return debugInfo;
};

// Inizializza quando la tab viene attivata
document.addEventListener('DOMContentLoaded', () => {
  console.log(`${LOG_PREFIX} 📄 DOM caricato per admin badges`);
  
  const badgesTab = document.getElementById('badges-tab');
  let badgeManager = null;

  if (badgesTab) {
    console.log(`${LOG_PREFIX} 🔍 Tab badges trovata, aggiungo listener`);
    badgesTab.addEventListener('shown.bs.tab', async () => {
      console.log(`${LOG_PREFIX} 👁️ Tab badges mostrata`);
      if (!badgeManager) {
        console.log(`${LOG_PREFIX} 🚀 Prima attivazione, inizializzo manager`);
        badgeManager = window.adminBadgeManager;
        await badgeManager.init();
      } else {
        console.log(`${LOG_PREFIX} ♻️ Manager già inizializzato`);
      }
    });
  } else {
    console.warn(`${LOG_PREFIX} ⚠️ Tab badges non trovata nel DOM`);
  }
});

export { AdminBadgeManager };