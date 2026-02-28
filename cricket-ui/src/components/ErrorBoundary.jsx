import { Component } from 'react'
import { logger } from '../lib/logger'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    logger.error('ui.render_error', { error, errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
          <h2>Something went wrong</h2>
          <p>
            Please refresh the page. If this keeps happening, check the browser console (or configured telemetry) for
            details.
          </p>
          <button onClick={() => window.location.reload()}>Refresh</button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

