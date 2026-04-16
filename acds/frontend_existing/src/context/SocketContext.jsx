import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({ total: 0, critical: 0, high: 0, false_positives: 0, correlated: 0 });
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Initial stats fetch
    fetchStats();
    const statInterval = setInterval(fetchStats, 3000);

    // WebSocket connect
    const socket = new WebSocket('ws://localhost:8000/ws/alerts');
    
    socket.onopen = () => console.log("WebSocket Connected");
    
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.alert_id) return; // Skip status broadcasts that aren't alerts
        
        setAlerts((prev) => {
          const exists = prev.find(a => a.alert_id === data.alert_id);
          if (exists) return prev;
          const newList = [data, ...prev];
          if (newList.length > 500) newList.length = 500;
          // Push to persistent archive (unaffected by reset)
          window.dispatchEvent(new CustomEvent('acds-new-alert', { detail: data }));
          return newList;
        });
      } catch (e) { console.error(e) }
    };

    setWs(socket);
    return () => {
      clearInterval(statInterval);
      socket.close();
    }
  }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get('http://localhost:8000/stats');
      setStats(res.data);
    } catch(e) {}
  };

  const resetSystem = async () => {
    try {
      await axios.post('http://localhost:8000/reset');
      setAlerts([]);
      fetchStats();
      // Notify all components to clear their local state
      window.dispatchEvent(new CustomEvent('acds-reset'));
    } catch(e) {}
  };

  return (
    <SocketContext.Provider value={{ alerts, stats, resetSystem }}>
      {children}
    </SocketContext.Provider>
  );
};
