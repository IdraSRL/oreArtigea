// preventivo.js v1.2
// Prezzi unitari
const prezzi = {
  canovaccio: 0.45,
  matrimonialeMillerighe: 1.18,
  singoloMillerighe: 0.97,
  federeMillerighe: 0.47,
  kitCucina: 0.60,
  scendibagno: 0.63,
  viso: 0.42,
  bidet: 0.32,
  corpo: 0.95,
  cartaigienica: 0.16,
  kitCortesia: 0.36,
  ciabattine: 0.40, // per ospite
  minuti: 25.00     // €/ora per il personale
};

// Stato dell'app
const state = {
  isDetailsVisible: false,
  totalPrice: 0,
  biancheriaTOT: 0,
  przPersonale: 0,
  margine: 0,
  ospiti: 0,
  breakdown: [] // [{label, qty, unitPrice, subtotal}]
};

// Utilità
const formatEuro = (v) => "€ " + (v || 0).toFixed(2);
const formatQty  = (v) => (Number.isInteger(v) ? v : v.toFixed(2));

// Calcolo quantità
function getQuantita(matrimoniali, singoli, cucine, bagni) {
  const ospiti = matrimoniali * 2 + singoli;

  return {
    ospiti,
    lenzuolaMat: matrimoniali * 3,
    lenzuolaSing: singoli * 3,
    federe: ospiti,                // 1 per ospite
    viso: ospiti,                  // set asciugamani per ospite
    bidet: ospiti,
    corpo: ospiti,
    kitCortesia: ospiti,
    ciabattine: ospiti,            // per ospite
    canovaccio: cucine,
    kitCucina: cucine,
    scendibagno: bagni,
    cartaigienica: bagni
  };
}

// Costruisce la lista breakdown (quantità * prezzo)
function buildBreakdown(q) {
  const rows = [
    { key: 'lenzuolaMat', label: 'Lenzuola Matrimoniali (pz)', unitPrice: prezzi.matrimonialeMillerighe, qty: q.lenzuolaMat },
    { key: 'lenzuolaSing', label: 'Lenzuola Singole (pz)', unitPrice: prezzi.singoloMillerighe, qty: q.lenzuolaSing },
    { key: 'federe', label: 'Federe (pz)', unitPrice: prezzi.federeMillerighe, qty: q.federe },
    { key: 'viso', label: 'Asciugamani Viso (pz)', unitPrice: prezzi.viso, qty: q.viso },
    { key: 'bidet', label: 'Asciugamani Bidet (pz)', unitPrice: prezzi.bidet, qty: q.bidet },
    { key: 'corpo', label: 'Teli Corpo (pz)', unitPrice: prezzi.corpo, qty: q.corpo },
    { key: 'kitCortesia', label: 'Kit Cortesia (pz)', unitPrice: prezzi.kitCortesia, qty: q.kitCortesia },
    { key: 'ciabattine', label: 'Ciabattine (paia)', unitPrice: prezzi.ciabattine, qty: q.ciabattine },
    { key: 'canovaccio', label: 'Canovacci Cucina (pz)', unitPrice: prezzi.canovaccio, qty: q.canovaccio },
    { key: 'kitCucina', label: 'Kit Cucina (pz)', unitPrice: prezzi.kitCucina, qty: q.kitCucina },
    { key: 'scendibagno', label: 'Scendibagno (pz)', unitPrice: prezzi.scendibagno, qty: q.scendibagno },
    { key: 'cartaigienica', label: 'Carta Igienica (rotoli)', unitPrice: prezzi.cartaigienica, qty: q.cartaigienica }
  ];

  return rows
    .filter(r => r.qty > 0)
    .map(r => ({ ...r, subtotal: r.qty * r.unitPrice }));
}

// Somma biancheria
function sommaBiancheria(breakdown) {
  return breakdown.reduce((acc, r) => acc + r.subtotal, 0);
}

// Calcolo principale
function aggiornaPreventivo() {
  const m = parseFloat(document.getElementById('lettiMatrimoniali').value) || 0;
  const s = parseFloat(document.getElementById('lettiSingoli').value) || 0;
  const c = parseFloat(document.getElementById('cucina').value) || 0;
  const b = parseFloat(document.getElementById('bagno').value) || 0;
  const ore = parseFloat(document.getElementById('ore').value) || 0;

  const q = getQuantita(m, s, c, b);
  const breakdown = buildBreakdown(q);

  const biancheria = sommaBiancheria(breakdown);
  const personale = ore * prezzi.minuti;

  // Ricarico 50% e arrotondamento al 5 superiore
  const totale = Math.ceil((1.5 * (biancheria + personale)) / 5) * 5;
  const margine = totale - biancheria - personale;

  // aggiorna stato
  state.ospiti = q.ospiti;
  state.breakdown = breakdown;
  state.biancheriaTOT = biancheria;
  state.przPersonale = personale;
  state.totalPrice = totale;
  state.margine = margine;

  aggiornaInterfaccia();
}

// UI update (KPI + tabella)
function aggiornaInterfaccia() {
  // KPI principali
  document.getElementById('total_price').textContent = formatEuro(state.totalPrice);
  document.getElementById('kpiBiancheria').textContent = formatEuro(state.biancheriaTOT);
  document.getElementById('kpiPersonale').textContent = formatEuro(state.przPersonale);
  document.getElementById('kpiMargine').textContent = formatEuro(state.margine);

  // Ospiti & Ciabattine
  document.getElementById('kpiOspiti').textContent = formatQty(state.ospiti);
  document.getElementById('kpiCiabattine').textContent = formatQty(state.ospiti); // 1 paio per ospite

  // Tabella breakdown
  const tbody = document.querySelector('#tblBiancheria tbody');
  tbody.innerHTML = '';
  state.breakdown.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.label}</td>
      <td class="text-end">${formatQty(r.qty)}</td>
      <td class="text-end">${formatEuro(r.unitPrice)}</td>
      <td class="text-end fw-semibold">${formatEuro(r.subtotal)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Totale biancheria (footer tabella + pannello dettagli)
  document.getElementById('biancheriaTOT').textContent = formatEuro(state.biancheriaTOT);
  document.getElementById('przBiancheriaDett').textContent = formatEuro(state.biancheriaTOT);

  // Sezioni nascoste
  document.getElementById('przPersonale').textContent = formatEuro(state.przPersonale);
  document.getElementById('margine').textContent = formatEuro(state.margine);

  // Bottone mostra/nascondi
  const btn = document.getElementById('toggleVisibility');
  btn.innerHTML = state.isDetailsVisible
    ? '<i class="fas fa-eye-slash me-1"></i>Nascondi Dettagli (margine & personale)'
    : '<i class="fas fa-eye me-1"></i>Mostra Dettagli (margine & personale)';

  document.getElementById('hiddenResults').classList.toggle('d-none', !state.isDetailsVisible);
}

// Toggle dettagli
function toggleDettagli() {
  state.isDetailsVisible = !state.isDetailsVisible;
  aggiornaInterfaccia();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const inputs = ['lettiMatrimoniali', 'lettiSingoli', 'cucina', 'bagno', 'ore'];
  inputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', aggiornaPreventivo);
  });

  const toggleBtn = document.getElementById('toggleVisibility');
  if (toggleBtn) toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleDettagli();
  });

  aggiornaPreventivo();
});
