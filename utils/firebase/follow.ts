import axios from "axios";
import { differenceInDays, isYesterday } from "date-fns";
import { getDocs, query, where } from "firebase/firestore";
import { useAlert } from "hooks/useAlert";
import { useQuests } from "hooks/useQuests";
import { calculateLevels, getCurrentTime } from "utils/constants";
import { userCollection } from "./config";
import { getCurrentUserData, getCurrentUserId, getData, updateUser } from "./utils";

const { setUsersToFollow, setEndedQuotas } = useQuests.getState();

const { open: openAlert } = useAlert.getState();

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
      const message = "Follow quota ended for today";
      openAlert({
        message,
        status: "error",
      });
      setEndedQuotas({
        follow: true,
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
  const result = await axios.get(
    `/api/get-twitter-data?user_id=${users[0].uid}`
  );
  users[0] = { ...users[0], ...result.data.data };

  setUsersToFollow(users);
}

export const fetchAndChangeUser = async () => {
  const { indexOfUser, usersToFollow } = useQuests.getState();
  const currentUserId = getCurrentUserId();

  const currentUserData = await getCurrentUserData(currentUserId);
  if (
    currentUserData.followCount >=
    calculateLevels(currentUserData.nftCount ?? 1)
  ) {
    openAlert({
      message: "Follow quota exceeds",
      status: "error",
    });
    return;
  }

  const user = usersToFollow[indexOfUser + 1];
  if (!user) return;

  const result = await axios.get(`/api/get-twitter-data?user_id=${user.uid}`);
  return {
    ...user,
    ...result.data.data,
    image: result.data.data.profile_image_url_https.replace("_normal", ""),
  };
};
