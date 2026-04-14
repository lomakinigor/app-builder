// @vitest-environment jsdom
// T-017 — GateDiagnostics shared component tests.
//
// Coverage:
//   A. Renders nothing when reasons is empty
//   B. Renders a single reason
//   C. Renders multiple reasons as separate paragraphs
//   D. variant='warning' (default) uses amber styling cue
//   E. variant='error' renders error icon
//   F. variant='neutral' renders info icon
//   G. CTA button rendered and clickable when provided
//   H. No CTA rendered when prop omitted
//   I. data-testid is present for targeting in page tests

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GateDiagnostics } from './GateDiagnostics'

// ─── A. Empty reasons ─────────────────────────────────────────────────────────

describe('A. Empty reasons — renders nothing', () => {
  it('renders nothing when reasons is empty', () => {
    const { container } = render(<GateDiagnostics reasons={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('does NOT render data-testid when reasons is empty', () => {
    render(<GateDiagnostics reasons={[]} />)
    expect(screen.queryByTestId('gate-diagnostics')).not.toBeInTheDocument()
  })
})

// ─── B. Single reason ─────────────────────────────────────────────────────────

describe('B. Single reason', () => {
  it('renders the reason text', () => {
    render(<GateDiagnostics reasons={['Список фич пуст.']} />)
    expect(screen.getByText('Список фич пуст.')).toBeInTheDocument()
  })

  it('renders the gate-diagnostics wrapper', () => {
    render(<GateDiagnostics reasons={['Список фич пуст.']} />)
    expect(screen.getByTestId('gate-diagnostics')).toBeInTheDocument()
  })
})

// ─── C. Multiple reasons ──────────────────────────────────────────────────────

describe('C. Multiple reasons', () => {
  it('renders each reason as a separate element', () => {
    render(
      <GateDiagnostics
        reasons={['Тесты не обнаружены.', 'Задача для ревью не указана.']}
      />
    )
    expect(screen.getByText('Тесты не обнаружены.')).toBeInTheDocument()
    expect(screen.getByText('Задача для ревью не указана.')).toBeInTheDocument()
  })

  it('renders exactly two paragraphs for two reasons', () => {
    const { container } = render(
      <GateDiagnostics
        reasons={['Причина 1.', 'Причина 2.']}
      />
    )
    const paras = container.querySelectorAll('p')
    expect(paras.length).toBe(2)
  })
})

// ─── D. variant='warning' (default) ──────────────────────────────────────────

describe('D. variant warning (default)', () => {
  it('renders ⚠️ icon for default variant', () => {
    render(<GateDiagnostics reasons={['Some reason.']} />)
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })

  it('renders ⚠️ icon when variant is explicitly "warning"', () => {
    render(<GateDiagnostics reasons={['Some reason.']} variant="warning" />)
    expect(screen.getByText('⚠️')).toBeInTheDocument()
  })
})

// ─── E. variant='error' ───────────────────────────────────────────────────────

describe('E. variant error', () => {
  it('renders 🚫 icon', () => {
    render(<GateDiagnostics reasons={['Critical error.']} variant="error" />)
    expect(screen.getByText('🚫')).toBeInTheDocument()
  })

  it('does NOT render ⚠️ icon for error variant', () => {
    render(<GateDiagnostics reasons={['Critical error.']} variant="error" />)
    expect(screen.queryByText('⚠️')).not.toBeInTheDocument()
  })
})

// ─── F. variant='neutral' ─────────────────────────────────────────────────────

describe('F. variant neutral', () => {
  it('renders ℹ️ icon', () => {
    render(<GateDiagnostics reasons={['Info message.']} variant="neutral" />)
    expect(screen.getByText('ℹ️')).toBeInTheDocument()
  })
})

// ─── G. CTA button ────────────────────────────────────────────────────────────

describe('G. CTA button', () => {
  it('renders CTA label when prop is provided', () => {
    render(
      <GateDiagnostics
        reasons={['Список фич пуст.']}
        cta={{ label: 'Перейти к спецификации', onClick: vi.fn() }}
      />
    )
    expect(screen.getByText(/Перейти к спецификации/)).toBeInTheDocument()
  })

  it('calls onClick when CTA is clicked', () => {
    const onClick = vi.fn()
    render(
      <GateDiagnostics
        reasons={['Some reason.']}
        cta={{ label: 'Действие', onClick }}
      />
    )
    fireEvent.click(screen.getByText(/Действие/))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('CTA text includes "→" arrow', () => {
    render(
      <GateDiagnostics
        reasons={['Some reason.']}
        cta={{ label: 'Перейти', onClick: vi.fn() }}
      />
    )
    expect(screen.getByText(/Перейти →/)).toBeInTheDocument()
  })
})

// ─── H. No CTA when omitted ───────────────────────────────────────────────────

describe('H. No CTA when omitted', () => {
  it('does NOT render a button when cta prop is omitted', () => {
    render(<GateDiagnostics reasons={['Some reason.']} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

// ─── I. data-testid ───────────────────────────────────────────────────────────

describe('I. data-testid presence', () => {
  it('has data-testid="gate-diagnostics" when reasons are present', () => {
    render(<GateDiagnostics reasons={['Any reason.']} />)
    expect(screen.getByTestId('gate-diagnostics')).toBeInTheDocument()
  })
})
