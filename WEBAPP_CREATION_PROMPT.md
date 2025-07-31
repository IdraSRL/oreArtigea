# Prompt per Creare Web App Sistema Gestione Ore

## 📋 **Descrizione del Progetto**

Crea una web app completa per la gestione delle ore lavorative dei dipendenti con le seguenti caratteristiche:

### **Funzionalità Principali:**
1. **Sistema di Login Dual-Mode**: Login dipendenti e login amministratore
2. **Gestione Ore Dipendenti**: Registrazione attività giornaliere con calcoli automatici
3. **Pannello Amministrativo**: Gestione dipendenti, categorie attività e visualizzazione dati
4. **Sistema Dinamico**: Categorie e attività configurabili dall'admin
5. **Export Excel**: Esportazione dati in formato Excel con ore decimali

---

## 🔧 **Configurazione Firebase**

### **Credenziali Firebase:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDLscDTFvi0uBg8fRMJuV5ZDozJQuBX9AA",
  authDomain: "orecliente-daa0d.firebaseapp.com",
  projectId: "orecliente-daa0d",
  storageBucket: "orecliente-daa0d.firebasestorage.app",
  messagingSenderId: "510090564679",
  appId: "1:510090564679:web:7b95bae80ee6eb3c568d62",
  measurementId: "G-7ZR1CX64VW"
};
```

### **Struttura Database Firestore:**
```
dipendenti/
  {employeeId}/
    ore/
      {YYYY-MM-DD}: {
        data: "YYYY-MM-DD",
        attività: [
          {
            nome: "Nome attività",
            tipo: "categoria_id",
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
  employees: { 
    employees: [
      { name: "Nome Dipendente", password: "password123" }
    ]
  }
  categories: { 
    categories: [
      {
        name: "Uffici",
        activities: [
          { name: "Pulizia Ufficio A", minutes: 30 },
          { name: "Pulizia Ufficio B", minutes: 45 }
        ]
      }
    ]
  }
  masterPassword: { password: "admin123" }
```

---

## 🏗️ **Architettura del Sistema**

### **1. Sistema di Autenticazione**
- **Login Dipendenti**: Select dinamica popolata da Firestore + password
- **Login Admin**: Password master per accesso amministrativo
- **Gestione Sessioni**: SessionStorage per mantenere lo stato di login

### **2. Lato Dipendente (timeEntry.html)**
- **Registrazione Attività**: Form dinamico con pulsanti per ogni categoria
- **Calcolo Ore**: Formula `(Minuti × Moltiplicatore) ÷ Persone = Ore Decimali`
- **Stati Giornalieri**: Normale, Riposo, Ferie, Malattia
- **Riepilogo Mensile**: Visualizzazione totali con dettagli giornalieri

### **3. Pannello Admin (admin.html)**
- **Tab Riepilogo Ore**: Visualizzazione dati tutti i dipendenti + export Excel
- **Tab Gestione Data**: 
  - Sottotab "Dipendenti": CRUD dipendenti con nome/password
  - Sottotab "Categorie Attività": CRUD categorie e relative attività
- **Tab Registro Attività**: Log completo attività con filtri e export

---

## 🎨 **Design e UI/UX**

### **Tema Scuro Moderno:**
- **Colori**: Gradiente blu/viola (#6366f1, #8b5cf6) su sfondo scuro
- **Cards**: Glassmorphism con backdrop-filter e bordi luminosi
- **Animazioni**: Hover effects, transizioni smooth, micro-interazioni
- **Responsive**: Mobile-first design con breakpoints ottimizzati

### **Componenti Chiave:**
- **Navbar**: Sticky con blur effect e informazioni utente
- **Activity Cards**: Cards colorate per ogni categoria con form integrati
- **Tables**: Stile dark con hover effects e colonne responsive
- **Buttons**: Gradients, shadows, e stati di loading

---

## ⚙️ **Logica di Funzionamento**

### **Sistema Dinamico delle Categorie:**

1. **Configurazione Admin:**
   ```javascript
   // Admin crea categoria "Uffici"
   categories: [{
     name: "Uffici",
     activities: [
       { name: "Pulizia Ufficio A", minutes: 30 },
       { name: "Pulizia Ufficio B", minutes: 45 }
     ]
   }]
   ```

2. **Generazione Dinamica Pulsanti:**
   ```javascript
   // Nel lato dipendente si generano automaticamente:
   <button class="btn-activity" style="background-color: #B71C6B">
     <i class="fas fa-building"></i>
     Uffici
   </button>
   ```

3. **Popolamento Select Attività:**
   ```javascript
   // Quando si clicca "Uffici", la select si popola con:
   <option value="Pulizia Ufficio A" data-minutes="30">Pulizia Ufficio A</option>
   <option value="Pulizia Ufficio B" data-minutes="45">Pulizia Ufficio B</option>
   ```

### **Calcolo Ore Decimali:**
```javascript
// Formula di calcolo
const minutiEffettivi = (minuti * moltiplicatore) / persone;
const oreDecimali = minutiEffettivi / 60;
// Esempio: (60 * 1) / 2 = 30 minuti = 0.50 ore
```

### **Nome Collezione Configurabile:**
```javascript
// In firestore-service.js
const COLLECTION_NAMES = {
  EMPLOYEES: 'dipendenti',
  DATA: 'Data',
  HOURS: 'ore'
};

// Facilmente modificabile cambiando solo questo oggetto
```

---

## 📁 **Struttura File**

```
/
├── index.html                 # Homepage con scelta login
├── pages/
│   ├── login.html            # Login dipendenti
│   ├── admin-login.html      # Login amministratore
│   ├── admin.html            # Pannello amministrativo
│   └── timeEntry.html        # Gestione ore dipendenti
├── assets/
│   ├── css/
│   │   └── style.css         # Stili tema scuro moderno
│   ├── js/
│   │   ├── common/
│   │   │   ├── firebase-config.js    # Config Firebase
│   │   │   ├── firestore-service.js  # Servizi database
│   │   │   ├── version.js            # Sistema versioning
│   │   │   ├── loader.js             # Cache-busting
│   │   │   ├── time-utils.js         # Utility calcoli ore
│   │   │   └── export-excel.js       # Export Excel
│   │   ├── auth/
│   │   │   └── auth.js               # Sistema autenticazione
│   │   ├── admin/
│   │   │   ├── admin.js              # Logica pannello admin
│   │   │   └── admin-data.js         # Gestione dati admin
│   │   └── time-entry/
│   │       ├── time-entry-core.js    # Servizi core
│   │       ├── time-entry-form.js    # Gestione form
│   │       └── time-entry-summary.js # Riepiloghi
│   └── img/
│       └── logo.png          # Logo applicazione
```

---

## 🔄 **Flusso di Utilizzo**

### **Setup Iniziale (Admin):**
1. Login come admin con password master
2. Vai su "Gestione Data" → "Dipendenti"
3. Aggiungi dipendenti con nome e password
4. Vai su "Categorie Attività"
5. Crea categorie (es: "Uffici", "Appartamenti")
6. Per ogni categoria, aggiungi attività con minuti

### **Uso Quotidiano (Dipendente):**
1. Login con credenziali personali
2. Seleziona data corrente
3. Clicca pulsante categoria (es: "Uffici")
4. Seleziona attività specifica
5. Imposta persone e moltiplicatore se necessario
6. Salva registrazione
7. Visualizza riepilogo mensile

### **Monitoraggio (Admin):**
1. Visualizza ore di tutti i dipendenti
2. Filtra per dipendente e mese
3. Esporta dati in Excel
4. Consulta registro attività dettagliato

---

## 🎯 **Caratteristiche Tecniche Specifiche**

### **Sistema di Cache-Busting:**
- Versioning automatico dei file CSS/JS
- Reload automatico quando cambia versione
- Gestione cache browser ottimizzata

### **Calcoli Precisi:**
- Minuti frazionari per calcoli precisi
- Arrotondamenti controllati
- Formattazione italiana per numeri decimali

### **Responsive Design:**
- Mobile-first approach
- Breakpoints ottimizzati per tablet/mobile
- Touch-friendly su dispositivi mobili

### **Sicurezza:**
- Validazione lato client e server
- Gestione errori robusta
- Sanitizzazione input utente

---

## 🚀 **Tecnologie Utilizzate**

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Framework CSS**: Bootstrap 5 con tema custom
- **Database**: Google Firestore
- **Icons**: Font Awesome 6
- **Export**: ExcelJS per generazione file Excel
- **Build**: Sistema di versioning e cache-busting custom

---

## 📝 **Note Implementative**

1. **Modularità**: Codice organizzato in moduli ES6 per manutenibilità
2. **Error Handling**: Gestione errori completa con feedback utente
3. **Performance**: Lazy loading e ottimizzazioni per velocità
4. **Accessibilità**: Supporto screen reader e navigazione keyboard
5. **Internazionalizzazione**: Formati italiani per date e numeri

---

## 🔧 **Personalizzazioni Facili**

### **Modificare Nome Collezioni:**
```javascript
// In firestore-service.js
const COLLECTION_NAMES = {
  EMPLOYEES: 'dipendenti',        // Cambia qui
  DATA: 'Data',                   // Cambia qui
  HOURS: 'ore'                    // Cambia qui
};
```

### **Aggiungere Nuovi Campi:**
```javascript
// Per aggiungere campo "reparto" ai dipendenti
employees: [{
  name: "Mario Rossi",
  password: "password123",
  reparto: "Pulizie"              // Nuovo campo
}]
```

### **Personalizzare Colori Categorie:**
```javascript
// In time-entry-core.js
const colors = [
  "#B71C6B",    // Rosa
  "#006669",    // Teal
  "#B38F00",    // Oro
  "#283593"     // Blu scuro
  // Aggiungi altri colori qui
];
```

Questo prompt fornisce tutte le informazioni necessarie per ricreare completamente la web app con la logica corretta e le configurazioni specificate.