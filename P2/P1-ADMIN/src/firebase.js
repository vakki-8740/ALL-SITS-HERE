import { initializeApp } from 'firebase/app';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCiqaLzh7PoVC5l03sJFdtK548Wulufn94",
  authDomain: "alll-projects-admin-pennal.firebaseapp.com",
  projectId: "alll-projects-admin-pennal",
  storageBucket: "alll-projects-admin-pennal.firebasestorage.app",
  messagingSenderId: "689297868215",
  appId: "1:689297868215:web:2747b19c2da47a31f49432"
};

const app = initializeApp(FIREBASE_CONFIG);

export const db = getFirestore(app);

// Offline cache across tabs. Fails harmlessly if another tab already won the race.
try {
  enableMultiTabIndexedDbPersistence(app).catch(() => {});
} catch (e) {
  /* persistence unavailable - the app still works online */
}
