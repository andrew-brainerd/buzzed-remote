import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isMobile } from '@/utils/platform';

// Prod brainerd-api (mounts at `/`, valid cert — reachable from any device). Real devices default here.
export const PROD_API_BASE = 'https://api.brainerd.dev';
// Local dev backend for the desktop. Use 127.0.0.1 (not local.brainerd.dev): the app's reqwest client
// fails to connect to that hostname, and the debug build ignores the cert's hostname mismatch anyway.
// Run the API with `pnpm dev` (add HOST=0.0.0.0 + set the phone's "Watch server" to the Mac's LAN IP to
// point a device at local instead).
export const LOCAL_API_BASE = 'https://127.0.0.1:5002/api';

// Mobile (device) builds default to prod so they work out in the world; the desktop dev build defaults
// to local. Either can be overridden per-device via the "Watch server" field.
export const DEFAULT_API_BASE = isMobile ? PROD_API_BASE : LOCAL_API_BASE;

interface ConfigState {
  apiBase: string;
  setApiBase: (base: string) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    set => ({
      apiBase: DEFAULT_API_BASE,
      setApiBase: base => set({ apiBase: base.trim() || DEFAULT_API_BASE })
    }),
    // Key bumped so devices drop any stale persisted base and re-default to the platform base above.
    { name: 'buzzed-remote-config-2' }
  )
);
