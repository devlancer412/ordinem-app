import { useTwitterUser } from "hooks/useTwitterUser";
import { initializeApp } from "firebase/app";
import {
  addDoc,
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  getFirestore,
  query,
  QuerySnapshot,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  TwitterAuthProvider,
  signOut,
} from "firebase/auth";
import { useAlert } from "hooks/useAlert";

const provider = new TwitterAuthProvider();

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

const auth = getAuth();
const { open } = useAlert.getState();
const { removeUser, changeUser } = useTwitterUser.getState();

export async function logoutFromTwitter() {
  await signOut(auth);
  removeUser();
}

export async function signInWithTwitterFirebase(address?: string) {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = TwitterAuthProvider.credentialFromResult(result);
    console.log(credential);
    const user = result.user;

    const q = query(userCollection, where("uid", "==", user.uid));
    const docs = await getDocs(q);
    if (docs.docs.length === 0) {
      const { uid, email, photoURL: image, displayName } = user;
      await addDoc(userCollection, {
        uid,
        email,
        image,
        displayName,
        screenName: (user as any)?.reloadUserInfo.screenName,
        wallet: address ?? "",
      });
    } else if (address != undefined) {
      const userDoc = docs.docs[0];
      const user = userDoc.data();
      console.log(user);

      if (user.wallet.length === 0) {
        await updateDoc(doc(db, "users", userDoc.id), {
          wallet: address,
        });
        changeUser(address);
      } else if (user.wallet !== address) {
        await signOut(auth);
        throw new Error("Usage of different wallet for this account");
      }
    }
  } catch (error) {
    console.log(error);
    open({
      message: error as string,
      status: "error",
    });
  }
}

export const getData = (
  docs: QuerySnapshot<DocumentData>
): { _id: string; [key: string]: any }[] =>
  docs.docs.map((doc) => ({ ...doc.data(), _id: doc.id }));

export async function getFirebaseNfts(publicKey: string) {
  const nftData = getData(
    await getDocs(
      query(nftCollection, where("wallet_address", "==", publicKey))
    )
  );
  const nfts = await Promise.all(
    nftData.map(async (data) => {
      let twitter;
      if ("twitter_id" in data) {
        const twitterData = await getDoc((data as any).twitter_id);
        twitter = twitterData.data();
      }

      return { ...data, twitter };
    })
  );
  return nfts;
}

export async function setTwitterDataToNft(publicKey: string, mint: string) {
  if (!auth.currentUser || !auth.currentUser.uid) return;
  const nftData = getData(
    await getDocs(
      query(
        nftCollection,
        where("wallet_address", "==", publicKey),
        where("mint", "==", mint)
      )
    )
  );
  const user = await getCurrentUserData();

  updateDoc(doc(db, "nfts", nftData[0]._id), {
    twitter_id: doc(db, `/users/${user._id}`),
  });
}

export async function getCurrentUserData() {
  return getData(
    await getDocs(
      query(userCollection, where("uid", "==", auth.currentUser?.uid))
    )
  )[0];
}

export async function updateUserData(payload: any) {
  const user = await getCurrentUserData();
  if (
    user.followers !== payload.followers ||
    user.following !== payload.following
  ) {
    updateDoc(doc(db, "users", user._id), payload);
  }
}

export async function getUserFromAddress(address: string) {
  return getData(
    await getDocs(query(userCollection, where("wallet", "==", address)))
  )[0];
}
