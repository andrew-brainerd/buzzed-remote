import { useState } from 'react';
import { rokuDeviceInfo } from '@/api/ipc';
import { useDeviceStore } from '@/stores/deviceStore';

export const DevicePicker = () => {
  const { devices, activeId, addDevice, removeDevice, setActive, syncFromBackend } = useDeviceStore();
  const [ip, setIp] = useState('');
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromBackend();
    setRefreshing(false);
  };

  // Confirm the IP is actually a Roku before saving it, so a typo fails here rather than silently
  // during a game when the pause doesn't fire.
  const onAdd = async () => {
    setChecking(true);
    setError(null);
    try {
      const info = await rokuDeviceInfo(ip.trim());
      addDevice(info.name || info.model, ip.trim());
      setIp('');
    } catch {
      setError('No Roku answered at that address.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-300">Roku</h2>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={refreshing}
          className="text-xs text-neutral-500 hover:text-white disabled:opacity-40"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {devices.length === 0 && (
        <p className="text-xs text-neutral-500">
          No saved TVs yet. Any Roku you’ve saved in Watch Remote shows up here.
        </p>
      )}

      {devices.length > 0 && (
        <ul className="space-y-1">
          {devices.map(device => (
            <li key={device.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActive(device.id)}
                className={`flex-1 rounded-md px-3 py-2 text-left text-sm ${
                  device.id === activeId
                    ? 'bg-brand-600/20 text-white ring-1 ring-brand-500'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {device.name}
                <span className="ml-2 font-mono text-xs text-neutral-500">{device.ip}</span>
              </button>
              <button
                type="button"
                onClick={() => removeDevice(device.id)}
                className="px-2 text-neutral-500 hover:text-red-400"
                aria-label={`Remove ${device.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={ip}
          onChange={e => setIp(e.target.value)}
          placeholder="192.168.4.61"
          inputMode="decimal"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-base text-white placeholder:text-neutral-600 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void onAdd()}
          disabled={!ip.trim() || checking}
          className="rounded-md border border-neutral-700 px-4 text-sm text-neutral-200 disabled:opacity-40"
        >
          {checking ? '…' : 'Add'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};
