import { PublicKey } from '@solana/web3.js';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { database } from './config';
import axios from 'axios';
import { collection, SOLANA_API_KEY } from 'utils/constants';

export const getTokenData = (publicKey: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const starCountRef = ref(database, `${publicKey}`);
      onValue(starCountRef, (snapshot) => {
        let data: NFT = snapshot.val();
        if (data === null) {
          createTokenData(publicKey).then((tokenData) =>
            tokenData ? resolve(tokenData) : resolve(null)
          );
        }

        return resolve(data);
      });
    } catch (error) {
      console.log(error);
    }
  });

export const createTokenData = async (publicKey: string) => {
  try {
    const optionsMoralis = {
      method: 'GET',
      url: `https://solana-gateway.moralis.io/nft/mainnet/${publicKey}/metadata`,
      headers: { accept: 'application/json', 'X-API-Key': SOLANA_API_KEY },
    };

    let response = await axios.request(optionsMoralis);

    if (response.data.symbol != collection) {
      return null;
    }

    const optionsIpfs = {
      method: 'GET',
      url: response.data.metaplex.metadataUri,
      headers: { accept: 'application/json' },
    };
    response = await axios.request(optionsIpfs);

    const { name, image } = response.data;

    const tokenData: NFT = {
      level: 0,
      name: name,
      image: image,
      tokenEarned: 0,
    };

    console.log(tokenData);
    await set(ref(database, `${publicKey}`), tokenData);
    return tokenData;
  } catch (err) {
    console.log(err);
  }
};
