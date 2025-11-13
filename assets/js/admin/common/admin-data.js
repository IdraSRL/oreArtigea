// admin-data.js - Gestione dati amministrativi (schema auto + sync + layout migliorato)
import { getCollection, updateDoc } from "../../common/firestore-service.js";

const tabList = document.getElementById('groupTabs');
const tabContent = document.getElementById('groupTabContent');
const addBtn = document.getElementById('add-group');

let docs = [];
let currentGroup = null;

// Gruppi che mostrano card "complesse" (appartamenti, ecc.)
const complexGroups = ['irene', 'cerrano', 'lorenza', 'molino'];

// Ordine suggerito dei campi quando si renderizza una card complessa
const fieldOrder = ['nome', 'indirizzo', 'composizione', 'ospiti', 'ore', 'note', 'mappa'];

/* ============================================================
 *  LAYOUT: inietta stili per sticky header/colonne + wrapper scroll
 * ==========================================================*/
let __layoutStylesInjected = false;
function ensureLayoutStyles() {
  if (__layoutStylesInjected) return;
  __layoutStylesInjected = true;

  const css = `
/* Contenitori scroll */
.gd-table-wrap, .gd-card-wrap {
  position: relative;
  max-height: 70vh;
  overflow: auto;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: .5rem;
}

/* Evita artefatti ai bordi quando si sovrappongono celle sticky */
.gd-table-wrap table {
  border-collapse: separate;
  border-spacing: 0;
}
.gd-table-wrap table th,
.gd-table-wrap table td {
  background-clip: padding-box;
}

/* Header tabella sticky */
.gd-table-wrap table thead th {
  position: sticky;
  top: 0;
  z-index: 5;
  background: #1f2833;
  color: #fff;
  box-shadow: 0 1px 0 rgba(255,255,255,.08) inset;
}

/* Prima colonna sticky (tbody + thead) */
.gd-sticky-first table thead th:first-child,
.gd-sticky-first table tbody td:first-child {
  position: sticky;
  left: 0;
  z-index: 4;
  background: rgba(31,40,51,.96);
  backdrop-filter: blur(3px);
  min-width: 160px; /* opzionale: evita salti durante lo scroll orizzontale */
}

/* >>> Angolo in alto a sinistra (header prima colonna) — DEVE stare sopra tutto */
.gd-sticky-first table thead th:first-child {
  top: 0;
  left: 0;
  z-index: 6; /* più dell’header (5) e della colonna (4) */
}

/* Ultima colonna (Azioni) sticky */
.gd-sticky-last table thead th:last-child,
.gd-sticky-last table tbody td:last-child {
  position: sticky;
  right: 0;
  z-index: 4;
  background: rgba(31,40,51,.96);
  backdrop-filter: blur(3px);
}

/* Angolo in alto a destra (header ultima colonna) — sopra tutto sul lato destro */
.gd-sticky-last table thead th:last-child {
  top: 0;
  z-index: 6;
  background: #1f2833;
}

/* Un piccolo gradiente/ombra per separare visivamente la colonna sticky (opzionale) */
.gd-sticky-first table tbody td:first-child {
  box-shadow: 2px 0 0 rgba(0,0,0,.08);
}

/* Toolbar */
.gd-toolbar {
  display: flex;
  gap: .5rem;
  align-items: center;
  margin-bottom: .5rem;
  flex-wrap: wrap;
}
.gd-toolbar .form-control { max-width: 280px; }
.gd-muted { color: #9aa0a6; font-size: .9rem; }

/* Compattezza card */
.gd-card-wrap .card { margin-bottom: .5rem; }
.gd-card-wrap .card .card-body { padding: .75rem; }
.gd-card-wrap .form-label { margin-bottom: .25rem; }
`;
const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
}

/* ============================================================
 *  UTIL: Inferenza schema e costruzione template coerente
 * ==========================================================*/
function detectType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function defaultForType(t) {
  switch (t) {
    case "string": return "";
    case "number": return 0;
    case "boolean": return false;
    case "null": return null;
    default: return null;
  }
}

// Schema:
// { kind: "primitive", type: "string"|"number"|"boolean"|"null" }
// { kind: "object", keys: { k: <schema>, ... } }
// { kind: "array", of: <schemaElementi>, elementKind: "primitive"|"object"|"array" }
function inferSchemaFromValue(v) {
  const t = detectType(v);

  if (t === "object") {
    const keys = {};
    for (const k of Object.keys(v)) {
      keys[k] = inferSchemaFromValue(v[k]);
    }
    return { kind: "object", keys };
  }

  if (t === "array") {
    if (v.length === 0) {
      return { kind: "array", of: { kind: "primitive", type: "string" }, elementKind: "primitive" };
    }
    const elementSchemas = v.map(inferSchemaFromValue);
    return mergeSchemasArrayElements(elementSchemas);
  }

  return { kind: "primitive", type: t };
}

function mergePrimitiveTypes(a, b) {
  if (a.type === b.type) return { kind: "primitive", type: a.type };
  if (a.type === "string" || b.type === "string") {
    return { kind: "primitive", type: "string" };
  }
  return { kind: "primitive", type: a.type };
}

function mergeObjectSchemas(a, b) {
  const keys = new Set([...Object.keys(a.keys), ...Object.keys(b.keys)]);
  const mergedKeys = {};
  for (const k of keys) {
    if (a.keys[k] && b.keys[k]) {
      mergedKeys[k] = mergeSchemas(a.keys[k], b.keys[k]);
    } else {
      mergedKeys[k] = (a.keys[k] || b.keys[k]);
    }
  }
  return { kind: "object", keys: mergedKeys };
}

function mergeArraySchemas(a, b) {
  if (a.kind !== "array") return b;
  if (b.kind !== "array") return a;
  const of = mergeSchemas(a.of, b.of);

  const ek = (x) => x.elementKind || (x.of ? x.of.kind : "primitive");
  const aK = ek(a), bK = ek(b);
  const elementKind =
    (aK === bK) ? aK :
    (aK === "object" || bK === "object") ? "object" :
    (aK === "primitive" || bK === "primitive") ? "primitive" : "array";

  return { kind: "array", of, elementKind };
}

function mergeSchemas(a, b) {
  if (!a) return b;
  if (!b) return a;

  if (a.kind === "primitive" && b.kind === "primitive") return mergePrimitiveTypes(a, b);
  if (a.kind === "object" && b.kind === "object") return mergeObjectSchemas(a, b);
  if (a.kind === "array" && b.kind === "array") return mergeArraySchemas(a, b);

  const pr = { object: 3, array: 2, primitive: 1 };
  return (pr[a.kind] >= pr[b.kind]) ? a : b;
}

function mergeSchemasArrayElements(schemas) {
  let acc = null;
  for (const s of schemas) acc = mergeSchemas(acc, s);

  const counts = { primitive: 0, object: 0, array: 0 };
  for (const s of schemas) counts[s.kind] = (counts[s.kind] || 0) + 1;

  const elementKind =
    counts.object > 0 ? "object" :
    counts.array > 0 ? "array" : "primitive";

  return { kind: "array", of: acc, elementKind };
}

function inferSchemaFromArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { kind: "array", of: { kind: "object", keys: {} }, elementKind: "object" };
  }
  const schemas = arr.map(inferSchemaFromValue);
  return mergeSchemasArrayElements(schemas);
}

function buildTemplateFromSchema(schema) {
  if (!schema) return {};
  if (schema.kind === "primitive") return defaultForType(schema.type);

  if (schema.kind === "object") {
    const o = {};
    for (const k of Object.keys(schema.keys)) {
      o[k] = buildTemplateFromSchema(schema.keys[k]);
    }
    return o;
  }
  if (schema.kind === "array") {
    return [];
  }
  return {};
}

// Coercizione dei valori inseriti dall'utente verso lo schema dedotto
function coerceToSchema(raw, schema) {
  if (!schema) return raw;

  if (schema.kind === "primitive") {
    const t = schema.type;
    if (t === "number") {
      const normalized = (typeof raw === 'string') ? raw.replace(',', '.') : raw;
      const n = parseFloat(normalized);
      return Number.isFinite(n) ? n : 0;
    }
    if (t === "boolean") {
      if (typeof raw === "boolean") return raw;
      const s = String(raw).trim().toLowerCase();
      return (s === "true" || s === "1" || s === "si" || s === "sì" || s === "yes");
    }
    if (t === "string") {
      return (raw ?? "").toString();
    }
    if (t === "null") return null;
    return raw;
  }

  if (schema.kind === "array") {
    if (typeof raw === "string") {
      const parts = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      return parts.map(p => coerceToSchema(p, schema.of));
    }
    if (Array.isArray(raw)) {
      return raw.map(v => coerceToSchema(v, schema.of));
    }
    return [];
  }

  if (schema.kind === "object") {
    const out = {};
    const keys = Object.keys(schema.keys);
    for (const k of keys) {
      out[k] = coerceToSchema(raw?.[k], schema.keys[k]);
    }
    return out;
  }

  return raw;
}

/* ============================================================
 *  SYNC LOCALE
 * ==========================================================*/
function setGroupArrayInDocs(id, arr) {
  const i = docs.findIndex(d => d.id === id);
  if (i >= 0) {
    docs[i] = { ...docs[i], [id]: arr };
  }
}

/* ============================================================
 *  INIT
 * ==========================================================*/
async function init() {
  try {
    docs = await getCollection('Data');
    ensureLayoutStyles();                 // layout sticky + scroll
    renderTabs(docs);
    if (docs.length) selectTab(docs[0].id);
  } catch (error) {
    console.error('Errore inizializzazione admin-data:', error);
  }
}

/* ============================================================
 *  RENDER TABS / SELECT
 * ==========================================================*/
function renderTabs(list) {
  tabList.innerHTML = '';
  tabContent.innerHTML = '';

  list.forEach((doc, i) => {
    const id = doc.id;

    const btn = document.createElement('button');
    btn.className = `nav-link${i === 0 ? ' active' : ''}`;
    btn.dataset.bsToggle = 'tab';
    btn.dataset.bsTarget = `#pane-${id}`;
    btn.type = 'button';
    btn.role = 'tab';
    btn.textContent = id;
    btn.onclick = () => selectTab(id);
    tabList.appendChild(btn);

    const pane = document.createElement('div');
    pane.className = `tab-pane fade${i === 0 ? ' show active' : ''}`;
    pane.id = `pane-${id}`;
    pane.role = 'tabpanel';
    tabContent.appendChild(pane);
  });
}

function selectTab(id) {
  currentGroup = id;

  Array.from(tabList.children).forEach(btn => {
    btn.classList.toggle('active', btn.textContent === id);
  });

  const doc = docs.find(d => d.id === id);
  const pane = document.getElementById(`pane-${id}`);
  pane.innerHTML = '';

  const data = doc[id] ?? [];

  if (!Array.isArray(data)) {
    renderSimpleData(pane, id, data);
    return;
  }

  if (complexGroups.includes(id)) {
    renderComplexData(pane, id, data);
  } else {
    const isPrimitiveArray = data.length > 0 && (typeof data[0] !== 'object' || data[0] === null);
    if (isPrimitiveArray) {
      renderPrimitiveList(pane, id, data);
    } else {
      renderTableData(pane, id, data);
    }
  }
}

/* ============================================================
 *  RENDER: Dati semplici (campo singolo)
 * ==========================================================*/
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

/* ============================================================
 *  RENDER: Lista di primitive (raro a livello top)
 * ==========================================================*/
function renderPrimitiveList(pane, id, data) {
  const ul = document.createElement('ul');
  ul.className = 'list-group mb-2';

  data.forEach((v, idx) => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex align-items-center justify-content-between';
    li.innerHTML = `
      <input class="form-control form-control-sm me-2 flex-grow-1 primitive-input" data-idx="${idx}" value="${v ?? ''}">
      <div class="btn-group">
        <button class="btn btn-sm btn-success save-prim-item" data-idx="${idx}">
          <i class="fas fa-save"></i>
        </button>
        <button class="btn btn-sm btn-danger del-prim-item" data-idx="${idx}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    ul.appendChild(li);
  });

  pane.appendChild(ul);

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-sm btn-primary';
  addBtn.innerHTML = '<i class="fas fa-plus me-1"></i>Aggiungi elemento';
  addBtn.onclick = async () => {
    try {
      const arrSchema = inferSchemaFromArray(data);
      const newItem = buildTemplateFromSchema(arrSchema.of);
      const next = [...data, newItem];
      await updateDoc('Data', id, { [id]: next });
      setGroupArrayInDocs(id, next);
      selectTab(id);
    } catch (e) {
      console.error(e);
      alert('❌ Errore durante l\'aggiunta dell\'elemento');
    }
  };
  pane.appendChild(addBtn);

  pane.querySelectorAll('.save-prim-item').forEach(btn => {
    btn.onclick = async () => {
      const idx = +btn.dataset.idx;
      const input = pane.querySelector(`.primitive-input[data-idx="${idx}"]`);
      data[idx] = input.value;
      try {
        await updateDoc('Data', id, { [id]: data });
        setGroupArrayInDocs(id, data);
        alert('✅ Elemento salvato');
      } catch (e) {
        alert('❌ Errore durante il salvataggio');
      }
    };
  });

  pane.querySelectorAll('.del-prim-item').forEach(btn => {
    btn.onclick = async () => {
      const idx = +btn.dataset.idx;
      if (!confirm('Eliminare questo elemento?')) return;
      data.splice(idx, 1);
      await updateDoc('Data', id, { [id]: data });
      setGroupArrayInDocs(id, data);
      selectTab(id);
    };
  });
}

/* ============================================================
 *  RENDER: Dati complessi (card con toolbar + wrap scroll)
 * ==========================================================*/
function renderComplexData(pane, id, data) {
  // schema degli ELEMENTI della collezione
  const arrSchema = inferSchemaFromArray(data);
  const elemSchema = arrSchema.of;

  // Toolbar (comprimi/espandi + aggiungi)
  const toolbar = document.createElement('div');
  toolbar.className = 'gd-toolbar';
  toolbar.innerHTML = `
    <button class="btn btn-sm btn-secondary" data-action="collapse">
      <i class="fas fa-compress-alt me-1"></i>Comprimi tutte
    </button>
    <button class="btn btn-sm btn-secondary" data-action="expand">
      <i class="fas fa-expand-alt me-1"></i>Espandi tutte
    </button>
    <button class="btn btn-sm btn-primary" data-action="add">
      <i class="fas fa-plus me-1"></i>Aggiungi elemento
    </button>
    <span class="gd-muted">Scorri nel riquadro: le intestazioni restano visibili</span>
  `;
  pane.appendChild(toolbar);

  // Wrapper scrollabile per le card
  const wrap = document.createElement('div');
  wrap.className = 'gd-card-wrap';
  pane.appendChild(wrap);

  // Generazione card
  data.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    card.innerHTML = `
      <div class="card-header d-flex justify-content-between align-items-center">
        <strong>Elemento ${idx + 1}</strong>
        <div>
          <button class="btn btn-sm btn-info edit-item" data-idx="${idx}" title="Modifica">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-success save-item" data-idx="${idx}" title="Salva">
            <i class="fas fa-save"></i>
          </button>
          <button class="btn btn-sm btn-danger del-item" data-idx="${idx}" title="Elimina">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="card-body row gx-2 gy-3"></div>
    `;

    const body = card.querySelector('.card-body');

    const keys = Object.keys(item || {});
    const orderedKeys = fieldOrder.filter(k => keys.includes(k))
      .concat(keys.filter(k => !fieldOrder.includes(k)));

    const finalKeys = orderedKeys.length && orderedKeys || (elemSchema?.kind === 'object' ? Object.keys(elemSchema.keys) : []);

    finalKeys.forEach(key => {
      const val = item?.[key];
      const schemaForField = elemSchema?.kind === 'object' ? elemSchema.keys[key] : null;
      const displayValue = Array.isArray(val) ? val.join('\n') : (val ?? '');

      const form = document.createElement('div');
      form.className = 'col-12';
      form.innerHTML = `
        <label class="form-label text-capitalize">${key}</label>
        <textarea class="form-control editable-complex-field"
                  data-field="${key}" data-idx="${idx}"
                  rows="2" style="width:100% !important;" disabled>${displayValue}</textarea>
      `;
      body.appendChild(form);

      if (schemaForField?.kind === 'array') {
        const small = document.createElement('small');
        small.className = 'text-muted';
        small.textContent = 'Inserisci una voce per riga';
        form.appendChild(small);
      }
    });

    wrap.appendChild(card);
  });

  // Toolbar actions
  const btnCollapse = toolbar.querySelector('[data-action="collapse"]');
  const btnExpand   = toolbar.querySelector('[data-action="expand"]');
  const btnAdd      = toolbar.querySelector('[data-action="add"]');

  btnCollapse.onclick = () => {
    wrap.querySelectorAll('.editable-complex-field').forEach(t => t.rows = 1);
  };
  btnExpand.onclick = () => {
    wrap.querySelectorAll('.editable-complex-field').forEach(t => t.rows = 4);
  };
  btnAdd.onclick = async () => {
    try {
      const arrSchema2 = inferSchemaFromArray(data);
      const template = buildTemplateFromSchema(arrSchema2.of || { kind: "object", keys: {} });
      const next = [...data, template];

      await updateDoc('Data', id, { [id]: next });
      setGroupArrayInDocs(id, next);
      selectTab(id);
    } catch (e) {
      console.error(e);
      alert('❌ Errore durante l\'aggiunta dell\'elemento');
    }
  };

  setupComplexDataListeners(pane, id, data);
}

function setupComplexDataListeners(pane, id, data) {
  pane.querySelectorAll('.edit-item').forEach(btn => {
    btn.onclick = () => {
      const card = btn.closest('.card');
      const textareas = card.querySelectorAll('.editable-complex-field');
      const nowEnabled = textareas[0]?.disabled === true;

      textareas.forEach(t => {
        t.disabled = !nowEnabled;
        if (t.disabled) {
          t.style.backgroundColor = '';
          t.style.borderColor = '';
          t.style.color = '';
        } else {
          t.style.backgroundColor = '#495057';
          t.style.borderColor = '#0d6efd';
          t.style.color = '#fff';
        }
      });

      btn.innerHTML = nowEnabled ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-edit"></i>';
      btn.className = nowEnabled ? 'btn btn-sm btn-warning edit-item' : 'btn btn-sm btn-info edit-item';
    };
  });

  pane.querySelectorAll('.save-item').forEach(btn => {
    btn.onclick = async () => {
      const idx = +btn.dataset.idx;
      const card = btn.closest('.card');
      const arrSchema = inferSchemaFromArray(data);
      const elemSchema = arrSchema.of || { kind: "object", keys: {} };

      const rawObj = {};
      card.querySelectorAll('[data-field]').forEach(el => {
        const field = el.dataset.field;
        rawObj[field] = el.value;
      });

      const coerced = coerceToSchema(rawObj, elemSchema);
      data[idx] = coerced;

      try {
        await updateDoc('Data', id, { [id]: data });
        setGroupArrayInDocs(id, data);
        alert('✅ Elemento salvato');

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
      setGroupArrayInDocs(id, data);
      selectTab(id);
    };
  });
}

/* ============================================================
 *  RENDER: Dati tabellari (array di oggetti) con sticky header/colonne + filtro
 * ==========================================================*/
function renderTableData(pane, id, data) {
  const keys = Array.from(new Set(data.flatMap(o => Object.keys(o || {}))));
  const arrSchema = inferSchemaFromArray(data);
  const elemSchema = arrSchema.of || { kind: "object", keys: {} };

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'gd-toolbar';
  toolbar.innerHTML = `
    <input type="search" class="form-control form-control-sm" placeholder="Filtra righe..." aria-label="Filtra">
    <button class="btn btn-sm btn-primary">
      <i class="fas fa-plus me-1"></i>Aggiungi riga
    </button>
    <span class="gd-muted">Tip: scorri nel riquadro, l'intestazione resta visibile</span>
  `;
  pane.appendChild(toolbar);

  const filterInput = toolbar.querySelector('input[type="search"]');
  const addBtn = toolbar.querySelector('button');

  // Wrapper scrollabile con sticky header e sticky colonne
  const wrap = document.createElement('div');
  wrap.className = 'gd-table-wrap gd-sticky-first gd-sticky-last';
  pane.appendChild(wrap);

  const table = document.createElement('table');
  table.className = 'table table-sm mb-0';
  table.innerHTML = `
    <thead>
      <tr>
        ${keys.map(k => `<th>${k}</th>`).join('')}
        <th>Azioni</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  wrap.appendChild(table);

  function renderRows(rows) {
    tbody.innerHTML = '';
    rows.forEach((item, idx) => {
      const tr = document.createElement('tr');

      keys.forEach(k => {
        const val = item?.[k] ?? '';
        tr.innerHTML += `
          <td>
            <input class="form-control form-control-sm editable-field"
                   data-field="${k}" data-idx="${idx}"
                   value="${val}" style="width:100% !important;">
          </td>
        `;
      });

      tr.innerHTML += `
        <td>
          <button class="btn btn-sm btn-success save-row" data-idx="${idx}" title="Salva">
            <i class="fas fa-save"></i>
          </button>
          <button class="btn btn-sm btn-danger del-row" data-idx="${idx}" title="Elimina">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    setupTableDataListeners(pane, id, data, keys, elemSchema);
  }

  renderRows(data);

  filterInput.addEventListener('input', () => {
    const q = filterInput.value.trim().toLowerCase();
    if (!q) { renderRows(data); return; }
    const filtered = data.filter(row =>
      keys.some(k => String(row?.[k] ?? '').toLowerCase().includes(q))
    );
    renderRows(filtered);
  });

  addBtn.onclick = async () => {
    try {
      const arrSchema2 = inferSchemaFromArray(data);
      const template = buildTemplateFromSchema(arrSchema2.of || { kind: "object", keys: {} });
      const next = [...data, template];

      await updateDoc('Data', id, { [id]: next });
      setGroupArrayInDocs(id, next);
      selectTab(id);
    } catch (e) {
      console.error(e);
      alert('❌ Errore durante l\'aggiunta della riga');
    }
  };
}

function setupTableDataListeners(pane, id, data, keys, elemSchema) {
  pane.querySelectorAll('.save-row').forEach(btn => {
    btn.onclick = async () => {
      const idx = +btn.dataset.idx;
      const rawObj = {};

      keys.forEach(k => {
        const el = pane.querySelector(`[data-field="${k}"][data-idx="${idx}"]`);
        rawObj[k] = el ? el.value : '';
      });

      const coerced = coerceToSchema(rawObj, elemSchema);
      data[idx] = coerced;

      try {
        await updateDoc('Data', currentGroup, { [currentGroup]: data });
        setGroupArrayInDocs(currentGroup, data);
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
      setGroupArrayInDocs(currentGroup, data);
      selectTab(currentGroup);
    };
  });
}

/* ============================================================
 *  Nuovo gruppo
 * ==========================================================*/
if (addBtn) {
  addBtn.onclick = async () => {
    const name = prompt('ID nuovo gruppo:');
    if (!name) return;

    try {
      await updateDoc('Data', name, { [name]: [] });
      await init();
    } catch (error) {
      alert('❌ Errore durante la creazione del gruppo');
    }
  };
}

/* ============================================================
 *  START
 * ==========================================================*/
init();
