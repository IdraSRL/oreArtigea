// firebase-config_gradimento.js v1.0
// Configurazione Firebase
// IMPORTANTE: Sostituisci questi valori con la tua configurazione Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAjyQ8BuAmWHUlwjWaYqYpVWZrZL1RKSeU",
    authDomain: "gradimento-37f58.firebaseapp.com",
    projectId: "gradimento-37f58",
    storageBucket: "gradimento-37f58.firebasestorage.app",
    messagingSenderId: "297599248620",
    appId: "1:297599248620:web:266a42707b70abc42d9dc9",
    measurementId: "G-JJNY6MJN3S"
};

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Inizializza Firebase
let app, db;

try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebase Gradimento inizializzato correttamente');
} catch (error) {
    console.error('Errore nell\'inizializzazione di Firebase:', error);
}

// Funzioni utility per lavorare con le date
const utils = {
    getCurrentMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
    },

    formatDate(timestamp) {
        if (!timestamp) return 'N/A';

        let date;
        if (timestamp.toDate) {
            // Firestore Timestamp
            date = timestamp.toDate();
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else {
            // String or number
            date = new Date(timestamp);
        }

        return date.toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getMonthName(monthString) {
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1, 1);
        return date.toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long'
        });
    }
};

// Funzioni per interagire con Firestore
const firebaseService = {
  /**
   * Salva il feedback di un cliente, garantendo 1 sola valutazione per email/mese:
   * - Se esiste già un feedback per il mese corrente, lo sovrascrive
   * - Altrimenti, lo crea
   * - Include il campo nomeCliente per raggruppare clienti con email diverse
   *
   * @param {string} email
   * @param {{ risposta1: string, risposta2: string, risposta3: string }} risposte
   * @param {string} commento
   * @param {string} nomeCliente - Nome del cliente per raggruppamento
   */
  async saveFeedback(email, risposte, commento = '', nomeCliente = '') {
    try {
      if (!db) throw new Error('Firebase non inizializzato');

      const currentMonth = utils.getCurrentMonth(); // es. "2025-06"
      const feedbackData = {
        risposta1: parseInt(risposte.risposta1, 10),
        risposta2: parseInt(risposte.risposta2, 10),
        risposta3: parseInt(risposte.risposta3, 10),
        commento: commento.trim(),
        dataInvio: serverTimestamp(),
        mese: currentMonth,
        email,
        nomeCliente: nomeCliente.trim() || email // Se non specificato, usa l'email come nome
      };

      const docRef = doc(db, 'Gradimento', email);
      // Unico setDoc con merge sul campo [currentMonth]
      await setDoc(docRef, { [currentMonth]: feedbackData }, { merge: true });

      return { success: true, message: 'Feedback salvato con successo!' };
    } catch (error) {
      console.error('Errore nel saveFeedback:', error);
      return {
        success: false,
        message: 'Errore nel salvare il feedback. Verifica la configurazione Firebase.'
      };
    }
  },

  /**
   * Aggiorna il nome cliente per una specifica email
   * @param {string} email
   * @param {string} nomeCliente
   * @param {string} mese
   */
  async updateFeedbackClientName(email, nomeCliente, mese) {
    try {
      if (!db) throw new Error('Firebase non inizializzato');

      const docRef = doc(db, 'Gradimento', email);
      await updateDoc(docRef, {
        [`${mese}.nomeCliente`]: nomeCliente.trim()
      });

      return { success: true, message: 'Nome cliente aggiornato con successo!' };
    } catch (error) {
      console.error('Errore nell\'aggiornamento nome cliente:', error);
      return {
        success: false,
        message: 'Errore nell\'aggiornamento del nome cliente.'
      };
    }
  },

  /**
   * Recupera tutti i feedback di tutti i clienti e mesi
   * @returns {{ success: boolean, data: Array, message?: string }}
   */
  async getAllFeedback() {
    try {
      if (!db) throw new Error('Firebase non inizializzato');

      const snapshot = await getDocs(collection(db, 'Gradimento'));
      const allFeedback = [];

      snapshot.forEach(docSnap => {
        const email = docSnap.id;
        const data = docSnap.data();
        Object.keys(data).forEach(month => {
          const fb = data[month];
          if (fb && typeof fb === 'object') {
            allFeedback.push({ 
              id: `${email}_${month}`, // ID univoco per il feedback
              email, 
              mese: month, 
              nomeCliente: fb.nomeCliente || email, // Fallback all'email se non c'è nome
              ...fb 
            });
          }
        });
      });

      // Ordina per dataInvio (più recente prima)
      allFeedback.sort((a, b) => {
        const dateA = a.dataInvio?.toDate?.() ?? new Date(a.dataInvio);
        const dateB = b.dataInvio?.toDate?.() ?? new Date(b.dataInvio);
        return dateB - dateA;
      });

      return { success: true, data: allFeedback };
    } catch (error) {
      console.error('Errore nel getAllFeedback:', error);
      return {
        success: false,
        message: 'Errore nel caricare i feedback. Verifica la configurazione Firebase.',
        data: []
      };
    }
  },

  /**
   * Calcola statistiche di base sui feedback ricevuti:
   * - numero clienti unici (per nome)
   * - media complessiva
   * - conteggio feedback del mese corrente
   * - numero con commento
   * - medie per domanda
   * - trend mensile
   * - statistiche per cliente
   *
   * @param {Array} feedbackData
   * @returns {Object}
   */
  calculateStats(feedbackData) {
    if (!Array.isArray(feedbackData) || feedbackData.length === 0) {
      return {
        totalClients: 0,
        avgRating: 0,
        thisMonth: 0,
        withComments: 0,
        questionsAvg: [0, 0, 0],
        monthlyTrend: {},
        clientStats: {}
      };
    }

    const currentMonth = utils.getCurrentMonth();
    const uniqueClients = new Set();
    let totals = [0, 0, 0];
    const monthlyData = {};
    const clientData = {};
    let thisMonthCount = 0;
    let commentsCount = 0;

    feedbackData.forEach(fb => {
      const clientName = fb.nomeCliente || fb.email;
      uniqueClients.add(clientName);
      
      if (fb.mese === currentMonth) thisMonthCount++;
      if (fb.commento && fb.commento.trim()) commentsCount++;

      totals[0] += fb.risposta1 || 0;
      totals[1] += fb.risposta2 || 0;
      totals[2] += fb.risposta3 || 0;

      // Trend mensile
      if (!monthlyData[fb.mese]) {
        monthlyData[fb.mese] = { count: 0, totalRating: 0 };
      }
      monthlyData[fb.mese].count++;
      monthlyData[fb.mese].totalRating +=
        ((fb.risposta1 || 0) + (fb.risposta2 || 0) + (fb.risposta3 || 0)) / 3;

      // Statistiche per cliente
      if (!clientData[clientName]) {
        clientData[clientName] = {
          feedbacks: [],
          totalRating: 0,
          count: 0,
          avgRating: 0,
          questionsAvg: [0, 0, 0],
          emails: new Set()
        };
      }
      
      clientData[clientName].feedbacks.push(fb);
      clientData[clientName].emails.add(fb.email);
      clientData[clientName].count++;
      
      const clientRating = ((fb.risposta1 || 0) + (fb.risposta2 || 0) + (fb.risposta3 || 0)) / 3;
      clientData[clientName].totalRating += clientRating;
    });

    // Calcola medie per cliente
    Object.keys(clientData).forEach(clientName => {
      const client = clientData[clientName];
      client.avgRating = parseFloat((client.totalRating / client.count).toFixed(1));
      
      // Medie per domanda del cliente
      const clientTotals = [0, 0, 0];
      client.feedbacks.forEach(fb => {
        clientTotals[0] += fb.risposta1 || 0;
        clientTotals[1] += fb.risposta2 || 0;
        clientTotals[2] += fb.risposta3 || 0;
      });
      
      client.questionsAvg = clientTotals.map(sum => 
        parseFloat((sum / client.count).toFixed(1))
      );
      
      // Converti Set in Array per serializzazione
      client.emails = Array.from(client.emails);
    });

    const count = feedbackData.length;
    const questionsAvg = totals.map(sum => parseFloat((sum / count).toFixed(1)));
    const overallAvg = parseFloat((totals.reduce((a, b) => a + b, 0) / (count * 3)).toFixed(1));

    const monthlyTrend = {};
    for (const [month, { count: c, totalRating }] of Object.entries(monthlyData)) {
      monthlyTrend[month] = parseFloat((totalRating / c).toFixed(1));
    }

    return {
      totalClients: uniqueClients.size,
      avgRating: overallAvg,
      thisMonth: thisMonthCount,
      withComments: commentsCount,
      questionsAvg,
      monthlyTrend,
      clientStats: clientData
    };
  }
};

async function testFirebaseConnection() {
    try {
        if (!db) throw new Error('Firebase non inizializzato');
        await getDocs(query(collection(db, 'Gradimento')));
        return { success: true, message: 'Connessione Firebase attiva' };
    } catch (error) {
        console.error('Errore connessione Firebase:', error);
        return {
            success: false,
            message: 'Errore di connessione. Verifica la configurazione Firebase.'
        };
    }
}

// Esporta per uso globale
window.firebaseService = firebaseService;
window.utils = utils;
window.testFirebaseConnection = testFirebaseConnection;