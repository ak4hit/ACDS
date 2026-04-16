import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import Globe from 'react-globe.gl';
import { Bar } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const API = 'http://localhost:8000';

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

  // ── Monitor status polling ───────────────────────────────────────
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API}/monitor/status`);
        const data = await res.json();
        setMonitorStatus(data);
        setMonitorRunning(data.is_running);
      } catch (_) {}
    }, 1500);
    return () => clearInterval(poll);
  }, []);

  const toggleMonitor = async () => {
    // Optimistic UI: flip state instantly so button responds in <100ms
    const wasRunning = monitorRunning;
    setMonitorRunning(!wasRunning);
    try {
      if (wasRunning) {
        await fetch(`${API}/monitor/stop`, { method: 'POST' });
      } else {
        await fetch(`${API}/monitor/start`, { method: 'POST' });
      }
    } catch (_) {
      // Revert on error
      setMonitorRunning(wasRunning);
    }
  };

  const resetMonitor = async () => {
    await fetch(`${API}/monitor/reset`, { method: 'POST' });
    setMonitorRunning(false);
    setMonitorStatus(s => ({ ...s, current_file: 0, progress_pct: 0 }));
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
      backgroundColor: ['#98FB98', '#5B8059', '#ffb4ab', '#84967e'],
      borderRadius: 2,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#84967e', font: { family: 'IBM Plex Mono', size: 8 } } },
      y: { display: false }
    }
  };

  return (
    <div className="pt-10 pb-20 px-8 min-h-screen relative overflow-y-auto bg-[#131313] text-[#e5e2e1]">
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
              className="flex items-center gap-2 bg-[#2a2a2a] px-4 py-2 text-xs font-['IBM_Plex_Mono'] uppercase tracking-widest text-[#e5e2e1] hover:bg-[#3a3939] transition-all"
            >
              <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>refresh</span>
              Reset
            </button>

            {/* ── ANALYSIS TOGGLE ── */}
            <button
              id="blueprints-analysis-toggle"
              onClick={toggleMonitor}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-['IBM_Plex_Mono'] uppercase tracking-widest transition-all border ${
                monitorRunning
                  ? 'bg-[#98FB98]/10 border-[#98FB98]/60 text-[#98FB98]'
                  : 'bg-[#2a2a2a] border-[#84967e]/30 text-[#84967e] hover:border-[#98FB98]/40 hover:text-[#e5e2e1]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${monitorRunning ? 'bg-[#98FB98] animate-pulse' : 'bg-[#84967e]/50'}`}
              />
              {monitorRunning ? 'Analysis: ON' : 'Analysis: OFF'}
            </button>

            {/* Reset scan */}
            {monitorStatus.current_file > 0 && (
              <button
                onClick={resetMonitor}
                className="flex items-center gap-2 bg-[#2a2a2a] px-3 py-2 text-xs font-['IBM_Plex_Mono'] uppercase tracking-widest text-[#84967e] hover:text-[#ffb4ab] transition-all"
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
              className="flex items-center gap-2 bg-[#2a2a2a] border border-dashed border-[#84967e]/40 px-4 py-2 text-xs font-['IBM_Plex_Mono'] uppercase tracking-widest text-[#84967e] hover:border-[#98FB98]/60 hover:text-[#98FB98] cursor-pointer transition-all"
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
                uploadResult.status === 'processed' ? 'text-[#98FB98] bg-[#98FB98]/10' : 'text-[#ffb4ab] bg-[#ffb4ab]/10'
              }`}>
                {uploadResult.status === 'processed'
                  ? `✓ ${uploadResult.findings} threats from ${uploadResult.filename}`
                  : `✗ ${uploadResult.message || 'Parse error'}`}
              </div>
            )}
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1c1b1b] p-4 border-l-2 border-[#84967e]/20">
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-neutral-500 uppercase tracking-widest mb-1">TOTAL EVENTS</p>
              <h3 className="text-2xl font-['Space_Grotesk'] font-black text-[#e5e2e1]">{animTotal}</h3>
            </div>
            <div className="bg-[#1c1b1b] p-4 border-l-2 border-[#ffb4ab]/40">
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-neutral-500 uppercase tracking-widest mb-1">CRITICAL</p>
              <h3 className="text-2xl font-['Space_Grotesk'] font-black text-[#ffb4ab]">{animCritical}</h3>
            </div>
            <div className="bg-[#1c1b1b] p-4 border-l-2 border-[#84967e]/20">
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-neutral-500 uppercase tracking-widest mb-1">FALSE POS.</p>
              <h3 className="text-2xl font-['Space_Grotesk'] font-black text-[#e5e2e1]">{animFP}</h3>
            </div>
            <div className="bg-[#1c1b1b] p-4 border-l-2 border-[#5B8059]/40">
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-neutral-500 uppercase tracking-widest mb-1">CORRELATED</p>
              <h3 className="text-2xl font-['Space_Grotesk'] font-black text-[#5B8059]">{animCorr}</h3>
            </div>
          </div>
        </div>



        {/* ── Main Grid ── */}
        <div className="grid grid-cols-12 gap-6 pb-8">

          {/* Left: Alert Feed + Engine Status */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-[#1c1b1b] h-[400px] flex flex-col">
              <div className="p-4 bg-[#353534] flex justify-between items-center">
                <span className="font-['Space_Grotesk'] font-bold uppercase text-sm tracking-widest">Latest Alerts</span>
                <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#84967e]">{alerts.length} DETECTED</span>
              </div>
              <div className="overflow-y-auto flex-1 font-['IBM_Plex_Mono'] text-[11px] no-scrollbar">
                {alerts.slice(0, 80).map((alert, i) => (
                  <div
                    key={alert.alert_id || i}
                    onClick={() => setActiveAlert(alert)}
                    className={`p-4 border-b border-[#84967e]/10 cursor-pointer transition-colors group ${activeAlert?.alert_id === alert.alert_id ? 'bg-[#2a2a2a]' : 'hover:bg-[#2a2a2a]'}`}
                  >
                    <div className="flex justify-between mb-1">
                      <span className={alert.severity === 'Critical' ? 'text-[#ffb4ab]' : alert.severity === 'High' ? 'text-yellow-400' : 'text-[#5B8059]'}>
                        #{alert.alert_id || `AC-${i}`}
                      </span>
                      <span className="text-neutral-500">{formatTime(alert.timestamp)}</span>
                    </div>
                    <p className={`uppercase transition-colors ${activeAlert?.alert_id === alert.alert_id ? 'text-[#98FB98]' : 'text-[#e5e2e1] group-hover:text-[#98FB98]'}`}>
                      {alert.type}
                    </p>
                    <p className="text-neutral-600 text-[9px] mt-0.5">{alert.src_ip}</p>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="p-8 text-neutral-500 text-center uppercase text-[10px]">
                    {monitorRunning ? 'Scanning files...' : 'Toggle Analysis to begin'}
                  </div>
                )}
              </div>
            </div>

            {/* Engine status */}
            <div className="bg-[#1c1b1b] p-6">
              <h4 className="font-['Space_Grotesk'] font-bold uppercase text-xs tracking-widest mb-4">Detection Engines</h4>
              <div className="space-y-3">
                {[
                  { name: 'Brute Force Detector', active: true },
                  { name: 'C2 Beacon Detector', active: true },
                  { name: 'Exfil Detector', active: true },
                  { name: 'Cross-Layer Correlator', active: true },
                ].map(eng => (
                  <div key={eng.name} className="flex justify-between items-center bg-[#2a2a2a] p-3">
                    <span className="font-['IBM_Plex_Mono'] text-xs text-neutral-400 uppercase">{eng.name}</span>
                    <span className="text-[10px] font-bold text-[#5B8059] bg-[#2f4d2f]/20 px-2 py-0.5 uppercase tracking-tighter">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle: Active Alert Analysis */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="bg-[#1c1b1b] flex flex-col" style={{ minHeight: '700px' }}>
              {activeAlert ? (
                <>
                  <div className="p-4 bg-[#353534] border-b border-[#98FB98]/20 flex justify-between items-center">
                    <div>
                      <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#ebffe2] uppercase">Active Analysis</span>
                      <h3 className="font-['Space_Grotesk'] font-black text-lg uppercase leading-none">Incident #{activeAlert.alert_id}</h3>
                    </div>
                    <div className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest ${activeAlert.severity === 'Critical' ? 'bg-[#93000a]/20 text-[#ffb4ab]' : 'bg-[#98FB98]/20 text-[#98FB98]'}`}>
                      {activeAlert.severity}
                    </div>
                  </div>

                  <div className="p-6 space-y-6 overflow-y-auto no-scrollbar flex-1">
                    {/* Source → Target */}
                    <div className="flex items-center justify-between bg-[#2a2a2a] p-4 border-l-4 border-[#98FB98]">
                      <div className="text-center">
                        <p className="font-['IBM_Plex_Mono'] text-[9px] text-neutral-500 uppercase mb-1">Source Origin</p>
                        <p className="font-['IBM_Plex_Mono'] text-sm text-[#5B8059]">{activeAlert.src_ip}</p>
                      </div>
                      <span className="material-symbols-outlined text-[#5B8059] animate-pulse" style={{ verticalAlign: 'middle' }}>arrow_forward</span>
                      <div className="text-center">
                        <p className="font-['IBM_Plex_Mono'] text-[9px] text-neutral-500 uppercase mb-1">Target Node</p>
                        <p className="font-['IBM_Plex_Mono'] text-sm text-[#ffb4ab]">{activeAlert.dst_ip || 'Internal'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-widest text-neutral-400">Why Flagged</p>
                        <div className="bg-[#2a2a2a] p-3 min-h-[80px]">
                          <p className="font-['IBM_Plex_Mono'] text-[11px] leading-relaxed">{activeAlert.why_flagged}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-widest text-neutral-400">Attack Trajectory</p>
                        <div className="bg-[#2a2a2a] p-3 min-h-[80px]">
                          {activeAlert.attack_path?.length > 0 ? (
                            <p className="font-['IBM_Plex_Mono'] text-[11px] leading-relaxed">
                              {activeAlert.attack_path.map(n => n.name).join(' → ')}
                            </p>
                          ) : (
                            <p className="font-['IBM_Plex_Mono'] text-[11px] text-neutral-500">Not sufficiently correlated.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Playbook — shown for all selected alerts */}
                    <PlaybookSection alert={activeAlert} />
                  </div>

                  <div className="flex gap-3 p-6 pt-0 mt-auto">
                    <button className="flex-1 bg-[#353534] border border-[#98FB98]/30 text-[#98FB98] font-['Space_Grotesk'] font-bold text-[10px] uppercase py-3 hover:bg-[#98FB98]/10 transition-all">
                      PREVENTIVE ACTION: ROTATE KEYS
                    </button>
                    <button className="flex-none bg-[#98FB98] text-[#2f4d2f] px-8 font-['Space_Grotesk'] font-black text-xs uppercase hover:bg-[#ebffe2] transition-all">
                      EXECUTE
                    </button>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-neutral-500 font-['IBM_Plex_Mono'] uppercase tracking-widest min-h-[400px]">
                  No alert selected
                </div>
              )}
            </div>
          </div>

          {/* Right: Globe + Chart */}
          <div className="col-span-12 lg:col-span-3 space-y-6 mt-8">
            {/* Animated Globe */}
            <div className="bg-gradient-to-b from-[#0a0a0a] to-[#131514] border border-[#2a2a2a] shadow-lg overflow-hidden relative rounded-xl" style={{ height: '360px' }}>
              <div className="p-4 bg-gradient-to-b from-[#111111]/90 to-transparent absolute top-0 left-0 w-full z-10 pointer-events-none">
                <p className="font-['Space_Grotesk'] font-bold text-[11px] uppercase tracking-widest text-[#e5e2e1] drop-shadow-md">
                  Threat Origin Globe
                </p>
                <p className="font-['IBM_Plex_Mono'] text-[10px] text-[#98FB98] mt-1 drop-shadow-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#98FB98] animate-pulse" />
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
                      <b style="color:#98FB98;font-size:12px;">${d.ip}</b><br/>
                      <span style="color:#fff">${d.city}, ${d.country}</span><br/>
                      <span style="color:#84967e">${d.isp || ''}</span>
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
            <div className="bg-[#1c1b1b] p-4">
              <p className="font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-widest mb-4">Attack Distribution</p>
              <div className="h-32 w-full relative">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* Live IOCs from alerts */}
            <div className="bg-[#1c1b1b] p-4">
              <p className="font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-widest mb-4">Active IOCs</p>
              <div className="space-y-2">
                {[...new Set(alerts.slice(0, 5).map(a => a.src_ip).filter(Boolean))].map(ip => (
                  <div key={ip} className="bg-[#2a2a2a] p-2 flex items-center justify-between">
                    <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#5B8059]">IP: {ip}</span>
                    <span
                      className="material-symbols-outlined text-[12px] text-neutral-600 cursor-pointer hover:text-[#98FB98]"
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
      const res = await fetch(`http://localhost:8000/playbooks/generate/${alert.alert_id}`, { method: 'POST' });
      const data = await res.json();
      if (data.playbook) setLocalPlaybook(data.playbook);
    } catch (_) {}
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="font-['Space_Grotesk'] font-bold text-[10px] uppercase tracking-widest text-[#98FB98]">
          AI Response Playbook
        </p>
        <div className="flex items-center gap-2">
          <span className="font-['IBM_Plex_Mono'] text-[9px] text-neutral-500 uppercase">Gemini · Critical Only</span>
          {!localPlaybook && (
            <button
              id="generate-playbook-btn"
              onClick={generatePlaybook}
              disabled={loading}
              className="text-[9px] font-['IBM_Plex_Mono'] uppercase bg-[#98FB98]/10 text-[#98FB98] px-2 py-0.5 border border-[#98FB98]/30 hover:bg-[#98FB98]/20 disabled:opacity-50 transition-all"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          )}
        </div>
      </div>
      <div className="bg-[#2a2a2a]/50 p-4 border border-[#98FB98]/10 space-y-3 max-h-60 overflow-y-auto no-scrollbar">
        {localPlaybook ? (
          localPlaybook.split('\n').filter(s => s.trim()).map((step, idx) => (
            <div key={idx} className="flex gap-4">
              <span className="font-['IBM_Plex_Mono'] text-[#98FB98] text-[10px] shrink-0">{String(idx + 1).padStart(2, '0')}</span>
              <p className="font-['IBM_Plex_Mono'] text-xs text-[#e5e2e1]">{step}</p>
            </div>
          ))
        ) : (
          <p className="font-['IBM_Plex_Mono'] text-[11px] text-neutral-500">
            {loading ? 'Calling Gemini AI...' : 'Click Generate to create an AI playbook for this critical threat.'}
          </p>
        )}
      </div>
    </div>
  );
}
