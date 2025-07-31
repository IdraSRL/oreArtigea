// firebase-config.js v1.0
// 1) Import delle librerie Firebase v9.22.1
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

// 2) Configurazione del progetto
export const firebaseConfig = {
  apiKey: "AIzaSyDLscDTFvi0uBg8fRMJuV5ZDozJQuBX9AA",
  authDomain: "orecliente-daa0d.firebaseapp.com",
  projectId: "orecliente-daa0d",
  storageBucket: "orecliente-daa0d.firebasestorage.app",
  messagingSenderId: "510090564679",
  appId: "1:510090564679:web:7b95bae80ee6eb3c568d62",
  measurementId: "G-7ZR1CX64VW"
};

// 3) Inizializza Firebase
const app = initializeApp(firebaseConfig);

// 4) Esporta auth e db (NOMINATIVI)
export const auth = getAuth(app);
export const db   = getFirestore(app);
