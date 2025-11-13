// admin.js - Pannello amministrativo principale
import { AuthService } from "../../auth/auth.js";
import { FirestoreService } from "../../common/firestore-service.js";
import { exportToExcel } from "../../common/export-excel.js";
import { showToast, showProgress, hideProgress } from "../../common/utils.js";
import { calculateTotalMinutes, formatDecimalHours } from '../../common/time-utilis.js';
import { AdminOreDetailManager } from "../ore/admin-ore-detail.js";

let currentData = {};
let adminOreDetailManager = null;

// Inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
  // Verifica autenticazione admin
  if (!AuthService.checkAuth() || !AuthService.isAdmin()) {
    window.location.href = 'login.html';
    return;
  }

  // Inizializza il manager dei dettagli ore
  adminOreDetailManager = new AdminOreDetailManager();

  await initializeAdminPanel();

  // Listener per aggiornamenti dati
  window.addEventListener('adminDataUpdated', async (e) => {
    console.log('Dati aggiornati, ricarico...', e.detail);
    await loadData();
  });
});

/**
 * Inizializza il pannello admin
 */
async function initializeAdminPanel() {
  const userDisplay = document.getElementById('userDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const empSelect = document.getElementById('employeeSelect');
  const monthSelect = document.getElementById('monthSelect');
  const exportBtn = document.getElementById('exportBtn');

  // Mostra utente corrente
  const user = AuthService.getCurrentUser();
  if (userDisplay) userDisplay.textContent = `${user} (Admin)`;
  
  // Event listeners
  if (logoutBtn) logoutBtn.onclick = () => AuthService.logout();
  if (empSelect) empSelect.onchange = loadData;
  if (monthSelect) monthSelect.onchange = loadData;
  if (exportBtn) {
    exportBtn.onclick = () => {
      if (!currentData || !Object.keys(currentData).length) {
        showToast('Nessun dato da esportare', 'warning');
        return;
      }
      const [year, month] = monthSelect.value.split('-');
      exportToExcel(currentData, year, Number(month));
    };
  }

  // Popola dropdown
  await populateEmployeeSelect();
  populateMonthsDropdown();
  
  // Carica dati iniziali
  await loadData();
}

/**
 * Popola la select dei dipendenti
 */
async function populateEmployeeSelect() {
  const empSelect = document.getElementById('employeeSelect');
  if (!empSelect) return;

  try {
    const employees = await FirestoreService.getEmployees();
    empSelect.innerHTML = '<option value="all">Tutti i dipendenti</option>';
    
    employees
      .sort((a, b) => a.name.localeCompare(b.name, 'it'))
      .forEach(emp => {
        empSelect.add(new Option(emp.name, emp.name));
      });
  } catch (error) {
    console.error('Errore caricamento dipendenti:', error);
    showToast('Impossibile caricare elenco dipendenti', 'error');
  }
}

/**
 * Popola la select dei mesi
 */
function populateMonthsDropdown() {
  const monthSelect = document.getElementById('monthSelect');
  if (!monthSelect) return;

  const today = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
    
    const option = new Option(label.charAt(0).toUpperCase() + label.slice(1), value);
    if (i === 0) option.selected = true;
    monthSelect.add(option);
  }
}

/**
 * Carica e visualizza i dati
 */
async function loadData() {
  const summaryDiv = document.getElementById('summaryContainer');
  const empSelect = document.getElementById('employeeSelect');
  const monthSelect = document.getElementById('monthSelect');
  
  if (!summaryDiv || !empSelect || !monthSelect) return;
  
  summaryDiv.innerHTML = '<p class="text-center">Caricamento...</p>';
  
  const emp = empSelect.value;
  const [year, month] = monthSelect.value.split('-');

  try {
    let result;
    
    if (emp === 'all') {
      result = await FirestoreService.getAllEmployeesMonth(year, Number(month));
    } else {
      const r = await FirestoreService.getEmployeeMonth(emp, year, Number(month));
      result = { success: r.success, data: { [emp]: r.data } };
    }
    
    if (!result.success) throw new Error('Caricamento dati fallito');

    currentData = result.data;
    renderSummary(currentData, year, Number(month));
    
  } catch (error) {
    console.error('Errore loadData:', error);
    summaryDiv.innerHTML = '<p class="text-danger text-center">Errore caricamento dati</p>';
  }
}

/**
 * Renderizza il riepilogo
 */
function renderSummary(data, year, month) {
  const summaryDiv = document.getElementById('summaryContainer');

  if (!Object.keys(data).length) {
    summaryDiv.innerHTML = '<p class="text-center text-muted">Nessun dato disponibile</p>';
    return;
  }

  summaryDiv.innerHTML = Object.entries(data)
    .map(([name, days], idx) => {
      const stats = calculateEmployeeStats(days);
      
      const cardsHtml = [
        ['Ore Lavorate', stats.hoursDec, 'text-primary'],
        ['Malattia', stats.sick, 'text-danger'],
        ['Ferie', stats.vac, 'text-info'],
        ['Riposo', stats.rest, 'text-warning']
      ].map(([label, value, cls]) => `
        <div class="col">
          <div class="card text-center">
            <div class="card-body">
              <h6 class="card-title ${cls}">${label}</h6>
              <p class="display-6 mb-0">${value}</p>
            </div>
          </div>
        </div>
      `).join('');

      const rowsHtml = generateDayRows(name, days, year, month);
      const toggleId = `details-${idx}`;

      return `
        <div class="mb-5">
          <h4>${name}</h4>
          <div class="row row-cols-1 row-cols-md-4 g-3 mb-4">
            ${cardsHtml}
          </div>
          <button class="btn btn-sm btn-outline-secondary mb-3" 
                  type="button" 
                  onclick="toggleEmployeeDetails('${toggleId}', this)">
            <span>Mostra dettagli</span> <i class="fas fa-chevron-down ms-1"></i>
          </button>
          <div class="collapse" id="${toggleId}" style="display: none;">
            <div class="table-responsive">
              <table class="table table-dark table-striped mb-0">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Ore</th>
                    <th>Status</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  // Attacca listener per i dettagli
  summaryDiv.querySelectorAll('.view-btn').forEach(btn => {
    btn.onclick = onViewDetail;
  });
}

/**
 * Calcola le statistiche per un dipendente
 */
function calculateEmployeeStats(days) {
  let rawTotal = 0, sick = 0, vac = 0, rest = 0;

  Object.values(days).forEach(d => {
    if (d.malattia) {
      sick++;
    } else if (d.ferie) {
      vac++;
    } else if (d.riposo) {
      rest++;
    } else if (Array.isArray(d.attività) && d.attività.length) {
      const flat = d.attività.map(a => ({
        minutes: parseInt(a.minuti, 10) || 0,
        multiplier: parseInt(a.moltiplicatore, 10) || 1,
        people: parseInt(a.persone, 10) || 1
      }));
      rawTotal += calculateTotalMinutes(flat);
    }
  });

  const decimal = formatDecimalHours(rawTotal, 2);
  const formatted = decimal.toLocaleString('it-IT', { minimumFractionDigits: 2 });

  return { hoursDec: formatted, sick, vac, rest };
}

/**
 * Genera le righe per i giorni del mese
 */
function generateDayRows(name, days, year, month) {
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const rows = [];

  // Se il mese selezionato è il mese corrente, mostra solo i giorni fino ad oggi
  // Altrimenti mostra tutti i giorni del mese
  let maxDay;
  if (parseInt(year) === todayYear && parseInt(month) === todayMonth) {
    maxDay = todayDay;
  } else {
    maxDay = new Date(year, month, 0).getDate();
  }

  for (let d = 1; d <= maxDay; d++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    const weekday = new Date(date).toLocaleDateString('it-IT', { 
      weekday: 'short', 
      day: 'numeric' 
    });
    
    const dayData = days[date] || {};
    let status = '', hours = '';
    
    if (dayData.malattia) {
      status = '<span class="badge bg-danger">Malattia</span>';
    } else if (dayData.ferie) {
      status = '<span class="badge bg-info">Ferie</span>';
    } else if (dayData.riposo) {
      status = '<span class="badge bg-warning text-dark">Riposo</span>';
    } else if (Array.isArray(dayData.attività) && dayData.attività.length) {
      const flat = dayData.attività.map(a => ({
        minutes: parseInt(a.minuti, 10) || 0,
        multiplier: parseInt(a.moltiplicatore, 10) || 1,
        people: parseInt(a.persone, 10) || 1
      }));
      const raw = calculateTotalMinutes(flat);
      const dec = formatDecimalHours(raw, 2);
      hours = dec.toLocaleString('it-IT', { minimumFractionDigits: 2 });
    }

    rows.push(`
      <tr data-date="${date}" data-emp="${name}">
        <td>${weekday}</td>
        <td>${hours}</td>
        <td>${status}</td>
        <td><button class="btn btn-sm btn-outline-secondary view-btn">Visualizza</button></td>
      </tr>
    `);
  }
  
  return rows.join('');
}

/**
 * Mostra il modal di dettaglio giorno
 */
async function onViewDetail(e) {
  const tr = e.currentTarget.closest('tr');
  const date = tr.dataset.date;
  const emp = tr.dataset.emp;
  
  try {
    const res = await FirestoreService.getEmployeeDay(emp, date);
    const dayData = res.success ? res.data : {};
    
    if (adminOreDetailManager) {
      adminOreDetailManager.showDayModal(emp, date, dayData);
    } else {
      // Fallback al metodo originale
      showDayModal(emp, date, dayData);
    }
  } catch (error) {
    showToast('Errore caricamento dettagli', 'error');
  }
}

/**
 * Mostra il modal con i dettagli del giorno (metodo fallback)
 */
function showDayModal(emp, date, day) {
  const container = document.getElementById('dayDetail');
  if (!container) return;

  const title = new Date(date).toLocaleDateString('it-IT', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  let html = `<h4>${emp} - ${title}</h4>`;
  
  // Status speciali
  ['riposo', 'ferie', 'malattia'].forEach(key => {
    if (day[key]) {
      const cls = key === 'ferie' ? 'info' : key === 'malattia' ? 'danger' : 'warning';
      html += `<div class="alert alert-${cls}">${key.charAt(0).toUpperCase() + key.slice(1)}</div>`;
    }
  });
  
  // Form di modifica
  html += `
    <form id="editForm">
      <div class="table-responsive">
        <table class="table table-bordered">
          <thead>
            <tr>
              <th>Attività</th>
              <th>Min</th>
              <th>Pers</th>
              <th>Mol</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody id="actBody">
  `;
  
  (day.attività || []).forEach((a, i) => {
    html += `
      <tr>
        <td><input type="text" name="nome_${i}" class="form-control" value="${a.nome || ''}"></td>
        <td><input type="number" name="minuti_${i}" class="form-control" value="${a.minuti || 0}"></td>
        <td><input type="number" name="persone_${i}" class="form-control" value="${a.persone || 1}"></td>
        <td><input type="number" step="0.1" name="moltiplicatore_${i}" class="form-control" value="${a.moltiplicatore || 1}"></td>
        <td><button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('tr').remove()">Elimina</button></td>
      </tr>
    `;
  });
  
  html += `
          </tbody>
        </table>
      </div>
      <button type="button" id="addAct" class="btn btn-outline-secondary mb-2">Aggiungi Attività</button>
      <button type="submit" class="btn btn-success">Salva Modifiche</button>
    </form>
  `;
  
  container.innerHTML = html;
  
  const modalEl = document.getElementById('dayDetailModal');
  if (modalEl) new bootstrap.Modal(modalEl).show();

  // Event listeners per il form
  setupEditFormListeners(emp, date, day);
}

/**
 * Configura i listener per il form di modifica
 */
function setupEditFormListeners(emp, date, day) {
  const addBtn = document.getElementById('addAct');
  const editForm = document.getElementById('editForm');

  if (addBtn) {
    addBtn.onclick = () => {
      const body = document.getElementById('actBody');
      const idx = body.children.length;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="text" name="nome_${idx}" class="form-control"></td>
        <td><input type="number" name="minuti_${idx}" class="form-control" value="0"></td>
        <td><input type="number" name="persone_${idx}" class="form-control" value="1"></td>
        <td><input type="number" step="0.1" name="moltiplicatore_${idx}" class="form-control" value="1"></td>
        <td><button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('tr').remove()">Elimina</button></td>
      `;
      body.appendChild(tr);
    };
  }

  if (editForm) {
    editForm.onsubmit = async (ev) => {
      ev.preventDefault();
      
      const formData = new FormData(ev.target);
      const activities = Array.from(document.getElementById('actBody').children).map((row, i) => ({
        nome: formData.get(`nome_${i}`),
        minuti: Number(formData.get(`minuti_${i}`)) || 0,
        persone: Number(formData.get(`persone_${i}`)) || 1,
        moltiplicatore: Number(formData.get(`moltiplicatore_${i}`)) || 1
      })).filter(a => a.nome);
      
      try {
        await FirestoreService.saveEmployeeDay(emp, date, { 
          ...day, 
          attività: activities 
        });
        
        showToast('Modifiche salvate con successo', 'success');
        loadData();
        
        // Chiudi modal in modo sicuro
        closeModalSafely();
      } catch (error) {
        showToast('Errore durante il salvataggio', 'error');
      }
    };
  }
}

/**
 * Chiude il modal in modo sicuro rimuovendo overlay
 */
function closeModalSafely() {
  const modalElement = document.getElementById('dayDetailModal');
  const modal = bootstrap.Modal.getInstance(modalElement);
  
  if (modal) {
    modal.hide();
  }
  
  // Cleanup completo con timeout
  setTimeout(() => {
    // Rimuovi tutti i backdrop
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
      backdrop.remove();
    });
    
    // Reset body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    
    // Assicurati che il modal sia nascosto
    if (modalElement) {
      modalElement.style.display = 'none';
      modalElement.classList.remove('show');
      modalElement.setAttribute('aria-hidden', 'true');
      modalElement.removeAttribute('aria-modal');
    }
  }, 300);
}

/**
 * Funzione globale per toggle dettagli dipendente
 */
window.toggleEmployeeDetails = function(toggleId, buttonElement) {
  const detailsElement = document.getElementById(toggleId);
  const icon = buttonElement.querySelector('i');
  const span = buttonElement.querySelector('span');
  
  if (detailsElement.style.display === 'none' || detailsElement.style.display === '') {
    detailsElement.style.display = 'block';
    detailsElement.classList.add('show');
    span.textContent = 'Nascondi dettagli';
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-up');
  } else {
    detailsElement.style.display = 'none';
    detailsElement.classList.remove('show');
    span.textContent = 'Mostra dettagli';
    icon.classList.remove('fa-chevron-up');
    icon.classList.add('fa-chevron-down');
  }
};