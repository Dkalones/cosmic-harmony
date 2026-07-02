import { create } from "zustand";
import { MOCK_USERS, type MockUser } from "@/lib/mock/users";

interface SelectionState {
  user: MockUser;
  setUser: (u: MockUser) => void;
}

export const useSelection = create<SelectionState>((set) => ({
  user: MOCK_USERS[0],
  setUser: (u) => set({ user: u }),
}));