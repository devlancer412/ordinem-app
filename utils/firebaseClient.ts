import { calculateLevels, getCurrentTime, NETWORK } from "./constants";
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
import { endedQuotas, ordinemUsers, tweet_id, usersToFollow } from "./earnGoldStore";

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
const { removeUser, changeUser } = useTwitterUser.getState();
let currentUserId: string;
const subscription = useTwitterUser.subscribe(
  (state) => (currentUserId = state.currentUser?.providerData[0].uid as string)
);

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

    const userWithAddress = getData(
      await getDocs(query(userCollection, where("wallet", "==", address)))
    )[0];
    if (userWithAddress && userWithAddress.uid !== user.providerData[0].uid) {
      logoutFromTwitter();
      throw new Error("This wallet is already in use for another account");
    }
    const docs = await getDocs(
      query(userCollection, where("uid", "==", user.providerData[0].uid))
    );
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
        logoutFromTwitter();
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
  return getData(
    await getDocs(
      query(nftCollection, where("wallet_address", "==", publicKey))
    )
  );
}

export async function getUserData(uid: string) {
  return getData(
    await getDocs(query(userCollection, where("uid", "==", uid)))
  )[0];
}
export async function getCurrentUserData(uid?: string) {
  console.log(currentUserId);
  let docs = await getDocs(
    query(
      userCollection,
      where(
        "uid",
        "==",
        uid ?? currentUserId ?? auth.currentUser?.providerData[0].uid
      )
    )
  );
  return getData(docs)[0];
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

export async function getRandomUser(address: string, uid: string) {
  const user = getData(
    await getDocs(query(userCollection, where("wallet", "==", address)))
  )[0];
  const level = calculateLevels(user.nftCount ?? 1);
  const today = await getCurrentTime();

  if (user.followCount >= level) {
    if (
      isYesterday(user.lastFollowed.toDate()) ||
      differenceInDays(today, user.lastFollowed.toDate()) > 0
    ) {
      updateUser(user._id, {
        followCount: 0,
      });
    } else {
      endedQuotas.value.follow = true;
      const message = "Follow quota ended for today";
      openAlert({
        message,
        status: "error",
      });
      throw new Error(message);
    }
  }

  let users = getData(
    await getDocs(query(userCollection, where("wallet", "!=", address)))
  );
  users = users.filter((user) => {
    let isFollower = false;
    if (user.followers) {
      isFollower = user.followers.includes(uid);
    }
    return user.hasNfts && !isFollower;
  });

  let index = Math.ceil(Math.random() * users.length) - 1;
  users = [...users.splice(index, 1), ...users];

  usersToFollow.value = users;

}

export async function getRandomTweet(address: string, uid: string) {
  const quotas: ("Likes" | "Reply" | "")[] = [];
  const user = getData(
    await getDocs(query(userCollection, where("wallet", "==", address)))
  )[0];
  const level = calculateLevels(user.nftCount ?? 1);
  const today = await getCurrentTime();

  if (user.likeCount >= level) {
    if (
      isYesterday(user.lastLiked.toDate()) ||
      differenceInDays(today, user.lastLiked.toDate()) > 0
    ) {
      updateUser(user._id, {
        likeCount: 0,
      });
    } else {
      endedQuotas.value.like = true;
      quotas.push("Likes");
    }
  }
  if (user.replyCount >= level) {
    if (
      isYesterday(user.lastReplied.toDate()) ||
      differenceInDays(today, user.lastReplied.toDate()) > 0
    ) {
      updateUser(user._id, {
        replyCount: 0,
      });
    } else {
      endedQuotas.value.comment = true;
      quotas.push("Reply");
    }
  }

  if (quotas.length === 2) {
    const message = quotas.join(", ") + " quotas expired for today";
    openAlert({
      message,
      status: "error",
    });
    throw new Error(message);
  } else if (quotas.length === 1) {
    const message = `Quota for ${quotas[0]} expired`;
    openAlert({
      message,
      status: "error",
    });
  }

  let users = getData(
    await getDocs(query(userCollection, where("wallet", "!=", address)))
  );
  users = users.filter((user) => user.hasNfts);
  ordinemUsers.value = users as any;

  let tweet = null;

  while (!tweet) {
    let index = Math.ceil(Math.random() * users.length) - 1;
    const randomUser = users[index];
    const currentUserId = randomUser.uid;

    const result = await axios.get(
      `/api/get-twitter-random-tweet?user_id=${currentUserId}`
    );
    const tweetData = result.data.data;
    if (!tweetData || !tweetData.id_str) {
      continue;
    }
    const likeVerify = await axios.get(
      `/api/verify-like?user_id=${currentUserId}&tweet_id=${tweetData.id_str}`
    );
    if (likeVerify.data.data) {
      continue;
    }

    const replyVerify = await axios.get(
      `/api/verify-reply?user_id=${currentUserId}&tweet_id=${tweetData.id_str}`
    );
    if (replyVerify.data.data) {
      continue;
    }

    tweet = result.data.data;
  }

  tweet_id.value = tweet.id_str;
}
