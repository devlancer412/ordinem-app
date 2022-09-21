import { fetchAndChangeUser } from "utils/firebase";
import create from "zustand";

type QuotasEnded = {
  like: boolean;
  comment: boolean;
  follow: boolean;
};

type State = {
  usersToFollow: any[];
  ordinemUsers: any[];
  indexOfUser: number;
  quotasEnded: QuotasEnded;
  tweet_id: string;
};

interface StateWithMutation extends State {
  setUsersToFollow: (payload: any[]) => void;
  setOrdinemUsers: (payload: any[]) => void;
  fetchAndChangeUser: () => Promise<void>;
  setEndedQuotas: (payload: Partial<QuotasEnded>) => void;
  setTweet: (payload: string) => void;
}

export const useQuests = create<StateWithMutation>((set) => ({
  usersToFollow: [],
  ordinemUsers: [],
  indexOfUser: 0,
  tweet_id: "",
  quotasEnded: {
    like: false,
    comment: false,
    follow: false,
  },
  setUsersToFollow: (payload) => {
    set((state) => ({ ...state, usersToFollow: payload }));
  },
  setOrdinemUsers: (payload) => {
    set((state) => ({ ...state, ordinemUsers: payload }));
  },
  setTweet: (payload) => {
    set((state) => ({ ...state, tweet_id: payload }));
  },
  fetchAndChangeUser: async () => {
    const user = await fetchAndChangeUser();
    set((state) => {
      state.indexOfUser += 1;
      const users = state.usersToFollow;
      users[state.indexOfUser] = user;

      return { ...state, usersToFollow: users };
    });
  },
  setEndedQuotas: (payload) => {
    set((state) => ({ ...state, ...payload }));
  },
}));
