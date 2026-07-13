import { invoke } from '@tauri-apps/api/core';

export interface RokuDeviceInfo {
  name: string;
  model: string;
  is_tv: boolean;
  power_on: boolean;
}

export interface RokuApp {
  id: string;
  name: string;
  // "app" = an installed channel; "input" = a TV input (HDMI, etc., often relabelled e.g. "Steam").
  kind: 'app' | 'input';
}

export interface RokuMediaPlayer {
  // "play" | "pause" | "stop" | "close" | "startup" | "buffer" | … — "close" when nothing is playing.
  state: string;
  app_id: string | null;
  app_name: string | null;
  position_ms: number | null;
  duration_ms: number | null;
  is_live: boolean;
}

// Cast (or plain-launch) an app. Pass contentId + mediaType to deep-link into a title.
export const rokuLaunch = (ip: string, channelId: string, contentId?: string, mediaType?: string): Promise<void> =>
  invoke('roku_launch', { ip, channelId, contentId, mediaType });

export const rokuInstall = (ip: string, channelId: string): Promise<void> =>
  invoke('roku_install', { ip, channelId });

export const rokuKeypress = (ip: string, key: string): Promise<void> => invoke('roku_keypress', { ip, key });

export const rokuType = (ip: string, text: string): Promise<void> => invoke('roku_type', { ip, text });

export const rokuDeviceInfo = (ip: string): Promise<RokuDeviceInfo> => invoke('roku_device_info', { ip });

export const rokuApps = (ip: string): Promise<RokuApp[]> => invoke('roku_apps', { ip });

// An app/input icon as a data: URL (fetched from the TV). Rejects if the device has no icon for it.
export const rokuAppIcon = (ip: string, id: string): Promise<string> => invoke('roku_app_icon', { ip, id });

// Current playback state on the device (ECP /query/media-player).
export const rokuMediaPlayer = (ip: string): Promise<RokuMediaPlayer> => invoke('roku_media_player', { ip });
