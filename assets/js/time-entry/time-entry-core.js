// time-entry-core.js - Servizi core per la gestione delle ore

import { db } from "../common/firebase-config.js";
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js';
import { FirestoreService } from "../common/firestore-service.js";

/**
 * Recupera da Firestore l'array di attività per tipo
 */
async function fetchDataArray(varName) {
  try {
    const ref = doc(db, 'Data', varName);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const arr = snap.data()[varName];
      return Array.isArray(arr) ? arr : [];
    }
  } catch (e) {
    console.error(`❌ fetchDataArray(${varName}) error:`, e);
  }
  return [];
}

export const TimeEntryService = {
  activityTypes: {
    appartamenti: { name: "Appartamenti", color: "#B71C6B" },
    uffici:       { name: "Uffici",       color: "#006669" },
    bnb:          { name: "BnB",          color: "#B38F00" },
    pst:          { name: "PST",          color: "#283593" }
  },

  /**
   * Restituisce le attività disponibili per un tipo
   */
  async getActivitiesForType(type) {
    const map = { appartamenti: 'appartamenti', uffici: 'uffici', bnb: 'bnb' };
    const varName = map[type];
    if (!varName) return [];
    
    const arr = await fetchDataArray(varName);
    return arr.map(item => {
      if (typeof item === 'string') {
        const [name, minutes] = item.split('|');
        return { name: name.trim(), minutes: parseInt(minutes, 10) || 0 };
      } else if (item && typeof item === 'object') {
        const name = item.name ?? item.nome ?? '';
        const minutes = item.minutes ?? item.minuti ?? 0;
        return { name: String(name), minutes: Number(minutes) };
      }
      return null;
    }).filter(x => x && x.name);
  },

  /**
   * Salva su Firestore le attività di un dipendente
   */
  async saveTimeEntry(username, date, activities, status) {
    try {
      const cleanedActivities = activities.map(a => ({
        tipo:           a.type       || null,
        nome:           a.name       || null,
        minuti:         Number(a.minutes)    || 0,
        persone:        Number(a.people)     || 1,
        moltiplicatore: Number(a.multiplier) || 1
      }));

      // Recupera dati esistenti per merge
      const existing = await FirestoreService.getEmployeeDay(username, date);
      const prevData = (existing.success && existing.data) ? existing.data : {};
      const prevActivities = Array.isArray(prevData.attività) ? prevData.attività : [];

      // Merge attività esistenti con nuove (evita duplicati)
      const activityMap = {};
      prevActivities.forEach(act => {
        const key = `${act.nome}|${act.tipo}`;
        activityMap[key] = act;
      });
      
      cleanedActivities.forEach(act => {
        const key = `${act.nome}|${act.tipo}`;
        activityMap[key] = act;
      });

      const finalActivities = Object.values(activityMap);
      
      const payload = {
        data:      date,
        attività:  finalActivities,
        riposo:    status.riposo   ?? prevData.riposo   ?? false,
        ferie:     status.ferie    ?? prevData.ferie    ?? false,
        malattia:  status.malattia ?? prevData.malattia ?? false
      };

      return await FirestoreService.saveEmployeeDay(username, date, payload);
    } catch (err) {
      console.error('❌ saveTimeEntry error:', err);
      return { success: false, error: err };
    }
  }
};