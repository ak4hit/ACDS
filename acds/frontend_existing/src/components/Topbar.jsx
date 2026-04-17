import React from 'react';
import { useSocket } from '../context/SocketContext';

export default function Topbar() {
  const { resetSystem } = useSocket();

  return (
    <header className="h-20 bg-[#0A0C0E]/60 backdrop-blur-xl flex justify-between items-center px-8 z-40 shrink-0 border-b border-[#6B6560]/10 relative z-50">
      <div className="flex items-center gap-6">
        <h2 className="font-['Space_Grotesk'] font-bold text-lg uppercase text-[#A84B2B]">ACDS — AI Cyber Defense System</h2>
        <div className="h-4 w-px bg-[#A84B2B]/10"></div>
        <div className="flex items-center gap-2 text-[#A84B2B] font-['IBM_Plex_Mono'] text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A84B2B] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A84B2B]"></span>
          </span>
          LIVE FEED ACTIVE
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="px-4 py-2 border border-[#6B6560]/30 text-[#E8E2D9] font-['Space_Grotesk'] font-bold text-sm uppercase hover:bg-[#A84B2B]/10 transition-all cursor-crosshair">
          LOGS
        </button>
        <span className="material-symbols-outlined text-[#A84B2B]" style={{ verticalAlign: 'middle' }}>signal_cellular_alt</span>
      </div>
    </header>
  );
}
