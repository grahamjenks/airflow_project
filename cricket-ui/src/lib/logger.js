const isProd = import.meta.env.PROD

function safeJson(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return '"[unserializable]"'
  }
}

function baseFields() {
  return {
    app: 'cricket-ui',
    env: import.meta.env.MODE,
    ts: new Date().toISOString(),
  }
}

function emit(level, event, fields) {
  const payload = { level, event, ...baseFields(), ...(fields || {}) }
  const msg = `[${payload.level}] ${payload.event} ${safeJson(payload)}`

  if (level === 'error') console.error(msg)
  else if (level === 'warn') console.warn(msg)
  else console.log(msg)

  // If telemetry is configured, forward errors there too.
  if (level === 'error' && typeof window !== 'undefined' && window.__telemetryCaptureException) {
    const err = fields?.error instanceof Error ? fields.error : new Error(event)
    window.__telemetryCaptureException(err, { extra: payload })
  }
}

export const logger = {
  info: (event, fields) => emit('info', event, isProd ? fields : fields),
  warn: (event, fields) => emit('warn', event, fields),
  error: (event, fields) => emit('error', event, fields),
}

