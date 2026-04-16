// @vitest-environment jsdom
// PLAT-ALERT-002 — SettingsPage sound notifications toggle tests
//
// Coverage groups:
//   A. Rendering        (1–2)
//   B. Behavior         (3–7)
//   C. Persistence      (8)
//   D. Accessibility    (9–10)
//   E. Preview button   (11)

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsPage } from './SettingsPage'

// ─── Module mocks ──────────────────────────────────────────────────────────────

const mockSetSoundNotificationsEnabled = vi.fn()
let mockSoundEnabled = true

vi.mock('../../app/store/settingsStore', () => ({
  useSettingsStore: () => ({
    soundNotificationsEnabled: mockSoundEnabled,
    setSoundNotificationsEnabled: mockSetSoundNotificationsEnabled,
  }),
}))

const mockPlayTestBeep = vi.fn()
vi.mock('../../shared/lib/attentionSignal', () => ({
  playTestBeep: (...args: unknown[]) => mockPlayTestBeep(...args),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderPage() {
  return render(<SettingsPage />)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockSoundEnabled = true
})

// ─── A. Rendering ─────────────────────────────────────────────────────────────

describe('A. Rendering', () => {
  it('1. toggle is visible', () => {
    renderPage()
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('2. label and description text are visible', () => {
    renderPage()
    expect(screen.getByText('Звуковые уведомления')).toBeInTheDocument()
    expect(
      screen.getByText('Короткий сигнал при ожидании подтверждения и после завершения задачи.'),
    ).toBeInTheDocument()
  })
})

// ─── B. Behavior ─────────────────────────────────────────────────────────────

describe('B. Behavior', () => {
  it('3. toggle is checked (aria-checked=true) when soundNotificationsEnabled = true', () => {
    mockSoundEnabled = true
    renderPage()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('4. toggle is unchecked (aria-checked=false) when soundNotificationsEnabled = false', () => {
    mockSoundEnabled = false
    renderPage()
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('5. clicking toggle when enabled calls setSoundNotificationsEnabled(false)', () => {
    mockSoundEnabled = true
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    expect(mockSetSoundNotificationsEnabled).toHaveBeenCalledWith(false)
  })

  it('6. clicking toggle when disabled calls setSoundNotificationsEnabled(true)', () => {
    mockSoundEnabled = false
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    expect(mockSetSoundNotificationsEnabled).toHaveBeenCalledWith(true)
  })

  it('7. setter is called exactly once per click', () => {
    renderPage()
    fireEvent.click(screen.getByRole('switch'))
    expect(mockSetSoundNotificationsEnabled).toHaveBeenCalledTimes(1)
  })
})

// ─── C. Persistence ───────────────────────────────────────────────────────────

describe('C. Persistence', () => {
  it('8. UI reflects store value on re-render (disabled state shows helper text)', () => {
    mockSoundEnabled = false
    renderPage()
    expect(
      screen.getByText('Визуальные индикаторы продолжат работать.'),
    ).toBeInTheDocument()
  })
})

// ─── D. Accessibility ─────────────────────────────────────────────────────────

describe('D. Accessibility', () => {
  it('9. toggle is associated with its label via aria-labelledby', () => {
    renderPage()
    const toggle = screen.getByRole('switch')
    const labelId = toggle.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const labelEl = document.getElementById(labelId!)
    expect(labelEl).toBeInTheDocument()
    expect(labelEl!.textContent).toContain('Звуковые уведомления')
  })

  it('10. toggle is associated with description via aria-describedby', () => {
    renderPage()
    const toggle = screen.getByRole('switch')
    const descId = toggle.getAttribute('aria-describedby')
    expect(descId).toBeTruthy()
    const descEl = document.getElementById(descId!)
    expect(descEl).toBeInTheDocument()
    expect(descEl!.textContent).toContain('Короткий сигнал')
  })
})

// ─── E. Preview button ────────────────────────────────────────────────────────

describe('E. Preview button', () => {
  it('11. clicking "Проверить звук" calls playTestBeep without starting a repeating cycle', () => {
    mockSoundEnabled = true
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Проверить звук/ }))
    expect(mockPlayTestBeep).toHaveBeenCalledTimes(1)
  })
})
