import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- IMPORTANT ---
// This is your actual Firebase project configuration.
const firebaseConfig = {
  apiKey: "AIzaSyBLf0fZUFGXS9NMS3rMr8Iisy-siAAiIyI",
  authDomain: "kabale-20ec4.firebaseapp.com",
  projectId: "kabale-20ec4",
  storageBucket: "kabale-20ec4.appspot.com",
  messagingSenderId: "792218710477",
  appId: "1:792218710477:web:5a32cc3177ddba98ff5484"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export the services for use in other modules
export { auth, db };