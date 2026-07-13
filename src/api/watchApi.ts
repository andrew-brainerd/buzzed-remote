import { call } from '@/api/client';
import type { SavedDevice } from '@/types/device';

// The saved Roku list is the SAME account-level list watch-remote writes, so a TV added in either app
// shows up in the other. It lives under /watch because that's where it was first built; there is no
// separate buzzed device list, and there shouldn't be.
export const getDevices = () => call<SavedDevice[]>('GET', '/watch/devices');

// pinnedShortcuts must be sent back even though Buzzed never reads them — the upsert resets the field
// to [] when it's absent, which would wipe the pins watch-remote set on the same device.
export const saveDevice = (device: SavedDevice) =>
  call<SavedDevice>('PUT', `/watch/devices/${encodeURIComponent(device.id)}`, {
    name: device.name,
    ip: device.ip,
    model: device.model,
    pinnedShortcuts: device.pinnedShortcuts ?? []
  });

export const deleteDevice = (id: string) =>
  call<{ message: string }>('DELETE', `/watch/devices/${encodeURIComponent(id)}`);
