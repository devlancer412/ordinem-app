import { initializeApp } from 'firebase/app';
import { collection, getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCTtP9rlaohOwASzv-DI3U1j-pAULyHx60',
  authDomain: 'ordinemquest-5408e.firebaseapp.com',
  databaseURL: 'https://ordinemquest-5408e-default-rtdb.firebaseio.com',
  projectId: 'ordinemquest-5408e',
  storageBucket: 'ordinemquest-5408e.appspot.com',
  messagingSenderId: '610580477828',
  appId: '1:610580477828:web:66352d8295e0058477cfd1',
  measurementId: 'G-FESS9HX09Y',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const database = getDatabase(app);

export const userCollection = collection(db, 'users');
export const nftCollection = collection(db, 'nfts');
