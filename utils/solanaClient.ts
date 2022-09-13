import { getAuth } from "firebase/auth";
import axios from "axios";
import { addDoc } from "firebase/firestore";
import { differenceWith } from "lodash";
import { NETWORK, SOLANA_API_KEY } from "./constants";
import {
  getFirebaseNfts,
  getUserFromAddress,
  nftCollection,
  updateUser,
} from "./firebaseClient";
import { useSolanaNfts } from "hooks/useSolanaNfts";

const axiosInstance = axios.create({
  baseURL: "https://solana-gateway.moralis.io",
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Origin, Content-Type, X-Auth-Token",
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Key": SOLANA_API_KEY as string,
  },
});

const { addNft, setTokens } = useSolanaNfts.getState();

export default class SolanaClient {
  async getAllNfts(publicKey: string) {
    try {
      // const auth = getAuth();
      // const firebaseNfts = await getFirebaseNfts(publicKey);
      const nftTokens = await this.getNftTokens(publicKey);
      // const diff = differenceWith(
      //   nftTokens,
      //   firebaseNfts,
      //   (i: any, o: any) => i.mint === o.mint
      // );

      // if (diff.length) {
      //   diff.forEach(async (token) => {
      //     await addDoc(nftCollection, {
      //       mint: token.mint,
      //       wallet_address: publicKey,
      //       uid: auth.currentUser?.uid,
      //       network: NETWORK
      //     });
      //   });
      // }

      const nfts = await Promise.all(
        nftTokens.map((nft: any) => this.getNftMetadata(nft.mint))
      );

      const ordinemNfts = nfts.filter((nft) => nft !== null);
      if (NETWORK === "mainnet") {
        const user = await getUserFromAddress(publicKey);
        if (user) {
          updateUser(user._id, {
            hasNfts: ordinemNfts.length > 0,
          });
        }
      }

      return ordinemNfts;
    } catch (error) {
      console.log(error);

      throw error;
    }
  }

  private async getData(url: string) {
    return await (
      await axiosInstance.get(url)
    ).data;
  }

  async getGoldTokens(publicKey: string) {
    const tokens = await this.getData(
      `/account/${NETWORK}/${publicKey}/tokens`
    );
    const token = tokens.find(
      (token: any) => token.mint === process.env.NEXT_PUBLIC_MINT_TOKEN_ADDRESS
    );
    if (token) {
      setTokens(token.amount);
    }
  }

  async getNftTokens(publicKey: string) {
    return this.getData(`/account/${NETWORK}/${publicKey}/nft`);
  }

  private async getNftMetadata(address: string) {
    const metadata = await this.getData(`nft/${NETWORK}/${address}/metadata`);
    if (
      NETWORK !== "devnet" &&
      !metadata.name.toLowerCase().includes("ordinem")
    )
      return null;

    const { data } = await axios.get(metadata?.metaplex.metadataUri);
    
    addNft({
      ...data,
      ...metadata,
    });
    return {
      ...data,
      ...metadata,
    };
  }
}
