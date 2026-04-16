import React, { useState, useEffect, useCallback, useRef } from 'react';

const API = 'http://localhost:8000';
const ARCHIVE_KEY = 'acds_archive_store';

// ── Persistent archive helpers ────────────────────────────────────────────────
function loadLocalArchive() {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); } catch { return []; }
}
function saveLocalArchive(data) {
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(data)); } catch {}
}

// ── Merge arrays uniquely by alert_id ─────────────────────────────────────────
function mergeUnique(base, incoming) {
  const map = new Map();
  [...base, ...incoming].forEach(a => {
    if (a?.alert_id) map.set(a.alert_id, a);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

function convertToCSV(entries) {
  if (!entries || !entries.length) return '';
  const headers = ['Alert ID', 'Type', 'Severity', 'Timestamp', 'Source IP', 'Dest IP', 'Source Port', 'Dest Port', 'Protocol', 'Correlated', 'False Positive', 'MITRE ID', 'MITRE Name', 'Why Flagged'];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = entries.map(e => [
    e.alert_id,
    e.type,
    e.severity,
    e.timestamp ? new Date(e.timestamp).toLocaleString() : '',
    e.src_ip,
    e.dst_ip,
    e.src_port,
    e.dst_port,
    e.protocol,
    e.correlated ? 'Yes' : 'No',
    e.false_positive ? 'Yes' : 'No',
    e.mitre ? e.mitre.id : '',
    e.mitre ? e.mitre.name : '',
    e.why_flagged || ''
  ].map(escapeCsv).join(','));

  return [headers.map(escapeCsv).join(','), ...rows].join('\n');
}

function downloadCSV(csvStr, filename) {
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadEntry(entry) {
  const csvStr = convertToCSV([entry]);
  downloadCSV(csvStr, `${entry.alert_id || 'alert_' + Date.now()}.csv`);
}

function downloadBulk(entries, label) {
  const csvStr = convertToCSV(entries);
  downloadCSV(csvStr, `acds_archive_report_${label}_${Date.now()}.csv`);
}

// ── Severity styles ───────────────────────────────────────────────────────────
const getSeverityStyle = (severity) => {
  switch (severity) {
    case 'Critical': return { bg: 'bg-[#93000a]/20', text: 'text-[#ffb4ab]', border: 'border-[#ffb4ab]', bar: 'bg-[#ffb4ab]', dot: 'bg-[#ffb4ab]' };
    case 'High':     return { bg: 'bg-[#ff9800]/15',  text: 'text-[#ffa726]', border: 'border-[#ffa726]', bar: 'bg-[#ffa726]', dot: 'bg-[#ffa726]' };
    default:         return { bg: 'bg-[#2a2a2a]',     text: 'text-[#84967e]', border: 'border-[#84967e]', bar: 'bg-[#84967e]', dot: 'bg-[#84967e]' };
  }
};

// ── Expanded detail modal ─────────────────────────────────────────────────────
function DetailModal({ entry, onClose }) {
  if (!entry) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-[#353534] w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded"
        style={{ scrollbarWidth: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex justify-between items-center p-5 bg-[#222] border-b border-[#353534] sticky top-0">
          <div>
            <span className="font-['IBM_Plex_Mono'] text-[10px] text-[#84967e] uppercase tracking-widest block mb-0.5">
              Archive Details
            </span>
            <h3 className="font-['Space_Grotesk'] font-black text-lg text-[#e5e2e1] uppercase leading-none">
              #{entry.alert_id}
            </h3>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => downloadEntry(entry)}
              className="flex items-center gap-1.5 text-[9px] font-['IBM_Plex_Mono'] uppercase text-[#98FB98] bg-[#98FB98]/10 px-3 py-1.5 border border-[#98FB98]/30 hover:bg-[#98FB98]/20 transition-all"
            >
              <span className="material-symbols-outlined text-xs" style={{ verticalAlign: 'middle' }}>download</span>
              Download CSV
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 bg-[#2a2a2a] border border-[#353534] text-[#84967e] hover:text-[#e5e2e1] hover:border-[#84967e] transition-all"
            >
              <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>close</span>
            </button>
          </div>
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-4 font-['IBM_Plex_Mono'] text-[11px]">

          {/* Core fields grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Alert ID',   entry.alert_id],
              ['Type',       entry.type],
              ['Severity',   entry.severity],
              ['Timestamp',  entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'],
              ['Source IP',  entry.src_ip || '—'],
              ['Dest IP',    entry.dst_ip || '—'],
              ['Source Port',entry.src_port || '—'],
              ['Dest Port',  entry.dst_port || '—'],
              ['Protocol',   entry.protocol || '—'],
              ['Correlated', entry.correlated ? 'Yes' : 'No'],
              ['False Positive', entry.false_positive ? 'Yes' : 'No'],
              ['Source File', entry.source_file || '—'],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#222] p-3 rounded">
                <p className="text-[9px] text-[#84967e] uppercase tracking-widest mb-1">{label}</p>
                <p className="text-[#e5e2e1] break-all">{String(value)}</p>
              </div>
            ))}
          </div>

          {/* MITRE */}
          {entry.mitre && (
            <div className="bg-[#222] p-3 rounded">
              <p className="text-[9px] text-[#84967e] uppercase tracking-widest mb-2">MITRE ATT&CK</p>
              <p className="text-[#98FB98]">{entry.mitre.id} — {entry.mitre.name}</p>
              {entry.mitre.tactic && <p className="text-[#84967e] text-[10px] mt-0.5">Tactic: {entry.mitre.tactic}</p>}
            </div>
          )}

          {/* Why Flagged */}
          {entry.why_flagged && (
            <div className="bg-[#222] p-3 rounded">
              <p className="text-[9px] text-[#84967e] uppercase tracking-widest mb-2">Why Flagged</p>
              <p className="text-[#e5e2e1] leading-relaxed">{entry.why_flagged}</p>
            </div>
          )}

          {/* Attack Path */}
          {entry.attack_path?.length > 0 && (
            <div className="bg-[#222] p-3 rounded">
              <p className="text-[9px] text-[#84967e] uppercase tracking-widest mb-2">Attack Path</p>
              <p className="text-[#e5e2e1] leading-relaxed">{entry.attack_path.map(n => n.name || n).join(' → ')}</p>
            </div>
          )}

          {/* Playbook */}
          {entry.playbook && (
            <div className="bg-[#222] p-3 rounded border border-[#98FB98]/10">
              <p className="text-[9px] text-[#98FB98] uppercase tracking-widest mb-2">AI Response Playbook</p>
              <div className="space-y-2">
                {entry.playbook.split('\n').filter(s => s.trim()).map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <span className="text-[#98FB98] shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                    <p className="text-[#e5e2e1]">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON */}
          <div className="bg-[#0f0f0f] p-3 rounded border border-[#2a2a2a]">
            <p className="text-[9px] text-[#84967e] uppercase tracking-widest mb-2">Raw Event Data</p>
            <pre className="text-[10px] text-[#84967e] whitespace-pre-wrap overflow-x-auto leading-relaxed">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Archives Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function Archives() {
  const [archive, setArchive] = useState(loadLocalArchive);
  const [filter, setFilter]   = useState('all');
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [detailEntry, setDetailEntry] = useState(null);
  const [deletedIds, setDeletedIds]   = useState(new Set());
  const hasFetched = useRef(false);

  // ── Fetch from backend and merge with local cache ─────────────────────────
  const fetchFromBackend = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch up to 500 alerts from the backend archive endpoint
      const res = await fetch(`${API}/archives/alerts?per_page=500&page=1`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      const incoming = data.alerts || [];
      setArchive(prev => {
        const merged = mergeUnique(prev, incoming);
        saveLocalArchive(merged);
        return merged;
      });
      setLastFetched(new Date().toLocaleTimeString('en-GB'));
    } catch (err) {
      // Silently fail — still show localStorage cache
      console.warn('Archives: backend fetch failed, using cache', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Listen for new real-time alerts from SocketContext ───────────────────
  useEffect(() => {
    const handleNewAlert = (e) => {
      const alert = e.detail;
      if (!alert?.alert_id) return;
      setArchive(prev => {
        if (prev.find(x => x.alert_id === alert.alert_id)) return prev;
        const next = [alert, ...prev];
        saveLocalArchive(next);
        return next;
      });
    };
    window.addEventListener('acds-new-alert', handleNewAlert);
    return () => window.removeEventListener('acds-new-alert', handleNewAlert);
  }, []);

  // ── Fetch on mount (only once) ────────────────────────────────────────────
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchFromBackend();
    }
  }, [fetchFromBackend]);

  // ── Delete entry from local view ─────────────────────────────────────────
  const deleteEntry = (alertId) => {
    setDeletedIds(prev => new Set([...prev, alertId]));
    setArchive(prev => {
      const next = prev.filter(a => a.alert_id !== alertId);
      saveLocalArchive(next);
      return next;
    });
  };

  // ── Clear all archives ────────────────────────────────────────────────────
  const clearAll = async () => {
    if (!window.confirm('Clear all local and remote archives?')) return;
    try {
      await fetch(`${API}/reset`, { method: 'POST' });
    } catch (e) {
      console.warn('Failed to reset backend:', e);
    }
    setArchive([]);
    saveLocalArchive([]);
    setDetailEntry(null);
  };

  // ── Filtered view ─────────────────────────────────────────────────────────
  const filteredArchive = archive.filter(a => {
    if (filter === 'critical')   return a.severity === 'Critical';
    if (filter === 'high')       return a.severity === 'High';
    return true;
  });

  const stats = {
    total:      archive.length,
    critical:   archive.filter(a => a.severity === 'Critical').length,
    high:       archive.filter(a => a.severity === 'High').length
  };

  const filterTabs = [
    { key: 'all',        label: 'ALL',         count: stats.total },
    { key: 'critical',   label: 'CRITICAL',    count: stats.critical },
    { key: 'high',       label: 'HIGH',        count: stats.high }
  ];

  const filterLabel = filterTabs.find(f => f.key === filter)?.label || 'all';

  return (
    <div className="pt-10 pb-20 px-8 min-h-screen relative overflow-y-auto bg-[#131313] text-[#e5e2e1]">
      {/* Detail Modal */}
      {detailEntry && (
        <DetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
      )}

      {/* Watermark */}
      <div className="fixed bottom-32 right-12 opacity-[0.02] pointer-events-none select-none z-0">
        <h3 className="text-8xl font-black font-['Space_Grotesk'] rotate-12">SOVEREIGN ARCHITECT</h3>
      </div>

      <div className="relative z-10 h-full flex flex-col">

        {/* ── Header ── */}
        <div className="flex justify-between items-start mb-8 gap-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <button className="w-10 h-10 bg-[#98FB98] flex items-center justify-center text-black">
                <span className="material-symbols-outlined" style={{ verticalAlign: 'middle' }}>storage</span>
              </button>
              <h2 className="text-3xl font-['Space_Grotesk'] font-bold uppercase tracking-tight">System Archives</h2>
            </div>
            <p className="font-['IBM_Plex_Mono'] text-xs text-[#84967e] tracking-wider">
              {stats.total} EVENTS · {stats.critical} CRITICAL
            </p>
            {lastFetched && (
              <p className="font-['IBM_Plex_Mono'] text-[10px] text-neutral-600 mt-1">
                Last synced: {lastFetched}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap items-start justify-end">
            {/* Refresh from backend */}
            <button
              onClick={fetchFromBackend}
              disabled={loading}
              className="flex items-center gap-1.5 text-[10px] font-['IBM_Plex_Mono'] uppercase tracking-widest text-[#84967e] bg-[#1c1c1c] border border-[#353534] px-3 py-2 hover:border-[#98FB98]/40 hover:text-[#98FB98] transition-all disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`} style={{ verticalAlign: 'middle' }}>
                {loading ? 'progress_activity' : 'sync'}
              </span>
              {loading ? 'Syncing...' : 'Sync'}
            </button>

            {/* Download filtered report */}
            <button
              onClick={() => downloadBulk(filteredArchive, filterLabel)}
              disabled={filteredArchive.length === 0}
              className="flex items-center gap-1.5 text-[10px] font-['IBM_Plex_Mono'] uppercase tracking-widest text-[#98FB98] bg-[#98FB98]/10 border border-[#98FB98]/30 px-3 py-2 hover:bg-[#98FB98]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>download</span>
              Download Report ({filteredArchive.length})
            </button>

            {/* Clear all */}
            <button
              onClick={clearAll}
              disabled={archive.length === 0}
              className="flex items-center gap-1.5 text-[10px] font-['IBM_Plex_Mono'] uppercase tracking-widest text-[#ffb4ab] bg-[#93000a]/10 border border-[#ffb4ab]/20 px-3 py-2 hover:bg-[#93000a]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-sm" style={{ verticalAlign: 'middle' }}>delete_sweep</span>
              Clear All
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Archived', value: stats.total,      color: 'border-[#84967e]/30', text: 'text-[#e5e2e1]' },
            { label: 'Critical',       value: stats.critical,   color: 'border-[#ffb4ab]/50', text: 'text-[#ffb4ab]' },
            { label: 'High',           value: stats.high,       color: 'border-[#ffa726]/40', text: 'text-[#ffa726]' }
          ].map(s => (
            <div key={s.label} className={`bg-[#1c1b1b] p-4 border-l-2 ${s.color}`}>
              <p className="font-['IBM_Plex_Mono'] text-[9px] text-neutral-500 uppercase tracking-widest mb-1">{s.label}</p>
              <h3 className={`text-2xl font-['Space_Grotesk'] font-black ${s.text}`}>{s.value}</h3>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div className="flex justify-between items-center bg-[#1c1b1b] px-4 py-2 mb-4">
          <div className="flex space-x-1">
            {filterTabs.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest px-3 py-1.5 transition-all ${
                  filter === f.key
                    ? 'bg-[#98FB98]/10 text-[#98FB98] border border-[#98FB98]/30'
                    : 'text-neutral-500 hover:text-white border border-transparent hover:border-[#353534]'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 text-[9px] ${filter === f.key ? 'text-[#98FB98]/70' : 'text-neutral-700'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
          <span className="font-['IBM_Plex_Mono'] text-[10px] text-neutral-600">
            {filteredArchive.length} results
          </span>
        </div>

        {/* ── Table Header ── */}
        <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-[#353534]/50 font-['IBM_Plex_Mono'] text-[10px] text-[#84967e] uppercase tracking-widest mb-0.5">
          <div className="col-span-2">TIMESTAMP</div>
          <div className="col-span-3">THREAT TYPE</div>
          <div className="col-span-2">SOURCE IP</div>
          <div className="col-span-1">SEV</div>
          <div className="col-span-2">MITRE TTP</div>
          <div className="col-span-2 text-center">ACTIONS</div>
        </div>

        {/* ── Events List ── */}
        <div className="flex-1 overflow-y-auto space-y-[2px]" style={{ scrollbarWidth: 'none' }}>

          {/* Loading state */}
          {loading && archive.length === 0 && (
            <div className="px-4 py-12 text-center font-['IBM_Plex_Mono'] text-[#84967e] text-xs uppercase tracking-widest">
              <span className="material-symbols-outlined text-2xl block mb-2 animate-spin">progress_activity</span>
              Loading archives from backend...
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredArchive.length === 0 && (
            <div className="px-4 py-12 text-center">
              <span className="material-symbols-outlined text-3xl text-neutral-700 block mb-3">storage</span>
              <p className="font-['IBM_Plex_Mono'] text-neutral-500 text-xs uppercase tracking-widest mb-2">
                No events found{filter !== 'all' ? ` for filter: ${filterLabel}` : ''}
              </p>
              {filter !== 'all' ? (
                <button
                  onClick={() => setFilter('all')}
                  className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-widest text-[#98FB98] border border-[#98FB98]/30 px-3 py-1.5 hover:bg-[#98FB98]/10 transition-all mt-2"
                >
                  Show All
                </button>
              ) : (
                <p className="font-['IBM_Plex_Mono'] text-neutral-700 text-[10px] mt-1">
                  Start the Analysis monitor on the Blueprints page to populate archives.
                </p>
              )}
            </div>
          )}

          {filteredArchive.map((a, i) => {
            const styles = getSeverityStyle(a.severity);
            const tsDate = new Date(a.timestamp);
            const hasPlaybook = a.playbook && a.playbook.length > 10;

            return (
              <div
                key={a.alert_id || i}
                className="grid grid-cols-12 gap-4 px-4 py-3 bg-[#1c1b1b] hover:bg-[#201f1f] transition-colors items-center group cursor-pointer"
                onClick={() => setDetailEntry(a)}
              >

                {/* Timestamp */}
                <div className="col-span-2 font-['IBM_Plex_Mono'] text-[11px] text-[#e5e2e1]/70">
                  <span className="block">{tsDate.toLocaleDateString()}</span>
                  <span className="block text-[9px] text-neutral-600">
                    {tsDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>

                {/* Threat type badge */}
                <div className="col-span-3">
                  <span className={`px-2 py-0.5 ${styles.bg} ${styles.text} text-[10px] font-['IBM_Plex_Mono'] border-l-2 ${styles.border} uppercase`}>
                    {a.type || '—'}
                  </span>
                </div>

                {/* Source IP */}
                <div className="col-span-2 font-['IBM_Plex_Mono'] text-[11px] text-[#5B8059]">
                  {a.src_ip || '—'}
                </div>

                {/* Severity bars */}
                <div className="col-span-1">
                  <div className="flex space-x-1 items-end">
                    <div className={`w-1 h-2 ${styles.bar}`} />
                    <div className={`w-1 h-3 ${styles.bar}`} />
                    <div className={`w-1 h-4 ${a.severity === 'Critical' || a.severity === 'High' ? styles.bar : 'bg-[#3b4b37]'}`} />
                  </div>
                  <span className={`font-['IBM_Plex_Mono'] text-[8px] uppercase mt-1 block ${styles.text}`}>
                    {a.severity}
                  </span>
                </div>

                {/* MITRE TTP */}
                <div className="col-span-2 font-['IBM_Plex_Mono'] text-[11px] text-neutral-500">
                  {a.mitre?.id || a.mitre_ttp || '—'}
                  {a.mitre?.name ? (
                    <span className="block text-[9px] text-neutral-700 mt-0.5">{a.mitre.name}</span>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>

                  {/* Details */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailEntry(a); }}
                    title="View full details"
                    className="flex items-center gap-1 text-[9px] font-['IBM_Plex_Mono'] uppercase text-[#84967e] bg-[#2a2a2a] px-2 py-1 border border-[#353534] hover:border-[#98FB98]/40 hover:text-[#98FB98] transition-all"
                  >
                    <span className="material-symbols-outlined text-xs" style={{ verticalAlign: 'middle' }}>open_in_new</span>
                    Details
                  </button>

                  {/* Download */}
                  <button
                    onClick={(e) => { e.stopPropagation(); downloadEntry(a); }}
                    title="Download individual log as CSV"
                    className="flex items-center gap-0.5 text-[9px] font-['IBM_Plex_Mono'] uppercase text-[#98FB98] bg-[#98FB98]/10 px-1.5 py-1 border border-[#98FB98]/20 hover:bg-[#98FB98]/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-xs" style={{ verticalAlign: 'middle' }}>download</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteEntry(a.alert_id); }}
                    title="Remove from archive"
                    className="flex items-center gap-0.5 text-[9px] font-['IBM_Plex_Mono'] uppercase text-[#ffb4ab] bg-[#93000a]/10 px-1.5 py-1 border border-[#ffb4ab]/20 hover:bg-[#93000a]/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-xs" style={{ verticalAlign: 'middle' }}>delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
