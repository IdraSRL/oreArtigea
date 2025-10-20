// time-entry.js - Sistema completo di gestione ore
import { AuthService } from '../auth/auth.js';
import { FirestoreService } from '../common/firestore-service.js';
import { formatISO, showToast, showProgress, hideProgress } from '../common/utils.js';
import { calculateTotalMinutes, formatDecimalHours } from '../common/time-utilis.js';
import { ACTIVITY_TYPES } from '../shared/activity-types.js';

export const TimeEntryService = {
  /**
   * Recupera le attività disponibili per un tipo specifico
   */
  async getActivitiesForType(type) {
    try {
      const activities = await FirestoreService.getActivitiesByType(type);
      return activities.map(item => {
        if (typeof item === 'string' && item.includes('|')) {
          const [name, minutes] = item.split('|');
          return { name: name.trim(), minutes: parseInt(minutes, 10) || 0 };
        } else if (item && typeof item === 'object') {
          return {
            name: item.nome || item.name || '',
            minutes: item.minuti || item.minutes || 0
          };
        }
        return null;
      }).filter(Boolean);
    } catch (error) {
      console.error(`Errore caricamento attività ${type}:`, error);
      return [];
    }
  },

  /**
   * Salva le ore lavorate per un dipendente
   */
  async saveTimeEntry(username, date, activities, status) {
    try {
      const cleanActivities = activities.map(a => ({
        tipo: a.type || null,
        nome: a.name || null,
        minuti: Number(a.minutes) || 0,
        persone: Number(a.people) || 1,
        moltiplicatore: Number(a.multiplier) || 1
      }));

      // Carica dati esistenti per merge
      const existing = await FirestoreService.getEmployeeDay(username, date);
      const prevData = existing.success ? existing.data : {};
      const prevActivities = Array.isArray(prevData.attività) ? prevData.attività : [];

      // Merge attività evitando duplicati
      const activityMap = {};
      prevActivities.forEach(act => {
        const key = `${act.nome}|${act.tipo}`;
        activityMap[key] = act;
      });

      cleanActivities.forEach(act => {
        const key = `${act.nome}|${act.tipo}`;
        activityMap[key] = act;
      });

      const finalActivities = Object.values(activityMap);

      const payload = {
        data: date,
        attività: finalActivities,
        riposo: status.riposo ?? prevData.riposo ?? false,
        ferie: status.ferie ?? prevData.ferie ?? false,
        malattia: status.malattia ?? prevData.malattia ?? false,
        timestamp: new Date().toISOString()
      };

      return await FirestoreService.saveEmployeeDay(username, date, payload);
    } catch (error) {
      console.error('Errore saveTimeEntry:', error);
      return { success: false, error };
    }
  }
};

// Variabili globali per il form
let currentDayData = null;
let isFormInitialized = false;

/**
 * Inizializzazione principale
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Verifica autenticazione
  if (!AuthService.checkAuth()) {
    window.location.href = 'login.html';
    return;
  }

  await initializeTimeEntryForm();
});

/**
 * Inizializza il form di registrazione ore
 */
async function initializeTimeEntryForm() {
  if (isFormInitialized) return;
  
  const username = AuthService.getCurrentUser();
  const userDisplay = document.getElementById('userDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const timeEntryForm = document.getElementById('timeEntryForm');
  const dateInput = document.getElementById('date');
  const restDayCheckbox = document.getElementById('restDay');

  // Mostra il nome utente
  if (userDisplay) userDisplay.textContent = username;

  // Inizializza componenti
  initializeDatePicker();
  await setupActivityButtons();
  setupMonthlyReport();

  // Event listeners
  if (logoutBtn) logoutBtn.addEventListener('click', () => AuthService.logout());
  if (timeEntryForm) timeEntryForm.addEventListener('submit', handleFormSubmit);
  if (restDayCheckbox) restDayCheckbox.addEventListener('change', toggleActivityFields);
  
  // Radio buttons per status
  document.querySelectorAll('input[name="dayStatus"]').forEach(radio => {
    radio.addEventListener('change', toggleActivityFields);
  });

  // Carica attività del giorno corrente
  if (dateInput) {
    await loadActivitiesForDate(dateInput.value);
  }

  isFormInitialized = true;
}

/**
 * Inizializza il date picker
 */
function initializeDatePicker() {
  const dateInput = document.getElementById('date');
  if (!dateInput) return;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  dateInput.value = formatISO(today);
  dateInput.min = formatISO(yesterday);
  dateInput.max = formatISO(today);

  dateInput.addEventListener('change', async (e) => {
    await loadActivitiesForDate(e.target.value);
  });
}

/**
 * Configura i pulsanti delle attività
 */
async function setupActivityButtons() {
  const activityButtons = document.getElementById('activityButtons');
  if (!activityButtons) return;
  
  activityButtons.innerHTML = '';
  
  const buttons = Object.entries(ACTIVITY_TYPES).map(([type, config]) => ({
    id: `add${type.charAt(0).toUpperCase() + type.slice(1)}Btn`,
    text: config.name,
    type: type,
    color: config.color,
    icon: config.icon
  }));

  buttons.forEach(button => {
    const btnHtml = `
      <div class="col-6 col-lg-3 mb-2">
        <button type="button" class="btn w-100 btn-activity" id="${button.id}"
          style="background-color: ${button.color}; color: white; min-height: 60px;">
          <i class="${button.icon} d-block mb-1" style="font-size: 1.3rem;"></i>
          <span class="small">${button.text}</span>
        </button>
      </div>
    `;
    activityButtons.insertAdjacentHTML('beforeend', btnHtml);
    
    document.getElementById(button.id).addEventListener('click', () => addActivity(button.type));
  });
}

/**
 * Configura il riepilogo mensile
 */
function setupMonthlyReport() {
  const monthSelect = document.getElementById('monthSelect');
  if (!monthSelect) return;

  // Popola dropdown mesi
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
    
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label.charAt(0).toUpperCase() + label.slice(1);
    if (i === 0) option.selected = true;
    monthSelect.appendChild(option);
  }

  monthSelect.addEventListener('change', loadMonthlyData);
  loadMonthlyData(); // Carica dati iniziali
}

/**
 * Toggle visibilità campi attività
 */
function toggleActivityFields() {
  const restDayCheckbox = document.getElementById('restDay');
  const statusOptions = document.getElementById('statusOptions');
  const activitiesContainer = document.getElementById('activitiesContainer');
  const activityButtons = document.getElementById('activityButtons');
  
  if (!restDayCheckbox) return;
  
  const isRestDay = restDayCheckbox.checked;
  const dayStatus = document.querySelector('input[name="dayStatus"]:checked')?.value;
  const disableActivities = isRestDay || dayStatus === 'vacation' || dayStatus === 'sick';

  if (statusOptions) statusOptions.style.display = isRestDay ? 'none' : 'block';
  if (activitiesContainer) activitiesContainer.style.display = disableActivities ? 'none' : 'block';
  if (activityButtons) activityButtons.style.display = disableActivities ? 'none' : 'flex';
}

/**
 * Aggiunge una nuova attività al form
 */
async function addActivity(type) {
  const activitiesContainer = document.getElementById('activitiesContainer');
  if (!activitiesContainer) return;
  
  const index = activitiesContainer.querySelectorAll('.activity-group').length;
  const config = ACTIVITY_TYPES[type];
  
  let html;
  if (type === 'pst') {
    html = createPSTActivityHtml(index, config);
  } else {
    html = await createStandardActivityHtml(type, index, config);
  }
  
  activitiesContainer.insertAdjacentHTML('beforeend', html);
}

/**
 * Crea HTML per attività PST
 */
function createPSTActivityHtml(index, config) {
  return `
    <div class="activity-group mb-3 position-relative" data-type="pst" data-index="${index}">
      <div class="card bg-dark border-2" style="border-color: ${config.color} !important;">
        <div class="card-header text-white d-flex justify-content-between align-items-center" 
             style="background-color: ${config.color};">
          <h6 class="mb-0">
            <i class="${config.icon} me-2"></i>${config.name}
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

/**
 * Crea HTML per attività standard
 */
async function createStandardActivityHtml(type, index, config) {
  const activities = await TimeEntryService.getActivitiesForType(type);
  
  const optionsHtml = activities
    .map(a => `<option value="${a.name}" data-minutes="${a.minutes}">${a.name}</option>`)
    .join('');
  
  const multiplierHtml = type === 'bnb'
    ? `<div class="col-6">
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
      <div class="card bg-dark border-2" style="border-color: ${config.color} !important;">
        <div class="card-header text-white d-flex justify-content-between align-items-center" 
             style="background-color: ${config.color};">
          <h6 class="mb-0">
            <i class="${config.icon} me-2"></i>${config.name}
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

/**
 * Aggiorna i minuti quando cambia la selezione attività
 */
window.updateMinutes = function (selectElement, index) {
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const minutes = selectedOption.dataset.minutes;
  const minutesInput = document.querySelector(`[name="minutes${index}"]`);

  if (minutes) {
    minutesInput.value = minutes;
  } else {
    minutesInput.value = '';
  }
};

/**
 * Gestisce l'invio del form
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const restDayCheckbox = document.getElementById('restDay');
  const dateInput = document.getElementById('date');
  const date = dateInput.value;
  const user = AuthService.getCurrentUser();
  
  // Verifica se il giorno è già stato registrato
  if (currentDayData && (currentDayData.riposo || currentDayData.ferie || currentDayData.malattia)) {
    const stato = currentDayData.riposo ? 'riposo' : currentDayData.ferie ? 'ferie' : 'malattia';
    showToast(`Giorno già segnato come ${stato}.`, 'warning');
    return;
  }

  const activities = collectActivitiesFromForm();

  // Validazione date: permetti inserimento solo per oggi e ieri
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayStr = formatISO(today);
  const yesterdayStr = formatISO(yesterday);

  // Permetti visualizzazione per tutte le date, ma inserimento solo oggi/ieri
  if (!restDayCheckbox.checked && activities.length > 0) {
    if (date !== todayStr && date !== yesterdayStr) {
      showToast('Puoi registrare ore solo per oggi o ieri.', 'warning');
      return;
    }
  }
  const status = {
    riposo: restDayCheckbox.checked,
    ferie: document.querySelector('input[name="dayStatus"]:checked')?.value === 'vacation',
    malattia: document.querySelector('input[name="dayStatus"]:checked')?.value === 'sick'
  };

  try {
    showProgress('Salvataggio in corso...');
    
    const result = await TimeEntryService.saveTimeEntry(user, date, activities, status);

    if (result.success) {
      showToast('Registrazione completata con successo!', 'success');
      resetForm();
      await loadActivitiesForDate(date);
      
      // Notifica aggiornamento per altre sezioni
      window.dispatchEvent(new Event('timeEntrySaved'));
    } else {
      showToast('Errore durante il salvataggio dei dati', 'error');
    }
  } catch (error) {
    console.error('Errore handleFormSubmit:', error);
    showToast('Errore durante il salvataggio dei dati', 'error');
  } finally {
    hideProgress();
  }
}

/**
 * Carica le attività per una data specifica
 */
async function loadActivitiesForDate(date) {
  const recentActivities = document.getElementById('recentActivities');
  if (!recentActivities) return;
  
  const username = AuthService.getCurrentUser();
  
  try {
    showProgress('Caricamento attività...');
    
    const result = await FirestoreService.getEmployeeDay(username, date);
    
    if (result.success) {
      currentDayData = result.data || null;
      displayActivities(currentDayData);
    } else {
      showToast('Errore durante il caricamento delle attività', 'error');
    }
  } catch (error) {
    console.error('Errore loadActivitiesForDate:', error);
    recentActivities.innerHTML = '<p class="text-danger">Errore caricamento dati.</p>';
  } finally {
    hideProgress();
  }
}

/**
 * Visualizza le attività caricate
 */
function displayActivities(data) {
  const recentActivities = document.getElementById('recentActivities');
  if (!recentActivities) return;

  if (!data) {
    recentActivities.innerHTML = '<p class="text-muted">Nessuna attività registrata per questa data.</p>';
    return;
  }

  let html = '';

  // Alert per status speciali
  if (data.riposo) {
    html += '<div class="alert alert-warning"><i class="fas fa-bed me-2"></i>Giorno di riposo</div>';
  } else if (data.ferie) {
    html += '<div class="alert alert-info"><i class="fas fa-umbrella-beach me-2"></i>Giorno di ferie</div>';
  } else if (data.malattia) {
    html += '<div class="alert alert-danger"><i class="fas fa-thermometer me-2"></i>Giorno di malattia</div>';
  }

  // Tabella attività
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

    // Calcolo totale
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

/**
 * Raccoglie le attività dal form
 */
function collectActivitiesFromForm() {
  const activities = [];
  const activityGroups = document.querySelectorAll('.activity-group');

  activityGroups.forEach(group => {
    const index = group.dataset.index;
    const type = group.dataset.type;
    
    const nameEl = document.querySelector(`[name="activityName${index}"]`);
    const minutesEl = document.querySelector(`[name="minutes${index}"]`);
    const peopleEl = document.querySelector(`[name="people${index}"]`);
    const multiplierEl = document.querySelector(`[name="multiplier${index}"]`);
    
    if (nameEl?.value && minutesEl?.value) {
      activities.push({
        type: type,
        name: nameEl.value,
        minutes: minutesEl.value,
        people: peopleEl?.value || 1,
        multiplier: multiplierEl?.value || 1
      });
    }
  });

  return activities;
}

/**
 * Carica e visualizza il riepilogo mensile
 */
async function loadMonthlyData() {
  const summaryContainer = document.getElementById('summaryContainer');
  const monthSelect = document.getElementById('monthSelect');
  
  if (!summaryContainer || !monthSelect) return;
  
  const value = monthSelect.value;
  if (!value.includes('-')) {
    summaryContainer.innerHTML = '<p class="text-danger">Mese non valido selezionato.</p>';
    return;
  }
  
  const [year, month] = value.split('-');
  const username = AuthService.getCurrentUser();

  try {
    showProgress('Caricamento riepilogo mensile...');
    
    const result = await FirestoreService.getEmployeeMonth(username, parseInt(year), parseInt(month));
    
    if (result.success) {
      renderMonthlySummary(result.data, year, month);
    } else {
      summaryContainer.innerHTML = '<p class="text-danger">Errore durante il caricamento dei dati.</p>';
    }
  } catch (error) {
    console.error('Errore loadMonthlyData:', error);
    summaryContainer.innerHTML = '<p class="text-danger">Errore durante il caricamento dei dati.</p>';
  } finally {
    hideProgress();
  }
}

/**
 * Renderizza il riepilogo mensile
 */
function renderMonthlySummary(monthData, year, month) {
  const summaryContainer = document.getElementById('summaryContainer');
  
  if (!monthData || Object.keys(monthData).length === 0) {
    summaryContainer.innerHTML = '<p class="text-muted"><i class="fas fa-info-circle me-2"></i>Nessun dato disponibile per questo periodo.</p>';
    return;
  }

  // Calcola totali
  let totalMinutes = 0;
  let sickDays = 0;
  let vacationDays = 0;
  let restDays = 0;

  Object.values(monthData).forEach(day => {
    if (day.malattia) {
      sickDays++;
    } else if (day.ferie) {
      vacationDays++;
    } else if (day.riposo) {
      restDays++;
    } else if (Array.isArray(day.attività) && day.attività.length) {
      const flatActivities = day.attività.map(a => ({
        minutes: parseInt(a.minuti, 10) || 0,
        multiplier: parseInt(a.moltiplicatore, 10) || 1,
        people: parseInt(a.persone, 10) || 1
      }));
      totalMinutes += calculateTotalMinutes(flatActivities);
    }
  });

  const decHours = formatDecimalHours(totalMinutes, 2);
  const formattedHours = decHours.toLocaleString('it-IT', { minimumFractionDigits: 2 });

  // Genera HTML
  let html = `
    <div class="row mb-4">
      <div class="col-md-3 mb-3">
        <div class="card bg-primary text-white h-100 border-0">
          <div class="card-body text-center">
            <h5 class="card-title"><i class="fas fa-clock mb-2 d-block"></i>Ore Lavorate</h5>
            <p class="card-text display-6">${formattedHours}</p>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-3">
        <div class="card bg-danger text-white h-100 border-0">
          <div class="card-body text-center">
            <h5 class="card-title"><i class="fas fa-thermometer mb-2 d-block"></i>Malattia</h5>
            <p class="card-text display-6">${sickDays}</p>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-3">
        <div class="card bg-info text-white h-100 border-0">
          <div class="card-body text-center">
            <h5 class="card-title"><i class="fas fa-umbrella-beach mb-2 d-block"></i>Ferie</h5>
            <p class="card-text display-6">${vacationDays}</p>
          </div>
        </div>
      </div>
      <div class="col-md-3 mb-3">
        <div class="card bg-warning text-dark h-100 border-0">
          <div class="card-body text-center">
            <h5 class="card-title"><i class="fas fa-bed mb-2 d-block"></i>Riposo</h5>
            <p class="card-text display-6">${restDays}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-dark">
        <thead>
          <tr>
            <th><i class="fas fa-calendar me-1"></i>Data</th>
            <th><i class="fas fa-clock me-1"></i>Ore</th>
            <th><i class="fas fa-info-circle me-1"></i>Status</th>
          </tr>
        </thead>
        <tbody>
  `;

  // Genera righe per ogni giorno del mese
  const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
  const today = new Date();
  const todayISO = formatISO(today);

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateISO = `${year}-${month.padStart(2, '0')}-${dayStr}`;

    // Non includere date future
    if (dateISO > todayISO) continue;

    const entry = monthData[dateISO] || {};
    let ore = '';
    let status = '';

    if (entry.malattia) {
      status = 'Malattia';
    } else if (entry.ferie) {
      status = 'Ferie';
    } else if (entry.riposo) {
      status = 'Riposo';
    } else if (Array.isArray(entry.attività) && entry.attività.length) {
      const flatActivities = entry.attività.map(a => ({
        minutes: parseInt(a.minuti, 10) || 0,
        multiplier: parseInt(a.moltiplicatore, 10) || 1,
        people: parseInt(a.persone, 10) || 1
      }));
      const rawMinutes = calculateTotalMinutes(flatActivities);
      const decHours = formatDecimalHours(rawMinutes, 2);
      ore = decHours.toLocaleString('it-IT', { minimumFractionDigits: 2 });
    }

    const displayDate = new Date(dateISO).toLocaleDateString('it-IT', { 
      day: 'numeric', 
      month: 'numeric', 
      year: 'numeric' 
    });

    html += `
      <tr>
        <td>${displayDate}</td>
        <td>${ore}</td>
        <td>${status}</td>
      </tr>
    `;
  }

  html += '</tbody></table></div>';
  summaryContainer.innerHTML = html;
}

/**
 * Reset del form
 */
function resetForm() {
  const activitiesContainer = document.getElementById('activitiesContainer');
  const restDayCheckbox = document.getElementById('restDay');
  
  if (activitiesContainer) {
    activitiesContainer.querySelectorAll('.activity-group').forEach(group => group.remove());
  }
  
  if (restDayCheckbox) {
    restDayCheckbox.checked = false;
  }
  
  const normalDayRadio = document.getElementById('normalDay');
  if (normalDayRadio) {
    normalDayRadio.checked = true;
  }
  
  toggleActivityFields();
}

// Listener per aggiornamenti da altre sezioni
window.addEventListener('timeEntrySaved', () => {
  loadMonthlyData();
});