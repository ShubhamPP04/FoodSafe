import { useState } from 'react'

const SEVERITY_CONFIG = {
  CRITICAL: { bg: '#fee2e2', border: '#fca5a5', text: '#B71C1C', badge: '#FF3B30', badgeText: '#fff', icon: '🚨' },
  HIGH:     { bg: '#fef2f2', border: '#f7c1c1', text: '#C62828', badge: '#FF3B30', badgeText: '#fff', icon: '⚠️'  },
  MEDIUM:   { bg: '#FFF8E1', border: '#fcd34d', text: '#BF360C', badge: '#F57F17', badgeText: '#fff', icon: '⚡'  },
  LOW:      { bg: '#E8F8F5', border: '#64DFD4', text: '#00897B', badge: '#00BFA5', badgeText: '#fff', icon: 'ℹ️'  },
  NONE:     { bg: '#F5F5F7', border: '#E5E5E7', text: '#6E6E73',   badge: '#AEAEB2',    badgeText: '#fff', icon: '✅'  },
}

const STATUS_BAR = {
  over:        { bar: '#FF3B30', label: 'Over limit' },
  approaching: { bar: '#F57F17', label: 'Approaching' },
  safe:        { bar: '#00BFA5', label: 'Safe'        },
}

export const OC_STYLES = `
  .ocb-wrap { border-radius: 16px; border: 1px solid; overflow: hidden; margin-bottom: 0; }
  .ocb-header { display: flex; align-items: center; gap: 10px; padding: 12px 16px; }
  .ocb-header-icon { font-size: 18px; flex-shrink: 0; }
  .ocb-header-title { font-size: 13px; font-weight: 600; flex: 1; }
  .ocb-badge { font-size: 9px; font-weight: 700; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 8px; text-transform: uppercase; }
  .ocb-chevron { font-size: 12px; color: #aaa; transition: transform 0.2s; cursor: pointer; }
  .ocb-chevron.open { transform: rotate(180deg); }
  .ocb-body { padding: 0 16px 14px; display: flex; flex-direction: column; gap: 8px; }
  .ocb-flag { border-radius: 10px; padding: 10px 12px; border: 1px solid; }
  .ocb-flag-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .ocb-flag-icon { font-size: 16px; }
  .ocb-flag-label { font-size: 12px; font-weight: 600; flex: 1; }
  .ocb-flag-sev { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 6px; }
  .ocb-flag-why { font-size: 11px; line-height: 1.5; opacity: 0.8; margin-top: 3px; }
  .ocb-count-row { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
  .ocb-count-bar-bg { flex: 1; height: 5px; background: rgba(0,0,0,0.08); border-radius: 3px; overflow: hidden; }
  .ocb-count-bar { height: 5px; border-radius: 3px; transition: width 0.6s ease; }
  .ocb-count-label { font-size: 10px; font-weight: 500; white-space: nowrap; }
  .ocb-divider { height: 1px; background: rgba(0,0,0,0.06); margin: 2px 0; }
  .ocb-all-clear { display: flex; align-items: center; gap: 8px; padding: 4px 0 2px; font-size: 12px; font-weight: 500; }
  .ocd-category { border-radius: 12px; padding: 10px 14px; border: 1px solid #E5E5E7; background: #fff; margin-bottom: 6px; }
  .ocd-cat-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .ocd-cat-icon { font-size: 16px; }
  .ocd-cat-label { font-size: 12px; font-weight: 600; color: #1D1D1F; flex: 1; }
  .ocd-cat-status { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; padding: 2px 7px; border-radius: 6px; }
  .ocd-bar-bg { height: 6px; background: #F0F0F2; border-radius: 3px; overflow: hidden; }
  .ocd-bar { height: 6px; border-radius: 3px; transition: width 0.8s ease; }
  .ocd-count-text { font-size: 10px; color: #888; margin-top: 4px; }
  .ocd-warn-box { background: #fef2f2; border: 1px solid #f7c1c1; border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; }
  .ocd-warn-title { font-size: 12px; font-weight: 700; color: #C62828; margin-bottom: 6px; }
  .ocd-warn-item { font-size: 11px; color: #C62828; padding: 2px 0; }
  .ocd-safe-box { background: #E8F8F5; border: 1px solid #64DFD4; border-radius: 12px; padding: 12px 14px; text-align: center; }
  .ocd-safe-text { font-size: 13px; font-weight: 600; color: #00897B; }
  .ocd-safe-sub { font-size: 11px; color: #00BFA5; margin-top: 3px; }
  @keyframes ocSlide { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
  .oc-slide { animation: ocSlide 0.2s ease forwards; }
`

export function ScanBanner({ warnings }) {
  const [open, setOpen] = useState(false)

  if (!warnings || !warnings.hasWarnings) {
    const cfg = SEVERITY_CONFIG.NONE
    return (
      <div className="ocb-wrap" style={{ background: cfg.bg, borderColor: cfg.border }}>
        <div className="ocb-header">
          <span className="ocb-header-icon">✅</span>
          <span className="ocb-header-title" style={{ color: cfg.text }}>No overconsumption warnings for today</span>
        </div>
      </div>
    )
  }

  const sev = warnings.overallSeverity || 'MEDIUM'
  const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.MEDIUM
  const totalFlags = (warnings.categoryFlags?.length || 0) + (warnings.additiveFlags?.length || 0)

  return (
    <div className="ocb-wrap" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <div className="ocb-header" onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <span className="ocb-header-icon">{cfg.icon}</span>
        <span className="ocb-header-title" style={{ color: cfg.text }}>
          {totalFlags} overconsumption warning{totalFlags !== 1 ? 's' : ''}
        </span>
        <span className="ocb-badge" style={{ background: cfg.badge, color: cfg.badgeText }}>{sev}</span>
        <span className={`ocb-chevron ${open ? 'open' : ''}`}>▼</span>
      </div>

      {open && (
        <div className="ocb-body oc-slide">
          {warnings.categoryFlags?.map((flag, i) => {
            const overBy = flag.today_count - flag.limit
            const pct = Math.min((flag.today_count / (flag.limit + overBy + 1)) * 100, 100)
            return (
              <div key={i} className="ocb-flag" style={{ background: 'rgba(255,255,255,0.5)', borderColor: cfg.border }}>
                <div className="ocb-flag-row">
                  <span className="ocb-flag-icon">{flag.icon}</span>
                  <span className="ocb-flag-label" style={{ color: cfg.text }}>{flag.label}</span>
                </div>
                <div className="ocb-count-row">
                  <div className="ocb-count-bar-bg">
                    <div className="ocb-count-bar" style={{ width: `${pct}%`, background: sev === 'CRITICAL' ? '#FF3B30' : sev === 'HIGH' ? '#FF3B30' : '#F57F17' }} />
                  </div>
                  <span className="ocb-count-label" style={{ color: cfg.text }}>{flag.today_count}/{flag.limit} today</span>
                </div>
                <div className="ocb-flag-why" style={{ color: cfg.text }}>{flag.why}</div>
              </div>
            )
          })}

          {warnings.additiveFlags?.map((flag, i) => {
            const aconf = SEVERITY_CONFIG[flag.severity] || SEVERITY_CONFIG.MEDIUM
            return (
              <div key={i} className="ocb-flag" style={{ background: aconf.bg, borderColor: aconf.border }}>
                <div className="ocb-flag-row">
                  <span className="ocb-flag-icon">🧪</span>
                  <span className="ocb-flag-label" style={{ color: aconf.text }}>{flag.additive}</span>
                  <span className="ocb-flag-sev" style={{ background: aconf.badge, color: aconf.badgeText }}>{flag.severity}</span>
                </div>
                <div className="ocb-flag-why" style={{ color: aconf.text }}>
                  {flag.risk}{flag.detected_in ? <span style={{ opacity: 0.65 }}> — found in {flag.detected_in}</span> : ''}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DigestPanel({ digest, loading }) {
  if (loading) return <div style={{ textAlign: 'center', padding: '20px', color: '#aaa', fontSize: 12 }}>Loading weekly digest…</div>
  if (!digest) return null

  const warned     = Object.values(digest.categories || {}).filter(c => c.status === 'over')
  const allCats    = Object.values(digest.categories || {}).filter(c => c.count > 0)

  return (
    <div>
      {warned.length > 0 && (
        <div className="ocd-warn-box">
          <div className="ocd-warn-title">⚠️ Over weekly limit</div>
          {warned.map((c, i) => (
            <div key={i} className="ocd-warn-item">{c.icon} {c.label} — {c.count} servings (limit: {c.weekly_limit})</div>
          ))}
        </div>
      )}
      {digest.safe && allCats.length > 0 && (
        <div className="ocd-safe-box" style={{ marginBottom: 8 }}>
          <div className="ocd-safe-text">✅ All categories within safe limits</div>
          <div className="ocd-safe-sub">Great eating habits this week!</div>
        </div>
      )}
      {allCats.map((cat, i) => {
        const statusInfo = STATUS_BAR[cat.status] || STATUS_BAR.safe
        return (
          <div key={i} className="ocd-category">
            <div className="ocd-cat-row">
              <span className="ocd-cat-icon">{cat.icon}</span>
              <span className="ocd-cat-label">{cat.label}</span>
              <span className="ocd-cat-status" style={{ background: statusInfo.bar + '22', color: statusInfo.bar, border: `1px solid ${statusInfo.bar}55` }}>{statusInfo.label}</span>
            </div>
            <div className="ocd-bar-bg"><div className="ocd-bar" style={{ width: `${cat.pct}%`, background: statusInfo.bar }} /></div>
            <div className="ocd-count-text">{cat.count} servings this week · limit {cat.weekly_limit}</div>
          </div>
        )
      })}
      {allCats.length === 0 && <div style={{ textAlign: 'center', padding: 16, color: '#aaa', fontSize: 12 }}>No categorised foods scanned this week yet.</div>}
      <div style={{ fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 4 }}>Period: {digest.period} · {digest.totalScans} total scans</div>
    </div>
  )
}