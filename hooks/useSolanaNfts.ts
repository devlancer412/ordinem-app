import create from "zustand";

type Twitter = {
  screenName: string;
  displayName?: string;
  image: string;
};

type NFT = {
  name: string;
  standard: string;
  symbol: string;
  image: string;
  twitter?: Twitter;
  mint?: string;
  [key: string]: any;
};

type State = {
  nfts?: NFT[];
  allNfts?: NFT[];
};

interface StateWithMutation extends State {
  setNfts: (payload: NFT[]) => void;
  searchNfts: (search: string) => void;
  setTwitterAccount: (payload: Twitter, nftId: string) => void;
}

export const useSolanaNfts = create<StateWithMutation>((set) => ({
  nfts: undefined,
  allNfts: undefined,
  setNfts: (payload) => {
    set((state) => ({ ...state, nfts: payload, allNfts: payload }));
  },
  searchNfts: (payload) => {
    console.log(payload);
    set((state) => ({
      ...state,
      nfts: payload.length
        ? state.allNfts?.filter((nft) => nft.name.toLowerCase().includes(payload))
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
}));
