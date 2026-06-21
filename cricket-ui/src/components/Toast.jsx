import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import './Toast.css'

const ToastContext = createContext(null)

let idSeq = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback((message, { type = 'info', duration = 4000 } = {}) => {
    const id = ++idSeq
    setToasts((list) => [...list, { id, message, type }])
    if (duration > 0) {
      timers.current.set(id, setTimeout(() => dismiss(id), duration))
    }
    return id
  }, [dismiss])

  // Clean up any pending timers on unmount.
  useEffect(() => {
    const map = timers.current
    return () => { map.forEach(clearTimeout); map.clear() }
  }, [])

  const api = useRef({
    show,
    success: (m, o) => show(m, { ...o, type: 'success' }),
    error: (m, o) => show(m, { ...o, type: 'error', duration: o?.duration ?? 6000 }),
    info: (m, o) => show(m, { ...o, type: 'info' }),
    dismiss,
  })
  // keep callbacks fresh
  api.current.show = show
  api.current.dismiss = dismiss

  return (
    <ToastContext.Provider value={api.current}>
      {children}
      <div className="toast-region" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role="status">
            <span className="toast__icon" aria-hidden="true">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="toast__msg">{t.message}</span>
            <button
              type="button"
              className="toast__close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // No-op fallback so callers never crash if used outside a provider.
    return { show: () => {}, success: () => {}, error: () => {}, info: () => {}, dismiss: () => {} }
  }
  return ctx
}
