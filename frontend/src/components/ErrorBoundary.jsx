import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('FoodSafe Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          background: 'oklch(97.2% 0.006 150)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          fontFamily: '"Outfit", system-ui, sans-serif',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'oklch(52% 0.13 155)', color: 'oklch(98% 0.004 150)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
            </svg>
          </div>
          <div style={{
            fontFamily: '"Outfit", system-ui, sans-serif',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'oklch(22% 0.035 155)',
            marginBottom: 8,
          }}>
            Something went wrong
          </div>
          <div style={{
            fontSize: 14,
            color: 'oklch(52% 0.018 155)',
            fontWeight: 400,
            marginBottom: 24,
            lineHeight: 1.6,
            maxWidth: 320,
          }}>
            An unexpected error occurred. Your scan history is safe.
          </div>
          {this.props.showError && this.state.error && (
            <div style={{
              fontSize: 11,
              fontFamily: '"DM Mono", monospace',
              color: 'oklch(38% 0.025 155)',
              background: 'oklch(94.5% 0.008 150)',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid oklch(88% 0.008 150)',
              marginBottom: 20,
              maxWidth: 360,
              wordBreak: 'break-all',
              textAlign: 'left',
            }}>
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = '/'
            }}
            style={{
              padding: '11px 28px',
              borderRadius: 10,
              border: '1px solid oklch(22% 0.035 155)',
              background: 'oklch(22% 0.035 155)',
              color: 'oklch(98% 0.004 150)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            Back to home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
