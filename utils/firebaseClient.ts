import { NETWORK } from "./constants";
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
import SolanaClient from "./solanaClient";
import axios from "axios";
import { differenceInDays, isYesterday } from "date-fns";

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
const { open: openAlert } = useAlert.getState();
const { removeUser, changeUser, currentUser } = useTwitterUser.getState();

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
      const {
        email,
        photoURL: image,
        displayName,
        providerData,
        uid: user_id,
      } = user;
      const { uid } = providerData[0];
      await addDoc(userCollection, {
        uid,
        user_id,
        email,
        image,
        displayName,
        screenName: (user as any)?.reloadUserInfo.screenName,
        wallet: address ?? "",
        hasNfts: false,
      });
    } else if (address != undefined) {
      const userDoc = docs.docs[0];
      const user = userDoc.data();
      console.log(user);

      if (user.wallet.length === 0) {
        await updateUser(userDoc.id, {
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
    openAlert({
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

export async function getUserData(uid: string) {
  return getData(
    await getDocs(query(userCollection, where("uid", "==", uid)))
  )[0];
}
export async function getCurrentUserData() {
  return getData(
    await getDocs(
      query(
        userCollection,
        where("uid", "==", auth.currentUser?.providerData[0].uid)
      )
    )
  )[0];
}

export async function updateUser(userId: string, payload: any) {
  await updateDoc(doc(db, "users", userId), payload);
}

export async function updateUserData(payload: any) {
  const user = await getCurrentUserData();

  updateUser(user._id, payload);
}

export async function getUserFromAddress(address: string) {
  return getData(
    await getDocs(query(userCollection, where("wallet", "==", address)))
  )[0];
}

export async function getRandomUser(address: string) {
  const solanaClient = new SolanaClient();
  const user = getData(
    await getDocs(query(userCollection, where("wallet", "==", address)))
  )[0];
  if (user.followCount >= 2) {
    if (
      isYesterday(user.lastFollowed.toDate()) ||
      differenceInDays(new Date(), user.lastFollowed.toDate()) > 0
    ) {
      updateUser(user._id, {
        followCount: 0,
      });
    } else {
      const message = "Follow quota ended for today";
      openAlert({
        message,
        status: "error",
      });
      throw new Error(message);
    }
  }

  const users = getData(
    await getDocs(query(userCollection, where("wallet", "!=", address)))
  );
  const searchedUsers = new Set();
  let index = Math.ceil(Math.random() * users.length) - 1;

  let randomUser = users[index];
  let hasNft = false;

  while (!hasNft && searchedUsers.size !== users.length) {
    searchedUsers.add(randomUser._id);

    if (
      randomUser.followers &&
      randomUser.followers.includes(currentUser?.providerData[0].uid)
    ) {
      index += 1;
      index %= users.length - 1;
      randomUser = users[index] ?? null;
      break;
    }
    if (NETWORK === "devnet") {
      const nfts = await solanaClient.getNftTokens(randomUser.wallet);
      if (nfts.length > 0) {
        hasNft = true;
        break;
      }
    } else if (randomUser.hasNfts) {
      hasNft = true;
      break;
    }
    index += 1;
    index %= users.length - 1;
    randomUser = users[index] ?? null;
  }
  if (!randomUser) return null;

  const result = await axios.get(
    `/api/get-twitter-data?user_id=${randomUser.uid}`
  );

  randomUser = {
    ...randomUser,
    ...result.data.data,
  };

  return randomUser;
}

export async function getRandomTweet(address: string) {
  const solanaClient = new SolanaClient();
  const users = getData(
    await getDocs(query(userCollection, where("wallet", "!=", address)))
  );
  const searchedUsers = new Set();
  let index = Math.ceil(Math.random() * users.length) - 1;

  let randomUser = users[index];
  let hasNft = false;

  while (!hasNft && searchedUsers.size !== users.length) {
    searchedUsers.add(randomUser._id);

    if (NETWORK === "devnet") {
      const nfts = await solanaClient.getNftTokens(randomUser.wallet);
      if (nfts.length > 0) {
        hasNft = true;
        break;
      }
    } else if (randomUser.hasNfts) {
      hasNft = true;
      break;
    }
    index += 1;
    index %= users.length - 1;
    randomUser = users[index] ?? null;
  }
  if (!randomUser) return null;

  const result = await axios.get(
    `/api/get-twitter-random-tweet?user_id=${randomUser.uid}`
  );

  return result.data.data;
}
