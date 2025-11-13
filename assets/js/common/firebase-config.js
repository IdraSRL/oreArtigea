// firebase-config.js - Configurazione Firebase centralizzata
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// Configurazione del progetto Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyCcq4vF4yGXOx3XVd30Mhqh4bfF2z8O7XU",
  authDomain: "oredipendenti-81442.firebaseapp.com",
  projectId: "oredipendenti-81442",
  storageBucket: "oredipendenti-81442.firebasestorage.app",
  messagingSenderId: "605987945448",
  appId: "1:605987945448:web:17d89a5f410c07b464025d"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Esporta istanze Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);