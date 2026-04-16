import React, { useState, useEffect } from 'react';

export default function DeployShield() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const initialLogs = [
      { time: '09:14:21', level: 'SYS', text: 'CORE_KERNEL_STABLE', type: 'info' },
      { time: '09:14:22', level: 'INFO', text: 'PACKET_FILTER_INITIALIZED', type: 'info' },
      { time: '09:14:22', level: 'INFO', text: 'ANALYZING_LATENCY_SPIKES... [OK]', type: 'info' },
      { time: '09:14:23', level: 'AUTH', text: 'SIG_ARCH_SECURE_HANDSHAKE_ESTABLISHED', type: 'info' },
      { time: '09:14:25', level: 'WARN', text: 'UNKNOWN_SIGNATURE_DETECTED_NODE_72', type: 'warn' },
      { time: '09:14:26', level: 'ACT', text: 'AUTOMATIC_ISOLATION_QUEUE_READY', type: 'info' },
      { time: '09:14:28', level: 'SYS', text: 'READY_FOR_SHIELD_OVERLAY_INJECTION', type: 'info' },
      { time: '09:14:29', level: 'SYS', text: 'WAITING_FOR_USER_CONFIRMATION...', type: 'info' },
      { time: '09:14:30', level: 'INFO', text: 'ALL_SUBSYSTEMS_GO', type: 'info' }
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < initialLogs.length) {
        setLogs(prev => [...prev, initialLogs[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="pt-10 pb-20 px-8 min-h-screen relative overflow-y-auto bg-[#131313] text-[#e5e2e1]">
      <div className="fixed bottom-10 right-10 pointer-events-none opacity-[0.02] select-none z-0">
        <h1 className="text-[12rem] font-['Space_Grotesk'] font-black leading-none">ACDS</h1>
      </div>

      <div className="relative z-10 h-full w-full max-w-6xl mx-auto grid grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: PROTOCOL & CONTROL */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          
          <section className="bg-[#1c1b1b] p-8 border-l-4 border-[#98FB98] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <span className="material-symbols-outlined text-[120px]">verified_user</span>
            </div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xs font-['IBM_Plex_Mono'] text-[#98FB98] mb-2 tracking-[0.2em]">PROTOCOL: DEPLOY_SHIELD_V4</h3>
                  <h4 className="text-4xl font-['Space_Grotesk'] font-black uppercase text-[#e5e2e1] leading-none">Authorization Required</h4>
                </div>
                <div className="flex gap-2">
                  <button className="bg-[#2a2a2a] px-3 py-1 text-[10px] font-['IBM_Plex_Mono'] hover:text-[#98FB98] transition-colors">RESET</button>
                  <button className="bg-[#2a2a2a] px-3 py-1 text-[10px] font-['IBM_Plex_Mono'] hover:text-[#98FB98] transition-colors">FILE MODE</button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  <div className="bg-[#0e0e0e] p-4 border-l border-[#98FB98]/20">
                    <p className="text-[11px] font-['IBM_Plex_Mono'] text-neutral-500 mb-1">CONTAINMENT ACTIONS</p>
                    <ul className="text-xs font-['IBM_Plex_Mono'] space-y-2 text-[#e5e2e1]">
                      {['ISOLATE_INFECTED_NODES', 'ENCRYPT_DATA_SILOS', 'ROTATE_ROOT_KEYS', 'FLUSH_DNS_CACHE'].map(action => (
                        <li key={action} className="flex items-center gap-2">
                          <span className="text-[#98FB98]">/</span> {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-[#0e0e0e] p-4 border-l border-[#98FB98]/20">
                    <p className="text-[11px] font-['IBM_Plex_Mono'] text-neutral-500 mb-1">API REFERENCE</p>
                    <code className="text-[11px] font-['IBM_Plex_Mono'] text-[#98FB98] block">POST /api/v4/defense/reset</code>
                    <code className="text-[11px] font-['IBM_Plex_Mono'] text-neutral-400 block mt-2">{'{ "auth": "SIG_ARCH_01", "force": true }'}</code>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-6 bg-[#3a3939] border border-[#98FB98]/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-[#98FB98] text-black">
                    <span className="material-symbols-outlined font-bold">gpp_maybe</span>
                  </div>
                  <div>
                    <p className="text-xs font-['IBM_Plex_Mono'] text-[#98FB98] uppercase">Sequence Status</p>
                    <p className="text-xl font-['Space_Grotesk'] font-bold text-[#e5e2e1]">PENDING CONFIRMATION</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="px-8 py-3 bg-[#131313] text-neutral-400 font-['Space_Grotesk'] font-bold uppercase tracking-widest text-sm hover:bg-[#1a1a1a] transition-all">ABORT SEQUENCE</button>
                  <button className="px-8 py-3 bg-[#98FB98] text-black font-['Space_Grotesk'] font-bold uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all">CONFIRM DEPLOYMENT</button>
                </div>
              </div>
            </div>
          </section>
          
          {/* NEURAL LOG FEED */}
          <section className="bg-[#1c1b1b] flex-1 flex flex-col min-h-[300px]">
            <div className="px-6 py-3 border-b border-[#84967e]/20 flex justify-between items-center">
              <span className="text-xs font-['IBM_Plex_Mono'] text-neutral-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#5B8059] animate-pulse"></span>
                NEURAL LOG FEED
              </span>
              <span className="text-[10px] font-['IBM_Plex_Mono'] text-neutral-600 uppercase">SYS_MONITOR_ACTIVE</span>
            </div>
            <div className="flex-1 p-6 font-['IBM_Plex_Mono'] text-[11px] leading-relaxed overflow-y-auto space-y-1 no-scrollbar">
              {logs.map((log, idx) => (
                <p key={idx} className={log.type === 'warn' ? 'text-[#ffb4ab]' : 'text-neutral-300'}>
                  [{log.time}] <span className={log.type === 'warn' ? 'text-[#ffb4ab]' : 'text-[#98FB98]'}>{log.level}:</span> {log.text}
                </p>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: MATRIX & STATUS */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          
          <section className="bg-[#1c1b1b] p-6 flex flex-col h-1/2">
            <h3 className="text-xs font-['IBM_Plex_Mono'] text-neutral-400 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-xs">grid_view</span>
              STRUCTURAL DEFENSE MATRIX
            </h3>
            <div className="flex-1 grid grid-cols-4 grid-rows-4 gap-2 relative">
              {Array.from({ length: 16 }).map((_, i) => {
                if (i === 5) {
                  return (
                    <div key={i} className="bg-[#93000a]/20 border border-[#ffb4ab]/40 relative flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#ffb4ab] text-xs">close</span>
                    </div>
                  );
                }
                const isBright = [0,1,3,6,8,9,10,11,14].includes(i);
                return (
                   <div key={i} className={`${isBright ? 'bg-[#98FB98]/20 border-[#98FB98]/40' : 'bg-[#98FB98]/5 border-neutral-800'} border`}></div>
                );
              })}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#98FB98]/5 to-transparent h-4 animate-pulse pointer-events-none"></div>
            </div>
            <div className="mt-4 flex justify-between text-[10px] font-['IBM_Plex_Mono'] text-neutral-500">
              <span>NODE_72_ERR</span>
              <span>LATENCY: 12ms</span>
            </div>
          </section>

          <section className="bg-[#1c1b1b] p-6 flex-1 border border-[#84967e]/30 flex flex-col justify-center items-center text-center">
            <div className="mb-6 relative">
              <div className="w-24 h-24 rounded-full border-4 border-[#98FB98]/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-[#98FB98]">verified_user</span>
              </div>
              <div className="absolute inset-0 w-24 h-24 rounded-full border border-[#98FB98]/50 animate-ping"></div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-['IBM_Plex_Mono'] text-[#98FB98] uppercase tracking-widest">Execution Status</p>
              <h5 className="text-2xl font-['Space_Grotesk'] font-black text-[#e5e2e1]">SHIELD ACTIVE</h5>
              <p className="text-[10px] font-['IBM_Plex_Mono'] text-neutral-500 mt-2">SYSTEM RESET COMPLETE / ENCRYPT_ALL_LEVEL_1</p>
            </div>
            <div className="mt-8 w-full bg-[#353534] p-4 flex items-center justify-between">
              <div className="text-left">
                <p className="text-[9px] font-['IBM_Plex_Mono'] text-neutral-500 uppercase">Uptime</p>
                <p className="text-xs font-['IBM_Plex_Mono'] text-[#98FB98]">00:00:12:04</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-['IBM_Plex_Mono'] text-neutral-500 uppercase">Threat Level</p>
                <p className="text-xs font-['IBM_Plex_Mono'] text-[#98FB98]">ZERO</p>
              </div>
            </div>
          </section>
          
        </div>
      </div>
    </div>
  );
}
