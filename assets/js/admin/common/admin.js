import { AuthService } from "../../auth/auth.js";
import { FirestoreService } from "../../common/firestore-service.js";
import { exportToExcel } from "../../common/export-excel.js";
import {
  calculateTotalMinutes,
  formatDecimalHours
} from '../../common/time-utilis.js';


let currentData = {};

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', async () => {
  // Controlla autenticazione
  if (!AuthService.checkAuth() || !AuthService.isAdmin()) {
    window.location.href = 'login.html';
    return;
  }

  // UI elements
  const userDisplay = document.getElementById('userDisplay');
  const logoutBtn = document.getElementById('logoutBtn');
  const empSelect = document.getElementById('employeeSelect');
  const monthSelect = document.getElementById('monthSelect');
  const exportBtn = document.getElementById('exportBtn');
  const summaryDiv = document.getElementById('summaryContainer');
  const detailDiv = document.getElementById('dayDetail');

  // Mostra utente e logout
  const user = AuthService.getCurrentUser();
  userDisplay.textContent = `${user} (Admin)`;
  logoutBtn.onclick = () => AuthService.logout();

  // Popola employee select da Firestore
  try {
    const employees = await FirestoreService.getEmployees();
    empSelect.add(new Option('Tutti i dipendenti', 'all'));
    employees.sort((a, b) => a.name.localeCompare(b.name, 'it'))
      .forEach(emp => empSelect.add(new Option(emp.name, emp.name)));
  } catch (err) {
    console.error('Errore caricamento dipendenti:', err);
    showAlert('Impossibile caricare elenco dipendenti', 'danger');
  }

  // Popola ultimi 12 mesi
  (function populateMonths() {
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
      const opt = new Option(label, val);
      if (i === 0) opt.selected = true;
      monthSelect.add(opt);
    }
  })();

  // Event listeners
  empSelect.onchange = loadData;
  monthSelect.onchange = loadData;
  exportBtn.onclick = () => {
    if (!currentData || !Object.keys(currentData).length) {
      showAlert('Nessun dato da esportare', 'warning');
      return;
    }
    const [year, month] = monthSelect.value.split('-');
    exportToExcel(currentData, year, Number(month));
  };

  // Carica dati iniziali
  await loadData();
});

/**
 * Carica e visualizza il summary mensile
 */
async function loadData() {
  const summaryDiv = document.getElementById('summaryContainer');
  summaryDiv.innerHTML = '<p class="text-center">Caricamento...</p>';
  const empSelect = document.getElementById('employeeSelect');
  const monthSelect = document.getElementById('monthSelect');
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
    if (!result.success) throw new Error('Fetch fallita');

    // include tutti i dipendenti (anche con days = {})
    currentData = result.data;
    renderSummary(currentData, year, Number(month));
  } catch (err) {
    console.error('Errore loadData:', err);
    document.getElementById('summaryContainer').innerHTML = '<p class="text-danger text-center">Errore caricamento dati</p>';
  }
}

/**
 * Renderizza il summary nella pagina
 */
function renderSummary(data, year, month) {
  const summaryDiv = document.getElementById('summaryContainer');
  const detailDiv = document.getElementById('dayDetail');

  if (!Object.keys(data).length) {
    summaryDiv.innerHTML = '<p class="text-center text-muted">Nessun dato disponibile</p>';
    detailDiv.innerHTML = '<p class="text-center text-muted">Seleziona un giorno</p>';
    return;
  }

  summaryDiv.innerHTML = Object.entries(data)
    .map(([name, days], idx) => {
      const stats = calcStats(days);
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
      </div>`).join('');

      const rowsHtml = Array.from(
        { length: new Date(year, month, 0).getDate() },
        (_, i) => i + 1
      )
        .filter(d => new Date(year, month - 1, d) <= new Date())
        .map(d => formatRow(name, days, year, month, d))
        .join('');

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
      </div>`;
    })
    .join('');


  // Attacca listener bottoni di dettaglio
  summaryDiv.querySelectorAll('.view-btn').forEach(btn => btn.onclick = onViewDetail);
}

window.toggleEmployeeDetails = function(toggleId, buttonElement) {
  const detailsElement = document.getElementById(toggleId);
  const icon = buttonElement.querySelector('i');
  const span = buttonElement.querySelector('span');
  
  if (detailsElement.style.display === 'none' || detailsElement.style.display === '') {
    // Apri i dettagli
    detailsElement.style.display = 'block';
    detailsElement.classList.add('show');
    span.textContent = 'Nascondi dettagli';
    icon.classList.remove('fa-chevron-down');
    icon.classList.add('fa-chevron-up');
  } else {
    // Chiudi i dettagli
    detailsElement.style.display = 'none';
    detailsElement.classList.remove('show');
    span.textContent = 'Mostra dettagli';
    icon.classList.remove('fa-chevron-up');
    icon.classList.add('fa-chevron-down');
  }
};

/**
 * Calcola statistiche mensili con ore decimali
 */
function calcStats(days) {
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
 * Genera riga tabella per singolo giorno
 */
function formatRow(name, days, year, month, dayNum) {
  const date = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  const weekday = new Date(date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
  const d = days[date] || {};
  let status = '', hours = '';
  if (d.malattia) status = '<span class="badge bg-danger">Malattia</span>';
  else if (d.ferie) status = '<span class="badge bg-info">Ferie</span>';
  else if (d.riposo) status = '<span class="badge bg-warning text-dark">Riposo</span>';
  else if (Array.isArray(d.attività) && d.attività.length) {
    const flat = d.attività.map(a => ({
      minutes: parseInt(a.minuti, 10) || 0,
      multiplier: parseInt(a.moltiplicatore, 10) || 1,
      people: parseInt(a.persone, 10) || 1
    }));
    const raw = calculateTotalMinutes(flat);
    const dec = formatDecimalHours(raw, 2);
    hours = dec.toLocaleString('it-IT', { minimumFractionDigits: 2 });
  }

  return `
    <tr data-date="${date}" data-emp="${name}">
      <td>${weekday}</td>
      <td>${hours}</td>
      <td>${status}</td>
      <td><button class="btn btn-sm btn-outline-secondary view-btn">Visualizza</button></td>
    </tr>`;
}

/**
 * Gestisce click su "Visualizza" per dettaglio giorno
 */
async function onViewDetail(e) {
  const tr = e.currentTarget.closest('tr');
  const date = tr.dataset.date;
  const emp = tr.dataset.emp;
  let dayData = {};
  try {
    const res = await FirestoreService.getEmployeeDay(emp, date);
    dayData = res.success ? res.data : {};
  } catch { }
  showDayModal(emp, date, dayData);
}

/**
 * Mostra modal di modifica giornaliera
 */
function showDayModal(emp, date, day) {
  const container = document.getElementById('dayDetail');
  const title = new Date(date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  let html = `<h4>${emp} - ${title}</h4>`;
  ['riposo', 'ferie', 'malattia'].forEach(key => {
    if (day[key]) {
      const cls = key === 'ferie' ? 'info' : key === 'malattia' ? 'danger' : 'warning';
      html += `<div class="alert alert-${cls}">${key.charAt(0).toUpperCase() + key.slice(1)}</div>`;
    }
  });
  html += `
    <form id="editForm">
      <div class="table-responsive">
        <table class="table table-bordered">
          <thead><tr><th>Attività</th><th>Min</th><th>Pers</th><th>Mol</th><th>Azioni</th></tr></thead>
          <tbody id="actBody">
`;
  (day.attività || []).forEach((a, i) => {
    html += `
      <tr>
        <td><input type="text" name="nome_${i}" class="form-control" value="${a.nome || ''}"></td>
        <td><input type="number" name="minuti_${i}" class="form-control" value="${a.minuti || 0}"></td>
        <td><input type="number" name="persone_${i}" class="form-control" value="${a.persone || 1}"></td>
        <td><input type="number" step="0.1" name="moltiplicatore_${i}" class="form-control" value="${a.moltiplicatore || 1}"></td>
        <td><button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('tr').remove()">Elim</button></td>
      </tr>`;
  });
  html += `
          </tbody>
        </table>
      </div>
      <button type="button" id="addAct" class="btn btn-outline-secondary mb-2">Aggiungi</button>
      <button type="submit" class="btn btn-success">Salva</button>
    </form>`;
  container.innerHTML = html;
  const modalEl = document.getElementById('dayDetailModal');
  new bootstrap.Modal(modalEl).show();

  document.getElementById('addAct').onclick = () => {
    const body = document.getElementById('actBody');
    const idx = body.children.length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" name="nome_${idx}" class="form-control"></td>
      <td><input type="number" name="minuti_${idx}" class="form-control" value="0"></td>
      <td><input type="number" name="persone_${idx}" class="form-control" value="1"></td>
      <td><input type="number" step="0.1" name="moltiplicatore_${idx}" class="form-control" value="1"></td>
      <td><button type="button" class="btn btn-outline-secondary btn-sm" onclick="this.closest('tr').remove()">Elim</button></td>
    `;
    body.appendChild(tr);
  };

  document.getElementById('editForm').onsubmit = async ev => {
    ev.preventDefault();
    const fm = new FormData(ev.target);
    const acts = Array.from(document.getElementById('actBody').children).map((r, i) => ({
      nome: fm.get(`nome_${i}`),
      minuti: +fm.get(`minuti_${i}`),
      persone: +fm.get(`persone_${i}`),
      moltiplicatore: +fm.get(`moltiplicatore_${i}`)
    })).filter(a => a.nome);
    try {
      await FirestoreService.saveEmployeeDay(emp, date, { ...day, attività: acts });
      alert('Salvato');
      loadData();
      bootstrap.Modal.getInstance(modalEl).hide();
    } catch {
      alert('Errore salvataggio');
    }
  };
}

/**
 * Utility per messaggi temporanei
 */
function showAlert(msg, type = 'info') {
  const a = document.createElement('div');
  a.className = `alert alert-${type} fixed-top m-3`;
  a.textContent = msg;
  document.body.append(a);
  setTimeout(() => a.remove(), 4000);
}