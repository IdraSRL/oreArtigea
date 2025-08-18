// firestore-service.js - Servizio Firestore centralizzato
import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  startAt,
  endAt,
  limit
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export const FirestoreService = {
  /**
   * Ottiene l'elenco dei dipendenti
   */
  async getEmployees() {
    try {
      const ref = doc(db, 'Data', 'employees');
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        const data = snap.data();
        const employees = data.employees || [];
        
        if (!Array.isArray(employees)) {
          console.warn('employees non è un array:', employees);
          return [];
        }
        
        return employees.map(emp => {
          if (typeof emp === 'string') {
            return { name: emp };
          } else if (emp && typeof emp === 'object') {
            return { 
              name: emp.name || emp.nome || 'N/A',
              password: emp.password || '',
              ...emp
            };
          }
          return { name: 'N/A' };
        }).filter(emp => emp.name !== 'N/A');
      }
      return [];
    } catch (error) {
      console.error('Errore caricamento dipendenti:', error);
      return [];
    }
  },

  /**
   * Ottiene le attività per un tipo specifico
   */
  async getActivitiesByType(type) {
    try {
      const ref = doc(db, 'Data', type);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        const data = snap.data();
        return data[type] || [];
      }
      return [];
    } catch (error) {
      console.error(`Errore caricamento attività ${type}:`, error);
      return [];
    }
  },

  /**
   * Salva i dati giornalieri per un dipendente
   */
  async saveEmployeeDay(username, date, data) {
    try {
      const employeeId = username.replaceAll(' ', '_');
      const dayDocRef = doc(db, 'dipendenti', employeeId, 'ore', date);
      await setDoc(dayDocRef, data, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Errore saveEmployeeDay:', error);
      return { success: false, error };
    }
  },

  /**
   * Recupera i dati di un singolo giorno per un dipendente
   */
  async getEmployeeDay(username, date) {
    try {
      const employeeId = username.replaceAll(' ', '_');
      if (!employeeId || !date) {
        throw new Error('Parametri mancanti');
      }
      
      const ref = doc(db, 'dipendenti', employeeId, 'ore', date);
      const snap = await getDoc(ref);
      return { success: true, data: snap.exists() ? snap.data() : {} };
    } catch (error) {
      console.error('Errore getEmployeeDay:', error);
      return { success: false, error };
    }
  },

  /**
   * Recupera tutti i dati del mese per un singolo dipendente
   */
  async getEmployeeMonth(username, year, month) {
    try {
      const employeeId = username.replaceAll(' ', '_');
      if (!employeeId) {
        throw new Error('Username non valido');
      }
      
      const oreRef = collection(db, 'dipendenti', employeeId, 'ore');
      const start = `${year}-${String(month).padStart(2,'0')}-01`;
      const end = `${year}-${String(month).padStart(2,'0')}-31`;
      
      const q = query(
        oreRef,
        orderBy('__name__'),
        startAt(start),
        endAt(end)
      );
      
      const snap = await getDocs(q);
      const data = {};
      snap.forEach(d => { data[d.id] = d.data(); });
      
      return { success: true, data };
    } catch (error) {
      console.error('Errore getEmployeeMonth:', error);
      return { success: false, error };
    }
  },

  /**
   * Recupera i dati di tutti i dipendenti per un mese
   */
  async getAllEmployeesMonth(year, month) {
    try {
      const allData = {};
      const employees = await this.getEmployees();
      
      if (!employees || employees.length === 0) {
        console.warn('Nessun dipendente trovato');
        return { success: true, data: {} };
      }
      
      for (const emp of employees) {
        const name = typeof emp === 'string' ? emp : (emp.name || emp.nome);
        if (!name || name.trim() === '') {
          console.warn('Dipendente senza nome valido:', emp);
          continue;
        }
        
        const result = await this.getEmployeeMonth(name, year, month);
        if (result.success) {
          allData[name] = result.data || {};
        } else {
          console.warn(`Errore caricamento dati per ${name}:`, result.error?.message);
          allData[name] = {};
        }
      }

      return { success: true, data: allData };
    } catch (error) {
      console.error('Errore getAllEmployeesMonth:', error);
      return { success: false, error };
    }
  },

  /**
   * Recupera tutte le attività di un dipendente
   */
  async getAllEmployeeActivities(username) {
    try {
      const employeeId = username.replaceAll(' ', '_');
      const colRef = collection(db, 'dipendenti', employeeId, 'ore');
      const q = query(colRef, orderBy('__name__', 'desc'), limit(100));
      const snap = await getDocs(q);
      
      const results = [];
      snap.forEach(docSnap => {
        results.push({ date: docSnap.id, ...docSnap.data() });
      });
      
      return results;
    } catch (error) {
      console.error('Errore getAllEmployeeActivities:', error);
      return [];
    }
  },

  /**
   * Ottiene una collezione completa
   */
  async getCollection(collectionName) {
    try {
      const colRef = collection(db, collectionName);
      const snap = await getDocs(colRef);
      const results = [];
      
      snap.forEach(docSnap => {
        results.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      return results;
    } catch (error) {
      console.error(`Errore getCollection ${collectionName}:`, error);
      return [];
    }
  },

  /**
   * Aggiorna un documento
   */
  async updateDocument(collectionName, docId, data) {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, data, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Errore updateDocument:', error);
      return { success: false, error };
    }
  }
};

// Named exports per compatibilità
export async function getCollection(collName) {
  return FirestoreService.getCollection(collName);
}

export async function updateDoc(collName, docId, data) {
  return FirestoreService.updateDocument(collName, docId, data);
}