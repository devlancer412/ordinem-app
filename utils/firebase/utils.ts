import {
  doc,
  DocumentData,
  getDocs,
  query,
  QuerySnapshot,
  updateDoc,
  where,
} from "firebase/firestore";
import { useAlert } from "hooks/useAlert";
import { useTwitterUser } from "hooks/useTwitterUser";
import { db, nftCollection, userCollection } from "./config";

const { open: openAlert } = useAlert.getState();
const { removeUser, changeUser } = useTwitterUser.getState();

export { openAlert, removeUser, changeUser };

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

export const getCurrentUserId = () =>
  useTwitterUser.getState().currentUser?.providerData[0].uid;

export async function getCurrentUserData(uid?: string) {
  const currentUserId = getCurrentUserId();

  let docs = await getDocs(
    query(userCollection, where("uid", "==", uid ?? currentUserId))
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
