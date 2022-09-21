import { useAnchorWallet, useWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { arrayUnion, increment, serverTimestamp } from "firebase/firestore";
import { useNotification } from "hooks/useNotification";
import { useTwitterUser } from "hooks/useTwitterUser";
import { useEffect, useState } from "react";
import {
  fetchAndChangeTweet,
  getRandomTweet,
  updateUserData,
} from "utils/firebase";
import { updateTokensToDB } from "utils/token";
import LoadingButton from "./LoadingButton";
import SuccessPopup from "./SuccessPopup";
import { Tweet as TweetWidget } from "react-twitter-widgets";
import { useQuests } from "hooks/useQuests";

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
  const walletContextState = useWallet()

  const { openNotification } = useNotification();
  const { tweet_id, quotasEnded } = useQuests();

  const changeTweet = async () => {
    setButtonClicked(true);
    const changed = await fetchAndChangeTweet();
    if (changed) {
      setIsVerified({ like: false, comment: false, retweet: false });
      setLoadTweet(true);
      setButtonClicked(false);
      setIsTweetLoading(true);
    }
  };

  useEffect(() => {
    if (wallet && currentUser && !tweet_id.length) {
      (async () => {
        setIsLoading(true);
        try {
          await getRandomTweet(
            wallet?.publicKey.toString(),
            currentUser?.providerData[0].uid
          );
        } catch (error) {
          console.log(error);
        }
        setIsLoading(false);
      })();
    }
  }, [wallet]);

  const sendTokens = async (quest: string, amount?: number) => {
    if(!wallet) return;
    const _amount =await updateTokensToDB(
      wallet.publicKey.toString(),
      amount ?? 5
    );

    openNotification(() => (
      <SuccessPopup goldRecieved={_amount} quest={quest} />
    ));
  };

  const verifyLike = async () => {
    try {
      setButtonClicked(true);
      const currentUserId = currentUser?.providerData[0].uid;
      const result = await axios.get(
        `/api/verify-like?user_id=${currentUserId}&tweet_id=${tweet_id}`
      );

      if (result.data.data === true) {
        setIsVerified((state) => ({ ...state, like: true }));
        updateUserData({
          likes: arrayUnion(tweet_id),
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
        `/api/verify-reply?user_id=${currentUserId}&tweet_id=${tweet_id}`
      );

      if (result.data.data === true) {
        setIsVerified((state) => ({ ...state, comment: true }));
        updateUserData({
          replies: arrayUnion(tweet_id),
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

  if (tweet_id.length === 0)
    return (
      <div>
        <h5>No User found in the database that has NFT</h5>
      </div>
    );

  if (quotasEnded.like && quotasEnded.comment)
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
              tweetId={tweet_id}
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
            {!quotasEnded.like && (
              <div className="flex items-center justify-between gap-4 w-full">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://twitter.com/intent/like?tweet_id=${tweet_id}`}
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
            {!quotasEnded.comment && (
              <div className="flex items-center justify-between gap-4 w-full">
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://twitter.com/intent/tweet?in_reply_to=${tweet_id}`}
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
              onClick={changeTweet}
            />


          </div>
        )}
      </div>
    </>
  );
};

export default Tweet;
