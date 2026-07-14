// Shared with watch-remote via /watch/devices. The id is the LAN IP.
export interface SavedDevice {
  id: string;
  name: string;
  ip: string;
  model?: string;
  // Unused here, but carried so saves round-trip them: the upsert resets the field to [] when absent,
  // which would wipe watch-remote's pins.
  pinnedShortcuts?: string[];
}
