import create from 'zustand';
import { persist } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

type State = {
  nfts?: NFT[];
  allNfts?: NFT[];
  tokens: number;
};

interface StateWithMutation extends State {
  setNfts: (payload: NFT[]) => void;
  addNft: (payload: NFT) => void;
  searchNfts: (search: string) => void;
  setTwitterAccount: (payload: Twitter, nftId: string) => void;
  setTokens: (amount: number) => void;
}

export const useSolanaNfts = create<StateWithMutation>()(
  devtools(
    persist((set) => ({
      nfts: [],
      allNfts: [],
      tokens: 0,
      setNfts: (payload) => {
        set((state) => ({
          ...state,
          nfts: payload.map((nft) => nft),
          allNfts: payload.map((nft) => nft),
        }));
      },
      addNft: (payload) => {
        set((state) => {
          const nfts = state.nfts ? [...state.nfts, payload] : [payload];
          return { ...state, nfts, allNfts: nfts };
        });
      },
      setTokens: (tokens) => {
        set((state) => ({ ...state, tokens }));
      },
      searchNfts: (payload) => {
        console.log(payload);
        set((state) => ({
          ...state,
          nfts: payload.length
            ? state.allNfts?.filter((nft) =>
                nft.name.toLowerCase().includes(payload)
              )
            : state.allNfts,
        }));
      },
      setTwitterAccount: (payload, nftId) => {
        set((state) => {
          const nfts = state.nfts?.map((nft) =>
            nft.mint === nftId
              ? {
                  ...nft,
                  twitter: payload,
                }
              : nft
          );
          return { ...state, nfts };
        });
      },
    }))
  )
);
