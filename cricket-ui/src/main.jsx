import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './styles/tables.css'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initTelemetry } from './lib/telemetry.js'

initTelemetry()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

