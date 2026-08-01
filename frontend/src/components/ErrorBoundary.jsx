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
    console.error('SafeThali Error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100dvh',
          background: '#F5F5F7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 999,
            background: '#00BFA5', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
            </svg>
          </div>
          <div style={{
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontWeight: 800, fontSize: 24, letterSpacing: '-0.02em',
            color: '#1D1D1F', marginBottom: 8,
          }}>
            Something went wrong
          </div>
          <div style={{
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontSize: 14, color: '#6E6E73', marginBottom: 24,
          }}>
            An unexpected error occurred. Your scan history is safe.
          </div>
          {this.props.showError && this.state.error && (
            <pre style={{
              marginTop: 8, marginBottom: 16, padding: 12,
              background: '#FFF3F3', border: '1px solid #FF3B30',
              borderRadius: 8, maxWidth: 500, textAlign: 'left',
              fontFamily: 'monospace', fontSize: 11, color: '#C62828',
              whiteSpace: 'pre-wrap',
            }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
            style={{
              padding: '12px 28px', borderRadius: 999,
              border: '1px solid #00BFA5', background: '#00BFA5',
              color: '#FFFFFF',
              fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
              fontWeight: 700, fontSize: 14, cursor: 'pointer',
              transition: 'background 0.3s cubic-bezier(0.32,0.72,0,1)',
            }}
          >
            Back to home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
