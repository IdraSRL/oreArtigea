# Sistema di Versioning e Cache-Busting

## 📋 Panoramica

Questo sistema implementa un meccanismo automatico di cache-busting per garantire che gli utenti ricevano sempre la versione più aggiornata dell'applicazione, senza dover svuotare manualmente la cache del browser.

## 🏗️ Architettura del Sistema

### File Principali

1. **`assets/js/common/version.js`** - Definisce la versione dell'applicazione
2. **`assets/js/common/loader.js`** - Sistema di cache-busting automatico
3. **`index.html`** - Pagina principale con inclusione del loader
4. **File di test** - Per verificare il funzionamento del sistema

### Come Funziona

```
1. loader.js viene caricato per primo (senza versioning)
2. loader.js importa dinamicamente version.js
3. Verifica se la versione è cambiata rispetto a localStorage
4. Se cambiata: forza reload della pagina
5. Applica ?v=VERSION a tutti i CSS, JS, iframe, immagini
6. Aggiorna gli elementi .version-display nell'interfaccia
```

## 🚀 Come Aggiornare la Versione

### Passo 1: Modifica version.js

Apri `assets/js/common/version.js` e cambia la costante:

```javascript
// DA:
export const APP_VERSION = '2.0.0';

// A:
export const APP_VERSION = '2.1.0';
```

### Passo 2: Salva e Testa

1. Salva il file
2. Ricarica la pagina nel browser
3. Il sistema automaticamente:
   - Rileva il cambio di versione
   - Forza il reload della pagina
   - Applica i nuovi parametri di versione

## 🔧 Configurazione

### Inclusione in HTML

```html
<head>
  <!-- IMPORTANTE: loader.js DEVE essere il primo script -->
  <script src="assets/js/common/loader.js"></script>
  
  <!-- Altri CSS e JS verranno versionati automaticamente -->
  <link rel="stylesheet" href="assets/css/style.css">
  <script src="assets/js/app.js"></script>
</head>

<body>
  <!-- Elemento per mostrare la versione -->
  <span class="version-display">Caricamento...</span>
</body>
```

### Elementi Versionati Automaticamente

- ✅ `<link rel="stylesheet" href="...">`
- ✅ `<script src="...">`
- ✅ `<iframe src="...">`
- ✅ `<img src="...">` (locali)
- ❌ Risorse esterne (CDN) - escluse automaticamente

## 🧪 Testing del Sistema

### Test Manuale

1. **Cambia la versione** in `version.js`
2. **Modifica un CSS** (es. cambia un colore)
3. **Ricarica la pagina**
4. **Verifica** che le modifiche siano visibili immediatamente

### Test con File di Esempio

Inclusi file di test:
- `assets/css/example-cache-test.css`
- `assets/js/example-cache-test.js`

Per testare:
```html
<link rel="stylesheet" href="assets/css/example-cache-test.css">
<script src="assets/js/example-cache-test.js"></script>
```

### Debug Console

Il sistema fornisce strumenti di debug:

```javascript
// Verifica versione corrente
console.log(window.cacheBustingSystem.getVersion());

// Forza reload
window.cacheBustingSystem.forceReload();

// Pulisce cache versione
window.cacheBustingSystem.clearVersionCache();
```

## 📊 Monitoraggio

### Console Logs

Il sistema produce log dettagliati:

```
🚀 Inizializzazione sistema cache-busting...
🔄 Versione caricata: 2.0.0
📄 CSS aggiornato: assets/css/style.css → assets/css/style.css?v=2.0.0
📜 JS aggiornato: assets/js/app.js → assets/js/app.js?v=2.0.0
✅ Cache-busting completato: 3 CSS, 5 JS aggiornati
```

### Verifica Rete

Nel DevTools → Network, verifica che i file abbiano il parametro `?v=VERSION`:
- `style.css?v=2.0.0`
- `app.js?v=2.0.0`

## 🔄 Workflow di Aggiornamento

### Sviluppo
1. Modifica codice CSS/JS
2. Incrementa versione in `version.js`
3. Testa in locale

### Produzione
1. Deploy dei file modificati
2. Il sistema rileva automaticamente la nuova versione
3. Gli utenti ricevono automaticamente gli aggiornamenti

## ⚠️ Note Importanti

### Cosa NON Versionare

- `loader.js` - Gestisce lui stesso il versioning
- Risorse CDN esterne - Hanno già i loro sistemi di versioning
- File con URL assoluti (`http://`, `https://`)

### Compatibilità Browser

- ✅ Chrome/Edge (moderni)
- ✅ Firefox (moderni)
- ✅ Safari (moderni)
- ⚠️ IE11 - Richiede polyfill per `import()`

### Performance

- Il sistema è ottimizzato per essere leggero
- Cache localStorage per evitare reload inutili
- Elaborazione asincrona per non bloccare il rendering

## 🐛 Troubleshooting

### Problema: Versione non si aggiorna

**Soluzione:**
```javascript
// Pulisci cache e forza reload
localStorage.removeItem('app_version');
window.location.reload(true);
```

### Problema: Script non versionati

**Verifica:**
1. `loader.js` è caricato per primo?
2. Gli script sono locali (non CDN)?
3. Console mostra errori?

### Problema: Loop di reload

**Causa:** Errore in `version.js`
**Soluzione:**
1. Verifica sintassi in `version.js`
2. Controlla console per errori
3. Ripristina versione precedente

## 📈 Estensioni Future

- Notifiche utente per aggiornamenti
- Rollback automatico in caso di errori
- Integrazione con service workers
- Versioning granulare per singoli moduli