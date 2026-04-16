import React from 'react';

const mitreMatrix = {
  'INITIAL ACCESS': [
    { id: 'T1190', label: 'EXPLOIT PUBLIC-FACING APP', active: false },
    { id: 'T1566', label: 'PHISHING', active: false },
    { id: 'T1133', label: 'EXTERNAL REMOTE SERVICES', active: false }
  ],
  'EXECUTION': [
    { id: 'T1059', label: 'COMMAND & SCRIPTING', active: true },
    { id: 'T1204', label: 'USER EXECUTION', active: false },
    { id: 'T1053', label: 'SCHEDULED TASK/JOB', active: false }
  ],
  'PERSISTENCE': [
    { id: 'T1098', label: 'ACCOUNT MANIPULATION', active: false },
    { id: 'T1547', label: 'BOOT/LOGON AUTORUN', active: false },
    { id: 'T1574', label: 'HIJACK EXECUTION FLOW', active: false }
  ],
  'PRIVILEGE ESC': [
    { id: 'T1548', label: 'ABUSE PRIVILEGE CONTROL', active: true },
    { id: 'T1068', label: 'EXPLOITATION FOR PRIV ESC', active: false },
    { id: 'T1055', label: 'PROCESS INJECTION', active: false }
  ],
  'DEFENSE EVASION': [
    { id: 'T1140', label: 'DEOBFUSCATE/DECODE', active: false },
    { id: 'T1070', label: 'INDICATOR REMOVAL', active: true, color: 'primary' },
    { id: 'T1562', label: 'IMPAIR DEFENSES', active: false }
  ]
};

const iocDatabase = [
  { value: '192.168.100.42', type: 'IPv4', lastSeen: '2024.05.21 14:22:01', status: 'Active Threat', statusClass: 'bg-[#93000a]/20 text-[#ffb4ab]' },
  { value: 'dc01.corp.internal', type: 'Domain', lastSeen: '2024.05.21 14:15:33', status: 'Monitored', statusClass: 'bg-[#98FB98]/10 text-[#98FB98]' },
  { value: 'sha256:8f2a...1e4c', type: 'File Hash', lastSeen: '2024.05.21 13:44:12', status: 'Blocked', statusClass: 'bg-[#93000a]/20 text-[#ffb4ab]' },
  { value: '/api/v1/auth/bypass', type: 'URL Path', lastSeen: '2024.05.21 12:01:05', status: 'Inactive', statusClass: 'bg-[#353534] text-[#e5e2e1]/40' },
  { value: '104.244.42.193', type: 'IPv4', lastSeen: '2024.05.21 11:58:22', status: 'Active Threat', statusClass: 'bg-[#93000a]/20 text-[#ffb4ab]' }
];

export default function Intelligence() {
  return (
    <div className="pt-10 pb-20 px-8 min-h-screen relative overflow-y-auto bg-[#131313] text-[#e5e2e1]">
      {/* Watermark Integration */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] flex items-center justify-center overflow-hidden z-0">
        <span className="text-[40rem] font-['Space_Grotesk'] font-black select-none -rotate-12 translate-x-20">ACDS</span>
      </div>

      <div className="relative z-10 flex-1 h-full">
        {/* Context Header */}
        <div className="mb-8">
          <h3 className="font-['Space_Grotesk'] font-bold text-4xl tracking-tighter uppercase">Tactical Coverage &amp; Active Observations</h3>
          <p className="font-['IBM_Plex_Mono'] text-xs text-[#b9ccb2] mt-2 tracking-widest">INTELLIGENCE_LAYER_V03.DATA_EXPORT</p>
        </div>

        {/* MITRE ATT&CK Matrix Grid */}
        <div className="grid grid-cols-5 gap-px bg-[#84967e]/10 mb-12">
          {Object.entries(mitreMatrix).map(([category, items], index) => (
            <div key={category} className="bg-[#1c1b1b] p-4">
              <div className="text-[10px] font-['IBM_Plex_Mono'] text-[#98FB98] mb-4 flex justify-between">
                <span>TA000{index + 1}</span>
                <span className="material-symbols-outlined text-xs">arrow_outward</span>
              </div>
              <h4 className="font-['Space_Grotesk'] font-bold text-sm tracking-widest mb-6">{category}</h4>
              <div className="space-y-2">
                {items.map(item => {
                  let borderColor = 'border-[#98FB98]/30';
                  if (item.active) borderColor = item.color === 'primary' ? 'border-[#98FB98]' : 'border-[#ffb4ab]';
                  return (
                    <div key={item.id} className={`bg-[#2a2a2a] p-3 text-[10px] font-['IBM_Plex_Mono'] border-l-2 ${borderColor}`}>
                      {item.id} {item.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Propagation & Indicators Layout */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* Propagation Vector Section */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-[#1c1b1b] p-6 outline outline-1 outline-[#3b4b37]/15">
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1 h-4 bg-[#98FB98]"></span>
                <h5 className="font-['Space_Grotesk'] font-bold text-sm tracking-widest uppercase">PROPAGATION_VECTOR</h5>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Cross-Site Scripting", percent: "42.8%", width: "42.8%", color: "#98FB98", bg: "bg-[#98FB98]" },
                  { label: "Insecure APIs", percent: "28.2%", width: "28.2%", color: "#98FB98", bg: "bg-[#98FB98]" },
                  { label: "SQL Injection", percent: "15.5%", width: "15.5%", color: "#ffb4ab", bg: "bg-[#ffb4ab]" },
                  { label: "Buffer Overflow", percent: "13.5%", width: "13.5%", color: "#98FB98", bg: "bg-[#98FB98]" },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between font-['IBM_Plex_Mono'] text-[10px] mb-2 uppercase">
                      <span>{item.label}</span>
                      <span style={{ color: item.color }}>{item.percent}</span>
                    </div>
                    <div className="h-1 bg-[#353534] w-full">
                      <div className={`h-full ${item.bg}`} style={{ width: item.width }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[#0e0e0e] p-6 border border-[#98FB98]/10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-['IBM_Plex_Mono'] text-[#e5e2e1]/40 tracking-widest">ANALYTICS_SNAPSHOT</p>
                <span className="material-symbols-outlined text-[#98FB98] text-lg">hub</span>
              </div>
              <div className="w-full h-24 bg-[#1c1b1b] flex items-center justify-center border border-[#84967e]/20 overflow-hidden relative">
                {/* Fallback pattern since image isn't loaded dynamically here */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#98FB98 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="font-['IBM_Plex_Mono'] text-[10px] text-[#98FB98] tracking-widest z-10">GRAPH_VISUALIZATION_ACTIVE</div>
              </div>
            </div>
          </div>

          {/* Indicators of Compromise Database */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-[#1c1b1b] outline outline-1 outline-[#3b4b37]/15 overflow-hidden">
              <div className="px-6 py-4 bg-[#2a2a2a] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#98FB98]">database</span>
                  <h5 className="font-['Space_Grotesk'] font-bold text-sm tracking-widest uppercase">INDICATORS OF COMPROMISE DATABASE</h5>
                </div>
                <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#e5e2e1]/50">ENTRY_COUNT: 4,021</span>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-[10px] font-['IBM_Plex_Mono'] text-[#e5e2e1]/40 uppercase tracking-widest text-left">
                      <th className="px-6 py-4 font-normal">Indicator Value</th>
                      <th className="px-6 py-4 font-normal">Type</th>
                      <th className="px-6 py-4 font-normal">Last Seen</th>
                      <th className="px-6 py-4 font-normal text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-['IBM_Plex_Mono']">
                    {iocDatabase.map((row, idx) => (
                      <tr key={idx} className="border-t border-[#84967e]/10 hover:bg-[#3a3939] transition-colors">
                        <td className="px-6 py-4 text-[#98FB98]">{row.value}</td>
                        <td className="px-6 py-4 text-[#e5e2e1]/60">{row.type}</td>
                        <td className="px-6 py-4 text-[#e5e2e1]/60">{row.lastSeen}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-0.5 ${row.statusClass} text-[9px] uppercase font-bold tracking-tighter`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="mt-8 flex gap-4">
              <div className="flex-1 bg-[#1c1b1b] p-4 outline outline-1 outline-[#3b4b37]/15 flex items-center justify-between">
                <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-widest text-[#e5e2e1]/40 uppercase">Global Signal Strength</span>
                <div className="flex gap-1 h-3 items-end">
                  <div className="w-1 bg-[#98FB98] h-full"></div>
                  <div className="w-1 bg-[#98FB98] h-3/4"></div>
                  <div className="w-1 bg-[#98FB98] h-5/6"></div>
                  <div className="w-1 bg-[#98FB98] h-2/3"></div>
                  <div className="w-1 bg-[#353534] h-full"></div>
                </div>
              </div>
              <div className="flex-1 bg-[#1c1b1b] p-4 outline outline-1 outline-[#3b4b37]/15 flex items-center justify-between">
                <span className="font-['IBM_Plex_Mono'] text-[10px] tracking-widest text-[#e5e2e1]/40 uppercase">Cluster Sync Status</span>
                <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#98FB98]">VERIFIED_SECURE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
