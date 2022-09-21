import { calculateLevels, getCurrentTime } from "utils/constants";
import { getDocs, query, where } from "firebase/firestore";
import axios from "axios";
import { differenceInDays, isYesterday } from "date-fns";
import {
  getCurrentUserData,
  getCurrentUserId,
  getData,
  openAlert,
  updateUser,
} from "./utils";
import { userCollection } from "./config";
import { useQuests } from "hooks/useQuests";

const { setEndedQuotas, setOrdinemUsers, setTweet } = useQuests.getState();
export async function getRandomTweet(address: string, uid: string) {
  const quotas = {
    like: false,
    comment: false,
  };
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
      quotas.like = true;
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
      quotas.comment = true;
    }
  }
  setEndedQuotas(quotas);

  if (quotas.like && quotas.comment) {
    const message = "Likes and Reply quotas expired for today";
    openAlert({
      message,
      status: "error",
    });
    throw new Error(message);
  } else if (quotas.like || quotas.comment) {
    const ended = quotas.like ? "Likes" : "Reply";
    const message = `Quota for ${ended} expired`;
    openAlert({
      message,
      status: "error",
    });
  }

  let users = getData(
    await getDocs(query(userCollection, where("wallet", "!=", address)))
  );
  users = users.filter((user) => user.hasNfts);

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
  setOrdinemUsers(users);
  setTweet(tweet.id_str);
}

export const fetchAndChangeTweet = async () => {
  const { ordinemUsers: users } = useQuests.getState();

  const index = Math.ceil(Math.random() * users.length) - 1;
  const _user = users[index];

  if (!_user) return;
  const currentUserId = getCurrentUserId();
  const currentUserData = await getCurrentUserData();
  const level = calculateLevels(currentUserData.nftCount ?? 1);
  const quota = {
    like: false,
    comment: false,
  };
  if (currentUserData.likeCount >= level) {
    quota.like = true;
  }
  if (currentUserData.replyCount >= level) {
    quota.comment = true;
  }
  setEndedQuotas(quota);
  if (quota.comment && quota.like) return;

  const result = await axios.get(
    `/api/get-twitter-random-tweet?user_id=${_user.uid}`
  );
  const tweetData = result.data.data;
  if (!tweetData) {
    fetchAndChangeTweet();
    return;
  }

  const likeVerify = await axios.get(
    `/api/verify-like?user_id=${currentUserId}&tweet_id=${tweetData.id_str}`
  );
  if (likeVerify.data.data) {
    fetchAndChangeTweet();
    return;
  }

  const replyVerify = await axios.get(
    `/api/verify-reply?user_id=${currentUserId}&tweet_id=${tweetData.id_str}`
  );
  if (replyVerify.data.data) {
    fetchAndChangeTweet();
    return;
  }

  if (tweetData && tweetData.id_str) {
    setTweet(tweetData.id_str);

    return true;
  } else {
    fetchAndChangeTweet();
  }
};
