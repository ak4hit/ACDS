import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

const BASE = `http://${window.location.hostname}:8000`;
const WS_URL = `ws://${window.location.hostname}:8000/ws/alerts`;

export const SocketProvider = ({ children }) => {
  const [alerts, setAlerts]   = useState([]);
  const [wsStatus, setWsStatus] = useState('connecting'); // 'connected' | 'reconnecting' | 'connecting'
  const [stats, setStats]     = useState({
    total: 0, critical: 0, high: 0, false_positives: 0, correlated: 0,
  });

  // Keep a ref to the latest alerts so the polling diff can access it without stale closure
  const alertsRef = useRef(alerts);
  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  // ── Merge helper — deduplicates by alert_id, newest-first ─────────────
  const mergeAlerts = (incoming, prev) => {
    const seen = new Set(prev.map(a => a.alert_id));
    const fresh = incoming.filter(a => a.alert_id && !seen.has(a.alert_id));
    if (fresh.length === 0) return prev;
    const newList = [...fresh, ...prev];
    if (newList.length > 5000) newList.length = 5000;
    return newList;
  };

  // ── Stats fetch ────────────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const res = await axios.get(`${BASE}/stats`);
      setStats(res.data);
    } catch (_) {}
  };

  // ── Polling fallback — fetches /alerts every 3 s ───────────────────────
  // This ensures the list stays in sync even when the WebSocket is down/reconnecting.
  const pollAlerts = async () => {
    try {
      const res = await axios.get(`${BASE}/alerts?limit=100`);
      const incoming = Array.isArray(res.data) ? res.data.reverse() : [];
      setAlerts(prev => {
        const merged = mergeAlerts(incoming, prev);
        // Fire custom events for any truly new ones
        incoming.forEach(a => {
          if (!prev.find(p => p.alert_id === a.alert_id)) {
            window.dispatchEvent(new CustomEvent('acds-new-alert', { detail: a }));
          }
        });
        return merged;
      });
    } catch (_) {}
  };

  // ── WebSocket with auto-reconnect ──────────────────────────────────────
  useEffect(() => {
    let socket = null;
    let retryDelay = 1000; // start at 1 s, doubles up to 16 s
    let destroyed = false;
    let retryTimer = null;

    const connect = () => {
      if (destroyed) return;
      setWsStatus('connecting');
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        console.log('[ACDS] WebSocket connected');
        setWsStatus('connected');
        retryDelay = 1000; // reset backoff on successful connect
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (Array.isArray(data)) {
            // Batch broadcast (Synthetic Analysis / warp)
            setAlerts(prev => {
              const newList = [...data.slice().reverse(), ...prev];
              if (newList.length > 5000) newList.length = 5000;
              return newList;
            });
            window.dispatchEvent(new CustomEvent('acds-warp-batch', { detail: data }));
          } else {
            // Single alert — skip non-alert status messages
            if (!data.alert_id) return;
            setAlerts(prev => {
              if (prev.find(a => a.alert_id === data.alert_id)) return prev;
              const newList = [data, ...prev];
              if (newList.length > 5000) newList.length = 5000;
              window.dispatchEvent(new CustomEvent('acds-new-alert', { detail: data }));
              return newList;
            });
          }
        } catch (e) {
          console.error('[ACDS] WS parse error', e);
        }
      };

      socket.onerror = (err) => {
        console.warn('[ACDS] WebSocket error — will reconnect', err);
      };

      socket.onclose = () => {
        if (destroyed) return;
        console.warn(`[ACDS] WebSocket closed — retrying in ${retryDelay / 1000}s`);
        setWsStatus('reconnecting');
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 16000);
          connect();
        }, retryDelay);
      };
    };

    connect();

    // Stats polling
    fetchStats();
    const statInterval = setInterval(fetchStats, 3000);

    // Alert polling fallback — catches anything missed during WS downtime
    pollAlerts();
    const pollInterval = setInterval(pollAlerts, 3000);

    return () => {
      destroyed = true;
      clearTimeout(retryTimer);
      clearInterval(statInterval);
      clearInterval(pollInterval);
      if (socket) socket.close();
    };
  }, []);

  // ── System reset ───────────────────────────────────────────────────────
  const resetSystem = async () => {
    try {
      await axios.post(`${BASE}/reset`);
      setAlerts([]);
      fetchStats();
      window.dispatchEvent(new CustomEvent('acds-reset'));
    } catch (_) {}
  };

  return (
    <SocketContext.Provider value={{ alerts, stats, wsStatus, resetSystem }}>
      {children}
    </SocketContext.Provider>
  );
};
