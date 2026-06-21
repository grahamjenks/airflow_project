import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

function Harness() {
  const toast = useToast()
  return (
    <div>
      <button onClick={() => toast.error('save failed')}>err</button>
      <button onClick={() => toast.success('saved', { duration: 0 })}>ok</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <Harness />
    </ToastProvider>
  )
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.runOnlyPendingTimers(); vi.useRealTimers() })

describe('Toast', () => {
  it('shows a toast when triggered', () => {
    renderWithProvider()
    act(() => { fireEvent.click(screen.getByText('err')) })
    expect(screen.getByText('save failed')).toBeInTheDocument()
  })

  it('can be dismissed manually', () => {
    renderWithProvider()
    act(() => { fireEvent.click(screen.getByText('ok')) })
    expect(screen.getByText('saved')).toBeInTheDocument()
    act(() => { fireEvent.click(screen.getByLabelText('Dismiss notification')) })
    expect(screen.queryByText('saved')).not.toBeInTheDocument()
  })

  it('auto-dismisses after the duration elapses', () => {
    renderWithProvider()
    act(() => { fireEvent.click(screen.getByText('err')) })
    expect(screen.getByText('save failed')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(6000) })
    expect(screen.queryByText('save failed')).not.toBeInTheDocument()
  })

  it('useToast is a safe no-op without a provider', () => {
    function Solo() {
      const toast = useToast()
      return <button onClick={() => toast.error('x')}>go</button>
    }
    render(<Solo />)
    expect(() => fireEvent.click(screen.getByText('go'))).not.toThrow()
  })
})
