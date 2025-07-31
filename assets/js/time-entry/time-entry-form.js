// time-entry-form.js

import { AuthService } from '../auth/auth.js';
import { TimeEntryService } from './time-entry-core.js';
import { FirestoreService } from '../common/firestore-service.js';
import {
  calculateTotalMinutes,
  formatDecimalHours
} from '../common/time-utilis.js';

// raccoglie i dati da ogni .activity-group
function collectActivitiesFromForm() {
  const out = [];
  document.querySelectorAll('.activity-group').forEach(group => {
    const idx = group.dataset.index;
    const tipo = group.dataset.type;
    const nameEl  = document.querySelector(`[name="activityName${idx}"]`);
    const minEl   = document.querySelector(`[name="minutes${idx}"]`);
    const pplEl   = document.querySelector(`[name="people${idx}"]`);
    const mulEl   = document.querySelector(`[name="multiplier${idx}"]`);
    if (!nameEl?.value || !minEl?.value) return;
    out.push({
      type:       tipo,
      name:       nameEl.value,
      minutes:    minEl.value,
      people:     pplEl?.value || 1,
      multiplier: mulEl?.value || 1
    });
  });
  console.log('🎯 activities:', out);
  return out;
}

function formatISO(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
}

// Funzione per mostrare popup di conferma cambio persone
function showPeopleChangeConfirmation(selectElement, originalValue) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content bg-dark text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title text-warning">
              <i class="fas fa-exclamation-triangle me-2"></i>Conferma Modifica
            </h5>
          </div>
          <div class="modal-body">
            <p class="mb-3">Stai modificando il numero di persone da <strong>${originalValue}</strong> a <strong>${selectElement.value}</strong>.</p>
            <p class="text-info small">
              <i class="fas fa-info-circle me-1"></i>
              Questa modifica influenzerà il calcolo delle ore effettive per questa attività.
            </p>
          </div>
          <div class="modal-footer border-secondary">
            <button type="button" class="btn btn-secondary" data-action="cancel">
              <i class="fas fa-times me-1"></i>Annulla
            </button>
            <button type="button" class="btn btn-warning" data-action="confirm">
              <i class="fas fa-check me-1"></i>Conferma
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const bootstrapModal = new bootstrap.Modal(modal);
    
    modal.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action === 'confirm') {
        resolve(true);
      } else if (action === 'cancel') {
        selectElement.value = originalValue;
        resolve(false);
      }
      bootstrapModal.hide();
      setTimeout(() => modal.remove(), 300);
    });
    
    bootstrapModal.show();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Verifica che l'utente sia autenticato: altrimenti rimanda a login.html
  if (!AuthService.checkAuth()) {
    window.location.href = 'login.html';
    return;
  }

  // Elementi DOM principali
  const username = AuthService.getCurrentUser();
  const userDisplay = document.getElementById('userDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const timeEntryForm = document.getElementById('timeEntryForm');
  const dateInput = document.getElementById('date');
  const restDayCheckbox = document.getElementById('restDay');
  const statusOptions = document.getElementById('statusOptions');
  const activitiesContainer = document.getElementById('activitiesContainer');
  const activityButtons = document.getElementById('activityButtons');
  const messageEl = document.getElementById('message');
  const recentActivities = document.getElementById('recentActivities');

  // Mostra il nome utente
  userDisplay.textContent = username;

  // Inizializza il date picker (visuale e nascosto)
  initializeDatePicker();

  // Configura i pulsanti di aggiunta attività (Uffici, Appartamenti, BnB, PST)
  await setupActivityButtons();

  // Event listeners globali
  logoutBtn.addEventListener('click', () => AuthService.logout());
  timeEntryForm.addEventListener('submit', handleFormSubmit);
  restDayCheckbox.addEventListener('change', toggleActivityFields);
  document.querySelectorAll('input[name="dayStatus"]').forEach(radio => {
    radio.addEventListener('change', toggleActivityFields);
  });

  // Carica le attività del giorno corrente
  loadActivitiesForDate(dateInput.value);

  function initializeDatePicker() {
    const today = new Date();
    dateInput.value = formatISO(today);
    loadActivitiesForDate(dateInput.value);
    dateInput.addEventListener('change', (e) => {
      loadActivitiesForDate(e.target.value);
    });
  }

  async function setupActivityButtons() {
    // Carica le categorie dinamicamente
    await TimeEntryService.loadCategories();
    
    const icons = {
      'uffici': 'fas fa-building',
      'appartamenti': 'fas fa-home',
      'bnb': 'fas fa-bed',
      'pst': 'fas fa-tools'
    };
    
    // Icone di fallback per categorie personalizzate
    const fallbackIcons = ['fas fa-briefcase', 'fas fa-cog', 'fas fa-wrench', 'fas fa-clipboard-list'];
    let iconIndex = 0;

    Object.entries(TimeEntryService.activityTypes).forEach(([typeId, typeData]) => {
      const icon = icons[typeId] || fallbackIcons[iconIndex % fallbackIcons.length];
      iconIndex++;
      
      const btnHtml = `
        <div class="col-6 col-lg-3 mb-2">
          <button type="button" class="btn w-100 btn-activity" id="add${typeId}Btn"
            style="background-color: ${typeData.color}; color: white; min-height: 60px;">
            <i class="${icon} d-block mb-1" style="font-size: 1.3rem;"></i>
            <span class="small">${typeData.name}</span>
          </button>
        </div>
      `;
      activityButtons.insertAdjacentHTML('beforeend', btnHtml);
      document.getElementById(`add${typeId}Btn`).addEventListener('click', () => addActivity(typeId));
    });
  }

  function toggleActivityFields() {
    const isRestDay = restDayCheckbox.checked;
    const dayStatus = document.querySelector('input[name="dayStatus"]:checked')?.value; // 'normal', 'vacation', 'sick'
    const disableActivities = isRestDay || dayStatus === 'vacation' || dayStatus === 'sick';

    statusOptions.style.display = isRestDay ? 'none' : 'block';
    activitiesContainer.style.display = disableActivities ? 'none' : 'block';
    activityButtons.style.display = disableActivities ? 'none' : 'flex';
  }

  async function addActivity(type) {
    const idx = activitiesContainer.querySelectorAll('.activity-group').length;
    const { color } = TimeEntryService.activityTypes[type];
    let html;
    if (type === 'pst') {
      html = createPSTActivityHtml(idx, color);
    } else {
      html = await createStandardActivityHtml(type, idx, color);
    }
    activitiesContainer.insertAdjacentHTML('beforeend', html);
    
    // Event listener per conferma cambio persone
    if (type !== 'pst') {
      const peopleSelect = document.querySelector(`[name="people${idx}"]`);
      if (peopleSelect) {
        let originalValue = peopleSelect.value;
        peopleSelect.addEventListener('change', async (e) => {
          if (e.target.value !== originalValue) {
            const confirmed = await showPeopleChangeConfirmation(e.target, originalValue);
            if (confirmed) {
              originalValue = e.target.value;
            }
          }
        });
      }
    }
  }

  function createPSTActivityHtml(index, color) {
    return `
      <div class="activity-group mb-3 position-relative" id="activity${index}" data-type="pst" data-index="${index}">
        <div class="card bg-dark border-2" style="border-color: ${color} !important;">
          <div class="card-header text-white d-flex justify-content-between align-items-center" style="background-color: ${color};">
            <h6 class="mb-0">
              <i class="fas fa-tools me-2"></i>PST
            </h6>
            <button type="button" class="btn btn-sm btn-outline-light delete-btn"
                    onclick="document.getElementById('activity${index}').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="card-body p-3">
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label small fw-bold">
                  <i class="fas fa-edit me-1"></i>Descrizione
                </label>
                <input type="text" class="form-control form-control-sm bg-secondary text-light border-0" 
                       name="activityName${index}" placeholder="Descrizione PST" required>
              </div>
              <div class="col-12">
                <label class="form-label small fw-bold">
                  <i class="fas fa-clock me-1"></i>Minuti
                </label>
                <input type="number" class="form-control form-control-sm bg-secondary text-light border-0" 
                       name="minutes${index}" placeholder="Minuti" required min="1" max="480">
              </div>
            </div>
            <input type="hidden" name="people${index}" value="1">
            <input type="hidden" name="multiplier${index}" value="1">
          </div>
        </div>
      </div>
    `;
  }

  async function createStandardActivityHtml(type, index, color) {
    console.log(`🖌 createStandardActivityHtml: tipo=${type}, idx=${index}`);
    const activities = await TimeEntryService.getActivitiesForType(type);
    console.log(`🎨 attività recuperate per ${type}:`, activities);

    if (!activities.length) {
      console.warn(`Nessuna attività trovata per: ${type}`);
    }
    
    const optionsHtml = activities
      .map(a => `<option value="${a.name}" data-minutes="${a.minutes}">${a.name}</option>`)
      .join('');
    
    const typeData = TimeEntryService.activityTypes[type];
    const typeIcons = {
      'uffici': 'fas fa-building',
      'appartamenti': 'fas fa-home',
      'bnb': 'fas fa-bed',
      'pst': 'fas fa-tools'
    };
    
    const fallbackIcons = ['fas fa-briefcase', 'fas fa-cog', 'fas fa-wrench', 'fas fa-clipboard-list'];
    const icon = typeIcons[type] || fallbackIcons[Math.floor(Math.random() * fallbackIcons.length)];
    
    // Il moltiplicatore è disponibile solo per BnB (mantenendo la logica originale)
    const multiplierHtml = type === 'bnb' || (typeData && typeData.name.toLowerCase().includes('bnb'))
      ? `<div class="col-6 mb-3">
         <label class="form-label small fw-bold">
           <i class="fas fa-times me-1"></i>Moltiplicatore
         </label>
         <select name="multiplier${index}" class="form-select form-select-sm bg-secondary text-light border-0" required>
           ${[...Array(10)].map((_, n) => `<option value="${n + 1}">${n + 1}</option>`).join('')}
         </select>
       </div>`
      : `<input type="hidden" name="multiplier${index}" value="1">`;

    return `
    <div class="activity-group mb-3 position-relative" data-type="${type}" data-index="${index}">
      <div class="card bg-dark border-2" style="border-color: ${color} !important;">
        <div class="card-header text-white d-flex justify-content-between align-items-center" style="background-color: ${color};">
          <h6 class="mb-0">
            <i class="${icon} me-2"></i>${typeData ? typeData.name : type.charAt(0).toUpperCase() + type.slice(1)}
          </h6>
          <button type="button" class="btn btn-sm btn-outline-light"
                  onclick="this.closest('.activity-group').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="card-body p-3">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label small fw-bold">
                <i class="fas fa-list me-1"></i>Attività
              </label>
              <select name="activityName${index}" class="form-select form-select-sm bg-secondary text-light border-0"
                      onchange="updateMinutes(this,${index})" required>
                <option value="">Seleziona attività</option>
                ${optionsHtml}
              </select>
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">
                <i class="fas fa-clock me-1"></i>Minuti
              </label>
              <input type="number" name="minutes${index}" 
                     class="form-control form-control-sm bg-secondary text-light border-0" 
                     min="1" required readonly>
            </div>
            <div class="col-6">
              <label class="form-label small fw-bold">
                <i class="fas fa-users me-1"></i>Persone
              </label>
              <select name="people${index}" class="form-select form-select-sm bg-secondary text-light border-0" required>
                <option value="1">1</option>
                <option value="2" selected>2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            ${multiplierHtml}
          </div>
        </div>
      </div>
    </div>`;
  }

  window.updateMinutes = function (selectElement, index) {
    const mins = selectElement.selectedOptions[0]?.dataset.minutes;
    const input = document.querySelector(`[name="minutes${index}"]`);
    input.value = mins || '';
  };

  async function handleFormSubmit(e) {
    e.preventDefault();
    
    const isRestDay = restDayCheckbox.checked;
    const date = dateInput.value;
    const dayStatus = document.querySelector('input[name="dayStatus"]:checked')?.value;
    
    let status = {
      riposo: isRestDay,
      ferie: dayStatus === 'vacation',
      malattia: dayStatus === 'sick'
    };

    const activities = [];

    // Se non è riposo/ferie/malattia, raccogli le attività
    if (!isRestDay && dayStatus === 'normal') {
      const activityGroups = document.querySelectorAll('.activity-group');
      
      if (activityGroups.length === 0) {
        showMessage('Aggiungi almeno un\'attività', 'alert-danger');
        return;
      }

      activityGroups.forEach(group => {
        const idx = group.dataset.index;
        const type = group.dataset.type;
        
        const nameEl = document.querySelector(`[name="activityName${idx}"]`);
        const minEl = document.querySelector(`[name="minutes${idx}"]`);
        const pplEl = document.querySelector(`[name="people${idx}"]`);
        const mulEl = document.querySelector(`[name="multiplier${idx}"]`);
        
        if (nameEl?.value && minEl?.value) {
          activities.push({
            type: type,
            name: nameEl.value,
            minutes: minEl.value,
            people: pplEl?.value || 1,
            multiplier: mulEl?.value || 1
          });
        }
      });

      if (activities.length === 0) {
        showMessage('Compila correttamente almeno un\'attività', 'alert-danger');
        return;
      }
    }

    try {
      showProgress('Salvataggio in corso...');
      const result = await TimeEntryService.saveTimeEntry(username, date, activities, status);
      
      if (result.success) {
        showMessage('Registrazione completata con successo!', 'alert-success');
        resetForm();
        loadActivitiesForDate(date);
        // Emetti evento per aggiornare altre sezioni
        window.dispatchEvent(new Event('timeEntrySaved'));
      } else {
        showMessage('Errore durante il salvataggio', 'alert-danger');
      }
    } catch (error) {
      console.error('❌ handleFormSubmit error:', error);
      showMessage('Errore durante il salvataggio', 'alert-danger');
    } finally {
      hideProgress();
    }
  }

  async function loadActivitiesForDate(date) {
    try {
      const result = await FirestoreService.getEmployeeDay(username, date);
      if (result.success) {
        displayActivities(result.data);
      } else {
        showMessage('Errore durante il caricamento delle attività', 'alert-danger');
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('Errore durante il caricamento delle attività', 'alert-danger');
    }
  }

  function displayActivities(data) {
    if (!data) {
      recentActivities.innerHTML = '<p class="text-muted">Nessuna attività registrata per questa data.</p>';
      return;
    }

    let html = '';

    // Status alerts
    if (data.riposo) {
      html += '<div class="alert alert-warning"><i class="fas fa-bed me-2"></i>Giorno di riposo</div>';
    } else if (data.ferie) {
      html += '<div class="alert alert-info"><i class="fas fa-umbrella-beach me-2"></i>Giorno di ferie</div>';
    } else if (data.malattia) {
      html += '<div class="alert alert-danger"><i class="fas fa-thermometer me-2"></i>Giorno di malattia</div>';
    }

    // Activities table
    if (data.attività && data.attività.length > 0) {
      html += '<div class="table-responsive"><table class="table table-striped table-sm">';
      html += '<thead><tr><th class="small">Attività</th><th class="small">Min</th><th class="small">Pers</th><th class="small">Molt</th><th class="small">Min Eff</th></tr></thead><tbody>';

      data.attività.forEach(activity => {
        const minutes = parseInt(activity.minuti, 10) || 0;
        const people = parseInt(activity.persone, 10) || 1;
        const multiplier = parseInt(activity.moltiplicatore, 10) || 1;
        const effectiveMinutes = Math.round((minutes * multiplier) / people);

        html += `
          <tr>
            <td class="small">${activity.nome}</td>
            <td class="small">${minutes}</td>
            <td class="small">${people}</td>
            <td class="small">${multiplier}</td>
            <td class="small fw-bold">${effectiveMinutes}</td>
          </tr>
        `;
      });

      html += '</tbody></table></div>';

      // Total calculation
      const flatActivities = data.attività.map(a => ({
        minutes: parseInt(a.minuti, 10) || 0,
        multiplier: parseInt(a.moltiplicatore, 10) || 1,
        people: parseInt(a.persone, 10) || 1
      }));
      
      const rawMinutes = calculateTotalMinutes(flatActivities);
      const decHours = formatDecimalHours(rawMinutes, 2);
      const formatted = decHours.toLocaleString('it-IT', { minimumFractionDigits: 2 });

      html += `
        <div class="alert alert-success mt-3">
          <i class="fas fa-clock me-2"></i>Totale ore: <strong>${formatted}</strong>
        </div>
      `;
    } else if (!data.riposo && !data.ferie && !data.malattia) {
      html += '<p class="text-muted">Nessuna attività registrata per questa data.</p>';
    }

    recentActivities.innerHTML = html;
  }

  function resetForm() {
    const activityGroups = document.querySelectorAll('.activity-group');
    activityGroups.forEach(group => group.remove());
    
    restDayCheckbox.checked = false;
    document.getElementById('normalDay').checked = true;
    toggleActivityFields();
  }

  /**
   * Mostra messaggio temporaneo
   */
  function showMessage(text, type) {
    messageEl.innerHTML = `<i class="fas fa-info-circle me-2"></i>${text}`;
    messageEl.className = `alert mt-3 ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => messageEl.style.display = 'none', 4000);
  }

  /**
   * Mostra overlay di caricamento
   */
  function showProgress(text) {
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

  /**
   * Nasconde overlay di caricamento
   */
  function hideProgress() {
    const progressContainer = document.getElementById('progressContainer');
    if (progressContainer) {
      progressContainer.remove();
    }
  }

  /**
   * Formatta data in ISO
   */
  function formatISO(date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${y}-${m}-${d}`;
  }
});