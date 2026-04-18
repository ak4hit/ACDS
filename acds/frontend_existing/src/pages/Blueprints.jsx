import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import Globe from 'react-globe.gl';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const API = `http://${window.location.hostname}:8000`;

// ── Smooth animated counter ───────────────────────────────────────────────
function useAnimatedCounter(target, duration = 400) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  const raf  = useRef(null);

  useEffect(() => {
    if (target === prev.current) return;
    const from  = prev.current;
    const delta = target - from;
    const start = performance.now();
    prev.current = target;

    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + delta * eased));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return display;
}

const formatTime = (ts) =>
  new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ── Lightweight Custom Virtual List ─────────────────────────────────────────
const VirtualList = ({ items, itemHeight, containerHeight, renderItem, emptyState }) => {
  const [scrollTop, setScrollTop] = useState(0);

  if (!items || items.length === 0) {
    return <div style={{ height: containerHeight }}>{emptyState}</div>;
  }

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
  const endIndex = Math.min(items.length - 1, startIndex + Math.ceil(containerHeight / itemHeight) + 4);

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push(
      renderItem({ index: i, style: { position: 'absolute', top: i * itemHeight, width: '100%', height: itemHeight } })
    );
  }

  return (
    <div
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
      className="no-scrollbar"
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
};

// Server-side geolocation proxy
const geoCache = {};
function clearGeoCache() { Object.keys(geoCache).forEach(k => delete geoCache[k]); }
async function fetchGeo(ip) {
  if (geoCache[ip]) return geoCache[ip];
  try {
    const res = await fetch(`${API}/geo/${ip}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.lat !== null && data.lon !== null) {
      const result = {
        lat: data.lat,
        lon: data.lon,
        city: data.city || 'Unknown',
        country: data.country || 'Unknown',
        isp: data.isp || ''
      };
      geoCache[ip] = result;
      return result;
    }
  } catch (_) {}
  return null;
}

export default function Blueprints() {
  const { alerts, stats, resetSystem } = useSocket();

  // Animated KPI counters
  const animTotal    = useAnimatedCounter(stats.total        ?? 0);
  const animCritical = useAnimatedCounter(stats.critical     ?? 0);
  const animFP       = useAnimatedCounter(stats.false_positives ?? 0);
  const animCorr     = useAnimatedCounter(stats.correlated   ?? 0);

  const [activeAlert, setActiveAlert] = useState(null);
  const [globePoints, setGlobePoints] = useState([]);
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [monitorStatus, setMonitorStatus] = useState({ current_file: 0, total_files: 100, progress_pct: 0 });
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const fileInputRef = useRef(null);
  const globeRef = useRef(null);
  const prevAlertCount = useRef(0);

  // ── Clear all local state on system reset ───────────────────────
  useEffect(() => {
    const handleReset = () => {
      setActiveAlert(null);
      setUploadResult(null);
      setGlobePoints([]);
      prevAlertCount.current = 0;
      clearGeoCache();
    };
    window.addEventListener('acds-reset', handleReset);
    return () => window.removeEventListener('acds-reset', handleReset);
  }, []);

  // ── Auto-select first alert ──────────────────────────────────────
  useEffect(() => {
    if (alerts.length > 0 && !activeAlert) setActiveAlert(alerts[0]);
    if (alerts.length > prevAlertCount.current && alerts.length > 0) {
      setActiveAlert(alerts[0]);
    }
    prevAlertCount.current = alerts.length;
  }, [alerts]);

  // ── Resolve IP → geo for globe ───────────────────────────────────
  useEffect(() => {
    const resolvePoints = async () => {
      const seen = new Set();
      const pts = [];
      for (const alert of alerts.slice(0, 60)) {
        const ip = alert.src_ip;
        if (!ip || seen.has(ip)) continue;
        seen.add(ip);
        const geo = await fetchGeo(ip);
        if (geo) {
          pts.push({
            lat: geo.lat,
            lng: geo.lon,
            label: `${ip} — ${geo.city}, ${geo.country}`,
            ip,
            city: geo.city,
            country: geo.country,
            isp: geo.isp,
            severity: alert.severity,
            color: '#ff3333',
          });
        }
      }
      setGlobePoints(pts);
    };
    resolvePoints();
  }, [alerts.length]);

  // ── Auto-rotate globe ────────────────────────────────────────────
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.0;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = true;
    }
  }, [globeRef.current]);

  const [analysisMode, setAnalysisMode] = useState('standby'); // 'synthetic', 'live', or 'standby'
  const [transitionMsg, setTransitionMsg] = useState(null);

  // ── Mode Toggles ───────────────────────────────────────────────
  useEffect(() => {
    // Check initial state or set it
    // Wait for the server, skip auto-start initially to let user press it
  }, []);

  const setLiveMode = () => {
    if (analysisMode === 'live') {
      fetch(`${API}/monitor/stop`, { method: 'POST' }).catch(() => {});
      resetSystem();
      return;
    }
    setTransitionMsg('Switching to Live Analysis...');
    fetch(`${API}/monitor/stop`, { method: 'POST' }).catch(() => {});
    
    setTimeout(() => {
      setAnalysisMode('live');
      setTransitionMsg(null);
    }, 1000);
  };

  const setSyntheticMode = () => {
    if (analysisMode === 'synthetic') {
      fetch(`${API}/monitor/stop`, { method: 'POST' }).catch(() => {});
      resetSystem();
      return;
    }
    setTransitionMsg('Initializing High-Speed Data Stream...');
    fetch(`${API}/monitor/start`, { method: 'POST' }).catch(() => {});
    
    setTimeout(() => {
      setAnalysisMode('synthetic');
      setTransitionMsg(null);
    }, 1000);
  };

  const resetMonitor = async () => {
    await fetch(`${API}/monitor/reset`, { method: 'POST' });
    setMonitorStatus(s => ({ ...s, current_file: 0, progress_pct: 0 }));
    if (analysisMode === 'synthetic') {
      await fetch(`${API}/monitor/start`, { method: 'POST' });
    }
  };



  // ── File upload ──────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${API}/upload`, {
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type — browser sets it with boundary automatically
      });
      const data = await res.json();
      setUploadResult(data);
    } catch (e) {
      setUploadResult({ status: 'error', message: String(e) });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const onDropZone = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // ── Chart config ─────────────────────────────────────────────────
  const chartLabels = ['BruteForce', 'C2Beacon', 'Exfil', 'Correlated'];
  const countByType = chartLabels.map(t =>
    alerts.filter(a => a.type?.toLowerCase().includes(t.toLowerCase().slice(0, 6))).length
  );

  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Detections',
      data: countByType.map(c => c || 0),
      backgroundColor: ['#A84B2B', '#5B8059', '#ffb4ab', '#6B6560'],
      borderRadius: 2,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6B6560', font: { family: 'IBM Plex Mono', size: 8 } } },
      y: { display: false }
    }
  };

  return (
    <div className="pt-10 pb-20 px-8 min-h-screen relative overflow-y-auto bg-[#0A0C0E] text-[#e5e2e1]">
      {/* Watermark */}
      <div className="fixed bottom-10 right-10 opacity-[0.02] pointer-events-none z-0">
        <h1 className="font-['Space_Grotesk'] font-black text-[12rem] tracking-tighter">ACDS</h1>
      </div>

      <div className="relative z-10">
        {/* ── Header Row ── */}
        <div className="flex justify-between items-start mb-8 gap-6">
          <div className="flex gap-3 flex-wrap">
            {/* Reset Button */}
            <button
              id="blueprints-reset-btn"
              onClick={resetSystem}
              className="flex items-center gap-2 bg-[#120b0a] px-4 py-2 text-xs font-['IBM_Plex_Mono'] uppercase tracking-widest text-[#e5e2e1] hover:bg-[#1e110d] transition-all"
            >
              <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>refresh</span>
              Reset
            </button>

            {/* ── ANALYSIS MODE TOGGLES ── */}
            <div className="flex gap-2">
              <button
                onClick={setSyntheticMode}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-['IBM_Plex_Mono'] uppercase tracking-widest transition-all border ${
                  analysisMode === 'synthetic'
                    ? 'bg-[#A84B2B]/20 border-[#A84B2B] text-[#A84B2B]'
                    : 'bg-[#120b0a] border-[#6B6560]/30 text-[#6B6560] hover:border-[#A84B2B]/40 hover:text-[#e5e2e1]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${analysisMode === 'synthetic' ? 'bg-[#A84B2B] animate-pulse' : 'bg-[#6B6560]/50'}`} />
                Synthetic Analysis
              </button>

              <button
                onClick={setLiveMode}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-['IBM_Plex_Mono'] uppercase tracking-widest transition-all border ${
                  analysisMode === 'live'
                    ? 'bg-[#5B8059]/20 border-[#5B8059] text-[#5B8059]'
                    : 'bg-[#120b0a] border-[#6B6560]/30 text-[#6B6560] hover:border-[#5B8059]/40 hover:text-[#e5e2e1]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${analysisMode === 'live' ? 'bg-[#5B8059] animate-pulse' : 'bg-[#6B6560]/50'}`} />
                Live Analysis
              </button>
            </div>

            {/* Reset scan */}
            {monitorStatus.current_file > 0 && (
              <button
                onClick={resetMonitor}
                className="flex items-center gap-2 bg-[#120b0a] px-3 py-2 text-xs font-['IBM_Plex_Mono'] uppercase tracking-widest text-[#6B6560] hover:text-[#ffb4ab] transition-all"
              >
                <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>restart_alt</span>
                Rescan
              </button>
            )}

            {/* Upload zone */}
            <div
              id="blueprints-upload-zone"
              onDragOver={e => e.preventDefault()}
              onDrop={onDropZone}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-[#120b0a] border border-dashed border-[#6B6560]/40 px-4 py-2 text-xs font-['IBM_Plex_Mono'] uppercase tracking-widest text-[#6B6560] hover:border-[#A84B2B]/60 hover:text-[#A84B2B] cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>
                {uploading ? 'hourglass_empty' : 'upload_file'}
              </span>
              {uploading ? 'Parsing...' : 'Upload JSON / Log'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.log,.ndjson,.jsonl"
              onChange={onFileInputChange}
              className="hidden"
            />

            {/* Upload result badge */}
            {uploadResult && (
              <div className={`flex items-center gap-2 px-3 py-2 text-xs font-['IBM_Plex_Mono'] uppercase ${
                uploadResult.status === 'processed' ? 'text-[#A84B2B] bg-[#A84B2B]/10' : 'text-[#ffb4ab] bg-[#ffb4ab]/10'
              }`}>
                {uploadResult.status === 'processed'
                  ? `✓ ${uploadResult.findings} threats from ${uploadResult.filename}`
                  : `✗ ${uploadResult.message || 'Parse error'}`}
              </div>
            )}
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#0A0C0E] p-4 border-l-2 border-[#6B6560]/20">
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">TOTAL EVENTS</p>
              <h3 className="text-2xl font-['Space_Grotesk'] font-black text-[#e5e2e1]">{animTotal}</h3>
            </div>
            <div className="bg-[#0A0C0E] p-4 border-l-2 border-[#ffb4ab]/40">
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">CRITICAL</p>
              <h3 className="text-2xl font-['Space_Grotesk'] font-black text-[#ffb4ab]">{animCritical}</h3>
            </div>
            <div className="bg-[#0A0C0E] p-4 border-l-2 border-[#6B6560]/20">
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">FALSE POS.</p>
              <h3 className="text-2xl font-['Space_Grotesk'] font-black text-[#e5e2e1]">{animFP}</h3>
            </div>
            <div className="bg-[#0A0C0E] p-4 border-l-2 border-[#5B8059]/40">
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560] uppercase tracking-widest mb-1">CORRELATED</p>
              <h3 className="text-2xl font-['Space_Grotesk'] font-black text-[#5B8059]">{animCorr}</h3>
            </div>
          </div>
        </div>

        {/* ── Status Banner ── */}
        <div className="mb-8">
          <div className={`p-4 border flex items-center gap-4 font-['IBM_Plex_Mono'] text-xs uppercase tracking-widest transition-all ${
            transitionMsg 
              ? 'border-[#6B6560]/50 text-[#e5e2e1] bg-[#120b0a]' 
              : analysisMode === 'synthetic' 
                ? 'border-[#A84B2B]/40 text-[#A84B2B] bg-[#A84B2B]/10' 
                : analysisMode === 'live'
                  ? 'border-[#5B8059]/40 text-[#5B8059] bg-[#5B8059]/10'
                  : 'border-[#6B6560]/20 text-[#6B6560] bg-[#120b0a]'
          }`}>
            {transitionMsg ? (
              <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> {transitionMsg}</>
            ) : analysisMode === 'synthetic' ? (
              <><span className="w-2.5 h-2.5 rounded-full bg-[#A84B2B] animate-pulse"></span> SYNTHETIC ANALYSIS MODE ACTIVE</>
            ) : analysisMode === 'live' ? (
              <><span className="w-2.5 h-2.5 rounded-full bg-[#5B8059] animate-pulse"></span> LIVE ANALYSIS MODE ACTIVE • Receiving real logs from Filebeat on Windows 11</>
            ) : (
              <><span className="w-2.5 h-2.5 rounded-full bg-[#6B6560]"></span> SYSTEM STANDBY • Select an Analysis Mode to begin scanning</>
            )}
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-12 gap-6 pb-8">

          {/* Left: Alert Feed + Engine Status */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-[#0A0C0E] h-[400px] flex flex-col">
              <div className="p-4 bg-[#353534] flex justify-between items-center">
                <span className="font-['Space_Grotesk'] font-bold uppercase text-sm tracking-widest">Latest Alerts</span>
                <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#6B6560]">{alerts.length} DETECTED</span>
              </div>
              <div className="flex-1 font-['IBM_Plex_Mono'] text-[11px] no-scrollbar overflow-hidden">
                <VirtualList
                  items={alerts}
                  containerHeight={340}
                  itemHeight={76}
                  emptyState={
                    <div className="p-8 text-[#6B6560] text-center flex flex-col items-center gap-3 uppercase text-[10px] h-full justify-center min-h-[340px]">
                      <span className="material-symbols-outlined text-[32px] opacity-50">data_exploration</span>
                      {analysisMode === 'synthetic' ? 'Scanning high-speed synthetic stream...' : analysisMode === 'live' ? 'Waiting for live logs from Filebeat...' : 'System offline. Select an analysis mode above.'}
                    </div>
                  }
                  renderItem={({ index, style }) => {
                    const alert = alerts[index];
                    if (!alert) return null;
                    return (
                      <div
                        key={alert.alert_id}
                        style={style}
                        onClick={() => setActiveAlert(alert)}
                        className={`p-4 border-b border-[#6B6560]/10 cursor-pointer transition-colors group ${activeAlert?.alert_id === alert.alert_id ? 'bg-[#120b0a]' : 'hover:bg-[#120b0a]'} ${index === 0 && analysisMode !== 'live' ? 'animate-pulse bg-[#A84B2B]/5' : ''}`}
                      >
                        <div className="flex justify-between mb-1">
                          <span className={alert.severity === 'Critical' ? 'text-[#ffb4ab]' : alert.severity === 'High' ? 'text-yellow-400' : 'text-[#5B8059]'}>
                            {alert.alert_id}
                          </span>
                          <span className="text-[#6B6560]">{formatTime(alert.timestamp)}</span>
                        </div>
                        <p className={`uppercase transition-colors ${activeAlert?.alert_id === alert.alert_id ? 'text-[#A84B2B]' : 'text-[#e5e2e1] group-hover:text-[#A84B2B]'}`}>
                          {alert.type}
                        </p>
                        <p className="text-neutral-600 text-[9px] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{alert.src_ip}</p>
                      </div>
                    )
                  }}
                />
              </div>
            </div>

            {/* Pipeline Status */}
            <div className="bg-[#0A0C0E] p-6 border border-[#6B6560]/20">
              <h4 className="font-['Space_Grotesk'] font-bold uppercase text-xs tracking-widest mb-4 text-[#E8E2D9]">System Pipeline</h4>
              <div className="space-y-3 relative">
                {/* Visual Line */}
                <div className="absolute left-[3px] top-6 bottom-4 w-[2px] bg-[#6B6560]/20 z-0 hidden lg:block"></div>
                {[
                  { name: 'Normalization Layer', info: 'Log Ingestion & Schema Parsing', active: true },
                  { name: 'Detection Engine', info: 'Brute Force, C2, Exfil, FP Catcher', active: true },
                  { name: 'Cross-Layer Correlation', info: 'Multi-vector contextual link', active: true },
                  { name: 'MITRE Path Prediction', info: 'Probabilistic Threat Modeling', active: true },
                  { name: 'Contextual AI Playbook', info: 'Gemini (Critical/Correlated Alerts)', active: true },
                ].map((step, idx) => (
                  <div key={idx} className="flex flex-col bg-[#120b0a] p-3 border-l-[3px] border-[#A84B2B] relative z-10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#A84B2B] uppercase font-bold">{step.name}</span>
                      <span className="text-[9px] font-bold text-[#5B8059] uppercase tracking-tighter mix-blend-screen animate-pulse">Online</span>
                    </div>
                    <span className="font-['IBM_Plex_Mono'] text-[9px] text-[#6B6560] uppercase">{step.info}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle: Active Alert Analysis */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-[#0A0C0E] flex flex-col" style={{ minHeight: '700px' }}>
              {activeAlert ? (
                <>
                  <div className="p-4 bg-[#353534] border-b border-[#A84B2B]/20 flex justify-between items-center">
                    <div>
                      <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#E8E2D9] uppercase">Active Analysis</span>
                      <h3 className="font-['Space_Grotesk'] font-black text-lg uppercase leading-none">Incident #{activeAlert.alert_id}</h3>
                    </div>
                    <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest ${activeAlert.severity === 'Critical' ? 'bg-[#93000a]/20 text-[#ffb4ab]' : 'bg-[#A84B2B]/20 text-[#A84B2B]'}`}>
                      {activeAlert.severity}
                    </div>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
                    {/* Source → Target */}
                    <div className="flex items-center justify-between bg-[#120b0a] p-4 border-l-4 border-[#A84B2B]">
                      <div className="text-center">
                        <p className="font-['IBM_Plex_Mono'] text-[9px] text-[#6B6560] uppercase mb-1">Source Origin</p>
                        <p className="font-['IBM_Plex_Mono'] text-sm text-[#5B8059]">{activeAlert.src_ip}</p>
                      </div>
                      <span className="material-symbols-outlined text-[#5B8059] animate-pulse" style={{ verticalAlign: 'middle' }}>arrow_forward</span>
                      <div className="text-center">
                        <p className="font-['IBM_Plex_Mono'] text-[9px] text-[#6B6560] uppercase mb-1">Target Node</p>
                        <p className="font-['IBM_Plex_Mono'] text-sm text-[#ffb4ab]">{activeAlert.dst_ip || 'Internal'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <p className="font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-widest text-[#E8E2D9]">Why Flagged</p>
                        <div className="bg-[#120b0a] p-3 min-h-[80px]">
                          <p className="font-['IBM_Plex_Mono'] text-[11px] leading-relaxed">{activeAlert.why_flagged}</p>
                        </div>
                      </div>
                    </div>

                    {/* Playbook — shown for all selected alerts */}
                    <PlaybookSection alert={activeAlert} />
                  </div>

                  <div className="flex gap-3 p-6 pt-0 mt-auto">
                    <button className="flex-1 bg-[#353534] border border-[#A84B2B]/30 text-[#A84B2B] font-['Space_Grotesk'] font-bold text-[10px] uppercase py-3 hover:bg-[#A84B2B]/10 transition-all">
                      PREVENTIVE ACTION: ROTATE KEYS
                    </button>
                    <button className="flex-none bg-[#A84B2B] text-[#2f4d2f] px-8 font-['Space_Grotesk'] font-black text-xs uppercase hover:bg-[#E8E2D9] transition-all">
                      EXECUTE
                    </button>
                  </div>
                </>
              ) : (
                  <div className="h-full flex flex-col items-center justify-center text-[#6B6560] font-['IBM_Plex_Mono'] uppercase tracking-widest min-h-[400px]">
                    <span className="material-symbols-outlined text-4xl mb-4 opacity-30">science</span>
                    {analysisMode === 'synthetic' ? 'Waiting for detections from synthetic stream...' : analysisMode === 'live' ? 'Waiting for live logs from Filebeat...' : 'System offline.'}
                  </div>
              )}
            </div>
          </div>

          {/* Right: Globe + Chart */}
          <div className="col-span-12 lg:col-span-3 space-y-6 mt-8">
            {/* Animated Globe */}
            <div className="bg-gradient-to-b from-[#0a0a0a] to-[#131514] border border-[#120b0a] shadow-lg overflow-hidden relative rounded-xl" style={{ height: '360px' }}>
              <div className="p-4 bg-gradient-to-b from-[#111111]/90 to-transparent absolute top-0 left-0 w-full z-10 pointer-events-none">
                <p className="font-['Space_Grotesk'] font-bold text-[11px] uppercase tracking-widest text-[#e5e2e1] drop-shadow-md">
                  Threat Origin Globe
                </p>
                <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#A84B2B] mt-1 drop-shadow-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A84B2B] animate-pulse" />
                  {globePoints.length} attacker IPs resolved
                </p>
              </div>
              <div className="flex items-center justify-center w-full h-full cursor-grab active:cursor-grabbing">
                <Globe
                  ref={globeRef}
                  width={400}
                  height={400}
                  backgroundColor="rgba(0,0,0,0)"
                  globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
                  bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
                  atmosphereColor="#2a2a4a"
                  atmosphereAltitude={0.15}
                  pointsData={globePoints}
                  pointLat="lat"
                  pointLng="lng"
                  pointAltitude={0.06}
                  pointRadius={0.7}
                  pointColor="color"
                  pointsMerge={true}
                  pointsTransitionDuration={2000}
                  arcsData={globePoints}
                  arcStartLat={d => d.lat + (Math.random() - 0.5) * 15}
                  arcStartLng={d => d.lng + (Math.random() - 0.5) * 15}
                  arcEndLat="lat"
                  arcEndLng="lng"
                  arcColor="color"
                  arcDashLength={0.4}
                  arcDashGap={0.2}
                  arcDashAnimateTime={2000}
                  arcAltitudeAutoScale={0.4}
                  pointLabel={d => `
                    <div style="background:rgba(28,27,27,0.9);backdrop-filter:blur(4px);border:1px solid #5B8059;border-radius:4px;padding:8px 12px;font-family:monospace;font-size:11px;color:#e5e2e1;box-shadow:0 4px 12px rgba(0,0,0,0.5);">
                      <b style="color:#A84B2B;font-size:12px;">${d.ip}</b><br/>
                      <span style="color:#fff">${d.city}, ${d.country}</span><br/>
                      <span style="color:#6B6560">${d.isp || ''}</span>
                    </div>
                  `}
                  ringsData={globePoints.filter(p => p.severity === 'Critical')}
                  ringLat="lat"
                  ringLng="lng"
                  ringColor={() => '#ffb4ab'}
                  ringMaxRadius={6}
                  ringPropagationSpeed={3}
                  ringRepeatPeriod={800}
                />
              </div>
              <div className="absolute bottom-4 left-4 font-['IBM_Plex_Mono'] text-[9px] text-[#ffb4ab] bg-[#111111]/80 backdrop-blur-sm border border-[#ffb4ab]/20 px-3 py-1.5 rounded-full z-20 shadow-lg">
                🔴 {(() => {
                  if (globePoints.length === 0) return 'Monitoring threats...';
                  const counts = {};
                  globePoints.forEach(p => {
                    if (p.country && p.country !== 'Unknown') {
                      counts[p.country] = (counts[p.country] || 0) + 1;
                    }
                  });
                  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
                  if (sorted.length === 0) return 'Monitoring threats...';
                  if (globePoints.length === 1 || sorted.length === 1) {
                    return `Detected Origin: ${sorted[0][0]}`;
                  }
                  const top = sorted.slice(0, 4).map(s => s[0]).join(' · ');
                  return `High Risk: ${top}`;
                })()}
              </div>
            </div>

            {/* Alert Type Distribution */}
            <div className="bg-[#0A0C0E] p-4">
              <p className="font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-widest mb-4">Attack Distribution</p>
              <div className="h-32 w-full relative">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Live IOCs from alerts */}
            <div className="bg-[#0A0C0E] p-4">
              <p className="font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-widest mb-4">Active IOCs</p>
              <div className="space-y-2">
                {[...new Set(alerts.slice(0, 5).map(a => a.src_ip).filter(Boolean))].map(ip => (
                  <div key={ip} className="bg-[#120b0a] p-2 flex items-center justify-between">
                    <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#5B8059]">IP: {ip}</span>
                    <span
                      className="material-symbols-outlined text-[12px] text-neutral-600 cursor-pointer hover:text-[#A84B2B]"
                      style={{ verticalAlign: 'middle' }}
                      onClick={() => navigator.clipboard.writeText(ip)}
                    >
                      content_copy
                    </span>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-neutral-600 font-['IBM_Plex_Mono'] text-[10px] uppercase">No IOCs yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Playbook sub-component ──────────────────────────────────────────────────
function PlaybookSection({ alert }) {
  const [loading, setLoading] = useState(false);
  const [localPlaybook, setLocalPlaybook] = useState(alert.playbook || '');

  useEffect(() => {
    setLocalPlaybook(alert.playbook || '');
  }, [alert.alert_id, alert.playbook]);

  const generatePlaybook = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:8000/playbooks/generate/${alert.alert_id}`, { method: 'POST' });
      const data = await res.json();
      if (data.playbook) setLocalPlaybook(data.playbook);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-widest text-[#A84B2B]">
          AI Response Playbook
        </p>
        <div className="flex items-center gap-2">
          <span className="font-['IBM_Plex_Mono'] text-[9px] text-[#6B6560] uppercase">Gemini · Critical Only</span>
          {!localPlaybook && (
            <button
              id="generate-playbook-btn"
              onClick={generatePlaybook}
              disabled={loading}
              className="text-[9px] font-['IBM_Plex_Mono'] uppercase bg-[#A84B2B]/10 text-[#A84B2B] px-2 py-0.5 border border-[#A84B2B]/30 hover:bg-[#A84B2B]/20 disabled:opacity-50 transition-all"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          )}
        </div>
      </div>
      <div className="bg-[#120b0a]/50 p-4 border border-[#A84B2B]/10 space-y-3 max-h-60 overflow-y-auto no-scrollbar">
        {localPlaybook ? (
          localPlaybook.split('\n').filter(s => s.trim()).map((step, idx) => (
            <div key={idx} className="flex gap-4">
              <span className="font-['IBM_Plex_Mono'] text-[#A84B2B] text-[10px] shrink-0">{String(idx + 1).padStart(2, '0')}</span>
              <p className="font-['IBM_Plex_Mono'] text-xs text-[#e5e2e1]">{step}</p>
            </div>
          ))
        ) : (
          <p className="font-['IBM_Plex_Mono'] text-[11px] text-[#6B6560]">
            {loading ? 'Calling Gemini AI...' : 'Click Generate to create an AI playbook for this critical threat.'}
          </p>
        )}
      </div>
    </div>
  );
}
