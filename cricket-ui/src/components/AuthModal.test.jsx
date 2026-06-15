import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

const { signIn, signUp } = vi.hoisted(() => ({ signIn: vi.fn(), signUp: vi.fn() }))

vi.mock('../lib/supabase', () => ({ signIn, signUp }))

import AuthModal from './AuthModal'

function renderModal(props = {}) {
  const onSuccess = vi.fn()
  const onClose = vi.fn()
  const result = render(<AuthModal onSuccess={onSuccess} onClose={onClose} {...props} />)
  return { ...result, onSuccess, onClose }
}

beforeEach(() => {
  signIn.mockReset()
  signUp.mockReset()
  signIn.mockResolvedValue({ user: { id: 'u1' } })
  signUp.mockResolvedValue({ user: { id: 'u1' } })
})

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('AuthModal rendering', () => {
  it('renders the modal with login mode by default', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument()
  })

  it('shows the confirm-password field in register mode', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('tab', { name: /create account/i }))
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })
})

// ── Close behaviour ───────────────────────────────────────────────────────────

describe('AuthModal close behaviour', () => {
  it('calls onClose when the Escape key is pressed', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose for other keys', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('removes the Escape listener on unmount', () => {
    const { onClose, unmount } = renderModal()
    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ── Validation & submission ───────────────────────────────────────────────────

describe('AuthModal submission', () => {
  it('shows an error when register passwords do not match', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('tab', { name: /create account/i }))
    await user.type(screen.getByLabelText(/^email$/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret1')
    await user.type(screen.getByLabelText(/confirm password/i), 'secret2')
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i)
    expect(signUp).not.toHaveBeenCalled()
  })

  it('calls signIn and onSuccess on a successful login', async () => {
    const user = userEvent.setup()
    const { onSuccess } = renderModal()
    await user.type(screen.getByLabelText(/^email$/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password$/i), 'secret1')
    fireEvent.click(screen.getByRole('button', { name: /^log in$/i }))
    await waitFor(() => expect(signIn).toHaveBeenCalledWith('a@b.com', 'secret1'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })

  it('surfaces an error message when signIn rejects', async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValue(new Error('Invalid credentials'))
    renderModal()
    await user.type(screen.getByLabelText(/^email$/i), 'a@b.com')
    await user.type(screen.getByLabelText(/^password$/i), 'wrong')
    fireEvent.click(screen.getByRole('button', { name: /^log in$/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid credentials/i)
  })
})
