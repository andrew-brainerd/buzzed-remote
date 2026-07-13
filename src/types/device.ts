// The account-level saved Roku, shared with watch-remote via /watch/devices. The id is the LAN IP.
export interface SavedDevice {
  id: string;
  name: string;
  ip: string;
  model?: string;
  // Buzzed never reads these — they belong to watch-remote's shortcuts grid. They're carried here purely
  // so a save from this app round-trips them: PUT /watch/devices/:id is a full upsert that resets
  // pinnedShortcuts to [] when the field is absent, which would wipe the user's pins in the other app.
  pinnedShortcuts?: string[];
}
