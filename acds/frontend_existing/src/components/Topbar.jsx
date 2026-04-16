import React from 'react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { resetSystem } = useSocket();
  const navigate = useNavigate();

  return (
    <header className="h-20 bg-[#131313]/60 backdrop-blur-xl flex justify-between items-center px-8 z-40 shrink-0 border-b border-[#84967e]/10 relative z-50">
      <div className="flex items-center gap-6">
        <h2 className="font-['Space_Grotesk'] font-bold text-lg uppercase text-[#98FB98]">ACDS — AI Cyber Defense System</h2>
        <div className="h-4 w-px bg-neutral-800"></div>
        <div className="flex items-center gap-2 text-[#98FB98] font-['IBM_Plex_Mono'] text-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#98FB98] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#98FB98]"></span>
          </span>
          LIVE FEED ACTIVE
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/deploy')}
          className="px-4 py-2 bg-[#98FB98] text-[#1a2b1a] font-['Space_Grotesk'] font-bold text-sm uppercase hover:bg-[#ebffe2] transition-all cursor-crosshair">
          DEPLOY SHIELD
        </button>
        <button className="px-4 py-2 border border-neutral-700 text-neutral-400 font-['Space_Grotesk'] font-bold text-sm uppercase hover:bg-neutral-800 transition-all cursor-crosshair">
          LOGS
        </button>
        <span className="material-symbols-outlined text-[#98FB98]" style={{ verticalAlign: 'middle' }}>signal_cellular_alt</span>
      </div>
    </header>
  );
}
