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
  activityTypes: {},
  
  /**
   * Carica le categorie dinamicamente da Firestore
   */
  async loadCategories() {
    try {
      const ref = doc(db, 'Data', 'categories');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const categories = snap.data().categories || [];
        this.activityTypes = {};
        
        // Colori predefiniti per le categorie
        const colors = ["#B71C6B", "#006669", "#B38F00", "#283593", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];
        
        categories.forEach((category, index) => {
          const categoryId = category.name.toLowerCase().replace(/\s+/g, '_');
          this.activityTypes[categoryId] = {
            name: category.name,
            color: colors[index % colors.length],
            activities: category.activities || []
          };
        });
        
        // Aggiungi sempre PST come categoria fissa
        this.activityTypes.pst = {
          name: "PST",
          color: "#283593",
          activities: []
        };
      }
    } catch (e) {
      console.error('❌ loadCategories error:', e);
    }
  },

  /**
   * Restituisce le attività disponibili per un tipo
   */
  async getActivitiesForType(type) {
    // Assicurati che le categorie siano caricate
    if (Object.keys(this.activityTypes).length === 0) {
      await this.loadCategories();
    }
    
    const categoryData = this.activityTypes[type];
    if (!categoryData || !categoryData.activities) return [];
    
    return categoryData.activities.map(activity => ({
      name: activity.name,
      minutes: activity.minutes || 0
    }));
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