import { create } from 'zustand';

export type CelebrationPayload = {
  title: string;
  message?: string;
};

type CelebrationState = {
  current: CelebrationPayload | null;
  show: (payload: CelebrationPayload) => void;
  dismiss: () => void;
};

export const useCelebrationStore = create<CelebrationState>((set) => ({
  current: null,
  show: (payload) => set({ current: payload }),
  dismiss: () => set({ current: null }),
}));

/** Fire a celebration moment from anywhere (e.g. first post, first 5★ review). */
export const celebrate = (payload: CelebrationPayload) =>
  useCelebrationStore.getState().show(payload);
