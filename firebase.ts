
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Vercel वा अन्य प्लेटफर्ममा सेक्रेट कीहरू राख्नका लागि Environment Variables प्रयोग गरिन्छ।
// यदि यी कीहरू छैनन् भने डिफल्ट मान प्रयोग हुनेछ।
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBNgp4ZKBq_sHjVC0OGwSidhzCOtoGYR4k",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "smart-health-dce40.firebaseapp.com",
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || "https://smart-health-dce40-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "smart-health-dce40",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "smart-health-dce40.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "81529782106",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:81529782106:web:286029a5dc050cd0423d63",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-CSK81WMJEQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const db = getDatabase(app);
