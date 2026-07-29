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
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          fontFamily: '"Source Sans 3", system-ui, sans-serif',
          textAlign: 'center',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 999,
            background: '#4a90d9', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" />
            </svg>
          </div>
          <div style={{
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: '#1c1917',
            marginBottom: 8,
          }}>
            Something went wrong
          </div>
          <div style={{
            fontSize: 14,
            color: '#57534e',
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
              fontFamily: 'ui-monospace, monospace',
              color: '#57534e',
              background: '#eef1f5',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #dde3ea',
              marginBottom: 20,
              maxWidth: 360,
              wordBreak: 'break-all',
              textAlign: 'left',
            }}>
              {this.state.error.toString()}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.href = '/'
            }}
            style={{
              padding: '11px 28px',
              borderRadius: 10,
              border: '1px solid #4a90d9',
              background: '#4a90d9',
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
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
