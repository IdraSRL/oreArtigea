// admin-bnb.js
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { db } from '../../common/firebase-config.js';

/* =========================
 * Config
 * ========================= */
const SERVICES = [
  { key: 'checkout',        label: 'Checkout' },
  { key: 'refresh',         label: 'Refresh' },
  { key: 'refreshProfondo', label: 'Refresh profondo' },
  { key: 'areaComune',      label: 'Area comune' },
  { key: 'ciabattine',      label: 'Ciabattine' },
  { key: 'oreExtra',        label: 'Ore extra' },
];

const BIANCHERIA_KEYS = ['matrimoniale', 'federa', 'viso', 'corpo', 'bidet', 'scendiBagno'];

/* =========================
 * Utils
 * ========================= */
function getKeywordClass(text) {
  const t = (text ?? '').trim().toLowerCase();
  if (!t) return '';
  if (t.includes('dalmazia')) return 'dalmazia';
  if (t.includes('martiri')) return 'martiri';
  if (/c[._]grande/.test(t)) return 'c-grande';
  if (/c[._]piccola/.test(t)) return 'c-piccola';
  return '';
}

function applyKeywordClasses(rootEl) {
  const header = rootEl.querySelector('.card-header');
  if (header) {
    const clsH = getKeywordClass(header.textContent);
    if (clsH) header.classList.add(clsH);
  }
  rootEl.querySelectorAll('[data-keyword]').forEach(el => {
    const cls = getKeywordClass(el.textContent);
    if (cls) el.classList.add(cls);
  });
}

const N = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function el(tag, className, attrs) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v !== undefined && v !== null) node.setAttribute(k, v);
    }
  }
  return node;
}

/* =========================
 * Render helpers
 * ========================= */
function renderServicesCol(d) {
  const col = el('div', 'col-lg-5');

  const h = el('h6', 'text-primary mb-2');
  h.textContent = 'Servizi';
  col.appendChild(h);

  for (const { key, label } of SERVICES) {
    const item = el('div', 'service-item', { 'data-keyword': '' });

    const lab = el('span', 'service-label');
    lab.textContent = `${label}:`;
    const val = el('span', 'service-value');
    val.textContent = String(N(d?.[key]));

    item.append(lab, document.createTextNode(' '), val);
    col.appendChild(item);
  }

  return col;
}

function renderBiancheriaCol(d) {
  const col = el('div', 'col-lg-7');

  const h = el('h6', 'text-success mb-2');
  h.textContent = 'Biancheria';
  col.appendChild(h);

  const grid = el('div', 'biancheria-grid');
  for (const k of BIANCHERIA_KEYS) {
    const item = el('div', 'biancheria-item', { 'data-keyword': '' });

    const name = el('div', 'biancheria-name');
    name.textContent = k;

    const values = el('div', 'biancheria-values');
    const s = el('span', 'text-warning'); s.textContent = `S:${N(d?.sporco?.[k])}`;
    const p = el('span', 'text-success'); p.textContent = `P:${N(d?.pulito?.[k])}`;
    const m = el('span', 'text-info');    m.textContent = `M:${N(d?.magazzino?.[k])}`;

    // spazi leggibili
    values.append(s, document.createTextNode(' '), p, document.createTextNode(' '), m);

    item.append(name, values);
    grid.appendChild(item);
  }
  col.appendChild(grid);

  return col;
}

function createBnbCard(bnbKey, d) {
  const bnbName = String(bnbKey ?? '').replace(/_/g, '.');

  const card = el('div', 'card bnb-compact-card');

  const header = el('div', 'card-header py-2');
  header.textContent = bnbName;
  card.appendChild(header);

  const body = el('div', 'card-body');
  const row  = el('div', 'row');

  row.appendChild(renderServicesCol(d));
  row.appendChild(renderBiancheriaCol(d));
  body.appendChild(row);

  const employeeInfo = el('div', 'employee-info mt-2');
  const empRow = el('div', 'row');

  const c1 = el('div', 'col-6', { 'data-keyword': '' });
  const i1 = el('i', 'fas fa-user me-1');
  c1.append(i1, document.createTextNode('Dip1: '));
  const s1 = el('strong'); s1.textContent = d?.dip1 || 'N/A';
  c1.appendChild(s1);

  const c2 = el('div', 'col-6', { 'data-keyword': '' });
  const i2 = el('i', 'fas fa-user-plus me-1');
  c2.append(i2, document.createTextNode('Dip2: '));
  const s2 = el('strong'); s2.textContent = d?.dip2 || 'N/A';
  c2.appendChild(s2);

  empRow.append(c1, c2);
  employeeInfo.appendChild(empRow);
  body.appendChild(employeeInfo);

  card.appendChild(body);

  applyKeywordClasses(card);
  return card;
}

/* =========================
 * Public API
 * ========================= */
/**
 * Carica e renderizza tutti i bigliettini BnB per la data indicata
 * @param {string} date       'YYYY-MM-DD'
 * @param {HTMLElement} container
 */
export async function loadBnbEntries(date, container) {
  if (!container) return;
  container.innerHTML = '';

  if (!date || typeof date !== 'string') {
    container.innerHTML = '<p class="text-danger">Data non valida.</p>';
    return;
  }

  try {
    const ref = doc(db, 'Bigliettini', date);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      container.innerHTML = '<p class="text-muted">Nessun bigliettino per questa data.</p>';
      return;
    }

    const data = snap.data();
    if (!data || typeof data !== 'object') {
      container.innerHTML = '<p class="text-muted">Nessun dato disponibile.</p>';
      return;
    }

    const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b));
    const frag = document.createDocumentFragment();

    for (const [key, d] of entries) {
      frag.appendChild(createBnbCard(key, d));
    }

    container.appendChild(frag);
  } catch (error) {
    console.error('❌ loadBnbEntries error:', error);
    container.innerHTML = '<p class="text-danger">Errore caricamento bigliettini.</p>';
  }
}
