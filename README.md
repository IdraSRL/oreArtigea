# Sistema Gestione Ore Semplificato

**Versione:** 2.0.1  
**Build:** 2025-01-27-cleaned

## Panoramica

Sistema semplificato per la gestione delle ore lavorative dei dipendenti con funzionalità essenziali per amministratori e dipendenti.

## Funzionalità

### Lato Dipendente
- **Gestione Ore**: Registrazione attività giornaliere con calcolo automatico ore decimali
- **Riepilogo Mensile**: Visualizzazione totali mensili e dettagli giornalieri

### Lato Amministratore
- **Riepilogo Ore**: Visualizzazione e gestione ore di tutti i dipendenti
- **Gestione Data**: Configurazione dipendenti, attività e parametri sistema
- **Registro Attività**: Visualizzazione dettagliata di tutte le attività con export Excel

## Sistema di Versioning

Sistema di versioning automatico con cache-busting per garantire aggiornamenti corretti.

### Struttura Versioning

- **Versione App:** 2.0.1 (formato semver) 
- **Build Date:** 2025-01-27-cleaned

### File di Configurazione

- `assets/js/common/version.js` - Script per gestire e visualizzare le versioni
- `assets/js/common/loader.js` - Sistema di cache-busting automatico

### Come Aggiornare la Versione

1. Modifica `assets/js/common/version.js`:
```javascript
export const APP_VERSION = '2.0.2';
```

2. Il sistema automaticamente:
   - Rileva il cambio di versione
   - Forza il reload della pagina
   - Applica i nuovi parametri di versione

## Struttura Progetto

```
/
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── common/
│       │   ├── version.js
│       │   ├── loader.js
│       │   ├── firebase-config.js
│       │   ├── firestore-service.js
│       │   ├── time-utilis.js
│       │   ├── utils.js
│       │   └── export-excel.js
│       ├── auth/
│       │   └── auth.js
│       ├── admin/
│       │   └── common/
│       │       ├── admin.js
│       │       └── admin-data.js
│       └── time-entry/
│           ├── time-entry-core.js
│           ├── time-entry-form.js
│           └── time-entry-summary.js
├── pages/
│   ├── login.html
│   ├── admin-login.html
│   ├── admin.html
│   └── timeEntry.html
└── index.html
```

## Funzionalità Principali

### Gestione Ore Dipendenti
- Registrazione attività con tipologie predefinite
- Calcolo automatico ore decimali con moltiplicatori e divisione per persone
- Gestione status giornalieri (normale, riposo, ferie, malattia)
- Riepilogo mensile con totali e dettagli giornalieri

### Pannello Amministrativo
- Visualizzazione ore di tutti i dipendenti
- Export Excel con dati mensili in formato decimale
- Gestione dati di configurazione
- Registro completo attività con filtri avanzati

### Sistema di Autenticazione
- Login dipendenti con credenziali personalizzate
- Accesso amministratore con password master
- Gestione sessioni sicura

## Database Structure

I dati sono memorizzati in Firestore con la seguente struttura:

```
dipendenti/
  {employeeId}/
    ore/
      {YYYY-MM-DD}: {
        data: "YYYY-MM-DD",
        attività: [
          {
            nome: "Nome attività",
            tipo: "appartamenti|uffici|bnb|pst",
            minuti: 60,
            persone: 2,
            moltiplicatore: 1
          }
        ],
        riposo: false,
        ferie: false,
        malattia: false
      }

Data/
  employees: { employees: [...] }
  appartamenti: { appartamenti: [...] }
  uffici: { uffici: [...] }
  bnb: { bnb: [...] }
```

## Calcolo Ore

Il sistema calcola le ore utilizzando:
```
Minuti Effettivi = (Minuti × Moltiplicatore) ÷ Persone
Ore Decimali = Minuti Effettivi ÷ 60
```

Tutti i calcoli mantengono precisione a 2 decimali con formattazione italiana.

## Tecnologie Utilizzate

- **Frontend**: HTML5, CSS3, JavaScript ES6+, Bootstrap 5
- **Database**: Google Firestore
- **Autenticazione**: Sistema personalizzato
- **Export**: ExcelJS per generazione file Excel
- **Versioning**: Sistema automatico di cache-busting

## Compatibilità

- ✅ Chrome/Edge (moderni)
- ✅ Firefox (moderni)  
- ✅ Safari (moderni)
- ✅ Dispositivi mobile (responsive design)

## Manutenzione

### Aggiornamento Sistema
1. Modificare i file necessari
2. Incrementare la versione in `version.js`
3. Il sistema gestirà automaticamente il cache-busting
### Pulizia Codice
- Rimossi file duplicati e non utilizzati
- Standardizzati stili di codifica
- Ottimizzate importazioni e dipendenze
- Consolidate funzioni comuni