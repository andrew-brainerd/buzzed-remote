import { invoke } from '@tauri-apps/api/core';
import { firebaseAuth } from '@/firebase';
import { useConfigStore } from '@/stores/configStore';

// Every call goes through the Rust proxy rather than fetch() from the webview. That sidesteps CORS
// entirely and lets debug builds accept the local self-signed cert. The proxy attaches the Firebase ID
// token as a bearer plus an `X-Client` marker; brainerd-api's firebaseAuthMiddleware falls back to
// verifyIdToken when the bearer isn't a session cookie, which is how a native client authenticates.
export const call = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Not signed in');

  const token = await user.getIdToken();
  const base = useConfigStore.getState().apiBase;

  return invoke<T>('brainerd_api', { method, path, token, body: body ?? null, base });
};
