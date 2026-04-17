import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

const API = 'http://localhost:8000';
const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 'Z';

function PlaybookCell({ alert }) {
  const [loading, setLoading] = useState(false);
  const [playbook, setPlaybook] = useState(alert.playbook || '');
  const [expanded, setExpanded] = useState(false);

  if (alert.severity !== 'Critical') {
    return <td className="px-6 py-5 text-xs text-neutral-700 font-['IBM_Plex_Mono'] uppercase">—</td>;
  }

  const generate = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch(`${API}/playbooks/generate/${alert.alert_id}`, { method: 'POST' });
      const data = await res.json();
      if (data.playbook) setPlaybook(data.playbook);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <td className="px-6 py-5" onClick={e => e.stopPropagation()}>
      {playbook ? (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[9px] font-['IBM_Plex_Mono'] uppercase text-[#A84B2B] bg-[#A84B2B]/10 px-2 py-1 border border-[#A84B2B]/20 hover:bg-[#A84B2B]/20 transition-all"
        >
          {expanded ? 'Hide' : 'View'}
        </button>
      ) : (
        <button
          onClick={generate}
          disabled={loading}
          className="text-[9px] font-['IBM_Plex_Mono'] uppercase text-[#ffb4ab] bg-[#93000a]/10 px-2 py-1 border border-[#ffb4ab]/20 hover:bg-[#93000a]/20 disabled:opacity-50 transition-all whitespace-nowrap"
        >
          {loading ? '...' : '⚡ Gemini'}
        </button>
      )}
      {expanded && playbook && (
        <div className="absolute left-0 right-0 z-50 mt-1 mx-6 bg-[#080808] border border-[#A84B2B]/30 p-4 shadow-2xl max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#A84B2B] uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>smart_toy</span>
            AI Playbook — {alert.alert_id}
          </p>
          {playbook.split('\n').filter(s => s.trim()).map((line, i) => (
            <p key={i} className={`font-['IBM_Plex_Mono'] text-xs leading-relaxed ${/^\d\./.test(line.trim()) ? 'text-[#A84B2B] mt-2 font-bold' : 'text-[#e5e2e1]/80'}`}>{line}</p>
          ))}
        </div>
      )}
    </td>
  );
}

export default function Threats() {
  const { alerts } = useSocket();
  const [activeTab, setActiveTab] = useState('all');

  const [threatStats, setThreatStats] = useState({
    system_integrity: '100.0%',
    raw_health_val: 100.0,
    network_latency: '4ms',
    active_detectors: 4,
    queue_depth: 0,
    status: 'NOMINAL'
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API}/threats/stats`);
        const data = await res.json();
        setThreatStats(data);
      } catch (e) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const getHealthColors = (status) => {
    switch (status) {
      case 'NOMINAL': return { text: 'text-[#A84B2B]', bg: 'bg-[#A84B2B]', border: 'border-[#A84B2B]' };
      case 'STABLE': return { text: 'text-[#2dd4bf]', bg: 'bg-[#2dd4bf]', border: 'border-[#2dd4bf]' };
      case 'DEGRADED': return { text: 'text-[#fbbf24]', bg: 'bg-[#fbbf24]', border: 'border-[#fbbf24]' };
      case 'IMPAIRED': return { text: 'text-[#f97316]', bg: 'bg-[#f97316]', border: 'border-[#f97316]' };
      case 'CRITICAL': return { text: 'text-[#ef4444]', bg: 'bg-[#ef4444]', border: 'border-[#ef4444]' };
      default: return { text: 'text-[#A84B2B]', bg: 'bg-[#A84B2B]', border: 'border-[#A84B2B]' };
    }
  };
  const colors = getHealthColors(threatStats.status);

  const filteredAlerts = alerts.filter(a => {
    if (activeTab === 'critical') return a.severity === 'Critical';
    if (activeTab === 'high') return a.severity === 'High';
    if (activeTab === 'correlated') return a.correlated;
    return true;
  });

  const tabs = [
    { key: 'all', label: `ALL (${alerts.length})` },
    { key: 'critical', label: `CRITICAL (${alerts.filter(a => a.severity === 'Critical').length})` },
    { key: 'high', label: `HIGH (${alerts.filter(a => a.severity === 'High').length})` },
    { key: 'correlated', label: 'CORRELATED' },
  ];

  return (
    <div className="pt-10 pb-20 px-8 min-h-screen relative overflow-y-auto bg-[#0A0C0E] text-[#e5e2e1]">
      {/* FLOATING WATERMARK */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.02] z-0">
        <h1 className="font-['Space_Grotesk'] text-[20vw] font-black leading-none">ACDS</h1>
      </div>

      <div className="relative z-10">
        {/* HEADER SECTION — no Reset/File Mode buttons */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div>
            <div className="font-['IBM_Plex_Mono'] text-[12px] text-[#A84B2B] mb-2 tracking-widest uppercase">// threat_reconnaissance_module</div>
            <h2 className="font-['Space_Grotesk'] text-4xl font-black tracking-tighter uppercase leading-none">
              {alerts.length} ACTIVE THREATS DETECTED
            </h2>
          </div>
        </div>

        {/* FILTERS & METRICS GRID */}
        <div className="grid grid-cols-12 gap-1 mb-8">
          {/* TABS — now functional */}
          <div className="col-span-12 md:col-span-8 flex bg-[#0A0C0E] p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 px-4 font-['IBM_Plex_Mono'] text-[11px] font-bold uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#1e110d] text-[#A84B2B]'
                    : 'text-[#6B6560] hover:text-[#e5e2e1] hover:bg-[#201f1f]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* METRIC BLOCK */}
          <div className="col-span-12 md:col-span-4 bg-[#080808] border border-[#6B6560]/10 p-4 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-1">
              <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${colors.bg} animate-pulse`}></span>
                SYSTEM HEALTH
              </span>
              <span className={`font-['IBM_Plex_Mono'] text-[10px] ${colors.text} uppercase font-bold tracking-widest`}>
                {threatStats.status} ({threatStats.system_integrity})
              </span>
            </div>
            <div className="w-full h-[3px] bg-[#353534] mt-2 relative overflow-hidden">
              <div 
                className={`absolute top-0 left-0 h-full ${colors.bg} transition-all duration-1000 ease-out`} 
                style={{ width: `${Math.max(5, threatStats.raw_health_val)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* METRIC TILES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className={`bg-[#0A0C0E] p-6 border-l-4 ${colors.border} transition-colors duration-1000`}>
            <div className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase mb-1">NETWORK LATENCY</div>
            <div className="font-['Space_Grotesk'] text-3xl font-bold">{threatStats.network_latency} <span className={`text-xs font-['IBM_Plex_Mono'] ${colors.text} uppercase`}>Avg</span></div>
          </div>
          <div className={`bg-[#0A0C0E] p-6 border-l-4 ${colors.border} transition-colors duration-1000`}>
            <div className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase mb-1">QUEUE DEPTH</div>
            <div className="font-['Space_Grotesk'] text-3xl font-bold">{threatStats.queue_depth} <span className="text-xs font-['IBM_Plex_Mono'] text-[#6B6560] uppercase">Events</span></div>
          </div>
          <div className="bg-[#0A0C0E] p-6 border-l-4 border-[#6B6560]/40">
            <div className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase mb-1">ACTIVE DETECTORS</div>
            <div className="font-['Space_Grotesk'] text-3xl font-bold">{threatStats.active_detectors} <span className="text-xs font-['IBM_Plex_Mono'] text-neutral-600 uppercase">/ 4 ONLINE</span></div>
          </div>
          <div className={`bg-[#0A0C0E] p-6 border-l-4 ${colors.border} transition-colors duration-1000`}>
            <div className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase mb-1">EVENT DENSITY</div>
            <div className="font-['Space_Grotesk'] text-3xl font-bold">{filteredAlerts.length} <span className={`text-xs font-['IBM_Plex_Mono'] ${colors.text} uppercase`}>Detected</span></div>
          </div>
        </div>

        {/* THREAT TABLE */}
        <div className="bg-[#0A0C0E] overflow-hidden">
          <div className="bg-[#353534] px-6 py-4 flex justify-between items-center border-b border-[#6B6560]/10">
            <span className="font-['IBM_Plex_Mono'] text-xs uppercase tracking-widest font-bold">LATEST_INTEL_STREAM</span>
            <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560]">LAST SYNC: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + 'Z'}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b border-[#6B6560]/10">
                  <th className="px-6 py-4 font-['IBM_Plex_Mono'] text-[10px] uppercase text-[#6B6560] tracking-widest">THREAT ID</th>
                  <th className="px-6 py-4 font-['IBM_Plex_Mono'] text-[10px] uppercase text-[#6B6560] tracking-widest">TYPE</th>
                  <th className="px-6 py-4 font-['IBM_Plex_Mono'] text-[10px] uppercase text-[#6B6560] tracking-widest">SOURCE IP</th>
                  <th className="px-6 py-4 font-['IBM_Plex_Mono'] text-[10px] uppercase text-[#6B6560] tracking-widest">SEVERITY</th>
                  <th className="px-6 py-4 font-['IBM_Plex_Mono'] text-[10px] uppercase text-[#6B6560] tracking-widest">MITRE TTP</th>
                  <th className="px-6 py-4 font-['IBM_Plex_Mono'] text-[10px] uppercase text-[#6B6560] tracking-widest">FIRST SEEN</th>
                  <th className="px-6 py-4 font-['IBM_Plex_Mono'] text-[10px] uppercase text-[#6B6560] tracking-widest">STATUS</th>
                  <th className="px-6 py-4 font-['IBM_Plex_Mono'] text-[10px] uppercase text-[#6B6560] tracking-widest">AI PLAYBOOK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6B6560]/5">
                {filteredAlerts.length === 0 ? (
                  <tr><td colSpan="8" className="px-6 py-10 text-center font-['IBM_Plex_Mono'] text-[#6B6560] text-xs uppercase tracking-widest">Awaiting Live Feed...</td></tr>
                ) : (
                  filteredAlerts.map((a, i) => (
                    <tr key={a.alert_id || i} className="hover:bg-[#1e110d]/50 transition-colors cursor-pointer group relative">
                      <td className="px-6 py-5 font-['IBM_Plex_Mono'] text-xs text-[#A84B2B] group-hover:text-[#A84B2B]">
                        {a.threat_id || a.alert_id || `TR-${i}`}
                      </td>
                      <td className="px-6 py-5 text-sm font-medium">{a.type?.toUpperCase()}</td>
                      <td className="px-6 py-5 font-['IBM_Plex_Mono'] text-xs text-[#E8E2D9]">{a.src_ip}</td>
                      <td className="px-6 py-5">
                        <span className={`font-['IBM_Plex_Mono'] text-[9px] px-2 py-0.5 font-bold uppercase tracking-tighter ${a.severity === 'Critical' ? 'bg-[#93000a] text-[#ffdad6]' : a.severity === 'High' ? 'bg-[#ff9800] text-[#000]' : 'bg-[#353534] text-[#E8E2D9]'}`}>
                          {a.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560]">{a.mitre?.id || a.mitre_ttp || 'T1000'}</td>
                      <td className="px-6 py-5 font-['IBM_Plex_Mono'] text-xs text-[#E8E2D9]">{formatTime(a.timestamp)}</td>
                      <td className={`px-6 py-5 text-xs uppercase font-bold tracking-widest ${a.severity === 'Critical' ? 'text-[#ffb4ab]' : 'text-[#6B6560]'}`}>
                        {a.severity === 'Critical' ? 'ESCALATE' : 'ACTIVE'}
                      </td>
                      <PlaybookCell alert={a} />
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
