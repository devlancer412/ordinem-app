import { getAuth } from "firebase/auth";
import axios from "axios";
import { addDoc } from "firebase/firestore";
import { differenceWith } from "lodash";
import { SOLANA_API_KEY } from "./constants";
import { getFirebaseNfts, nftCollection } from "./firebaseClient";

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
const NETWORK = process.env.NEXT_PUBLIC_NETWORK ?? "devnet";

export default class SolanaClient {
  async getAllNfts(publicKey: string) {
    try {
      const auth = getAuth();
      const firebaseNfts = await getFirebaseNfts(publicKey);
      const nftTokens = await this.getNftTokens(publicKey);
      const diff = differenceWith(
        nftTokens,
        firebaseNfts,
        (i: any, o: any) => i.mint === o.mint
      );

      if (diff.length) {
        diff.forEach(async (token) => {
          await addDoc(nftCollection, {
            mint: token.mint,
            wallet_address: publicKey,
            uid: auth.currentUser?.uid,
          });
        });
      }

      const nfts = await Promise.all(
        nftTokens.map(async (nft: any) => {
          const data = await this.getNftMetadata(nft.mint);
          const firebaseNft = firebaseNfts.find(
            (item: any) => item.mint === nft.mint
          );

          if (firebaseNft?.twitter) {
            data.twitter = firebaseNft?.twitter;
          }

          return data;
        })
      );

      return nfts;
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

  private async getNftTokens(publicKey: string) {
    return this.getData(`/account/${NETWORK}/${publicKey}/nft`);
  }

  private async getNftMetadata(address: string) {
    const metadata = await this.getData(`nft/${NETWORK}/${address}/metadata`);
    const { data } = await axios.get(metadata?.metaplex.metadataUri);
    return {
      ...data,
      ...metadata,
    };
  }
}
