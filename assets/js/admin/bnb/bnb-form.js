// bnb-form.js - Gestione bigliettini BnB
import { db } from "../../common/firebase-config.js";
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { AuthService } from "../../auth/auth.js";
import { showToast } from "../../common/utils.js";
import { ACTIVITY_TYPES } from "../../shared/activity-types.js";

let tabCount = 0;

/**
 * Inizializza le tab multiple di Bigliettini BnB
 */
export async function initBnbTabs({ navContainer, contentContainer, addTabBtn }) {
  const user = AuthService.getCurrentUser() || '';

  if (!user) {
    if (addTabBtn) addTabBtn.disabled = true;
    return;
  }

  // Carica dati necessari
  let employeesList = [];
  let bnbNames = [];
  
  try {
    const [empSnap, bnbSnap] = await Promise.all([
      getDoc(doc(db, 'Data', 'employees')),
      getDoc(doc(db, 'Data', 'bnbNomi'))
    ]);
    
    if (empSnap.exists()) {
      employeesList = empSnap.data().employees || [];
    }
    
    if (bnbSnap.exists()) {
      bnbNames = (bnbSnap.data().bnbNomi || [])
        .map(x => (typeof x === 'string' ? x : (x && x.nome)))
        .filter(Boolean);
    }
  } catch (error) {
    console.error('Errore caricamento liste BnB:', error);
    showToast('Errore caricamento configurazione BnB', 'error');
    return;
  }

  // Crea la prima tab
  createNewTab(navContainer, contentContainer, user, employeesList, bnbNames);
  
  if (addTabBtn) {
    addTabBtn.disabled = false;
    addTabBtn.addEventListener('click', () =>
      createNewTab(navContainer, contentContainer, user, employeesList, bnbNames)
    );
  }

  // Setup filtro tabella globale
  setupBnbFilter();
}

/**
 * Configura il filtro BnB
 */
function setupBnbFilter() {
  const filterBtn = document.getElementById('bnbFilterBtn');
  const dateInput = document.getElementById('bnbFilterDate');
  const tableBody = document.querySelector('#bnbTable tbody');

  if (filterBtn && dateInput && tableBody) {
    filterBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      const date = dateInput.value;
      if (!date) {
        showToast('Seleziona una data prima di filtrare', 'warning');
        return;
      }
      
      tableBody.innerHTML = '<tr><td colspan="4" class="text-center">Caricamento...</td></tr>';
      
      try {
        const rowsData = await handleBnbFilter(date);
        renderBnbFilterResults(tableBody, rowsData, date);
      } catch (error) {
        console.error('Errore filtro BnB:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Errore caricamento dati</td></tr>';
      }
    });
  }
}

/**
 * Renderizza i risultati del filtro BnB
 */
function renderBnbFilterResults(tableBody, rowsData, date) {
  if (!rowsData.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
          Nessun bigliettino per ${date}.
        </td>
      </tr>
    `;
    return;
  }
  
  tableBody.innerHTML = '';
  
  rowsData.forEach(entry => {
    // Riga principale
    const trMain = document.createElement('tr');
    ['date', 'dip1', 'dip2', 'bnb'].forEach(key => {
      const td = document.createElement('td');
      td.contentEditable = 'true';
      td.className = `${key}-cell`;
      td.textContent = entry[key] || '-';
      trMain.appendChild(td);
    });
    tableBody.appendChild(trMain);

    // Righe dettagli attività
    entry.tasks.forEach(task => {
      const trTask = document.createElement('tr');
      trTask.classList.add(task.class);
      
      // Cella vuota
      trTask.appendChild(document.createElement('td'));
      
      // Label attività
      const tdLabel = document.createElement('td');
      tdLabel.contentEditable = 'true';
      tdLabel.textContent = task.label;
      trTask.appendChild(tdLabel);
      
      // Valore
      const tdValue = document.createElement('td');
      tdValue.contentEditable = 'true';
      tdValue.textContent = task.value;
      trTask.appendChild(tdValue);
      
      // Cella vuota
      trTask.appendChild(document.createElement('td'));
      
      tableBody.appendChild(trTask);
    });

    // Sezione biancheria
    const trBiancheriaHeader = document.createElement('tr');
    trBiancheriaHeader.classList.add('section-header');
    
    const hdrTd = document.createElement('td');
    hdrTd.rowSpan = entry.biancheria.length + 1;
    hdrTd.textContent = 'Biancheria';
    trBiancheriaHeader.appendChild(hdrTd);
    
    ['Sporco', 'Pulito', 'Magazzino'].forEach(col => {
      const td = document.createElement('td');
      td.textContent = col;
      trBiancheriaHeader.appendChild(td);
    });
    
    tableBody.appendChild(trBiancheriaHeader);

    // Righe biancheria
    entry.biancheria.forEach(item => {
      const trItem = document.createElement('tr');
      ['sporco', 'pulito', 'magazzino'].forEach(prop => {
        const td = document.createElement('td');
        td.contentEditable = 'true';
        td.textContent = item[prop] || 0;
        trItem.appendChild(td);
      });
      tableBody.appendChild(trItem);
    });
  });
}

/**
 * Crea una nuova tab BnB
 */
function createNewTab(navContainer, contentContainer, name, employeesList, bnbNames) {
  const idx = tabCount++;
  const tabId = `bnbTab-${idx}`;
  const tabNavId = `bnbTabNav-${idx}`;

  // Bottone di navigazione
  const li = document.createElement('li');
  li.className = 'nav-item';
  li.role = 'presentation';
  li.innerHTML = `
    <button
      class="nav-link ${idx === 0 ? 'active' : ''}"
      id="${tabNavId}"
      data-bs-toggle="tab"
      data-bs-target="#${tabId}"
      type="button"
      role="tab"
      aria-controls="${tabId}"
      aria-selected="${idx === 0}"
    >
      Bigliettino ${idx + 1}
    </button>
  `;
  navContainer.appendChild(li);

  // Clona template e configura
  const template = document.getElementById('bnb-form-template');
  if (!template) {
    console.error('Template bnb-form-template non trovato');
    return;
  }

  const pane = template.content.firstElementChild.cloneNode(true);
  pane.id = tabId;
  pane.setAttribute('aria-labelledby', tabNavId);
  if (idx === 0) pane.classList.add('show', 'active');
  contentContainer.appendChild(pane);

  // Configura il form
  setupBnbForm(pane, idx, name, employeesList, bnbNames);
}

/**
 * Configura il form BnB
 */
function setupBnbForm(pane, idx, name, employeesList, bnbNames) {
  // Imposta ID messaggi
  const msgEl = pane.querySelector('.bnb-message');
  msgEl.id = `bnbMessage-${idx}`;

  // Previeni submit nativo
  const formEl = pane.querySelector('.bnb-form');
  formEl.addEventListener('submit', e => e.preventDefault());

  // Pulsanti
  const btnSave = pane.querySelector('.btn-save');
  btnSave.type = 'button';
  btnSave.addEventListener('click', () => handleBnbSubmit(idx));

  const btnClose = pane.querySelector('.btn-close');
  btnClose.type = 'button';
  btnClose.addEventListener('click', () => closeTab(idx));

  // Configura campi
  setupBnbFormFields(pane, idx, name, employeesList, bnbNames);
}

/**
 * Configura i campi del form BnB
 */
function setupBnbFormFields(pane, idx, name, employeesList, bnbNames) {
  // Data e BnB
  const dateInput = pane.querySelector('.bnbDate');
  dateInput.id = `bnbDate-${idx}`;
  
  const bnbSelect = pane.querySelector('.bnbSelect');
  bnbSelect.id = `bnbSelect-${idx}`;
  populateSelectOptions(bnbSelect.id, bnbNames);

  // Dipendenti
  const dip1 = pane.querySelector('.dip1Input');
  dip1.id = `dip1Input-${idx}`;
  dip1.value = name;
  
  const dip2 = pane.querySelector('.dip2Input');
  dip2.id = `dip2Input-${idx}`;
  const empNames = employeesList.map(x => typeof x === 'string' ? x : x.name);
  populateSelectOptions(dip2.id, empNames, true);

  // Task generali
  const taskRanges = {
    checkoutSelect: [0, 4],
    refreshSelect: [0, 4],
    refreshProfondoSelect: [0, 4],
    areaComuneSelect: [0, 1],
    ciabattineSelect: [0, 8],
    oreExtraSelect: [0, 2]
  };
  
  Object.entries(taskRanges).forEach(([cls, [min, max]]) => {
    const sel = pane.querySelector(`.${cls}`);
    sel.id = `${cls}-${idx}`;
    generateSelectRange(sel.id, min, max);
  });

  // Auto-popolamento checkout → biancheria
  const checkoutSelect = pane.querySelector(`#checkoutSelect-${idx}`);
  if (checkoutSelect) {
    checkoutSelect.addEventListener('change', (e) => {
      const n = parseInt(e.target.value, 10) || 0;
      
      const multipliers = {
        matrimoniale: 3,
        federa: 4,
        viso: 2,
        corpo: 2,
        bidet: 2,
        scendiBagno: 1,
      };

      Object.entries(multipliers).forEach(([field, factor]) => {
        const count = factor * n;
        const sporcoEl = document.getElementById(`${field}Sporco-${idx}`);
        const pulitoEl = document.getElementById(`${field}Pulito-${idx}`);
        const magazzinoEl = document.getElementById(`${field}Magazzino-${idx}`);

        if (sporcoEl) sporcoEl.value = count;
        if (pulitoEl) pulitoEl.value = count;
        if (magazzinoEl) magazzinoEl.value = 0;
      });
    });
  }

  // Biancheria
  ['matrimoniale', 'federa', 'viso', 'corpo', 'bidet', 'scendiBagno'].forEach(field => {
    ['Sporco', 'Pulito', 'Magazzino'].forEach(type => {
      const sel = pane.querySelector(`.${field + type}`);
      sel.id = `${field + type}-${idx}`;
      generateSelectRange(sel.id, 0, 16);
    });
  });
}

/**
 * Gestisce il salvataggio del bigliettino
 */
async function handleBnbSubmit(idx) {
  const messageEl = document.getElementById(`bnbMessage-${idx}`);
  messageEl.classList.add('d-none');

  const date = document.getElementById(`bnbDate-${idx}`).value;
  const bnb = document.getElementById(`bnbSelect-${idx}`).value;
  const dip2 = document.getElementById(`dip2Input-${idx}`).value;
  const dip1 = AuthService.getCurrentUser() || '';
  
  document.getElementById(`dip1Input-${idx}`).value = dip1;

  if (!date || !bnb || !dip1) {
    showBnbMessage(messageEl, 'Compila i campi obbligatori (data, BnB, Dipendente 1).', 'alert-danger');
    return;
  }

  const entryData = {
    dip1,
    dip2: dip2 || '',
    checkout: parseInt(document.getElementById(`checkoutSelect-${idx}`).value, 10) || 0,
    refresh: parseInt(document.getElementById(`refreshSelect-${idx}`).value, 10) || 0,
    refreshProfondo: parseInt(document.getElementById(`refreshProfondoSelect-${idx}`).value, 10) || 0,
    areaComune: parseInt(document.getElementById(`areaComuneSelect-${idx}`).value, 10) || 0,
    ciabattine: parseInt(document.getElementById(`ciabattineSelect-${idx}`).value, 10) || 0,
    oreExtra: parseInt(document.getElementById(`oreExtraSelect-${idx}`).value, 10) || 0,
    sporco: getSezione('Sporco', idx),
    pulito: getSezione('Pulito', idx),
    magazzino: getSezione('Magazzino', idx),
    timestamp: new Date().toISOString(),
  };

  const safeKey = bnb.replace(/\./g, '_');

  try {
    const refDoc = doc(db, 'Bigliettini', date);
    const docSnap = await getDoc(refDoc);
    const docData = docSnap.exists() ? docSnap.data() : {};
    
    docData[safeKey] = entryData;
    await setDoc(refDoc, docData);

    showBnbMessage(messageEl, 'Bigliettino salvato con successo!', 'alert-success');
  } catch (error) {
    console.error('Errore salvataggio bigliettino:', error);
    showBnbMessage(messageEl, 'Errore durante il salvataggio.', 'alert-danger');
  }
}

/**
 * Filtra i bigliettini per data
 */
export async function handleBnbFilter(filterDate) {
  if (!filterDate) return [];

  try {
    const refDoc = doc(db, 'Bigliettini', filterDate);
    const docSnap = await getDoc(refDoc);
    
    if (!docSnap.exists()) return [];

    const data = docSnap.data();
    return Object.entries(data).map(([safeKey, details]) => {
      const bnbName = safeKey.replace(/_/g, '.');

      const tasks = [
        { label: 'Check-Out:', value: details.checkout || 0, class: 'row-checkout' },
        { label: 'Refresh:', value: details.refresh || 0, class: 'row-refresh' },
        { label: 'Refresh Profondo:', value: details.refreshProfondo || 0, class: 'row-refresh-profondo' },
        { label: 'Area Comune:', value: details.areaComune || 0, class: 'row-area-comune' },
        { label: 'Ciabattine:', value: details.ciabattine || 0, class: 'row-ciabattine' },
        { label: 'Ore Extra:', value: details.oreExtra || 0, class: 'row-ore-extra' },
      ];

      const fields = ['matrimoniale', 'federa', 'viso', 'corpo', 'bidet', 'scendiBagno'];
      const biancheria = fields.map(f => ({
        sporco: details.sporco?.[f] ?? 0,
        pulito: details.pulito?.[f] ?? 0,
        magazzino: details.magazzino?.[f] ?? 0,
      }));

      return {
        date: filterDate,
        dip1: details.dip1,
        dip2: details.dip2,
        bnb: bnbName,
        tasks,
        biancheria,
      };
    });
  } catch (error) {
    console.error('Errore handleBnbFilter:', error);
    return [];
  }
}

/**
 * Utility functions
 */
function closeTab(idx) {
  const tabNav = document.getElementById(`bnbTabNav-${idx}`);
  const tabPane = document.getElementById(`bnbTab-${idx}`);
  
  if (tabNav) {
    const li = tabNav.closest('li');
    if (li) li.remove();
  }
  if (tabPane) {
    tabPane.remove();
  }
  
  const anyNav = document.querySelector('#bnbTabsNav .nav-link');
  if (anyNav) new bootstrap.Tab(anyNav).show();
}

function populateSelectOptions(selectId, arr, allowEmpty = false) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  
  sel.innerHTML = '';
  
  if (allowEmpty) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '— Seleziona —';
    sel.appendChild(empty);
  }
  
  arr.forEach((val) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    sel.appendChild(opt);
  });
}

function generateSelectRange(selectId, min, max) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  
  sel.innerHTML = '';
  
  for (let i = min; i <= max; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    sel.appendChild(opt);
  }
}

function getSezione(tipo, idx) {
  const fields = ['matrimoniale', 'federa', 'viso', 'corpo', 'bidet', 'scendiBagno'];
  const result = {};
  
  fields.forEach((f) => {
    const sel = document.getElementById(`${f}${tipo}-${idx}`);
    result[f] = parseInt(sel?.value, 10) || 0;
  });
  
  return result;
}

function showBnbMessage(messageEl, text, className) {
  messageEl.textContent = text;
  messageEl.className = `${className} mt-3`;
  messageEl.classList.remove('d-none');
}