import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  deleteDevice as apiDeleteDevice,
  getDevices as apiGetDevices,
  saveDevice as apiSaveDevice
} from '@/api/watchApi';
import type { SavedDevice } from '@/types/device';

interface DeviceState {
  devices: SavedDevice[];
  activeId: string | null;
  addDevice: (name: string, ip: string) => void;
  removeDevice: (id: string) => void;
  setActive: (id: string) => void;
  activeDevice: () => SavedDevice | undefined;
  syncFromBackend: () => Promise<void>;
}

// Cached locally and synced to the account (`/watch/devices`) — the same list watch-remote uses. Which TV
// you're driving stays per-client. No SSDP discovery (needs Apple's multicast entitlement), so adds are by hand.
export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      devices: [],
      activeId: null,

      addDevice: (name, ip) => {
        const trimmedIp = ip.trim();
        if (!trimmedIp) return;

        const trimmedName = name.trim() || trimmedIp;
        const state = get();
        const exists = state.devices.some(d => d.ip === trimmedIp);
        const devices = exists
          ? state.devices.map(d => (d.ip === trimmedIp ? { ...d, name: trimmedName } : d))
          : [...state.devices, { id: trimmedIp, name: trimmedName, ip: trimmedIp }];

        set({ devices, activeId: trimmedIp });

        const device = devices.find(d => d.id === trimmedIp);
        if (device) void apiSaveDevice(device).catch(() => undefined);
      },

      removeDevice: id => {
        set(state => ({
          devices: state.devices.filter(d => d.id !== id),
          activeId: state.activeId === id ? null : state.activeId
        }));
        void apiDeleteDevice(id).catch(() => undefined);
      },

      setActive: id => set({ activeId: id }),

      activeDevice: () => {
        const { devices, activeId } = get();
        return devices.find(d => d.id === activeId) ?? devices[0];
      },

      syncFromBackend: async () => {
        try {
          const merged = await apiGetDevices();
          const remoteIds = new Set(merged.map(d => d.id));

          // Push up anything only this client knows about, rather than dropping it.
          for (const local of get().devices) {
            if (remoteIds.has(local.id)) continue;
            merged.push(local);
            void apiSaveDevice(local).catch(() => undefined);
          }

          const { activeId } = get();
          const stillThere = activeId && merged.some(d => d.id === activeId);

          set({ devices: merged, activeId: stillThere ? activeId : (merged[0]?.id ?? null) });
        } catch {
          // Offline or signed out — keep the local cache rather than blanking the list.
        }
      }
    }),
    { name: 'buzzed-remote-devices' }
  )
);
