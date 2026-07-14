import { call } from '@/api/client';
import type { SavedDevice } from '@/types/device';
import type { YoutubePlaylist, YoutubePlaylistItem } from '@/types/youtube';

// The same account-level list watch-remote writes — there is no separate buzzed device list.
export const getDevices = () => call<SavedDevice[]>('GET', '/watch/devices');

// pinnedShortcuts must be sent back: the upsert resets it to [] when absent, wiping watch-remote's pins.
export const saveDevice = (device: SavedDevice) =>
  call<SavedDevice>('PUT', `/watch/devices/${encodeURIComponent(device.id)}`, {
    name: device.name,
    ip: device.ip,
    model: device.model,
    pinnedShortcuts: device.pinnedShortcuts ?? []
  });

export const deleteDevice = (id: string) =>
  call<{ message: string }>('DELETE', `/watch/devices/${encodeURIComponent(id)}`);

// The app can browse playlists with its ID token, but can't CONNECT the account — the OAuth callback
// identifies the user by the session cookie, which a native webview doesn't carry. Connecting is web-only.
export const getYoutubeConnection = () =>
  call<{ connected: boolean }>('GET', '/watch/youtube/connection').then(r => r.connected);

export const getYoutubePlaylists = () =>
  call<{ playlists: YoutubePlaylist[] }>('GET', '/watch/youtube/playlists').then(r => r.playlists ?? []);

export const getYoutubePlaylistItems = (playlistId: string) =>
  call<{ items: YoutubePlaylistItem[] }>(
    'GET',
    `/watch/youtube/playlists/${encodeURIComponent(playlistId)}/items`
  ).then(r => r.items ?? []);
