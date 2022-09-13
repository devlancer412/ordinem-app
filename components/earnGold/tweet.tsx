import { useAnchorWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import { arrayUnion, increment, serverTimestamp } from "firebase/firestore";
import { useTwitterUser } from "hooks/useTwitterUser";
import { useEffect, useState } from "react";
import { TwitterTweetEmbed } from "react-twitter-embed";
import { getRandomTweet, updateUserData } from "utils/firebaseClient";
import LoadingButton from "./LoadingButton";

const Tweet = () => {
  const [tweet, setTweet] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [isTweetLoading, setIsTweetLoading] = useState(true);
  const [isVerified, setIsVerified] = useState({
    like: false,
    comment: false,
    retweet: false,
  });

  const { currentUser } = useTwitterUser();
  const wallet = useAnchorWallet();
  useEffect(() => {
    if (wallet) {
      (async () => {
        setIsLoading(true);
        setTweet(await getRandomTweet(wallet?.publicKey.toString()));
        setIsLoading(false);
      })();
    }
  }, [wallet]);

  const verifyLike = async () => {
    try {
      const currentUserId = currentUser?.providerData[0].uid;
      const result = await axios.get(
        `/api/verify-like?user_id=${currentUserId}&tweet_id=${tweet.id_str}`
      );

      if (result.data.data === true) {
        setIsVerified((state) => ({ ...state, like: true }));
        updateUserData({
          likes: arrayUnion(tweet.id_str),
          likeCount: increment(1),
          lastLiked: serverTimestamp(),
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  if (!wallet) {
    return <div className="">Connect your wallet</div>;
  }

  if (isLoading) return <div>Loading ...</div>;

  if (tweet === undefined) return null;

  if (tweet === null)
    return (
      <div>
        <h5>No User found in the database that has NFT</h5>
      </div>
    );

  return (
    <div>
      <TwitterTweetEmbed
        tweetId={tweet.id_str}
        onLoad={() => {
          setIsTweetLoading(false);
        }}
      />
      {!isTweetLoading && (
        <div className="flex gap-4">
          {isVerified.like ? (
            "Like verified"
          ) : (
            <LoadingButton text="Verify Like" onClick={verifyLike} />
          )}
        </div>
      )}
    </div>
  );
};

export default Tweet;
