// admin-data.js - Gestione dati amministrativi
import { getCollection, updateDoc } from "../../common/firestore-service.js";

const tabList = document.getElementById('groupTabs');
const tabContent = document.getElementById('groupTabContent');
const addBtn = document.getElementById('add-group');

let docs = [];
let currentGroup = null;
const complexGroups = ['irene', 'cerrano', 'lorenza', 'molino'];
const fieldOrder = ['nome', 'indirizzo', 'composizione', 'ospiti', 'ore', 'note', 'mappa'];

/**
 * Inizializzazione
 */
async function init() {
  try {
    docs = await getCollection('Data');
    renderTabs(docs);
    if (docs.length) selectTab(docs[0].id);
  } catch (error) {
    console.error('Errore inizializzazione admin-data:', error);
  }
}

/**
 * Renderizza le tab
 */
function renderTabs(list) {
  tabList.innerHTML = '';
  tabContent.innerHTML = '';
  
  list.forEach((doc, i) => {
    const id = doc.id;
    
    // Tab button
    const btn = document.createElement('button');
    btn.className = `nav-link${i === 0 ? ' active' : ''}`;
    btn.dataset.bsToggle = 'tab';
    btn.dataset.bsTarget = `#pane-${id}`;
    btn.type = 'button';
    btn.role = 'tab';
    btn.textContent = id;
    btn.onclick = () => selectTab(id);
    tabList.appendChild(btn);

    // Tab pane
    const pane = document.createElement('div');
    pane.className = `tab-pane fade${i === 0 ? ' show active' : ''}`;
    pane.id = `pane-${id}`;
    pane.role = 'tabpanel';
    tabContent.appendChild(pane);
  });
}

/**
 * Seleziona una tab e renderizza il contenuto
 */
function selectTab(id) {
  currentGroup = id;
  
  // Aggiorna stato attivo delle tab
  Array.from(tabList.children).forEach(btn => {
    btn.classList.toggle('active', btn.textContent === id);
  });
  
  const doc = docs.find(d => d.id === id);
  const pane = document.getElementById(`pane-${id}`);
  pane.innerHTML = '';
  
  const data = doc[id] || [];

  // Gestione dati semplici (non array)
  if (!Array.isArray(data)) {
    renderSimpleData(pane, id, data);
    return;
  }

  // Gestione dati complessi (appartamenti)
  if (complexGroups.includes(id)) {
    renderComplexData(pane, id, data);
  } else {
    renderTableData(pane, id, data);
  }
}

/**
 * Renderizza dati semplici (stringhe, numeri)
 */
function renderSimpleData(pane, id, data) {
  pane.innerHTML = `
    <div class="input-group mb-3">
      <input id="field-${id}" class="form-control" value="${data}" style="width:100% !important;">
      <button id="save-prim" class="btn btn-success">
        <i class="fas fa-save me-1"></i>Salva
      </button>
    </div>
  `;
  
  pane.querySelector('#save-prim').onclick = async () => {
    const val = pane.querySelector(`#field-${id}`).value;
    try {
      await updateDoc('Data', id, { [id]: val });
      alert('✅ Salvato con successo');
    } catch (error) {
      alert('❌ Errore durante il salvataggio');
    }
  };
}

/**
 * Renderizza dati complessi (appartamenti)
 */
function renderComplexData(pane, id, data) {
  data.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    card.innerHTML = `
      <div class="card-header d-flex justify-content-between">
        <strong>Elemento ${idx + 1}</strong>
        <div>
          <button class="btn btn-sm btn-info edit-item" data-idx="${idx}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-success save-item" data-idx="${idx}">
            <i class="fas fa-save"></i>
          </button>
          <button class="btn btn-sm btn-danger del-item" data-idx="${idx}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="card-body row gx-2 gy-3"></div>
    `;
    
    const body = card.querySelector('.card-body');
    const keys = Object.keys(item);
    const ordered = fieldOrder.filter(k => keys.includes(k))
                              .concat(keys.filter(k => !fieldOrder.includes(k)));
    
    ordered.forEach(key => {
      const form = document.createElement('div');
      form.className = 'col-12';
      const value = Array.isArray(item[key]) ? item[key].join('\n') : (item[key] ?? '');
      
      form.innerHTML = `
        <label class="form-label text-capitalize">${key}</label>
        <textarea class="form-control editable-complex-field" 
                  data-field="${key}" data-idx="${idx}" 
                  rows="2" style="width:100% !important;" disabled>${value}</textarea>
      `;
      body.appendChild(form);
    });
    
    pane.appendChild(card);
  });

  // Pulsante aggiungi elemento
  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-sm btn-primary';
  addBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Aggiungi elemento';
  addBtn.onclick = async () => {
    data.push({});
    await updateDoc('Data', id, { [id]: data });
    selectTab(id);
  };
  pane.appendChild(addBtn);

  // Setup event listeners per elementi complessi
  setupComplexDataListeners(pane, id, data);
}

/**
 * Renderizza dati tabellari
 */
function renderTableData(pane, id, data) {
  const keys = Array.from(new Set(data.flatMap(o => Object.keys(o))));
  
  const table = document.createElement('table');
  table.className = 'table table-sm';
  table.innerHTML = `
    <thead>
      <tr>
        ${keys.map(k => `<th>${k}</th>`).join('')}
        <th>Azioni</th>
      </tr>
    </thead>
  `;
  
  const tbody = document.createElement('tbody');
  
  data.forEach((item, idx) => {
    const tr = document.createElement('tr');
    
    keys.forEach(k => {
      tr.innerHTML += `
        <td>
          <input class="form-control form-control-sm editable-field" 
                 data-field="${k}" data-idx="${idx}" 
                 value="${item[k] ?? ''}" style="width:100% !important;">
        </td>
      `;
    });
    
    tr.innerHTML += `
      <td>
        <button class="btn btn-sm btn-success save-row" data-idx="${idx}">
          <i class="fas fa-save"></i>
        </button>
        <button class="btn btn-sm btn-danger del-row" data-idx="${idx}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  pane.appendChild(table);

  // Pulsante aggiungi riga
  const addRow = document.createElement('button');
  addRow.className = 'btn btn-sm btn-primary mt-2';
  addRow.innerHTML = '<i class="fas fa-plus me-1"></i>Aggiungi riga';
  addRow.onclick = async () => {
    data.push({});
    await updateDoc('Data', id, { [id]: data });
    selectTab(id);
  };
  pane.appendChild(addRow);

  // Setup event listeners per tabella
  setupTableDataListeners(pane, id, data, keys);
}

/**
 * Setup listeners per dati complessi
 */
function setupComplexDataListeners(pane, id, data) {
  pane.querySelectorAll('.edit-item').forEach(btn => {
    btn.onclick = () => {
      const idx = +btn.dataset.idx;
      const card = btn.closest('.card');
      const textareas = card.querySelectorAll('.editable-complex-field');
      
      textareas.forEach(textarea => {
        textarea.disabled = !textarea.disabled;
        if (!textarea.disabled) {
          textarea.style.backgroundColor = '#495057';
          textarea.style.borderColor = '#0d6efd';
          textarea.style.color = '#fff';
        } else {
          textarea.style.backgroundColor = '';
          textarea.style.borderColor = '';
          textarea.style.color = '';
        }
      });
      
      btn.innerHTML = textareas[0].disabled ? '<i class="fas fa-edit"></i>' : '<i class="fas fa-lock"></i>';
      btn.className = textareas[0].disabled ? 'btn btn-sm btn-info edit-item' : 'btn btn-sm btn-warning edit-item';
    };
  });

  pane.querySelectorAll('.save-item').forEach(btn => {
    btn.onclick = async () => {
      const idx = +btn.dataset.idx;
      const card = btn.closest('.card');
      
      card.querySelectorAll('[data-field]').forEach(el => {
        const field = el.dataset.field;
        const raw = el.value.trim();
        
        if (field === 'composizione' || field === 'note') {
          data[idx][field] = raw.split(/\r?\n/).map(s => s.trim()).filter(s => s);
        } else if (field === 'ospiti') {
          data[idx][field] = parseInt(raw, 10) || 0;
        } else if (field === 'ore') {
          data[idx][field] = parseFloat(raw) || 0;
        } else {
          data[idx][field] = raw;
        }
      });
      
      try {
        await updateDoc('Data', id, { [id]: data });
        alert('✅ Elemento salvato');
        
        // Disabilita campi dopo salvataggio
        const textareas = card.querySelectorAll('.editable-complex-field');
        textareas.forEach(textarea => {
          textarea.disabled = true;
          textarea.style.backgroundColor = '';
          textarea.style.borderColor = '';
          textarea.style.color = '';
        });
        
        const editBtn = card.querySelector('.edit-item');
        if (editBtn) {
          editBtn.innerHTML = '<i class="fas fa-edit"></i>';
          editBtn.className = 'btn btn-sm btn-info edit-item';
        }
      } catch (error) {
        alert('❌ Errore durante il salvataggio');
      }
    };
  });

  pane.querySelectorAll('.del-item').forEach(btn => {
    btn.onclick = async () => {
      const idx = +btn.dataset.idx;
      if (!confirm('Eliminare questo elemento?')) return;
      
      data.splice(idx, 1);
      await updateDoc('Data', id, { [id]: data });
      selectTab(id);
    };
  });
}

/**
 * Setup listeners per dati tabellari
 */
function setupTableDataListeners(pane, id, data, keys) {
  pane.querySelectorAll('.save-row').forEach(btn => {
    btn.onclick = async () => {
      const idx = +btn.dataset.idx;
      const updated = {};
      
      keys.forEach(k => {
        const el = pane.querySelector(`[data-field="${k}"][data-idx="${idx}"]`);
        updated[k] = el.value;
      });
      
      data[idx] = updated;
      
      try {
        await updateDoc('Data', currentGroup, { [currentGroup]: data });
        alert('✅ Riga salvata');
      } catch (error) {
        alert('❌ Errore durante il salvataggio');
      }
    };
  });

  pane.querySelectorAll('.del-row').forEach(btn => {
    btn.onclick = async () => {
      const idx = +btn.dataset.idx;
      if (!confirm('Eliminare questa riga?')) return;
      
      data.splice(idx, 1);
      await updateDoc('Data', currentGroup, { [currentGroup]: data });
      selectTab(currentGroup);
    };
  });
}

// Event listener per aggiunta nuovo gruppo
if (addBtn) {
  addBtn.onclick = async () => {
    const name = prompt('ID nuovo gruppo:');
    if (!name) return;
    
    try {
      await updateDoc('Data', name, { [name]: [] });
      init();
    } catch (error) {
      alert('❌ Errore durante la creazione del gruppo');
    }
  };
}

// Inizializzazione
init();