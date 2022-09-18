import { useAnchorWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { arrayUnion, increment, serverTimestamp } from "firebase/firestore";
import { useNotification } from "hooks/useNotification";
import { useTwitterUser } from "hooks/useTwitterUser";
import { useEffect, useState } from "react";
import { calculateLevels } from "utils/constants";
import {
  getCurrentUserData,
  getRandomTweet,
  updateUserData,
} from "utils/firebaseClient";
import { sendTokensToUser } from "utils/token";
import LoadingButton from "./LoadingButton";
import SuccessPopup from "./SuccessPopup";
import { Tweet as TweetWidget } from "react-twitter-widgets";
import { endedQuotas, ordinemUsers, tweet_id } from "utils/earnGoldStore";

type Quotas = ("Likes" | "Reply" | "")[];

const Tweet = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isTweetLoading, setIsTweetLoading] = useState(true);
  const [loadTweet, setLoadTweet] = useState(true);
  const [buttonClicked, setButtonClicked] = useState(false);

  const [isVerified, setIsVerified] = useState({
    like: false,
    comment: false,
    retweet: false,
  });

  const { currentUser } = useTwitterUser();
  const wallet = useAnchorWallet();
  const { openNotification } = useNotification();

  const fetchAndChangeTweet = async () => {
    setButtonClicked(true);
    const users = ordinemUsers.value;
    const index = Math.ceil(Math.random() * users.length) - 1;
    const _user = users[index];

    if (!_user) return;
    const currentUserId = currentUser?.providerData[0].uid;
    const currentUserData = await getCurrentUserData(currentUserId);
    const level = calculateLevels(currentUserData.nftCount ?? 1);
    const quotas: Quotas = [];
    if (currentUserData.likeCount >= level) {
      quotas.push("Likes");
      endedQuotas.value.like = true;
    }
    if (currentUserData.replyCount >= level) {
      endedQuotas.value.comment = true;
      quotas.push("Reply");
    }
    if (quotas.length === 2) return;

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
      tweet_id.value = tweetData.id_str;

      setIsVerified({ like: false, comment: false, retweet: false });
      setLoadTweet(true);
      setButtonClicked(false);
      setIsTweetLoading(true);
    } else {
      fetchAndChangeTweet();
    }
  };

  useEffect(() => {
    if (wallet && currentUser && !tweet_id.value.length) {
      (async () => {
        setIsLoading(true);
        await getRandomTweet(
          wallet?.publicKey.toString(),
          currentUser?.providerData[0].uid
        );
        setIsLoading(false);
      })();
    }
  }, [wallet]);

  const sendTokens = async (quest: string, amount?: number) => {
    const sig = await sendTokensToUser(
      wallet?.publicKey.toString() as string,
      amount ?? 5
    );

    openNotification(() => (
      <SuccessPopup goldRecieved={amount ?? 5} quest={quest} signature={sig} />
    ));
  };

  const verifyLike = async () => {
    try {
      setButtonClicked(true);
      const currentUserId = currentUser?.providerData[0].uid;
      const result = await axios.get(
        `/api/verify-like?user_id=${currentUserId}&tweet_id=${tweet_id.value}`
      );

      if (result.data.data === true) {
        setIsVerified((state) => ({ ...state, like: true }));
        updateUserData({
          likes: arrayUnion(tweet_id.value),
          likeCount: increment(1),
          lastLiked: serverTimestamp(),
        });

        sendTokens("like", 5);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setButtonClicked(false);
    }
  };

  const verifyReply = async () => {
    try {
      setButtonClicked(true);
      const currentUserId = currentUser?.providerData[0].uid;
      const result = await axios.get(
        `/api/verify-reply?user_id=${currentUserId}&tweet_id=${tweet_id.value}`
      );

      if (result.data.data === true) {
        setIsVerified((state) => ({ ...state, comment: true }));
        updateUserData({
          replies: arrayUnion(tweet_id.value),
          replyCount: increment(1),
          lastReplied: serverTimestamp(),
        });

        sendTokens("reply", 10);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setButtonClicked(false);
    }
  };

  if (!wallet) {
    return <div className="">Connect your wallet</div>;
  }

  if (isLoading) return <div>Loading ...</div>;

  if (tweet_id.value.length === 0)
    return (
      <div>
        <h5>No User found in the database that has NFT</h5>
      </div>
    );

  if (endedQuotas.value.like && endedQuotas.value.comment)
    return (
      <div className="w-full h-full flex flex-col justify-center items-center text-center">
        <h4>Quotas ended for today</h4>
        <p>Come again tomorrow to take up more like and reply quests</p>
      </div>
    );

  return (
    <>
      <div>
        <div className="max-h-[20rem] mb-4 overflow-x-hidden overflow-y-scroll">
          <div className="rounded-lg overflow-hidden">
            <TweetWidget
              tweetId={tweet_id.value}
              onLoad={() => {
                setIsTweetLoading(false);
                setLoadTweet(false);
              }}
            />
          </div>
        </div>
        {loadTweet && (
          <div className="min-h-[10rem] w-full flex items-center justify-center text-center">
            <h5 className="text-2xl">Loading tweet...</h5>
          </div>
        )}
        {!isTweetLoading && (
          <div className="flex flex-col gap-4 justify-stretch">
            {!endedQuotas.value.like && (
              <div className="flex items-center justify-between gap-4 w-full">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://twitter.com/intent/like?tweet_id=${tweet_id.value}`}
                  className="bg-blue-400 text-white px-5 py-2 rounded-lg"
                >
                  Like tweet
                </a>
                <div>
                  {isVerified.like ? (
                    <h5>Like verified</h5>
                  ) : (
                    <LoadingButton
                      className={`${
                        buttonClicked
                          ? "pointer-events-none cursor-not-allowed"
                          : ""
                      }`}
                      text="Verify Like"
                      onClick={verifyLike}
                    />
                  )}
                </div>
              </div>
            )}
            {!endedQuotas.value.comment && (
              <div className="flex items-center justify-between gap-4 w-full">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://twitter.com/intent/tweet?in_reply_to=${tweet_id.value}`}
                  className="bg-blue-400 text-white px-5 py-2 rounded-lg"
                >
                  Comment tweet
                </a>
                <div>
                  {isVerified.comment ? (
                    <h5>Reply verified</h5>
                  ) : (
                    <LoadingButton
                      className={`${
                        buttonClicked
                          ? "pointer-events-none cursor-not-allowed"
                          : ""
                      }`}
                      text="Verify Comment"
                      onClick={verifyReply}
                    />
                  )}
                </div>
              </div>
            )}

            <LoadingButton
              className={`${
                buttonClicked ? "pointer-events-none cursor-not-allowed" : ""
              }`}
              text="Next"
              onClick={fetchAndChangeTweet}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default Tweet;
