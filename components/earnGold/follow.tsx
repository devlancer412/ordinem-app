/* eslint-disable react/no-unescaped-entities */
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import axios from "axios";
import ModalWrapper from "components/modal/ModalWrapper";
import Spinner from "components/Spinner";
import { arrayUnion, increment, serverTimestamp } from "firebase/firestore";
import { useModal } from "hooks/useModal";
import { useTwitterUser } from "hooks/useTwitterUser";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  getRandomUser,
  updateUser,
  updateUserData,
} from "utils/firebaseClient";
import { sendTokensToUser } from "utils/token";

const Follow = () => {
  const [user, setUser] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const { currentUser } = useTwitterUser();
  const wallet = useAnchorWallet();
  const { setModal } = useModal();

  useEffect(() => {
    if (wallet) {
      (async () => {
        setIsLoading(true);
        try {
          setUser(await getRandomUser(wallet?.publicKey.toString()));
        } catch (error) {
          setError(error as string);
        }
        setIsLoading(false);
      })();
    }
  }, [wallet]);

  const verifyUserFollow = async () => {
    if (!isVerifying) {
      setIsVerifying(true);
      try {
        const result = await axios.get(
          `/api/get-twitter-followers?user_id=${user.uid}`
        );
        const currentUserId = currentUser?.providerData[0].uid;

        if (
          result.data.data &&
          result.data.data.ids &&
          result.data.data.ids.includes(Number(currentUserId))
        ) {
          setIsVerified(true);
          updateUser(user._id, {
            followers: arrayUnion(currentUserId),
          });
          updateUserData({
            followCount: increment(1),
            lastFollowed: serverTimestamp(),
          });
          const sig = await sendTokensToUser(
            wallet?.publicKey.toString() as string,
            10
          );
          setSuccessMessage(sig);
          setModal();
        }
      } catch (error) {
        console.log(error);
      } finally {
        setIsVerifying(false);
      }
    }
  };

  if (!wallet) {
    return <div className="">Connect your wallet</div>;
  }

  if (isLoading) return <div>Loading ...</div>;
  if (error.length > 0) return <div>{error}</div>;

  if (user === undefined) return null;

  if (user === null)
    return (
      <div>
        <h5>No User found in the database that has NFT</h5>
      </div>
    );

  return (
    <>
      <ModalWrapper>
        <div className="bg-gray-800 border-2 items-center border-white px-5 py-3 rounded-lg flex gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Congratulations! 🎉</h2>
            <h4 className="text-gray-300">
              You have received 10 Gold for completing the follow quest.
            </h4>
            <a
              className="text-gray-700 bg-white rounded-lg px-5 py-3 mt-4 inline-flex"
              href={`https://solscan.io/tx/${successMessage}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
            >
              Go to this url to check the transaction
            </a>
          </div>
          <img
            src="/gold_pile_rewards.png"
            alt="Reward gold tokens"
            
          />
        </div>
      </ModalWrapper>
      <div className="flex flex-col items-center px-4 py-8 my-2 bg-gray-800 h-full rounded-lg">
        <Image
          src={user.image}
          className="rounded-lg"
          alt={user.name}
          height={200}
          width={200}
        />
        <h3 className="mt-2">{user.name}</h3>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex flex-col items-center">
            <h6 className="text-xl">{user.followers}</h6>
            <h5 className="text-gray-400">Followers</h5>
          </div>
          <div className="flex flex-col items-center">
            <h6 className="text-xl">{user.following}</h6>
            <h5 className="text-gray-400">Followings</h5>
          </div>
        </div>

        <div className="flex gap-3 items-center mt-6">
          <a
            target="_blank"
            rel="noreferrer"
            href={`https://twitter.com/intent/follow?screen_name=${user.screenName}`}
            className="bg-blue-400 text-white px-5 py-2 rounded-lg"
          >
            Follow @{user.screen_name}
          </a>

          {isVerified ? (
            <h4>Verified</h4>
          ) : (
            <button
              onClick={verifyUserFollow}
              className={`bg-gray-50 text-blue-700 px-5 min-w-[5rem] py-2 rounded-lg duration-75 font-semibold ${
                isVerifying && "opacity-60 pointer-events-none"
              }`}
            >
              {isVerifying ? <Spinner /> : "Verify follow"}
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Follow;
