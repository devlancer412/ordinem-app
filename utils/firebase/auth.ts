import {
  getAuth,
  signInWithPopup,
  signOut,
  TwitterAuthProvider,
} from "firebase/auth";
import { addDoc, getDocs, query, where } from "firebase/firestore";
import { userCollection } from "./config";
import {
  changeUser,
  getData,
  openAlert,
  removeUser,
  updateUser,
} from "./utils";

const provider = new TwitterAuthProvider();
const auth = getAuth();
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
