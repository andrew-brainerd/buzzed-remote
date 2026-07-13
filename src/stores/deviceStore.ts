import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedDevice {
  id: string;
  name: string;
  ip: string;
}

interface DeviceState {
  devices: SavedDevice[];
  activeId: string | null;
  addDevice: (name: string, ip: string) => void;
  removeDevice: (id: string) => void;
  setActive: (id: string) => void;
  activeDevice: () => SavedDevice | undefined;
}

// Saved-device / manual-IP only, persisted locally. No SSDP discovery (that needs Apple's multicast
// entitlement on iOS) and no account sync yet — the device id is just its IP.
export const useDeviceStore = create<DeviceState>()(
  persist(
    (set, get) => ({
      devices: [],
      activeId: null,

      addDevice: (name, ip) => {
        const trimmedIp = ip.trim();
        if (!trimmedIp) return;

        const trimmedName = name.trim() || trimmedIp;
        const { devices } = get();
        const exists = devices.some(d => d.ip === trimmedIp);

        set({
          devices: exists
            ? devices.map(d => (d.ip === trimmedIp ? { ...d, name: trimmedName } : d))
            : [...devices, { id: trimmedIp, name: trimmedName, ip: trimmedIp }],
          activeId: trimmedIp
        });
      },

      removeDevice: id =>
        set(state => ({
          devices: state.devices.filter(d => d.id !== id),
          activeId: state.activeId === id ? null : state.activeId
        })),

      setActive: id => set({ activeId: id }),

      activeDevice: () => {
        const { devices, activeId } = get();
        return devices.find(d => d.id === activeId) ?? devices[0];
      }
    }),
    { name: 'buzzed-remote-devices' }
  )
);
