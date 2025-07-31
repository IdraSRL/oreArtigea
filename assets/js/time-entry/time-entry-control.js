import { AuthService } from '../js/auth/auth.js';
import { TimeEntryService } from './time-entry.js';
import { FirestoreService } from '../js/common/firestore-service.js';
import {
  calculateTotalMinutes,
  formatHoursMinutes,
  formatDecimalHours
} from '../js/common/time-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  // Check authentication
  if (!AuthService.checkAuth()) {
    window.location.href = 'login.html';
    return;
  }

  // Set up variables
  const username = AuthService.getCurrentUser();
  const userDisplay = document.getElementById('userDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const timeEntryForm = document.getElementById('timeEntryForm');
  const dateInput = document.getElementById('date');
  const hiddenDateInput = document.getElementById('hiddenDate');
  const restDayCheckbox = document.getElementById('restDay');
  const statusOptions = document.getElementById('statusOptions');
  const activitiesContainer = document.getElementById('activitiesContainer');
  const activityButtons = document.getElementById('activityButtons');
  const messageEl = document.getElementById('message');
  const recentActivities = document.getElementById('recentActivities');

  // Display current user
  userDisplay.textContent = username;

  // Initialize date picker
  initializeDatePicker();

  // Set up activity buttons
  setupActivityButtons();

  // Set up event listeners
  logoutBtn.addEventListener('click', () => AuthService.logout());
  timeEntryForm.addEventListener('submit', handleFormSubmit);
  restDayCheckbox.addEventListener('change', toggleActivityFields);

  // Load today's activities
  loadActivitiesForDate(hiddenDateInput.value);

  // Initialize date picker
  function initializeDatePicker() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const formatDisplay = date => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formatISO = date => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    };

    dateInput.value = formatDisplay(today);
    hiddenDateInput.value = formatISO(today);

    const pickerInput = document.createElement('input');
    pickerInput.type = 'date';
    pickerInput.style.position = 'absolute';
    pickerInput.style.opacity = '0';
    pickerInput.value = formatISO(today);
    pickerInput.min = formatISO(yesterday);
    pickerInput.max = formatISO(today);
    dateInput.after(pickerInput);

    dateInput.addEventListener('click', () => {
      pickerInput.showPicker();
    });

    pickerInput.addEventListener('change', (e) => {
      const selectedDate = new Date(e.target.value);
      dateInput.value = formatDisplay(selectedDate);
      hiddenDateInput.value = formatISO(selectedDate);
      loadActivitiesForDate(hiddenDateInput.value);
    });
  }

  // Set up activity buttons
  function setupActivityButtons() {
    const buttons = [
      { id: 'addUfficiBtn', text: 'Uffici', type: 'uffici', color: TimeEntryService.activityTypes.uffici.color },
      { id: 'addAppartamentiBtn', text: 'Appartamenti', type: 'appartamenti', color: TimeEntryService.activityTypes.appartamenti.color },
      { id: 'addBnBBtn', text: 'BnB', type: 'bnb', color: TimeEntryService.activityTypes.bnb.color },
      { id: 'addPstBtn', text: 'PST', type: 'pst', color: TimeEntryService.activityTypes.pst.color }
    ];

    buttons.forEach(button => {
      const btnHtml = `
            <div class="col-12 col-md-6 col-lg-3">
              <button type="button" class="btn w-100" id="${button.id}"
                style="background-color: ${button.color}; color: white;">${button.text}</button>
            </div>
          `;
      activityButtons.insertAdjacentHTML('beforeend', btnHtml);
      document.getElementById(button.id).addEventListener('click', () => addActivity(button.type));
    });
  }

  // Toggle activity fields based on rest day checkbox
  function toggleActivityFields() {
    const isRestDayChecked = restDayCheckbox.checked;
    statusOptions.style.display = isRestDayChecked ? 'none' : 'block';
    activitiesContainer.style.display = isRestDayChecked ? 'none' : 'block';
    activityButtons.style.display = isRestDayChecked ? 'none' : 'flex';
  }

  // Add a new activity
  function addActivity(type) {
    const activityIndex = document.querySelectorAll('.activity-group').length;
    const color = TimeEntryService.activityTypes[type].color;

    let activityHtml = '';
    if (type === 'pst') {
      activityHtml = createPSTActivityHtml(activityIndex, color);
    } else {
      activityHtml = createStandardActivityHtml(type, activityIndex, color);
    }

    activitiesContainer.insertAdjacentHTML('beforeend', activityHtml);
  }

  function createPSTActivityHtml(index, color) {
    return `
    <div class="activity-group card mb-3 border-start border-4 position-relative"
         style="--bs-border-start-color:${color};">
      <div class="card-body">
        <div class="mb-3">
          <label for="activityName${index}" class="form-label">Descrizione</label>
          <input
            type="text"
            id="activityName${index}"
            name="activityName${index}"
            class="form-control"
            placeholder="Descrizione PST"
            required
          />
        </div>
        <div class="mb-3">
          <label for="minutes${index}" class="form-label">Minuti</label>
          <input
            type="number"
            id="minutes${index}"
            name="minutes${index}"
            class="form-control"
            placeholder="Minuti"
            min="1"
            required
          />
        </div>
        <input type="hidden" name="multiplier${index}" value="1" />
        <input type="hidden" name="people${index}" value="1" />
      </div>
      <button
        type="button"
        class="btn btn-outline-danger btn-sm delete-btn"
        aria-label="Rimuovi attività"
        style="position:absolute; bottom:0.75rem; right:0.75rem;">
        &times; Rimuovi
      </button>
    </div>
  `;
  }

  /**
   * Genera l’HTML di una card per attività standard
   * (Select attività, Minuti, Persone; + Moltiplicatore per BnB)
   */
  async function createStandardActivityHtml(type, index, color) {
    const activities = await TimeEntryService.getActivitiesForType(type);
    const optionsHtml = activities
      .map(a => `<option value="${a.name}" data-minutes="${a.minutes}">${a.name}</option>`)
      .join('');

    return `
    <div class="activity-group card mb-3 border-start border-4 position-relative"
         style="--bs-border-start-color:${color};">
      <div class="card-body">
        <div class="mb-3">
          <label for="activityName${index}" class="form-label">Attività</label>
          <select
            id="activityName${index}"
            name="activityName${index}"
            class="form-select"
            onchange="updateMinutes(this, ${index})"
            required
          >
            <option value="">Seleziona</option>
            ${optionsHtml}
          </select>
        </div>
        <div class="mb-3">
          <label for="minutes${index}" class="form-label">Minuti</label>
          <input
            type="number"
            id="minutes${index}"
            name="minutes${index}"
            class="form-control"
            min="1"
            required
          />
        </div>
        ${type === 'bnb'
        ? `<div class="mb-3">
               <label for="multiplier${index}" class="form-label">Moltiplicatore</label>
               <select
                 id="multiplier${index}"
                 name="multiplier${index}"
                 class="form-select"
                 required
               >
                 ${[...Array(10)].map((_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}
               </select>
             </div>`
        : `<input type="hidden" name="multiplier${index}" value="1" />`}
        <div class="mb-3">
          <label for="people${index}" class="form-label">Persone</label>
          <select
            id="people${index}"
            name="people${index}"
            class="form-select"
            required
          >
            ${[1, 2, 3, 4].map(n => `<option value="${n}">${n}</option>`).join('')}
          </select>
        </div>
      </div>
      <button
        type="button"
        class="btn btn-outline-danger btn-sm delete-btn"
        aria-label="Rimuovi attività"
        style="position:absolute; bottom:0.75rem; right:0.75rem;">
        &times; Rimuovi
      </button>
    </div>
  `;
  }
  // Update minutes when activity selection changes
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

  // Handle form submission
  async function handleFormSubmit(e) {
    e.preventDefault();

    // Get form data
    const isRestDay = restDayCheckbox.checked;
    const date = hiddenDateInput.value;
    let status = {
      riposo: isRestDay,
      ferie: false,
      malattia: false
    };

    if (!isRestDay) {
      const dayStatus = document.querySelector('input[name="dayStatus"]:checked').value;
      status.ferie = dayStatus === 'vacation';
      status.malattia = dayStatus === 'sick';
    }

    const activities = [];

    // If it's not a rest/sick/vacation day, collect activities
    if (!isRestDay && !status.ferie && !status.malattia) {
      const activityGroups = document.querySelectorAll('.activity-group');

      if (activityGroups.length === 0) {
        showMessage('Aggiungi almeno un\'attività', 'alert-danger');
        return;
      }

      activityGroups.forEach(group => {
        const index = group.dataset.index;
        const type = group.dataset.type;

        const nameInput = document.querySelector(`[name="activityName${index}"]`);
        const minutesInput = document.querySelector(`[name="minutes${index}"]`);
        const peopleInput = document.querySelector(`[name="people${index}"]`);
        const multiplierInput = document.querySelector(`[name="multiplier${index}"]`);

        if (!nameInput.value || !minutesInput.value) {
          return;
        }

        activities.push({
          type,
          name: nameInput.value,
          minutes: minutesInput.value,
          people: peopleInput.value,
          multiplier: multiplierInput.value
        });
      });

      if (activities.length === 0) {
        showMessage('Compila correttamente almeno un\'attività', 'alert-danger');
        return;
      }
    }

    // Save to Firestore
    try {
      showProgress('Invio dati in corso...');

      const result = await TimeEntryService.saveTimeEntry(username, date, activities, status);

      if (result.success) {
        showMessage('Registrazione completata con successo!', 'alert-success');
        resetForm();
        loadActivitiesForDate(date);
      } else {
        showMessage('Errore durante il salvataggio dei dati', 'alert-danger');
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('Errore durante il salvataggio dei dati', 'alert-danger');
    } finally {
      hideProgress();
    }
  }

  // Load activities for a specific date
  async function loadActivitiesForDate(date) {
    try {
      showProgress('Caricamento attività...');

      const result = await FirestoreService.getEmployeeDay(username, date);

      if (result.success) {
        displayActivities(result.data);
      } else {
        showMessage('Errore durante il caricamento delle attività', 'alert-danger');
      }
    } catch (error) {
      console.error('Error:', error);
      showMessage('Errore durante il caricamento delle attività', 'alert-danger');
    } finally {
      hideProgress();
    }
  }

  // Display activities for the selected date
  function displayActivities(data) {
    console.log('[DEBUG] Dati ricevuti per la giornata:', data);

    if (!data) {
      recentActivities.innerHTML = '<p class="text-muted">Nessuna attività registrata per questa data.</p>';
      return;
    }

    let html = '';

    // Check for special day status
    if (data.riposo) {
      html += '<div class="alert alert-warning">Giorno di riposo</div>';
    } else if (data.ferie) {
      html += '<div class="alert alert-info">Giorno di ferie</div>';
    } else if (data.malattia) {
      html += '<div class="alert alert-danger">Giorno di malattia</div>';
    }

    // Display activities
    if (data.attività && data.attività.length > 0) {
      // 1) tabella attività con arrotondamento per riga
      let html = '';
      html += '<div class="table-responsive"><table class="table table-striped">';
      html += '<thead><tr><th>Attività</th><th>Minuti</th><th>Persone</th><th>Moltiplicatore</th><th>Minuti Effettivi</th></tr></thead>';
      html += '<tbody>';
      data.attività.forEach(activity => {
        const minutes = parseInt(activity.minuti, 10) || 0;
        const people = parseInt(activity.persone, 10) || 1;
        const multiplier = parseInt(activity.moltiplicatore, 10) || 1;

        // calcolo frazionario e arrotondamento per la cella
        const effectiveMinutesFloat = (minutes * multiplier) / people;
        const effectiveMinutes = Math.round(effectiveMinutesFloat);

        html += `
      <tr>
        <td>${activity.nome}</td>
        <td>${minutes}</td>
        <td>${people}</td>
        <td>${multiplier}</td>
        <td>${effectiveMinutes}</td>
      </tr>
    `;
      });
      html += '</tbody></table></div>';

      // 2) totale ore con time-utils (arrotonda una sola volta)
      // preparo l'array per calculateTotalMinutes
      const flatActivities = data.attività.map(a => ({
        minutes: parseInt(a.minuti, 10) || 0,
        multiplier: parseInt(a.moltiplicatore, 10) || 1,
        people: parseInt(a.persone, 10) || 1
      }));
      const rawMinutes = calculateTotalMinutes(flatActivities);
// ore decimali con 2 cifre e formato italiano
const decHours = formatDecimalHours(rawMinutes, 2);
const formatted = decHours.toLocaleString('it-IT', { minimumFractionDigits: 2 });

      html += `
    <div class="alert alert-success mt-3">
      Totale ore: <strong>${formatted}</strong>
    </div>
  `;

    } else if (!data.riposo && !data.ferie && !data.malattia) {
      html += '<p class="text-muted">Nessuna attività registrata per questa data.</p>';
    }

    recentActivities.innerHTML = html;
  }

  // Reset form after successful submission
  function resetForm() {
    const activityGroups = document.querySelectorAll('.activity-group');
    activityGroups.forEach(group => group.remove());

    restDayCheckbox.checked = false;
    document.getElementById('normalDay').checked = true;

    toggleActivityFields();
  }

  // Show message
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `alert mt-3 ${type}`;
    messageEl.style.display = 'block';
    setTimeout(() => messageEl.style.display = 'none', 3000);
  }

  // Show progress overlay
  function showProgress(text) {
    let progressContainer = document.getElementById('progressContainer');
    if (!progressContainer) {
      progressContainer = document.createElement('div');
      progressContainer.id = 'progressContainer';
      progressContainer.className = 'progress-container';
      document.body.appendChild(progressContainer);
    }

    progressContainer.innerHTML = `
          <div class="data-stream">
            <div class="server-icon">
              <div class="server-light active"></div>
            </div>
            <div class="progress-text">${text}</div>
          </div>
        `;
  }


  // ---- SEZIONE RIEPILOGO MENSILE ----

  const summaryContainer = document.getElementById('summaryContainer');
  const dayDetail = document.getElementById('dayDetail');
  const monthSelect = document.getElementById('monthSelect');

  monthSelect.addEventListener('change', loadMonthlyData);
  initializeMonthDropdown();
  loadMonthlyData();

  function initializeMonthDropdown() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    for (let i = 0; i < 12; i++) {
      let month = currentMonth - i;
      let year = currentYear;
      if (month <= 0) {
        month += 12;
        year -= 1;
      }
      const monthName = new Date(year, month - 1, 1).toLocaleString('it-IT', { month: 'long' });
      const option = document.createElement('option');
      option.value = `${year}-${month.toString().padStart(2, '0')}`;
      option.textContent = `${monthName} ${year}`;
      if (i === 0) option.selected = true;
      monthSelect.appendChild(option);
    }
  }

  async function loadMonthlyData() {
    const value = monthSelect?.value || '';
    if (!value.includes('-')) {
      summaryContainer.innerHTML = '<p class="text-danger">Mese non valido selezionato.</p>';
      return;
    }
    const [year, month] = value.split('-');
    try {
      const result = await FirestoreService.getEmployeeMonth(username, year, parseInt(month));
      if (result.success) {
        const data = { [username]: result.data };
        renderSummary(data, year, month);
      } else {
        summaryContainer.innerHTML = '<p class="text-danger">Errore durante il caricamento dei dati.</p>';
      }
    } catch (err) {
      console.error(err);
      summaryContainer.innerHTML = '<p class="text-danger">Errore durante il caricamento dei dati.</p>';
    }
  }
  loadFullActivityLog();
  // ⬇️ UNIFICA FUNZIONE DI RENDER TABELLA ATTIVITÀ
  window.renderActivityLogTable = function (activities, filterDate) {
    const tableBody = document.getElementById('fullActivityTableBody');
    tableBody.innerHTML = '';

    const filtered = filterDate
      ? activities.filter(a => a.data === filterDate)
      : activities;

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nessuna attività trovata.</td></tr>';
      return;
    }

    filtered.forEach(activity => {
      const row = document.createElement('tr');
      row.innerHTML = `
      <td>${activity.data}</td>
      <td>${activity.nome}</td>
      <td>${activity.minuti}</td>
      <td>${activity.tipo}</td>
    `;
      tableBody.appendChild(row);
    });
  };

  // ⬇️ CARICAMENTO COMPLETO + GESTIONE FILTRO
  async function loadFullActivityLog() {
    try {
      const result = await FirestoreService.getEmployeeMonth(username, new Date().getFullYear(), new Date().getMonth() + 1);
      if (result.success) {
        const allActivities = [];

        const data = result.data;
        for (const date in data) {
          const entry = data[date];
          if (entry.attività && Array.isArray(entry.attività)) {
            entry.attività.forEach(a => {
              allActivities.push({
                data: date,
                nome: a.nome || '',
                minuti: a.minuti || '',
                tipo: a.tipo || ''
              });
            });
          }
        }

        // Salvo globalmente per filtri esterni
        window.allActivities = allActivities;

        // Imposto data odierna
        const today = new Date().toISOString().split('T')[0];
        const dateFilter = document.getElementById('activityDateFilter');
        dateFilter.value = today;

        // Mostra attività di oggi
        window.renderActivityLogTable(allActivities, today);

        // Imposta evento sul filtro
        dateFilter.addEventListener('change', () => {
          const selectedDate = dateFilter.value;
          window.renderActivityLogTable(allActivities, selectedDate);
        });
      }
    } catch (err) {
      console.error('[loadFullActivityLog] Errore:', err);
    }
  }

  // ✅ CHIAMATA UNICA
  loadFullActivityLog();

});

