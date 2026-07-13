import { create } from 'zustand';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { firebaseAuth } from '@/firebase';

interface AuthState {
  user: User | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Firebase persists the session itself (localStorage), so on launch we just wait for the first
// onAuthStateChanged to restore it. `ready` gates the UI until that resolves.
export const useAuthStore = create<AuthState>(set => {
  onAuthStateChanged(firebaseAuth, user => set({ user, ready: true }));

  // Safety net: never hang on the "Loading…" screen if auth init stalls — fall through to the login
  // screen after a few seconds so the user can at least act.
  setTimeout(() => set(state => (state.ready ? {} : { ready: true })), 4000);

  return {
    user: null,
    ready: false,
    signIn: async (email, password) => {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
    },
    signOut: async () => {
      await signOut(firebaseAuth);
    }
  };
});
