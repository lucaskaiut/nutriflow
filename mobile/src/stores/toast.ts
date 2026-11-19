import { create } from 'zustand';

export type ToastType = 'success' | 'info' | 'error';
type Toast = { id: number; text: string; type: ToastType };

export const useToastStore = create<{ toast: Toast | null; show: (text: string, type?: ToastType) => void; dismiss: () => void }>((set) => ({
  toast: null,
  show(text, type = 'success') {
    const id = Date.now();
    set({ toast: { id, text, type } });
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 3200);
  },
  dismiss() {
    set({ toast: null });
  },
}));

/** Atalhos: só chame toast.success depois que a API confirmou a operação. */
export const toast = {
  success: (text: string) => useToastStore.getState().show(text, 'success'),
  info: (text: string) => useToastStore.getState().show(text, 'info'),
  error: (text: string) => useToastStore.getState().show(text, 'error'),
};
