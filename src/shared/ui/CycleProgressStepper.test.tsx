// @vitest-environment jsdom
// T-204 — CycleProgressStepper acceptance tests
// Implements F-024
//
// Coverage areas:
//   A. Rendering — canonical phases rendered, done/active/upcoming visual states
//   B. State mapping — phase statuses correctly reflected in the UI
//   C. Cross-project behavior — stepper re-renders when phases prop changes
//   D. Navigation semantics — clicking a phase button navigates to its path
//   E. Accessibility — aria-labels, ordered list semantics

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CycleProgressStepper } from './CycleProgressStepper'
import type { CyclePhaseProgress, CyclePhaseId } from '../lib/superpowers/cycleProgress'

// ─── Module mocks ─────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const CANONICAL_PHASES: CyclePhaseProgress[] = [
  { id: 'brainstorm',     label: 'Идея',        icon: '💡', path: '/idea',         status: 'not_started', hint: 'Введите идею' },
  { id: 'spec',           label: 'Спец',         icon: '🔍', path: '/research',     status: 'not_started', hint: 'Добавьте идею' },
  { id: 'plan',           label: 'План',         icon: '📋', path: '/spec',         status: 'not_started', hint: 'Завершите исследование' },
  { id: 'tasks',          label: 'Задачи',       icon: '🏗️', path: '/architecture', status: 'not_started', hint: 'Завершите план' },
  { id: 'code_and_tests', label: 'Код + Тесты',  icon: '⚡', path: '/prompt-loop',  status: 'not_started', hint: 'Первый промпт' },
  { id: 'review',         label: 'Обзор',        icon: '🔍', path: '/history',      status: 'not_started', hint: 'Запустите цикл' },
]

function makePhases(
  overrides: Partial<Record<CyclePhaseId, Partial<CyclePhaseProgress>>>,
): CyclePhaseProgress[] {
  return CANONICAL_PHASES.map((p) => ({ ...p, ...(overrides[p.id] ?? {}) }))
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => vi.clearAllMocks())

// ─── A. Rendering ─────────────────────────────────────────────────────────────

describe('A. Rendering — canonical cycle phases', () => {
  it('renders all 6 phase labels', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    expect(screen.getByText('Идея')).toBeInTheDocument()
    expect(screen.getByText('Спец')).toBeInTheDocument()
    expect(screen.getByText('План')).toBeInTheDocument()
    expect(screen.getByText('Задачи')).toBeInTheDocument()
    expect(screen.getByText('Код + Тесты')).toBeInTheDocument()
    expect(screen.getByText('Обзор')).toBeInTheDocument()
  })

  it('renders phases as an ordered list', () => {
    const { container } = render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    expect(container.querySelector('ol')).toBeInTheDocument()
  })

  it('renders a button for each phase', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
  })

  it('done phase button shows ✓ symbol', () => {
    const phases = makePhases({ brainstorm: { status: 'done', hint: 'Готово' } })
    render(<CycleProgressStepper phases={phases} />)
    const btn = screen.getByRole('button', { name: /Идея: done/ })
    expect(btn.textContent).toContain('✓')
  })

  it('not_started phase button shows phase icon, not ✓', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    const btn = screen.getByRole('button', { name: /Идея: not_started/ })
    expect(btn.textContent).not.toContain('✓')
    expect(btn.textContent).toContain('💡')
  })

  it('renders without crashing when phases is empty', () => {
    expect(() => render(<CycleProgressStepper phases={[]} />)).not.toThrow()
  })
})

// ─── B. State mapping ─────────────────────────────────────────────────────────

describe('B. State mapping — phase statuses reflected in aria-labels', () => {
  it('in_progress phase button has aria-label containing "in_progress"', () => {
    const phases = makePhases({ plan: { status: 'in_progress', hint: 'Идёт' } })
    render(<CycleProgressStepper phases={phases} />)
    const btn = screen.getByRole('button', { name: /План: in_progress/ })
    expect(btn).toBeInTheDocument()
  })

  it('done phase button has aria-label containing "done"', () => {
    const phases = makePhases({ brainstorm: { status: 'done', hint: 'Готово' } })
    render(<CycleProgressStepper phases={phases} />)
    expect(screen.getByRole('button', { name: /Идея: done/ })).toBeInTheDocument()
  })

  it('upcoming (not_started) phase button has aria-label containing "not_started"', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    expect(screen.getByRole('button', { name: /Задачи: not_started/ })).toBeInTheDocument()
  })

  it('in_progress phase button has ring-violet styling class', () => {
    const phases = makePhases({ spec: { status: 'in_progress', hint: 'Идёт' } })
    render(<CycleProgressStepper phases={phases} />)
    const btn = screen.getByRole('button', { name: /Спец: in_progress/ })
    expect(btn.className).toContain('ring-violet-200')
  })
})

// ─── C. Cross-project behavior ────────────────────────────────────────────────

describe('C. Cross-project behavior — stepper updates when phases prop changes', () => {
  it('re-renders with new phase statuses after prop change (simulates project switch)', () => {
    const projectA = makePhases({ brainstorm: { status: 'done', hint: 'Готово' } })
    const projectB = makePhases({
      brainstorm: { status: 'done', hint: 'Готово' },
      spec: { status: 'done', hint: 'Готово' },
      plan: { status: 'in_progress', hint: 'Идёт' },
    })

    const { rerender } = render(<CycleProgressStepper phases={projectA} />)
    expect(screen.getByRole('button', { name: /Идея: done/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Спец: not_started/ })).toBeInTheDocument()

    rerender(<CycleProgressStepper phases={projectB} />)
    expect(screen.getByRole('button', { name: /Спец: done/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /План: in_progress/ })).toBeInTheDocument()
  })

  it('switching from project with progress to fresh project shows all not_started', () => {
    const withProgress = makePhases({
      brainstorm: { status: 'done', hint: 'Готово' },
      spec: { status: 'in_progress', hint: 'Идёт' },
    })

    const { rerender } = render(<CycleProgressStepper phases={withProgress} />)
    expect(screen.getByRole('button', { name: /Идея: done/ })).toBeInTheDocument()

    rerender(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    expect(screen.getByRole('button', { name: /Идея: not_started/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Спец: not_started/ })).toBeInTheDocument()
  })
})

// ─── D. Navigation semantics ──────────────────────────────────────────────────

describe('D. Navigation semantics — clicking phases navigates', () => {
  it('clicking Идея button navigates to /idea', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    fireEvent.click(screen.getByRole('button', { name: /Идея/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/idea')
  })

  it('clicking Спец button navigates to /research', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    fireEvent.click(screen.getByRole('button', { name: /Спец/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/research')
  })

  it('clicking Код + Тесты button navigates to /prompt-loop', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    fireEvent.click(screen.getByRole('button', { name: /Код/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/prompt-loop')
  })

  it('calls navigate exactly once per click', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    fireEvent.click(screen.getByRole('button', { name: /Обзор/ }))
    expect(mockNavigate).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith('/history')
  })

  it('clicking done phase still navigates to its path', () => {
    const phases = makePhases({ brainstorm: { status: 'done', hint: 'Готово' } })
    render(<CycleProgressStepper phases={phases} />)
    fireEvent.click(screen.getByRole('button', { name: /Идея/ }))
    expect(mockNavigate).toHaveBeenCalledWith('/idea')
  })
})

// ─── E. Accessibility ─────────────────────────────────────────────────────────

describe('E. Accessibility', () => {
  it('each phase button has an aria-label', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    const buttons = screen.getAllByRole('button')
    for (const btn of buttons) {
      expect(btn).toHaveAttribute('aria-label')
      expect(btn.getAttribute('aria-label')!.length).toBeGreaterThan(0)
    }
  })

  it('aria-label includes phase label and status', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    const ideaBtn = screen.getByRole('button', { name: /Идея/ })
    expect(ideaBtn.getAttribute('aria-label')).toContain('Идея')
    expect(ideaBtn.getAttribute('aria-label')).toContain('not_started')
  })

  it('recommended phase aria-label includes "рекомендуется"', () => {
    render(
      <CycleProgressStepper phases={CANONICAL_PHASES} recommendedPhaseId="brainstorm" />,
    )
    const btn = screen.getByRole('button', { name: /Идея/ })
    expect(btn.getAttribute('aria-label')).toContain('рекомендуется')
  })

  it('recommended phase shows "Рекомендуется" badge text', () => {
    render(
      <CycleProgressStepper phases={CANONICAL_PHASES} recommendedPhaseId="plan" />,
    )
    expect(screen.getByText('Рекомендуется')).toBeInTheDocument()
  })

  it('phase buttons have title attribute matching phase label', () => {
    render(<CycleProgressStepper phases={CANONICAL_PHASES} />)
    const ideaBtn = screen.getByRole('button', { name: /Идея/ })
    expect(ideaBtn).toHaveAttribute('title', 'Идея')
  })
})
