import axios from 'axios';
import { Connection, GetProgramAccountsFilter } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { NETWORK, SOLANA_API_KEY, rpcEndpoint } from './constants';
import {
  db,
  getFirebaseNfts,
  getUserFromAddress,
  nftCollection,
  updateUser,
} from 'utils/firebase';
import { useSolanaNfts } from 'hooks/useSolanaNfts';
import { differenceWith } from 'lodash';
import { addDoc, deleteDoc, doc } from 'firebase/firestore';
import { getTokenData } from './firebase/firebase';

const axiosInstance = axios.create({
  baseURL: 'https://solana-gateway.moralis.io',
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, Content-Type, X-Auth-Token',
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-API-Key': SOLANA_API_KEY as string,
  },
});

const { setTokens, setNfts } = useSolanaNfts.getState();

export default class SolanaClient {
  async getAllNfts(publicKey: string) {
    setNfts([]);
    try {
      const solanaConnection = new Connection(rpcEndpoint);

      const wallet = publicKey; //example: vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg

      const filters: GetProgramAccountsFilter[] = [
        {
          dataSize: 165, //size of account (bytes)
        },
        {
          memcmp: {
            offset: 32, //location of our query in the account (bytes)
            bytes: wallet, //our search criteria, a base58 encoded string
          },
        },
      ];
      const accounts = await solanaConnection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        { filters: filters }
      );

      console.log(
        `Found ${accounts.length} token account(s) for wallet ${wallet}.`
      );

      let nfts: NFT[] = [];
      accounts.forEach(async (account, i) => {
        //Parse the account data
        const parsedAccountInfo: any = account.account.data;
        if (
          parsedAccountInfo['parsed']['info']['tokenAmount']['decimals'] != 0
        ) {
          return;
        }

        const mintAddress: string = parsedAccountInfo['parsed']['info']['mint'];
        const data = await getTokenData(mintAddress);
        console.log(data);
        if (data) {
          nfts.push(data as NFT);
        }
      });

      setNfts(nfts);
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
    // const user = await getUserFromAddress(publicKey);
    // if (user && user.tokensEarned) {
    //   setTokens(user.tokensEarned);
    //   return;
    // }
    // const tokens = await this.getData(
    //   `/account/${NETWORK}/${publicKey}/tokens`
    // );
    // const token = tokens.find(
    //   (token: any) => token.mint === process.env.NEXT_PUBLIC_MINT_TOKEN_ADDRESS
    // );
    // if (token) {
    //   setTokens(Number(token.amount.split('.')[0]));
    // }
  }

  async getNftTokens(publicKey: string) {
    return this.getData(`/account/${NETWORK}/${publicKey}/nft`);
  }

  private async getNftMetadata(address: string) {
    const metadata = await this.getData(`nft/${NETWORK}/${address}/metadata`);
    if (
      NETWORK !== 'devnet' &&
      !metadata.name.toLowerCase().includes('ordinem')
    )
      return null;

    const { data } = await axios.get(metadata?.metaplex.metadataUri);

    return {
      ...data,
      ...metadata,
    };
  }
}
