export default function Settings() {

  return (
    <div className="pt-8 pb-16 px-8 min-h-screen bg-[#131313] relative overflow-y-auto">
      {/* Background Watermark */}
      <div className="absolute top-1/4 left-1/4 opacity-[0.02] pointer-events-none select-none">
        <span className="font-['Space_Grotesk'] font-black text-[20rem] leading-none text-[#e5e2e1]">ACDS</span>
      </div>

      {/* Page Header */}
      <div className="flex items-baseline justify-between mb-10 mt-8 relative z-10">
        <div>
          <h2 className="font-['Space_Grotesk'] text-5xl font-black tracking-tight text-[#e5e2e1] mb-2">Settings</h2>
          <div className="flex items-center gap-3">
            <span className="font-['IBM_Plex_Mono'] text-xs text-[#5B8059] py-1 px-2 bg-[#98FB98]/5 border border-[#98FB98]/10">config.py</span>
            <span className="h-[1px] w-12 bg-[#84967e]/30"></span>
            <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#b9ccb2] tracking-widest uppercase">System Core Configuration</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-6 py-2 bg-[#1c1b1b] border border-[#84967e]/20 font-['IBM_Plex_Mono'] text-[10px] tracking-tighter text-[#e5e2e1] hover:bg-[#2a2a2a] transition-colors uppercase">RESET_DEFAULTS</button>
          <button className="px-6 py-2 bg-[#98FB98] text-[#1a2b1a] font-['IBM_Plex_Mono'] text-[10px] font-bold tracking-tighter hover:shadow-[0_0_15px_rgba(152, 251, 152, 0.3)] transition-all uppercase">SAVE_CHANGES</button>
        </div>
      </div>

      {/* Settings Bento Grid */}
      <div className="grid grid-cols-12 gap-6 relative z-10 mb-20 text-[#e5e2e1]">
        
        {/* Section 01: Detection Thresholds */}
        <section className="col-span-12 lg:col-span-8 bg-[#1c1b1b] p-8 border border-[#84967e]/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-['Space_Grotesk'] text-xl font-bold tracking-tight flex items-center gap-3 text-[#e5e2e1]">
              <span className="w-1.5 h-6 bg-[#98FB98]"></span>
              SECTION_01 <span className="text-[#b9ccb2] font-medium">Detection Thresholds</span>
            </h3>
            <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#84967e]">v4.0.2-ALPHA</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="space-y-2">
              <label className="block font-['IBM_Plex_Mono'] text-[10px] text-[#b9ccb2] tracking-widest uppercase">BRUTE_FORCE_THRESHOLD</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 w-1 h-full bg-[#98FB98] scale-y-0 group-focus-within:scale-y-100 transition-transform"></div>
                <input className="w-full bg-[#0e0e0e] border-none py-3 px-4 font-['IBM_Plex_Mono'] text-[#98FB98] focus:ring-0 outline-none" type="number" defaultValue="5" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-['IBM_Plex_Mono'] text-[#84967e]/50 uppercase">attempts</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-['IBM_Plex_Mono'] text-[10px] text-[#b9ccb2] tracking-widest uppercase">BRUTE_FORCE_WINDOW_SEC</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 w-1 h-full bg-[#98FB98] scale-y-0 group-focus-within:scale-y-100 transition-transform"></div>
                <input className="w-full bg-[#0e0e0e] border-none py-3 px-4 font-['IBM_Plex_Mono'] text-[#98FB98] focus:ring-0 outline-none" type="number" defaultValue="60" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-['IBM_Plex_Mono'] text-[#84967e]/50 uppercase">seconds</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-['IBM_Plex_Mono'] text-[10px] text-[#b9ccb2] tracking-widest uppercase">BEACON_INTERVAL_VARIANCE</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 w-1 h-full bg-[#98FB98] scale-y-0 group-focus-within:scale-y-100 transition-transform"></div>
                <input className="w-full bg-[#0e0e0e] border-none py-3 px-4 font-['IBM_Plex_Mono'] text-[#98FB98] focus:ring-0 outline-none" type="text" defaultValue="0.15" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-['IBM_Plex_Mono'] text-[#84967e]/50 uppercase">float</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-['IBM_Plex_Mono'] text-[10px] text-[#b9ccb2] tracking-widest uppercase">EXFIL_THRESHOLD_BYTES</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 w-1 h-full bg-[#98FB98] scale-y-0 group-focus-within:scale-y-100 transition-transform"></div>
                <input className="w-full bg-[#0e0e0e] border-none py-3 px-4 font-['IBM_Plex_Mono'] text-[#98FB98] focus:ring-0 outline-none" type="number" defaultValue="10485760" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-['IBM_Plex_Mono'] text-[#84967e]/50 uppercase">bytes</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-['IBM_Plex_Mono'] text-[10px] text-[#b9ccb2] tracking-widest uppercase">CORRELATION_WINDOW_SEC</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 w-1 h-full bg-[#98FB98] scale-y-0 group-focus-within:scale-y-100 transition-transform"></div>
                <input className="w-full bg-[#0e0e0e] border-none py-3 px-4 font-['IBM_Plex_Mono'] text-[#98FB98] focus:ring-0 outline-none" type="number" defaultValue="300" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-['IBM_Plex_Mono'] text-[#84967e]/50 uppercase">seconds</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-['IBM_Plex_Mono'] text-[10px] text-[#b9ccb2] tracking-widest uppercase">GEMINI_RATE_LIMIT_SEC</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 w-1 h-full bg-[#98FB98] scale-y-0 group-focus-within:scale-y-100 transition-transform"></div>
                <input className="w-full bg-[#0e0e0e] border-none py-3 px-4 font-['IBM_Plex_Mono'] text-[#98FB98] focus:ring-0 outline-none" type="number" defaultValue="10" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-['IBM_Plex_Mono'] text-[#84967e]/50 uppercase">requests</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 03: API & Input Mode */}
        <section className="col-span-12 lg:col-span-4 bg-[#1c1b1b] p-8 border border-[#84967e]/10 flex flex-col">
          <div className="mb-8">
            <h3 className="font-['Space_Grotesk'] text-xl font-bold tracking-tight flex items-center gap-3 text-[#e5e2e1]">
              <span className="w-1.5 h-6 bg-[#98FB98]"></span>
              SECTION_03 <span className="text-[#b9ccb2] font-medium">API &amp; Mode</span>
            </h3>
          </div>
          {/* Gemini API Key only */}
          <div className="space-y-2">
            <label className="block font-['IBM_Plex_Mono'] text-[10px] text-[#b9ccb2] tracking-widest uppercase">GEMINI_API_KEY</label>
            <div className="relative group">
              <input className="w-full bg-[#0e0e0e] border-none py-3 px-4 font-['IBM_Plex_Mono'] text-[#98FB98] focus:ring-0 outline-none pr-12" type="password" defaultValue="AIzaSyB3X_589X-Yp7ZlQ9m2k0j1h4g3f2e1d" />
              <button className="absolute right-4 top-1/2 -translate-y-1/2 text-[#84967e] hover:text-[#98FB98] transition-colors">
                <span className="material-symbols-outlined text-lg" style={{ verticalAlign: 'middle', fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}>visibility</span>
              </button>
            </div>
            <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#84967e]/60 mt-2">Used for AI Playbook generation on Critical threats.</p>
          </div>
        </section>

        {/* Section 02: Admin Whitelist */}
        <section className="col-span-12 lg:col-span-8 bg-[#1c1b1b] p-8 border border-[#84967e]/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-['Space_Grotesk'] text-xl font-bold tracking-tight flex items-center gap-3 text-[#e5e2e1]">
              <span className="w-1.5 h-6 bg-[#98FB98]"></span>
              SECTION_02 <span className="text-[#b9ccb2] font-medium">Admin Whitelist</span>
            </h3>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#2a2a2a] border border-[#84967e]/10">
              <span className="material-symbols-outlined text-xs text-[#98FB98]" style={{ verticalAlign: 'middle' }}>verified_user</span>
              <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#b9ccb2] uppercase">Currently 2 whitelisted hosts active</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="bg-[#0e0e0e] border border-[#98FB98]/20 px-4 py-2 flex items-center gap-4 group">
                <span className="font-['IBM_Plex_Mono'] text-sm text-[#98FB98]">192.168.1.1</span>
                <button className="text-[#84967e] hover:text-[#ffb4ab] transition-colors">
                  <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>close</span>
                </button>
              </div>
              <div className="bg-[#0e0e0e] border border-[#98FB98]/20 px-4 py-2 flex items-center gap-4 group">
                <span className="font-['IBM_Plex_Mono'] text-sm text-[#98FB98]">10.0.0.12</span>
                <button className="text-[#84967e] hover:text-[#ffb4ab] transition-colors">
                  <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>close</span>
                </button>
              </div>
              <button className="bg-[#2a2a2a] border border-[#84967e]/20 px-4 py-2 font-['IBM_Plex_Mono'] text-[10px] tracking-widest uppercase text-[#e5e2e1] hover:bg-[#98FB98] hover:text-black transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>add</span>
                ADD IP ADDRESS
              </button>
            </div>
            <p className="font-['Inter'] text-[10px] text-[#84967e]/60 mt-4 italic leading-relaxed">
              Note: Whitelisted hosts are exempt from behavioral analysis and threshold-based locking. Use with extreme caution as this bypasses the ACDS neural engine filters.
            </p>
          </div>
        </section>

        {/* Critical Notice Section */}
        <section className="col-span-12 lg:col-span-4 bg-[#93000a]/10 border border-[#ffb4ab]/20 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-7xl text-[#ffb4ab]" style={{ verticalAlign: 'middle' }}>warning</span>
          </div>
          <h3 className="font-['Space_Grotesk'] text-xl font-black text-[#ffb4ab] mb-4 flex items-center gap-3 uppercase italic">
            Critical Notice
          </h3>
          <div className="space-y-4 relative z-10 text-[#e5e2e1]">
            <p className="font-['IBM_Plex_Mono'] text-xs leading-relaxed">
              Unauthorized modification of threshold values may lead to false negatives or system instability.
            </p>
            <div className="h-[1px] w-full bg-[#ffb4ab]/20"></div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#ffb4ab] text-sm mt-0.5" style={{ verticalAlign: 'middle' }}>chevron_right</span>
                <span className="font-['Inter'] text-[10px] uppercase tracking-wider text-[#ffb4ab]/80 font-bold">Log all changes to ACDS_SEC_AUDIT</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#ffb4ab] text-sm mt-0.5" style={{ verticalAlign: 'middle' }}>chevron_right</span>
                <span className="font-['Inter'] text-[10px] uppercase tracking-wider text-[#ffb4ab]/80 font-bold">Require Level 4 Clearance for Exfil resets</span>
              </li>
            </ul>
          </div>
        </section>
      </div>

    </div>
  );
}
