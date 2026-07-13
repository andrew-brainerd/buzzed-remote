import { call } from '@/api/client';
import type { SavedDevice } from '@/types/device';
import type { YoutubePlaylist, YoutubePlaylistItem } from '@/types/youtube';

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

// --- YouTube (the same connection the web /watch and /buzzed pages use) ---
// Read-only. The app can BROWSE playlists with its Firebase ID token, but it cannot CONNECT the account:
// the OAuth callback identifies the user by the brainerd session cookie, which a native webview doesn't
// carry. So connecting is a one-time thing you do on the web, and the app just consumes it.
export const getYoutubeConnection = () =>
  call<{ connected: boolean }>('GET', '/watch/youtube/connection').then(r => r.connected);

export const getYoutubePlaylists = () =>
  call<{ playlists: YoutubePlaylist[] }>('GET', '/watch/youtube/playlists').then(r => r.playlists ?? []);

export const getYoutubePlaylistItems = (playlistId: string) =>
  call<{ items: YoutubePlaylistItem[] }>(
    'GET',
    `/watch/youtube/playlists/${encodeURIComponent(playlistId)}/items`
  ).then(r => r.items ?? []);
