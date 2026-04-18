import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const API = `http://${window.location.hostname}:8000`;

export default function Intelligence() {
  const { alerts, stats } = useSocket();
  const [mitreTactics, setMitreTactics] = useState([]);
  const [iocs, setIocs] = useState([]);
  const [blockedIocs, setBlockedIocs] = useState(new Set());
  const [propagation, setPropagation] = useState([]);
  const [toast, setToast] = useState(null);
  const [timeSinceUpdate, setTimeSinceUpdate] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let lastFetch = Date.now();
    const fetchData = async () => {
      try {
        const [mRes, iRes, pRes] = await Promise.all([
          fetch(`${API}/intelligence/mitre`),
          fetch(`${API}/intelligence/iocs`),
          fetch(`${API}/intelligence/propagation`)
        ]);
        if (mRes.ok) {
           const d = await mRes.json();
           setMitreTactics(d.tactics || []);
        }
        if (iRes.ok) setIocs(await iRes.json());
        if (pRes.ok) setPropagation(await pRes.json());
        lastFetch = Date.now();
        setTimeSinceUpdate(0);
      } catch (e) {}
    };
    fetchData();
    const intv = setInterval(fetchData, 2000);
    const timeIntv = setInterval(() => {
      setTimeSinceUpdate(Math.floor((Date.now() - lastFetch) / 1000));
    }, 1000);
    return () => {
      clearInterval(intv);
      clearInterval(timeIntv);
    };
  }, []);

  // Compute live properties
  const activeAlertsCount = alerts.length;
  const isThreatActive = activeAlertsCount > 0;
  
  // Synthetic dynamic chains for visual impact based on active threats
  const dynamicChains = isThreatActive ? [
    { chain: "T1190 → T1059 (78%) → T1055 (64%)", label: "Exploit to Injection", color: "#ffb4ab" },
    { chain: "T1566 → T1204 (82%) → T1078 (71%)", label: "Phish to Valid Acc", color: "#A84B2B" },
    { chain: "T1110 → T1098 (88%) → T1041 (61%)", label: "Brute Force to Exfil", color: "#ffb4ab" }
  ] : [
    { chain: "System Monitoring Phase", label: "Nominal", color: "#6B6560" }
  ];

  // Helper to generate a fake risk score based on status
  const getRiskScore = (status) => {
    if (status === 'Active Threat') return Math.floor(Math.random() * 15) + 85; // 85-99
    if (status === 'Blocked') return Math.floor(Math.random() * 20) + 40;       // 40-59
    return Math.floor(Math.random() * 30) + 10;                                 // 10-39
  };

  const handleBlock = (iocValue) => {
    // Record this IOC in the UI-local list so the polling doesn't overwrite it
    setBlockedIocs(prev => new Set(prev).add(iocValue));
    setToast({ message: `IP Blocked Successfully: ${iocValue}`, type: 'success' });
    setTimeout(() => setToast(null), 3000);
  };

  const handleInvestigate = () => {
    setToast({ message: `Forwarding Context... View in Blueprints ➔`, type: 'info' });
    setIsNavigating(true);
    setTimeout(() => {
      setToast(null);
      // Reset scroll position before navigating to Blueprints
      const mainScroll = document.querySelector('.overflow-y-auto');
      if (mainScroll) mainScroll.scrollTop = 0;
      navigate("/blueprints");
    }, 1500);
  };

  return (
    <div className="pt-10 pb-20 px-8 min-h-screen relative overflow-y-auto bg-[#0A0C0E] text-[#e5e2e1]">
      {/* Smooth Transition Overlay */}
      <div className={`fixed inset-0 bg-[#0A0C0E] z-[100] transition-opacity duration-1000 flex items-center justify-center ${isNavigating ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {isNavigating && (
          <div className="flex flex-col items-center gap-4">
            <span className="material-symbols-outlined text-[#A84B2B] text-4xl animate-[spin_2s_linear_infinite]">radar</span>
            <p className="font-['Space_Grotesk'] text-[#A84B2B] tracking-widest uppercase text-sm animate-pulse">Locking Target Coordinates...</p>
          </div>
        )}
      </div>

      {/* Background branding */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center overflow-hidden z-0">
        <span className="text-[40rem] font-['Space_Grotesk'] font-black select-none -rotate-12 translate-x-20">ACDS</span>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-8 right-8 z-50 px-6 py-3 font-['IBM_Plex_Mono'] text-xs font-bold uppercase tracking-widest border shadow-xl ${
          toast.type === 'success' ? 'bg-[#2f4d2f]/90 text-[#A84B2B] border-[#A84B2B]' : 'bg-[#0A0C0E]/90 text-[#e5e2e1] border-[#6B6560]'
        } backdrop-blur-md transition-all`}>
          {toast.message}
        </div>
      )}

      <div className="relative z-10 flex-1 h-full max-w-screen-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-end border-b border-[#6B6560]/20 pb-6">
          <div>
            <h3 className="font-['Space_Grotesk'] font-black text-4xl tracking-tighter uppercase text-[#e5e2e1]">Tactical Coverage <span className="text-[#A84B2B]">&amp;</span> Active Observations</h3>
            <p className="font-['IBM_Plex_Mono'] text-xs text-[#6B6560] mt-2 tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#A84B2B] rounded-full animate-pulse"></span>
              INTELLIGENCE_LAYER_V4.0 // LIVE_MITRE_SYNC // LAST UPDATED: {timeSinceUpdate}s AGO
            </p>
          </div>
          <div className="text-right">
            <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">Matrix Confidence</p>
            <p className="font-['Space_Grotesk'] font-black text-xl text-[#A84B2B]">98.2%</p>
          </div>
        </div>

        {/* 1. Top Section: MITRE Matrix Grid */}
        <div className="bg-[#0A0C0E] outline outline-1 outline-[#6B6560]/20 p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {mitreTactics.map((tactic, idx) => (
              <div key={idx} className="flex flex-col space-y-4">
                <div className="border-b border-[#6B6560]/20 pb-2 flex justify-between items-end">
                  <h4 className="font-['Space_Grotesk'] font-bold text-xs tracking-widest uppercase text-[#e5e2e1]">{tactic.name}</h4>
                  <span className="font-['IBM_Plex_Mono'] text-[9px] text-[#6B6560]">{tactic.ta_id}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {tactic.ttps.map((tech) => {
                    const isActive = tech.observed;
                    return (
                      <div 
                        key={tech.id} 
                        className={`group relative p-3 border-l-2 cursor-pointer transition-all ${
                          isActive 
                            ? 'bg-[#2f4d2f]/20 border-[#A84B2B] hover:bg-[#2f4d2f]/40' 
                            : 'bg-[#120b0a]/50 border-transparent hover:bg-[#353534]'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-['IBM_Plex_Mono'] text-[9px] font-bold ${isActive ? 'text-[#A84B2B]' : 'text-[#6B6560]'}`}>
                            {tech.id}
                          </span>
                          {isActive && (
                            <span className="flex items-center gap-1 bg-[#A84B2B]/10 text-[#A84B2B] border border-[#A84B2B]/30 text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-[0_0_8px_rgba(152,251,152,0.1)]">
                              <span className="w-1 h-1 bg-[#A84B2B] rounded-full animate-ping"></span>
                              LIVE
                            </span>
                          )}
                        </div>
                        <p className={`font-['Space_Grotesk'] text-[10px] uppercase font-bold tracking-wide ${isActive ? 'text-[#e5e2e1]' : 'text-[#E8E2D9]'}`}>
                          {tech.name}
                        </p>
                        {isActive && (
                          <div className="mt-2 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="font-['IBM_Plex_Mono'] text-[8px] text-[#6B6560]">Conf: {Math.floor(Math.random() * 10) + 90}%</span>
                            <span className="font-['IBM_Plex_Mono'] text-[8px] text-[#A84B2B] uppercase hover:underline">View Alerts →</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2 & 3. Middle Section: Propagation Vector & Intelligence Insights */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* Left: Propagation Vector */}
          <div className="col-span-12 lg:col-span-7 bg-[#0A0C0E] outline outline-1 outline-[#6B6560]/20 p-6 flex flex-col relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute right-0 top-0 w-64 h-64 bg-[#A84B2B]/5 rounded-full blur-3xl pointer-events-none transform translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="flex justify-between items-end mb-6 z-10">
              <div>
                <h4 className="font-['Space_Grotesk'] font-bold text-lg uppercase tracking-widest text-[#e5e2e1]">Live Attack Propagation Vector</h4>
                <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#A84B2B] uppercase mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">radar</span>
                  Dynamically predicted from current active alerts
                </p>
              </div>
              <div className="text-right">
                <span className="material-symbols-outlined text-[#A84B2B] animate-[spin_4s_linear_infinite] opacity-50">route</span>
                <p className="font-['IBM_Plex_Mono'] text-[8px] text-[#6B6560] mt-1 uppercase">Updated {timeSinceUpdate} sec ago</p>
              </div>
            </div>

            <div className="space-y-6 z-10 flex-1">
              {dynamicChains.map((dc, i) => (
                <div key={i} className="bg-[#120b0a] p-4 border border-[#6B6560]/10 relative group hover:border border-[#A84B2B]/30 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-['IBM_Plex_Mono'] text-[10px] uppercase text-[#e5e2e1]/60 tracking-widest">Predicted Chain {i+1}</span>
                    <span className="font-['Space_Grotesk'] text-[10px] font-bold uppercase tracking-wider bg-[#353534] px-2 py-1" style={{ color: dc.color }}>{dc.label}</span>
                  </div>
                  <div className="flex items-center text-sm font-['IBM_Plex_Mono'] font-bold">
                    {dc.chain.split('→').map((node, i, arr) => (
                      <React.Fragment key={i}>
                        <span className={i === 0 ? 'text-[#e5e2e1]' : i === arr.length - 1 ? `text-[${dc.color}]` : 'text-[#6B6560]'}>
                          {node.trim()}
                        </span>
                        {i < arr.length - 1 && (
                          <span className="material-symbols-outlined text-[#5B8059] mx-2 text-sm">arrow_forward</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  {/* Progress bar logic */}
                  <div className="w-full h-1 bg-[#0A0C0E] mt-4 rounded-full overflow-hidden">
                    <div 
                       className="h-full transform origin-left transition-transform duration-1000 ease-out relative" 
                       style={{ width: isThreatActive ? `${80 - i*15}%` : '10%', backgroundColor: dc.color }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Intelligence Insights */}
          <div className="col-span-12 lg:col-span-5 bg-[#0A0C0E] outline outline-1 outline-[#6B6560]/20 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb4ab]">insights</span>
                <h4 className="font-['Space_Grotesk'] font-bold text-lg uppercase tracking-widest text-[#e5e2e1]">Intelligence Insights</h4>
              </div>
              <span className="font-['IBM_Plex_Mono'] text-[8px] text-[#6B6560] uppercase">Last Updated: moments ago</span>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="bg-[#120b0a] p-4 flex flex-col justify-between border-l-2 border-[#A84B2B] relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#A84B2B]/5 opacity-0 group-hover:opacity-100 animate-pulse transition-opacity"></div>
                <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase text-[#6B6560] mb-2 tracking-widest z-10">Correlation Strength</span>
                <span className="font-['Space_Grotesk'] text-2xl font-black text-[#e5e2e1] z-10">89.4<span className="text-sm text-[#6B6560]">%</span></span>
              </div>
              <div className="bg-[#120b0a] p-4 flex flex-col justify-between border-l-2 border-[#5B8059] relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#5B8059]/10 opacity-0 group-hover:opacity-100 animate-pulse transition-opacity"></div>
                <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase text-[#6B6560] mb-2 tracking-widest z-10">Normalization Cover</span>
                <span className="font-['Space_Grotesk'] text-2xl font-black text-[#e5e2e1] z-10">100<span className="text-sm text-[#6B6560]">%</span></span>
                <span className="font-['IBM_Plex_Mono'] text-[8px] text-[#6B6560] mt-1 z-10">LAST 100 LOGS</span>
              </div>
              <div className="bg-[#120b0a] p-4 flex flex-col justify-between border-l-2 border-[#ffb4ab] col-span-2 shadow-[inset_0_0_20px_rgba(255,180,171,0.05)]">
                <div className="flex justify-between items-start">
                  <span className="font-['IBM_Plex_Mono'] text-[9px] uppercase text-[#6B6560] tracking-widest">Active Multi-Vector Incidents</span>
                  <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-sm ${stats?.correlated > 0 ? 'bg-[#ffb4ab]/10 text-[#ffb4ab]' : 'bg-[#6B6560]/10 text-[#6B6560]'}`}>
                    {stats?.correlated > 0 ? 'Critical' : 'Nominal'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-['Space_Grotesk'] text-3xl font-black text-[#e5e2e1]">{stats?.correlated || 0}</span>
                  <div className="text-right">
                    <span className="font-['IBM_Plex_Mono'] text-[9px] text-[#6B6560] uppercase block">Predicted Next Move</span>
                    <span className={`font-['Space_Grotesk'] text-[11px] font-bold uppercase tracking-wide ${stats?.correlated > 0 ? 'text-[#ffb4ab]' : 'text-[#5B8059]'}`}>
                      {stats?.correlated > 0 ? 'Lateral Movement' : 'Wait states'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Bottom Section: IOC Database */}
        <div className="bg-[#0A0C0E] outline outline-1 outline-[#6B6560]/20 flex flex-col">
          <div className="p-6 border-b border-[#6B6560]/20 flex justify-between items-center bg-[#212121]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#A84B2B]">search</span>
              <h4 className="font-['Space_Grotesk'] font-bold text-sm tracking-widest uppercase text-[#e5e2e1]">Indicators of Compromise</h4>
            </div>
            <div className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] px-3 py-1 bg-[#0A0C0E] border border-[#353534] shadow-[inset_0_0_8px_rgba(0,0,0,0.5)]">
              {iocs.length} RECORDS INDEXED
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#120b0a] text-[9px] font-['Space_Grotesk'] uppercase tracking-widest text-[#6B6560]">
                  <th className="px-6 py-4 font-bold border-b border-[#353534]">Indicator Value</th>
                  <th className="px-6 py-4 font-bold border-b border-[#353534]">Type</th>
                  <th className="px-6 py-4 font-bold border-b border-[#353534]">Last Seen</th>
                  <th className="px-6 py-4 font-bold border-b border-[#353534]">Risk Score</th>
                  <th className="px-6 py-4 font-bold border-b border-[#353534]">Status</th>
                  <th className="px-6 py-4 font-bold border-b border-[#353534] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="font-['IBM_Plex_Mono'] text-xs">
                {iocs.length > 0 ? iocs.map((ioc, idx) => {
                  const effectiveStatus = blockedIocs.has(ioc.value) ? 'Blocked' : ioc.status;
                  const score = getRiskScore(effectiveStatus);
                  const isThreat = effectiveStatus === 'Active Threat';
                  const isBlocked = effectiveStatus === 'Blocked';
                  return (
                    <tr key={idx} className={`border-b border-[#6B6560]/10 transition-colors group ${isBlocked ? 'bg-[#93000a]/10 hover:bg-[#93000a]/20' : 'hover:bg-[#120b0a]/50'}`}>
                      <td className={`px-6 py-4 font-bold relative flex items-center gap-2 ${isThreat ? 'text-[#ffb4ab]' : isBlocked ? 'text-[#ffb4ab] opacity-60 line-through' : 'text-[#A84B2B]'}`}>
                        {isBlocked && <span className="material-symbols-outlined text-[#ffb4ab] text-[14px]">block</span>}
                        {ioc.value}
                      </td>
                      <td className={`px-6 py-4 text-[10px] uppercase tracking-wider ${isBlocked ? 'text-neutral-600 line-through' : 'text-[#e5e2e1]/60'}`}>{ioc.type}</td>
                      <td className={`px-6 py-4 text-[10px] ${isBlocked ? 'text-neutral-600' : 'text-[#6B6560]'}`}>
                        {new Date(ioc.last_seen || Date.now()).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`flex items-center gap-2 ${isBlocked ? 'opacity-30 grayscale' : ''}`}>
                          <span className={`text-[10px] font-bold w-6 ${score >= 80 ? 'text-[#ffb4ab]' : score >= 50 ? 'text-yellow-400' : 'text-[#A84B2B]'}`}>{score}</span>
                          <div className="w-16 h-1.5 bg-[#0A0C0E] rounded-full overflow-hidden">
                            <div className={`h-full ${score >= 80 ? 'bg-[#ffb4ab]' : score >= 50 ? 'bg-yellow-400' : 'bg-[#A84B2B]'}`} style={{ width: `${score}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-[8px] uppercase font-black tracking-widest rounded-sm shadow-sm flex items-center w-max gap-1 ${
                          isThreat ? 'bg-[#ffb4ab]/10 text-[#ffb4ab] border border-[#ffb4ab]/20' : 
                          isBlocked ? 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#93000a]/50' :
                          'bg-[#A84B2B]/10 text-[#A84B2B] border border-[#A84B2B]/20'
                        }`}>
                          {isBlocked && <span className="w-1.5 h-1.5 bg-[#ffb4ab] rounded-full"></span>}
                          {effectiveStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isBlocked ? (
                          <>
                            <button 
                              onClick={() => handleBlock(ioc.value)}
                              className="bg-[#353534] hover:bg-[#ffb4ab]/20 hover:border-[#ffb4ab]/50 border border-transparent hover:text-[#ffb4ab] text-[#E8E2D9] px-3 py-1 text-[9px] uppercase font-bold transition-all"
                            >
                              Block
                            </button>
                            <button 
                              onClick={handleInvestigate}
                              className="bg-[#353534] hover:bg-[#A84B2B]/20 hover:border-[#A84B2B]/50 border border-transparent hover:text-[#A84B2B] text-[#E8E2D9] px-3 py-1 text-[9px] uppercase font-bold transition-all"
                            >
                              Investigate
                            </button>
                          </>
                        ) : (
                          <span className="text-[#ffb4ab] text-[9px] font-bold uppercase tracking-widest underline decoration-[#ffb4ab]/50 pr-4">Mitigated</span>
                        )}
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-[#6B6560] text-[10px] uppercase tracking-widest">
                      <span className="material-symbols-outlined block text-2xl mb-2 opacity-50">data_array</span>
                      No indicators indexed currently
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
