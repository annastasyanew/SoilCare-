import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_u1O9fdaPKVnIhdJH-oi-rOTE_KHCOL4",
  authDomain: "soilcare-cabai-db941.firebaseapp.com",
  databaseURL: "https://soilcare-cabai-db941-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "soilcare-cabai-db941",
  storageBucket: "soilcare-cabai-db941.firebasestorage.app",
  messagingSenderId: "1689782516",
  appId: "1:1689782516:web:c4e75f1ac24b7e041376a1"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };