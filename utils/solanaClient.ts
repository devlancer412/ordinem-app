import axios from 'axios';
import { Connection, GetProgramAccountsFilter } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { rpcEndpoint, goldMintAddress } from './constants';
import { useSolanaNfts } from 'hooks/useSolanaNfts';
import { getTokenData } from './firebase/firebase';

const { setTokens, setNfts } = useSolanaNfts.getState();

const solanaConnection = new Connection(rpcEndpoint);

export default class SolanaClient {
  async getAllNfts(publicKey: string) {
    setNfts([]);
    try {
      const filters: GetProgramAccountsFilter[] = [
        {
          dataSize: 165, //size of account (bytes)
        },
        {
          memcmp: {
            offset: 32, //location of our query in the account (bytes)
            bytes: publicKey, //our search criteria, a base58 encoded string
          },
        },
      ];
      const accounts = await solanaConnection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        { filters: filters }
      );

      console.log(
        `Found ${accounts.length} token account(s) for wallet ${publicKey}.`
      );

      let nfts: NFT[] = [];
      for (const account of accounts) {
        //Parse the account data
        const parsedAccountInfo: any = account.account.data;
        if (
          parsedAccountInfo['parsed']['info']['tokenAmount']['decimals'] != 0
        ) {
          return;
        }

        const mintAddress: string = parsedAccountInfo['parsed']['info']['mint'];
        const data = (await getTokenData(mintAddress)) as NFT;
        data.mint = mintAddress;
        if (data) {
          nfts.push(data);
        }
      }

      setNfts(nfts);
    } catch (error) {
      console.log(error);

      throw error;
    }
  }

  async getGoldTokens(publicKey: string) {
    const filters: GetProgramAccountsFilter[] = [
      {
        dataSize: 165, //size of account (bytes)
      },
      {
        memcmp: {
          offset: 32, //location of our query in the account (bytes)
          bytes: publicKey, //our search criteria, a base58 encoded string
        },
      },
      {
        memcmp: {
          offset: 0, //location of our query in the account (bytes)
          bytes: goldMintAddress, //our search criteria, a base58 encoded string
        },
      },
    ];

    const accounts = await solanaConnection.getParsedProgramAccounts(
      TOKEN_PROGRAM_ID, //new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      { filters: filters }
    );
    console.log(accounts);
  }
}
