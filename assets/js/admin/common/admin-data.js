import {
  getCollection,
  updateDoc,
  deleteDoc
} from "../../common/firestore-service.js";

const tabList = document.getElementById('groupTabs');
const tabContent = document.getElementById('groupTabContent');
const addBtn = document.getElementById('add-group');

let docs = [], currentGroup = null;

async function init() {
  docs = await getCollection('Data');
  
  // Assicuriamoci che esistano le collezioni base
  await ensureBaseCollections();
  
  // Ricarica dopo aver creato le collezioni base
  docs = await getCollection('Data');
  renderTabs(docs);
  if (docs.length) selectTab(docs[0].id);
}

async function ensureBaseCollections() {
  const requiredCollections = ['employees', 'categories'];
  
  for (const collName of requiredCollections) {
    const exists = docs.find(d => d.id === collName);
    if (!exists) {
      const defaultData = collName === 'employees' 
        ? { employees: [] }
        : { categories: [] };
      await updateDoc('Data', collName, defaultData);
    }
  }
}

function renderTabs(list) {
  tabList.innerHTML = '';
  tabContent.innerHTML = '';
  
  // Ordina le tab: employees e categories per prime
  const sortedList = list.sort((a, b) => {
    const priority = { employees: 1, categories: 2 };
    const aPriority = priority[a.id] || 999;
    const bPriority = priority[b.id] || 999;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.id.localeCompare(b.id);
  });

  sortedList.forEach((doc, i) => {
    const id = doc.id;
    const displayName = getDisplayName(id);
    
    const btn = document.createElement('button');
    btn.className = `nav-link${i === 0 ? ' active' : ''}`;
    btn.dataset.bsToggle = 'tab';
    btn.dataset.bsTarget = `#pane-${id}`;
    btn.type = 'button';
    btn.role = 'tab';
    btn.textContent = displayName;
    btn.onclick = () => selectTab(id);
    tabList.appendChild(btn);

    const pane = document.createElement('div');
    pane.className = `tab-pane fade${i === 0 ? ' show active' : ''}`;
    pane.id = `pane-${id}`;
    pane.role = 'tabpanel';
    tabContent.appendChild(pane);
  });
}

function getDisplayName(id) {
  const displayNames = {
    employees: 'Dipendenti',
    categories: 'Categorie Attività'
  };
  return displayNames[id] || id.charAt(0).toUpperCase() + id.slice(1);
}

function selectTab(id) {
  currentGroup = id;
  Array.from(tabList.children).forEach(btn => {
    btn.classList.toggle('active', btn.textContent === getDisplayName(id));
  });
  
  const doc = docs.find(d => d.id === id);
  const pane = document.getElementById(`pane-${id}`);
  pane.innerHTML = '';
  
  if (id === 'employees') {
    renderEmployeesManager(pane, doc);
  } else if (id === 'categories') {
    renderCategoriesManager(pane, doc);
  } else {
    renderGenericManager(pane, doc, id);
  }
}

function renderEmployeesManager(pane, doc) {
  const employees = doc?.employees || [];
  
  let html = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4><i class="fas fa-users me-2"></i>Gestione Dipendenti</h4>
      <button class="btn btn-primary" onclick="addEmployee()">
        <i class="fas fa-plus me-1"></i>Aggiungi Dipendente
      </button>
    </div>
  `;

  if (employees.length === 0) {
    html += `
      <div class="alert alert-info">
        <i class="fas fa-info-circle me-2"></i>
        Nessun dipendente configurato. Clicca "Aggiungi Dipendente" per iniziare.
      </div>
    `;
  } else {
    html += `
      <div class="table-responsive">
        <table class="table table-dark table-striped table-hover">
          <thead class="table-primary">
            <tr>
              <th><i class="fas fa-user me-1"></i>Nome</th>
              <th><i class="fas fa-key me-1"></i>Password</th>
              <th><i class="fas fa-cogs me-1"></i>Azioni</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    employees.forEach((emp, index) => {
      html += `
        <tr>
          <td>
            <input type="text" class="form-control form-control-sm bg-secondary text-light border-0" 
                   value="${emp.name || ''}" data-field="name" data-index="${index}">
          </td>
          <td>
            <input type="text" class="form-control form-control-sm bg-secondary text-light border-0" 
                   value="${emp.password || ''}" data-field="password" data-index="${index}">
          </td>
          <td>
            <button class="btn btn-sm btn-success me-1" onclick="saveEmployee(${index})">
              <i class="fas fa-save"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${index})">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  }
  
  pane.innerHTML = html;
}

function renderCategoriesManager(pane, doc) {
  const categories = doc?.categories || [];
  
  let html = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4><i class="fas fa-tags me-2"></i>Gestione Categorie Attività</h4>
      <button class="btn btn-primary" onclick="addCategory()">
        <i class="fas fa-plus me-1"></i>Aggiungi Categoria
      </button>
    </div>
  `;

  if (categories.length === 0) {
    html += `
      <div class="alert alert-info">
        <i class="fas fa-info-circle me-2"></i>
        Nessuna categoria configurata. Clicca "Aggiungi Categoria" per iniziare.
      </div>
    `;
  } else {
    categories.forEach((category, catIndex) => {
      html += `
        <div class="card mb-4 bg-dark border-secondary">
          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0">
              <i class="fas fa-folder me-2"></i>
              <input type="text" class="form-control form-control-sm d-inline-block bg-transparent border-0 text-white" 
                     style="width: auto; min-width: 200px;" 
                     value="${category.name || ''}" data-field="name" data-category="${catIndex}">
            </h5>
            <div>
              <button class="btn btn-sm btn-success me-1" onclick="saveCategory(${catIndex})">
                <i class="fas fa-save"></i>
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteCategory(${catIndex})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h6><i class="fas fa-list me-1"></i>Attività</h6>
              <button class="btn btn-sm btn-outline-primary" onclick="addActivity(${catIndex})">
                <i class="fas fa-plus me-1"></i>Aggiungi Attività
              </button>
            </div>
      `;
      
      const activities = category.activities || [];
      if (activities.length === 0) {
        html += `
          <div class="alert alert-secondary">
            <i class="fas fa-info-circle me-2"></i>
            Nessuna attività in questa categoria.
          </div>
        `;
      } else {
        html += `
          <div class="table-responsive">
            <table class="table table-sm table-dark table-striped">
              <thead class="table-secondary">
                <tr>
                  <th><i class="fas fa-tasks me-1"></i>Nome Attività</th>
                  <th><i class="fas fa-clock me-1"></i>Minuti</th>
                  <th><i class="fas fa-cogs me-1"></i>Azioni</th>
                </tr>
              </thead>
              <tbody>
        `;
        
        activities.forEach((activity, actIndex) => {
          html += `
            <tr>
              <td>
                <input type="text" class="form-control form-control-sm bg-secondary text-light border-0" 
                       value="${activity.name || ''}" data-field="activityName" 
                       data-category="${catIndex}" data-activity="${actIndex}">
              </td>
              <td>
                <input type="number" class="form-control form-control-sm bg-secondary text-light border-0" 
                       value="${activity.minutes || 0}" data-field="activityMinutes" 
                       data-category="${catIndex}" data-activity="${actIndex}" min="1">
              </td>
              <td>
                <button class="btn btn-sm btn-success me-1" onclick="saveActivity(${catIndex}, ${actIndex})">
                  <i class="fas fa-save"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteActivity(${catIndex}, ${actIndex})">
                  <i class="fas fa-trash"></i>
                </button>
              </td>
            </tr>
          `;
        });
        
        html += `
              </tbody>
            </table>
          </div>
        `;
      }
      
      html += `
          </div>
        </div>
      `;
    });
  }
  
  pane.innerHTML = html;
}

function renderGenericManager(pane, doc, id) {
  const data = doc?.[id] || [];
  
  if (!Array.isArray(data)) {
    pane.innerHTML = `
      <div class="input-group mb-3">
        <input id="field-${id}" class="form-control bg-secondary text-light border-0" 
               value="${data}" style="width:100% !important;">
        <button id="save-prim" class="btn btn-success">
          <i class="fas fa-save me-1"></i>Salva
        </button>
      </div>`;
    pane.querySelector('#save-prim').onclick = async () => {
      const val = pane.querySelector(`#field-${id}`).value;
      await updateDoc('Data', id, { [id]: val });
      showAlert('✅ Salvato', 'success');
    };
    return;
  }

  // Gestione array generici (legacy)
  let html = `
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h4>${id.charAt(0).toUpperCase() + id.slice(1)}</h4>
      <button class="btn btn-primary" onclick="addGenericItem('${id}')">
        <i class="fas fa-plus me-1"></i>Aggiungi
      </button>
    </div>
  `;

  if (data.length === 0) {
    html += `<div class="alert alert-info">Nessun elemento presente.</div>`;
  } else {
    html += `
      <div class="table-responsive">
        <table class="table table-dark table-striped">
          <thead class="table-primary">
            <tr>
              <th>Valore</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    data.forEach((item, index) => {
      html += `
        <tr>
          <td>
            <input type="text" class="form-control form-control-sm bg-secondary text-light border-0" 
                   value="${typeof item === 'string' ? item : JSON.stringify(item)}" 
                   data-index="${index}">
          </td>
          <td>
            <button class="btn btn-sm btn-success me-1" onclick="saveGenericItem('${id}', ${index})">
              <i class="fas fa-save"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteGenericItem('${id}', ${index})">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  }
  
  pane.innerHTML = html;
}

// Funzioni per gestione dipendenti
window.addEmployee = async function() {
  const doc = docs.find(d => d.id === 'employees');
  const employees = doc?.employees || [];
  employees.push({ name: '', password: '' });
  await updateDoc('Data', 'employees', { employees });
  await refreshData();
  selectTab('employees');
};

window.saveEmployee = async function(index) {
  const nameInput = document.querySelector(`[data-field="name"][data-index="${index}"]`);
  const passwordInput = document.querySelector(`[data-field="password"][data-index="${index}"]`);
  
  if (!nameInput.value.trim()) {
    showAlert('Il nome del dipendente è obbligatorio', 'danger');
    return;
  }
  
  const doc = docs.find(d => d.id === 'employees');
  const employees = doc?.employees || [];
  employees[index] = {
    name: nameInput.value.trim(),
    password: passwordInput.value.trim()
  };
  
  await updateDoc('Data', 'employees', { employees });
  showAlert('✅ Dipendente salvato', 'success');
  await refreshData();
};

window.deleteEmployee = async function(index) {
  if (!confirm('Sei sicuro di voler eliminare questo dipendente?')) return;
  
  const doc = docs.find(d => d.id === 'employees');
  const employees = doc?.employees || [];
  employees.splice(index, 1);
  
  await updateDoc('Data', 'employees', { employees });
  showAlert('✅ Dipendente eliminato', 'success');
  await refreshData();
  selectTab('employees');
};

// Funzioni per gestione categorie
window.addCategory = async function() {
  const doc = docs.find(d => d.id === 'categories');
  const categories = doc?.categories || [];
  categories.push({ name: 'Nuova Categoria', activities: [] });
  await updateDoc('Data', 'categories', { categories });
  await refreshData();
  selectTab('categories');
};

window.saveCategory = async function(catIndex) {
  const nameInput = document.querySelector(`[data-field="name"][data-category="${catIndex}"]`);
  
  if (!nameInput.value.trim()) {
    showAlert('Il nome della categoria è obbligatorio', 'danger');
    return;
  }
  
  const doc = docs.find(d => d.id === 'categories');
  const categories = doc?.categories || [];
  categories[catIndex].name = nameInput.value.trim();
  
  await updateDoc('Data', 'categories', { categories });
  showAlert('✅ Categoria salvata', 'success');
  await refreshData();
};

window.deleteCategory = async function(catIndex) {
  if (!confirm('Sei sicuro di voler eliminare questa categoria e tutte le sue attività?')) return;
  
  const doc = docs.find(d => d.id === 'categories');
  const categories = doc?.categories || [];
  categories.splice(catIndex, 1);
  
  await updateDoc('Data', 'categories', { categories });
  showAlert('✅ Categoria eliminata', 'success');
  await refreshData();
  selectTab('categories');
};

window.addActivity = async function(catIndex) {
  const doc = docs.find(d => d.id === 'categories');
  const categories = doc?.categories || [];
  if (!categories[catIndex].activities) categories[catIndex].activities = [];
  categories[catIndex].activities.push({ name: '', minutes: 0 });
  
  await updateDoc('Data', 'categories', { categories });
  await refreshData();
  selectTab('categories');
};

window.saveActivity = async function(catIndex, actIndex) {
  const nameInput = document.querySelector(`[data-field="activityName"][data-category="${catIndex}"][data-activity="${actIndex}"]`);
  const minutesInput = document.querySelector(`[data-field="activityMinutes"][data-category="${catIndex}"][data-activity="${actIndex}"]`);
  
  if (!nameInput.value.trim()) {
    showAlert('Il nome dell\'attività è obbligatorio', 'danger');
    return;
  }
  
  const doc = docs.find(d => d.id === 'categories');
  const categories = doc?.categories || [];
  categories[catIndex].activities[actIndex] = {
    name: nameInput.value.trim(),
    minutes: parseInt(minutesInput.value) || 0
  };
  
  await updateDoc('Data', 'categories', { categories });
  showAlert('✅ Attività salvata', 'success');
  await refreshData();
};

window.deleteActivity = async function(catIndex, actIndex) {
  if (!confirm('Sei sicuro di voler eliminare questa attività?')) return;
  
  const doc = docs.find(d => d.id === 'categories');
  const categories = doc?.categories || [];
  categories[catIndex].activities.splice(actIndex, 1);
  
  await updateDoc('Data', 'categories', { categories });
  showAlert('✅ Attività eliminata', 'success');
  await refreshData();
  selectTab('categories');
};

// Funzioni generiche (legacy)
window.addGenericItem = async function(collectionId) {
  const doc = docs.find(d => d.id === collectionId);
  const data = doc?.[collectionId] || [];
  data.push('');
  await updateDoc('Data', collectionId, { [collectionId]: data });
  await refreshData();
  selectTab(collectionId);
};

window.saveGenericItem = async function(collectionId, index) {
  const input = document.querySelector(`[data-index="${index}"]`);
  const doc = docs.find(d => d.id === collectionId);
  const data = doc?.[collectionId] || [];
  data[index] = input.value;
  
  await updateDoc('Data', collectionId, { [collectionId]: data });
  showAlert('✅ Elemento salvato', 'success');
  await refreshData();
};

window.deleteGenericItem = async function(collectionId, index) {
  if (!confirm('Eliminare questo elemento?')) return;
  const doc = docs.find(d => d.id === collectionId);
  const data = doc?.[collectionId] || [];
  data.splice(index, 1);
  await updateDoc('Data', collectionId, { [collectionId]: data });
  await refreshData();
  selectTab(collectionId);
};

async function refreshData() {
  docs = await getCollection('Data');
}

function showAlert(message, type) {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 4000);
}

addBtn.onclick = async () => {
  const name = prompt('Nome della nuova collezione:');
  if (!name) return;
  await updateDoc('Data', name, { [name]: [] });
  await refreshData();
  renderTabs(docs);
  selectTab(name);
};

init();