import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useEffect, useLayoutEffect } from "react";
import SolanaClient from "utils/solanaClient";
import { Header } from "../header/Header";
import { Sidenav } from "../sidenav/Sidenav";
import { getAuth } from "firebase/auth";
import { useTwitterUser } from "hooks/useTwitterUser";
import { getUserFromAddress } from "utils/firebase";
import Alert from "components/Alert";
import Notification from "components/Notification";
import { useWindowSize } from "hooks/useWindowSize";

interface Props {
  children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({ children }) => {
  const wallet = useAnchorWallet();
  const { login, logout, changeUser, getDataFromStorage } = useTwitterUser();
  const { setSize } = useWindowSize();
  const auth = getAuth();

  useEffect(() => {
    if (wallet && wallet.publicKey) {
      (async () => {
        const publicKey = wallet.publicKey.toString();

        const user = await getUserFromAddress(publicKey);
        if (!user) {
          logout();
        } else {
          changeUser(user.screenName);
        }

        const solanaClient = new SolanaClient();
        await solanaClient.getGoldTokens(publicKey);

        await solanaClient.getAllNfts(publicKey);
      })();
    }
  }, [wallet]);

  useEffect(() => {
    auth.onAuthStateChanged(async (observer) => {
      if (observer !== null) {
        login(observer);
      }
      // else {
      //   logout();
      // }
    });
  }, []);

  const windowListener = () => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  useLayoutEffect(() => {
    windowListener();
    window.addEventListener("resize", windowListener);
    getDataFromStorage();

    return () => window.removeEventListener("resize", () => {});
  }, []);

  try {
    return (
      <>
        <div>
          <Alert />
          <Notification />
          <Sidenav />
          <Header />
          <div className="mx-2 md:mx-4 lg:ml-80 py-4 px-3 md:px-6">
            {children}
          </div>
        </div>
      </>
    );
  } catch (error) {
    return <div>We found an error here {JSON.stringify(error)}</div>;
  }
};
