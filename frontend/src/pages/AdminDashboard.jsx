import { useState, useEffect } from 'react'
import { Activity, ShieldCheck, Users, Search, AlertOctagon, BarChart2, Database, Cpu, Globe, RefreshCcw, BellRing } from 'lucide-react'

const API_BASE = '/api'

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

function StatCard({ label, value, sub, icon: Icon, colorClass = 'text-ink' }) {
  return (
    <div className="bg-paper border border-rule rounded-2xl p-5 shadow-soft relative overflow-hidden group hover:bg-paper-2/50 transition-colors">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-ink/5 rounded-full blur-2xl group-hover:bg-brand/10 transition-colors pointer-events-none" />
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="text-[10px] font-bold text-ink-3 uppercase tracking-[0.15em]">{label}</div>
        {Icon && <div className="p-2 rounded-xl bg-paper-3/50 border border-rule text-ink-2 group-hover:text-brand transition-colors"><Icon className="w-4 h-4" /></div>}
      </div>
      <div className={`relative z-10 text-3xl font-sans font-bold ${colorClass} leading-none mb-2`}>{value}</div>
      {sub && <div className="relative z-10 text-[11px] font-medium text-ink-3">{sub}</div>}
    </div>
  )
}

function RiskBadge({ risk }) {
  const styles = {
    LOW:      'bg-brand/10 text-brand border-brand/20',
    MEDIUM:   'bg-gold/10 text-gold border-gold/20',
    HIGH:     'bg-chili/10 text-chili border-chili/30',
    CRITICAL: 'bg-chili/10 text-chili border-chili/30',
    UNKNOWN:  'bg-paper-3 text-ink-2 border-rule',
  }
  const s = styles[risk] || styles.UNKNOWN
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-widest ${s}`}>
      {risk}
    </span>
  )
}

function MiniChart({ data }) {
  if (!data?.length) return <div className="text-ink-3 text-xs text-center py-6 font-medium tracking-wide">No data available</div>
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex gap-2 items-end h-16 w-full">
      {data.map((d, i) => {
        const h = Math.max((d.count / max) * 100, 10)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-[9px] font-bold text-ink-3 group-hover:text-ink transition-colors opacity-0 group-hover:opacity-100">{d.count || 0}</span>
            <div 
              className="w-full max-w-[12px] rounded-t-sm transition-all duration-500 group-hover:brightness-125 bg-gradient-to-t from-brand/20 to-brand"
              style={{ height: `${h}%` }}
            />
            <span className="text-[9px] font-bold text-ink-3 uppercase">{d.day.charAt(0)}</span>
          </div>
        )
      })}
    </div>
  )
}

function ProgressBar({ value, max, colorClass = 'bg-brand' }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <div className="flex-1 h-1.5 bg-paper-3 rounded-full overflow-hidden">
      <div className={`h-full ${colorClass} rounded-full transition-all duration-1000 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  )
}

const TABS = [
  { key: 'overview',  label: 'Overview',  Icon: BarChart2 },
  { key: 'scans',     label: 'Scans',     Icon: Search },
  { key: 'community', label: 'Community', Icon: Users },
  { key: 'fssai',     label: 'FSSAI',     Icon: ShieldCheck },
  { key: 'ml',        label: 'AI Core',   Icon: Cpu },
]

export default function AdminDashboard() {
  const [tab,         setTab]         = useState('overview')
  const [stats,       setStats]       = useState(null)
  const [scans,       setScans]       = useState([])
  const [reports,     setReports]     = useState([])
  const [alerts,      setAlerts]      = useState([])
  const [mlStatus,    setMlStatus]    = useState({})
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [refreshing,  setRefreshing]  = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    try {
      setError(null)
      const [s, sc, rep, alt, ml] = await Promise.all([
        apiFetch('/admin/stats'),
        apiFetch('/admin/recent-scans?limit=30'),
        apiFetch('/community/reports').catch(() => ({ reports: [] })),
        apiFetch('/fssai/alerts').catch(() => ({ alerts: [] })),
        apiFetch('/admin/ml-status').catch(() => ({ models: {} })),
      ])
      setStats(s)
      setScans(sc.scans || [])
      setReports(rep.reports || rep || [])
      setAlerts(alt.alerts || alt || [])
      setMlStatus(ml.models || {})
      setLastRefresh(new Date())
    } catch (e) {
      setError('Cannot reach API backend — is the server running?')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load(); const t = setInterval(() => load(true), 30000); return () => clearInterval(t) }, [])

  const RISK_COLORS = { LOW: 'text-brand bg-brand', MEDIUM: 'text-gold bg-gold', HIGH: 'text-chili bg-chili', CRITICAL: 'text-chili bg-chili' }

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center relative shadow-[0_0_32px_rgba(0,191,165,0.15)]">
        <Activity className="w-8 h-8 text-brand animate-pulse" />
      </div>
      <div className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.2em] animate-pulse">Initializing System</div>
    </div>
  )

  if (error && !stats) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5 animate-fade-up max-w-sm mx-auto text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-chili/10 border border-chili/30 flex items-center justify-center relative shadow-[0_0_32px_rgba(239,68,68,0.15)]">
        <AlertOctagon className="w-8 h-8 text-chili" />
      </div>
      <div className="text-chili text-sm font-medium">{error}</div>
      <button 
        onClick={() => load(true)} 
        className="px-6 py-3 rounded-xl bg-paper-2 border border-rule text-ink-2 hover:text-ink hover:bg-paper-3 transition-all font-bold text-[11px] uppercase tracking-wider"
      >
        Retry Connection
      </button>
    </div>
  )

  return (
    <div className="flex flex-col min-h-screen pb-32 animate-fade-up">
      
      {/* Top App Bar */}
      <div className="sticky top-0 z-40 bg-paper/80 border-b border-rule py-4 px-4 md:px-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-brand" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-ink font-sans tracking-wide leading-tight">SafeThali Cortex</h1>
            <span className="text-[9px] font-bold text-ink-3 uppercase tracking-[0.2em]">Command Center</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          {lastRefresh && (
            <span className="hidden md:inline text-[10px] text-ink-3 font-bold uppercase tracking-widest">
              Live • {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button 
            onClick={() => load(true)} 
            disabled={refreshing}
            className={`p-2 border border-rule rounded-lg transition-all flex items-center justify-center
              ${refreshing ? 'bg-paper-3 text-ink-3' : 'bg-paper hover:bg-paper-2 text-ink-2 hover:text-ink'}`}
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20 text-brand">
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Online</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-4 md:mx-8 mt-4 p-3 rounded-xl bg-chili/10 border border-chili/30 text-chili text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <AlertOctagon className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-4 md:px-8 mt-6">
        <div className="flex gap-2 p-1.5 bg-paper/50 border border-rule rounded-2xl overflow-x-auto hide-scrollbar custom-scrollbar w-full sm:w-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all shrink-0
                ${tab === t.key 
                  ? 'bg-paper-3 text-ink shadow-card border border-rule' 
                  : 'text-ink-3 hover:text-ink hover:bg-paper-2/50'}`}
            >
              <t.Icon className={`w-4 h-4 ${tab === t.key ? 'text-brand' : ''}`} />
              {t.label}
              {t.key === 'scans' && scans.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[9px] border border-brand/20">{scans.length}</span>}
              {t.key === 'community' && reports.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded bg-brand/10 text-brand text-[9px] border border-brand/20">{reports.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8 mt-6 max-w-6xl w-full mx-auto">

        {/* ── Overview Tab ── */}
        {tab === 'overview' && stats && (
          <div className="flex flex-col gap-6 animate-fade-up">
            
            {/* Primary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Search} label="Total Scans" value={stats.totalScans?.toLocaleString() || '0'} sub="All time" colorClass="text-brand" />
              <StatCard icon={Activity} label="Active Today" value={stats.todayScans || 0} sub="Scans in last 24h" colorClass="text-ink" />
              <StatCard icon={AlertOctagon} label="High Risk (%)" value={`${stats.totalScans ? Math.round(((stats.highRiskScans || 0) / stats.totalScans) * 100) : 0}%`} sub={`${stats.highRiskScans || 0} critical scans`} colorClass="text-chili" />
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers || 0} sub={`${stats.activeUsers || 0} active recently`} colorClass="text-ink" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trend Chart */}
              <div className="bg-paper border border-rule rounded-2xl p-6 shadow-soft relative overflow-hidden flex flex-col justify-between">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl rounded-full pointer-events-none" />
                 <h3 className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.15em] mb-8 relative z-10 flex items-center gap-2">
                   <BarChart2 className="w-3.5 h-3.5" /> Scan Volume (7 Days)
                 </h3>
                 <div className="relative z-10 mt-auto">
                   <MiniChart data={stats.weeklyTrend} />
                 </div>
              </div>

              {/* Risk Breakdown */}
              <div className="bg-paper border border-rule rounded-2xl p-6 shadow-soft relative overflow-hidden flex flex-col justify-between">
                 <div className="absolute top-0 left-0 w-32 h-32 bg-chili/5 blur-3xl rounded-full pointer-events-none" />
                 <h3 className="text-[11px] font-bold text-ink-3 uppercase tracking-[0.15em] mb-6 relative z-10 flex items-center gap-2">
                   <AlertOctagon className="w-3.5 h-3.5" /> Risk Distribution
                 </h3>
                 <div className="relative z-10 flex flex-col gap-4">
                   {Object.entries(stats.riskBreakdown || {}).length === 0 ? (
                     <div className="text-ink-3 text-xs text-center py-4 font-medium">No distribution data</div>
                   ) : (
                     Object.entries(stats.riskBreakdown || {}).sort((a,b) => b[1]-a[1]).map(([level, count]) => {
                       const colorCls = RISK_COLORS[level] || 'text-ink-2 bg-white/20'
                       const [textColor, bgColor] = colorCls.split(' ')
                       return (
                         <div key={level} className="flex items-center gap-3 group">
                           <div className={`w-14 text-[9px] font-bold uppercase tracking-wider ${textColor}`}>
                             {level}
                           </div>
                           <ProgressBar value={count} max={stats.totalScans || 1} colorClass={bgColor} />
                           <div className="w-10 text-right text-[10px] font-bold text-ink-2 group-hover:text-ink transition-colors">
                             {stats.totalScans ? Math.round((count / stats.totalScans) * 100) : 0}%
                           </div>
                         </div>
                       )
                     })
                   )}
                 </div>
              </div>
            </div>

            {/* Minor Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-paper-2/50 border border-rule rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-ink-3 uppercase tracking-widest mb-1.5">Avg Score</span>
                <span className="text-xl font-sans font-bold text-brand">{stats.avgScore || 0}</span>
                <span className="text-[9px] font-medium text-ink-3 mt-1">/ 100</span>
              </div>
              <div className="bg-paper-2/50 border border-rule rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-ink-3 uppercase tracking-widest mb-1.5">Top Food</span>
                <span className="text-sm font-bold text-ink truncate w-full px-2">{stats.topFood || '—'}</span>
              </div>
              <div className="bg-paper-2/50 border border-rule rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-ink-3 uppercase tracking-widest mb-1.5">Top City</span>
                <span className="text-sm font-bold text-ink truncate w-full px-2">{stats.topCity || '—'}</span>
              </div>
              <div className="bg-paper-2/50 border border-rule rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-ink-3 uppercase tracking-widest mb-1.5">FSSAI Reports</span>
                <span className="text-xl font-sans font-bold text-gold">{stats.fssaiViolations || 0}</span>
              </div>
            </div>

          </div>
        )}

        {/* ── Scans Tab ── */}
        {tab === 'scans' && (
          <div className="bg-paper border border-rule rounded-2xl overflow-hidden shadow-soft animate-fade-up">
            <div className="p-5 md:p-6 border-b border-rule flex justify-between items-center bg-paper-2/30">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4 text-ink-2" /> Global Scans Live Feed
              </h3>
              <span className="text-[10px] font-bold text-brand uppercase tracking-widest bg-brand/10 px-2 py-1 rounded-md border border-brand/20">
                Latest {scans.length}
              </span>
            </div>
            
            {scans.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-4 border-t border-rule bg-paper/30">
                <Search className="w-10 h-10 text-ink/10" />
                <span className="text-xs font-medium text-ink-3 uppercase tracking-widest">No scans recorded</span>
              </div>
            ) : (
              <div className="overflow-x-auto hide-scrollbar custom-scrollbar pb-2">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-paper-2/50 border-b border-rule">
                      {['Product / Food', 'Risk Assessment', 'Score', 'Location', 'Scanner Mode', 'Timestamp'].map(h => (
                        <th key={h} className="py-3.5 px-6 text-[9px] font-bold text-ink-3 uppercase tracking-[0.15em] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {scans.map((s, i) => (
                      <tr key={i} className="hover:bg-paper-2/30 transition-colors group">
                        <td className="py-4 px-6 font-bold text-ink text-sm">{s.food}</td>
                        <td className="py-4 px-6"><RiskBadge risk={s.risk} /></td>
                        <td className="py-4 px-6 text-xs font-bold text-ink-2 group-hover:text-ink">{s.score || '—'}</td>
                        <td className="py-4 px-6 text-xs font-medium text-ink-2">{s.city || 'Unknown'}</td>
                        <td className="py-4 px-6 text-[10px] font-bold text-ink-3 uppercase tracking-wider">{s.scan_type}</td>
                        <td className="py-4 px-6 text-[10px] font-medium text-ink-3 whitespace-nowrap">{s.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Community Tab ── */}
        {tab === 'community' && (
          <div className="bg-paper border border-rule rounded-2xl overflow-hidden shadow-soft animate-fade-up">
            <div className="p-5 md:p-6 border-b border-rule flex justify-between items-center bg-paper-2/30">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-ink-2" /> Crowdsourced Reports
              </h3>
            </div>
            
            {reports.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-4">
                <Users className="w-10 h-10 text-ink/10" />
                <span className="text-xs font-medium text-ink-3 uppercase tracking-widest">No reports submitted</span>
              </div>
            ) : (
              <div className="divide-y divide-rule">
                {reports.map((r, i) => (
                  <div key={i} className="p-5 md:p-6 hover:bg-paper-2/30 transition-colors">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-ink text-[15px]">{r.food_name}</span>
                          {r.brand && <span className="text-[10px] font-bold text-ink-3 bg-paper-3 px-2 py-0.5 rounded-md border border-rule">{r.brand}</span>}
                        </div>
                        <span className="text-[10px] font-bold text-ink-3 uppercase tracking-widest flex items-center gap-1.5">
                          📍 {r.city || 'Unknown Location'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {r.verified && <span className="text-[9px] font-bold uppercase tracking-widest bg-brand/10 text-brand border border-brand/20 px-2.5 py-1 rounded-md">✓ Verified</span>}
                        <span className="text-[10px] font-bold text-ink-2 bg-paper-3 px-2.5 py-1 rounded-md border border-rule flex items-center gap-1.5 hover:text-ink transition-colors cursor-default">
                          👍 {r.upvotes || 0}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-ink-2 leading-relaxed mt-3">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── FSSAI Tab ── */}
        {tab === 'fssai' && (
          <div className="bg-paper border border-rule rounded-2xl overflow-hidden shadow-soft animate-fade-up">
            <div className="p-5 md:p-6 border-b border-rule flex justify-between items-center bg-paper-2/30">
              <h3 className="text-sm font-bold text-ink uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-ink-2" /> Official Violations Database
              </h3>
            </div>
            
            {alerts.length === 0 ? (
              <div className="p-16 text-center flex flex-col items-center gap-4">
                <ShieldCheck className="w-10 h-10 text-ink/10" />
                <span className="text-xs font-medium text-ink-3 uppercase tracking-widest">No FSSAI alerts aggregated</span>
              </div>
            ) : (
              <div className="divide-y divide-rule">
                {alerts.map((a, i) => (
                  <div key={i} className="p-5 md:p-6 hover:bg-paper-2/30 transition-colors flex flex-col md:flex-row gap-4 md:items-center">
                     <div className="w-10 h-10 shrink-0 rounded-xl bg-chili/10 border border-chili/30 text-chili flex items-center justify-center">
                       <AlertOctagon className="w-5 h-5" />
                     </div>
                     <div className="flex-1 flex flex-col gap-1.5">
                       <div className="flex justify-between items-start md:items-center gap-3">
                         <h4 className="font-bold text-ink text-[14px]">{a.product || a.title || 'Regulatory Alert'}</h4>
                         <span className="text-[9px] font-bold text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-md uppercase tracking-widest whitespace-nowrap shrink-0">
                           {a.state || 'National'}
                         </span>
                       </div>
                       <p className="text-xs font-medium text-ink-2 leading-relaxed">{a.violation || a.description || 'Details unavailable'}</p>
                       <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider mt-1">{a.date}</span>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ML Tab ── */}
        {tab === 'ml' && (
          <div className="flex flex-col gap-6 animate-fade-up">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Core Nodes */}
              {[
                { id: 'llm_core', icon: Cpu, name: 'Google Gemini', detail: 'Text and ingredient analysis engine' },
                { id: 'llm_vision', icon: Globe, name: 'Gemini Vision', detail: 'Image and label analysis engine' },
                { id: 'backend', icon: Database, name: 'FastAPI Router', detail: 'Traffic Director & DB Cache' },
              ].map((m) => (
                <div key={m.id} className="bg-paper border border-rule rounded-2xl p-5 flex items-start gap-4 shadow-card group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-brand/5 blur-xl rounded-full group-hover:bg-brand/10 transition-colors pointer-events-none" />
                  <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 text-brand flex items-center justify-center shrink-0">
                    <m.icon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col flex-1 z-10">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <h4 className="text-[13px] font-bold text-ink leading-tight">{m.name}</h4>
                      <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20">
                         <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                         <span className="text-[8px] font-bold text-brand uppercase tracking-widest">Active</span>
                      </div>
                    </div>
                    <p className="text-[10px] font-medium text-ink-3 uppercase tracking-widest">{m.detail}</p>
                  </div>
                </div>
              ))}

              {/* Dynamic Models */}
              {Object.entries(mlStatus).map(([key, m]) => {
                const Icon = key === 'yolov8' ? Search : key === 'indicbert' ? Globe : key === 'prophet' ? BarChart2 : key === 'random_forest' ? Database : Activity
                const isLoaded = Boolean(m.loaded)
                const desc = m.classes ? `${m.classes} classes` : m.mappings ? `${m.mappings} mappings` : m.categories ? `${m.categories} categories` : 'Sub-process'

                return (
                  <div key={key} className={`bg-paper border ${isLoaded ? 'border-brand/20' : 'border-rule'} rounded-2xl p-5 flex items-start gap-4 shadow-card group relative overflow-hidden transition-colors`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-brand/5 blur-xl rounded-full group-hover:bg-brand/10 transition-colors pointer-events-none" />
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${isLoaded ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-paper-3 border-rule text-ink-3'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col flex-1 z-10">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className="text-[13px] font-bold text-ink leading-tight">{m.label || key}</h4>
                        <div className={`flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-full border ${isLoaded ? 'bg-brand/10 border-brand/20 text-brand' : 'bg-paper-3 border-rule text-ink-3'}`}>
                           {isLoaded && <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />}
                           <span className="text-[8px] font-bold uppercase tracking-widest">{isLoaded ? 'Active' : 'Offline'}</span>
                        </div>
                      </div>
                      <p className="text-[10px] font-medium text-ink-3 uppercase tracking-widest">{desc}</p>
                    </div>
                  </div>
                )
              })}

            </div>
          </div>
        )}

      </div>
    </div>
  )
}