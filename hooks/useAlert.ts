import create from "zustand";

type State = {
  show: boolean;
  message: string;
  status: "error" | "success";
};

interface StateWithMutation extends State {
  open: (payload: { message: string; status: "error" | "success" }) => void;
  close: () => void;
}

export const useAlert = create<StateWithMutation>((set) => ({
  show: false,
  status: "error",
  message: "",
  open: (payload) => {
    set((state) => ({ ...state, show: true, ...payload }));
  },
  close: () => {
    set((state) => ({ ...state, show: false, message: "" }));
  },
}));
