import * as Sentry from '@sentry/react'

function hasDsn() {
  return Boolean(import.meta.env.VITE_SENTRY_DSN)
}

export function initTelemetry() {
  if (typeof window === 'undefined') return

  if (hasDsn()) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    })
  }

  // Provide a stable capture hook for the logger (and other call sites).
  window.__telemetryCaptureException = (error, context) => {
    if (hasDsn()) Sentry.captureException(error, context)
  }

  window.addEventListener('error', (event) => {
    window.__telemetryCaptureException?.(event.error || new Error(event.message || 'window.error'), {
      tags: { source: 'window.error' },
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    window.__telemetryCaptureException?.(reason, {
      tags: { source: 'window.unhandledrejection' },
    })
  })
}

