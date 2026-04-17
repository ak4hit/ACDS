import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-[#1c1b1b] flex flex-col py-8 z-50 h-screen shrink-0 border-r-0">
      <div className="px-6 mb-12">
        <h1 className="font-['Space_Grotesk'] font-black text-[#98FB98] tracking-widest text-xl">ACDS PLATFORM</h1>
        <p className="font-['IBM_Plex_Mono'] uppercase tracking-tighter text-[10px] text-neutral-500 mt-1">ACDS LOGO</p>
      </div>
      <nav className="flex-1 space-y-1">
        <NavLink 
          to="/blueprints" 
          className={({isActive}) => `flex items-center px-6 py-4 font-['IBM_Plex_Mono'] uppercase tracking-tighter text-xs ${isActive ? "text-[#ebffe2] bg-[#3a3939] border-l-2 border-[#98FB98]" : "text-neutral-500 hover:text-[#98FB98] hover:bg-[#2a2a2a] transition-all duration-75"}`}
        >
          <span className="material-symbols-outlined mr-4" style={{ verticalAlign: 'middle' }}>architecture</span>
          BLUEPRINTS
        </NavLink>
        <NavLink 
          to="/threats" 
          className={({isActive}) => `flex items-center px-6 py-4 font-['IBM_Plex_Mono'] uppercase tracking-tighter text-xs ${isActive ? "text-[#ebffe2] bg-[#3a3939] border-l-2 border-[#98FB98]" : "text-neutral-500 hover:text-[#98FB98] hover:bg-[#2a2a2a] transition-all duration-75"}`}
        >
          <span className="material-symbols-outlined mr-4" style={{ verticalAlign: 'middle' }}>security</span>
          THREATS
        </NavLink>
        <NavLink 
          to="/intelligence" 
          className={({isActive}) => `flex items-center px-6 py-4 font-['IBM_Plex_Mono'] uppercase tracking-tighter text-xs ${isActive ? "text-[#ebffe2] bg-[#3a3939] border-l-2 border-[#98FB98]" : "text-neutral-500 hover:text-[#98FB98] hover:bg-[#2a2a2a] transition-all duration-75"}`}
        >
          <span className="material-symbols-outlined mr-4" style={{ verticalAlign: 'middle' }}>psychology</span>
          INTELLIGENCE
        </NavLink>
        <NavLink 
          to="/archives" 
          className={({isActive}) => `flex items-center px-6 py-4 font-['IBM_Plex_Mono'] uppercase tracking-tighter text-xs ${isActive ? "text-[#ebffe2] bg-[#3a3939] border-l-2 border-[#98FB98]" : "text-neutral-500 hover:text-[#98FB98] hover:bg-[#2a2a2a] transition-all duration-75"}`}
        >
          <span className="material-symbols-outlined mr-4" style={{ verticalAlign: 'middle' }}>inventory_2</span>
          ARCHIVES
        </NavLink>
      </nav>
      <div className="mt-auto px-6 space-y-4">
        <NavLink 
          to="/settings" 
          className={({isActive}) => `flex items-center py-4 font-['IBM_Plex_Mono'] uppercase tracking-tighter text-xs ${isActive ? "text-[#ebffe2]" : "text-neutral-500 hover:text-[#98FB98] transition-all duration-75"}`}
        >
          <span className="material-symbols-outlined mr-4" style={{ verticalAlign: 'middle' }}>settings</span>
          SETTINGS
        </NavLink>
        
        <div className="bg-[#0e0e0e] p-4 border border-[#84967e]/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-['IBM_Plex_Mono'] text-neutral-500">SYSTEM HEALTH</span>
            <span className="text-[10px] font-['IBM_Plex_Mono'] text-[#98FB98]">98.4%</span>
          </div>
          <div className="h-1 bg-[#131313] w-full">
            <div className="h-1 bg-[#98FB98] w-[98.4%]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
