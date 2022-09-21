import { initializeApp } from "firebase/app";
import { collection, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDaUnotOtJseK7qi3Wt35UbJ3UAtcfjmVw",
  authDomain: "solana-nfts.firebaseapp.com",
  projectId: "solana-nfts",
  storageBucket: "solana-nfts.appspot.com",
  messagingSenderId: "259626375319",
  appId: "1:259626375319:web:83bf74f2c1684dd6c471d2",
  measurementId: "G-6BV70P11LT",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const userCollection = collection(db, "users");
export const nftCollection = collection(db, "nfts");
