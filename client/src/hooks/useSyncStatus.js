/**
 * useSyncStatus.js
 *
 * Drop this in your client/src/hooks/ folder.
 *
 * Usage:
 *   const { online, syncing, pending, lastSync, syncNow } = useSyncStatus();
 */

import { useState, useEffect, useCallback } from "react";

export function useSyncStatus() {
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    // Subscribe to sync status events pushed from main process
    const unsub = window.api.onSyncStatus((status) => {
      if (status.online !== undefined) setOnline(status.online);
      if (status.syncing !== undefined) setSyncing(status.syncing);
      if (status.pending !== undefined) setPending(status.pending);
      if (status.lastSync) setLastSync(status.lastSync);
      if (status.errors) setErrors(status.errors);
    });

    // Get initial pending count on mount
    window.api.getPendingCount().then(setPending);
    window.api.checkOnline().then(setOnline);

    return unsub;
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    await window.api.syncNow();
    // status update arrives via onSyncStatus listener above
  }, []);

  return { online, syncing, pending, lastSync, errors, syncNow };
}

/* ─────────────────────────────────────────────────────────────────────────────
   SyncBadge — a small status indicator to put in your navbar/sidebar

   Usage:
     import { SyncBadge } from "./hooks/useSyncStatus";
     <SyncBadge />

   Tailwind CSS classes used — make sure Tailwind is configured in your client.
───────────────────────────────────────────────────────────────────────────── */
export function SyncBadge() {
  const { online, syncing, pending, lastSync, syncNow } = useSyncStatus();

  const label = syncing
    ? "Syncing..."
    : !online
    ? "Offline"
    : pending > 0
    ? `${pending} unsynced`
    : "Synced";

  const color = syncing
    ? "bg-blue-500"
    : !online
    ? "bg-gray-400"
    : pending > 0
    ? "bg-yellow-500"
    : "bg-green-500";

  const lastSyncText = lastSync
    ? `Last sync: ${new Date(lastSync).toLocaleTimeString()}`
    : "Not yet synced this session";

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Status dot */}
      <span
        className={`inline-block w-2 h-2 rounded-full ${color} ${
          syncing ? "animate-pulse" : ""
        }`}
      />

      {/* Label + last sync tooltip */}
      <span
        className="text-xs text-gray-600 cursor-default"
        title={lastSyncText}
      >
        {label}
      </span>

      {/* Manual sync button — only when online and not already syncing */}
      {online && !syncing && (
        <button
          onClick={syncNow}
          className="text-xs text-blue-600 hover:text-blue-800 underline ml-1"
          title="Sync now"
        >
          ↑ Sync
        </button>
      )}
    </div>
  );
}