// activity-types.js - Configurazione tipi di attività condivisa
export const ACTIVITY_TYPES = {
  appartamenti: { 
    name: "Appartamenti", 
    color: "#B71C6B", 
    icon: "fas fa-home",
    collection: "appartamenti"
  },
  uffici: { 
    name: "Uffici", 
    color: "#006669", 
    icon: "fas fa-building",
    collection: "uffici"
  },
  bnb: { 
    name: "BnB", 
    color: "#B38F00", 
    icon: "fas fa-bed",
    collection: "bnb"
  },
  pst: { 
    name: "PST", 
    color: "#283593", 
    icon: "fas fa-tools",
    collection: null // PST non ha collezione predefinita
  }
};

/**
 * Ottiene la configurazione per un tipo di attività
 */
export function getActivityTypeConfig(type) {
  return ACTIVITY_TYPES[type] || null;
}

/**
 * Ottiene tutti i tipi di attività disponibili
 */
export function getAllActivityTypes() {
  return Object.keys(ACTIVITY_TYPES);
}

/**
 * Verifica se un tipo di attività è valido
 */
export function isValidActivityType(type) {
  return type in ACTIVITY_TYPES;
}