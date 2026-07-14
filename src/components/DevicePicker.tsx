import { useEffect, useState } from 'react';
import { rokuDeviceInfo } from '@/api/ipc';
import { useDeviceStore } from '@/stores/deviceStore';

// Ported from watch-remote's DeviceBar: a dropdown of saved TVs plus a live reachability line, rather
// than a list of tap targets. The status line earns its place here — hosting wakes the TV and casts to it,
// so "is this thing actually reachable" is the question you want answered BEFORE you start a game, not
// when the intro plays to a black screen.
export const DevicePicker = () => {
  const { devices, activeId, addDevice, removeDevice, setActive, syncFromBackend } = useDeviceStore();
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [checking, setChecking] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Mirrors the store's activeDevice() fallback. Without it the dropdown reads blank while the app is
  // quietly driving devices[0] — the UI would disagree with the TV it's actually casting to.
  const active = devices.find(d => d.id === activeId) ?? devices[0];
  const activeIp = active?.ip;

  useEffect(() => {
    if (!activeIp) {
      setStatus(null);
      return;
    }

    // Cancelled on change so a slow probe for the TV you just switched away from can't overwrite the
    // status of the one you switched to.
    let cancelled = false;
    setStatus('checking…');

    rokuDeviceInfo(activeIp)
      .then(info => {
        if (!cancelled) setStatus(`${info.name} · ${info.model} · ${info.power_on ? 'on' : 'standby'}`);
      })
      .catch(() => {
        if (!cancelled) setStatus('unreachable');
      });

    return () => {
      cancelled = true;
    };
  }, [activeIp]);

  const onRefresh = async () => {
    setRefreshing(true);
    await syncFromBackend();
    setRefreshing(false);
  };

  // Confirm the IP is actually a Roku before saving it, so a typo fails here rather than silently during a
  // game when the cast doesn't fire. The typed name wins; otherwise the TV tells us its own.
  const onAdd = async () => {
    const trimmedIp = ip.trim();
    if (!trimmedIp) return;

    setChecking(true);
    setError(null);
    try {
      const info = await rokuDeviceInfo(trimmedIp);
      addDevice(name.trim() || info.name || info.model, trimmedIp);
      setName('');
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

      <div className="flex items-center gap-2">
        <select
          value={active?.id ?? ''}
          onChange={e => setActive(e.target.value)}
          aria-label="Active Roku"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 focus:border-brand-500 focus:outline-none"
        >
          {devices.length === 0 && <option value="">No TVs yet — add one below</option>}
          {devices.map(device => (
            <option key={device.id} value={device.id}>
              {device.name} ({device.ip})
            </option>
          ))}
        </select>

        {active && (
          <button
            type="button"
            onClick={() => removeDevice(active.id)}
            aria-label={`Remove ${active.name}`}
            className="shrink-0 rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-400 hover:text-red-400"
          >
            ✕
          </button>
        )}
      </div>

      {active && <p className="px-1 text-xs text-neutral-500">{status ?? 'checking…'}</p>}

      {devices.length === 0 && (
        <p className="text-xs text-neutral-500">
          Any Roku you’ve saved in Watch Remote shows up here.
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Name"
          className="w-24 shrink-0 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-white placeholder:text-neutral-600 focus:border-brand-500 focus:outline-none"
        />
        <input
          value={ip}
          onChange={e => setIp(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void onAdd()}
          placeholder="192.168.4.61"
          inputMode="decimal"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 font-mono text-base text-white placeholder:text-neutral-600 focus:border-brand-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void onAdd()}
          disabled={!ip.trim() || checking}
          className="shrink-0 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {checking ? '…' : 'Add'}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};
