// preventivo.js v1.0
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
  minuti: 25.00
};

// Stato dell'app
const state = {
  isDetailsVisible: false,
  totalPrice: 0,
  biancheriaTOT: 0,
  przPersonale: 0,
  margine: 0
};

// Formatta in euro
function formatEuro(value) {
  return "€ " + value.toFixed(2);
}

// Calcolo biancheria
function calcolaBiancheria(matrimoniali, singoli, cucine, bagni) {
  const lenzuolaMat = matrimoniali * 3 * prezzi.matrimonialeMillerighe;
  const lenzuolaSing = singoli * 3 * prezzi.singoloMillerighe;
  const federe = (matrimoniali * 2 + singoli) * prezzi.federeMillerighe;
  const asciugamani = (matrimoniali * 2 + singoli) * (prezzi.viso + prezzi.bidet + prezzi.corpo);
  const cortesia = (matrimoniali * 2 + singoli) * prezzi.kitCortesia;
  const cucina = cucine * (prezzi.canovaccio + prezzi.kitCucina);
  const bagno = bagni * (prezzi.scendibagno + prezzi.cartaigienica);

  return lenzuolaMat + lenzuolaSing + federe + asciugamani + cortesia + cucina + bagno;
}

// Calcolo principale
function aggiornaPreventivo() {
  const m = parseFloat(document.getElementById('lettiMatrimoniali').value) || 0;
  const s = parseFloat(document.getElementById('lettiSingoli').value) || 0;
  const c = parseFloat(document.getElementById('cucina').value) || 0;
  const b = parseFloat(document.getElementById('bagno').value) || 0;
  const ore = parseFloat(document.getElementById('ore').value) || 0;

  const biancheria = calcolaBiancheria(m, s, c, b);
  const personale = ore * prezzi.minuti;
  const totale = Math.ceil((1.5 * (biancheria + personale)) / 5) * 5;
  const margine = totale - biancheria - personale;

  // aggiorna stato
  state.biancheriaTOT = biancheria;
  state.przPersonale = personale;
  state.totalPrice = totale;
  state.margine = margine;

  aggiornaInterfaccia();
}

// UI update
function aggiornaInterfaccia() {
  document.getElementById('total_price').textContent = formatEuro(state.totalPrice);
  document.getElementById('biancheriaTOT').textContent = state.isDetailsVisible ? formatEuro(state.biancheriaTOT) : '****';
  document.getElementById('przPersonale').textContent = state.isDetailsVisible ? formatEuro(state.przPersonale) : '****';
  document.getElementById('margine').textContent = state.isDetailsVisible ? formatEuro(state.margine) : '****';

  const btn = document.getElementById('toggleVisibility');
  btn.innerHTML = state.isDetailsVisible ? '<i class="fas fa-eye-slash me-1"></i>Nascondi Dettagli' : '<i class="fas fa-eye me-1"></i>Mostra Dettagli';

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
    if (input) {
      input.addEventListener('input', aggiornaPreventivo);
    }
  });

  const toggleBtn = document.getElementById('toggleVisibility');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleDettagli);
  }

  aggiornaPreventivo();
});
