import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { generateId } from '../../shared/lib/id'
import { canAdvanceFromIdea } from '../../shared/lib/stageGates'
import {
  validateIdeaDraft,
  getRawIdeaCharState,
  IDEA_MIN_LENGTH,
  IDEA_RECOMMENDED_LENGTH,
} from '../../features/idea-input/validation'
import type { IdeaDraft } from '../../shared/types'

const PLACEHOLDER_IDEA =
  'A project management tool where AI helps break down goals into tasks, writes subtask descriptions, and suggests next actions based on what is overdue or blocked.'

// ─── Field wrapper with error display ─────────────────────────────────────────

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
      <span>⚠</span>
      {message}
    </p>
  )
}

// ─── Character progress bar for the raw idea field ────────────────────────────

function IdeaCharProgress({ length }: { length: number }) {
  const state = getRawIdeaCharState(length)
  const pct = Math.min(100, (length / IDEA_RECOMMENDED_LENGTH) * 100)

  const barColor =
    state === 'empty' ? 'bg-zinc-200 dark:bg-zinc-700'
    : state === 'too_short' ? 'bg-red-400'
    : state === 'ok' ? 'bg-amber-400'
    : 'bg-emerald-500'

  const label =
    state === 'empty' ? `0 / ${IDEA_MIN_LENGTH}+ chars`
    : state === 'too_short' ? `${length} / ${IDEA_MIN_LENGTH} chars minimum`
    : state === 'ok' ? `${length} chars — good, aim for ${IDEA_RECOMMENDED_LENGTH}+`
    : `${length} chars ✓`

  const labelColor =
    state === 'too_short' ? 'text-red-500 dark:text-red-400'
    : state === 'ok' ? 'text-amber-600 dark:text-amber-400'
    : 'text-zinc-400'

  return (
    <div className="mt-2 space-y-1.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`text-xs ${labelColor}`}>{label}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function IdeaPage() {
  const navigate = useNavigate()
  const { activeProject, ideaDraft, setActiveProject, setIdeaDraft, setCurrentStage } = useProjectStore()

  const [form, setForm] = useState<IdeaDraft>({
    title: ideaDraft?.title ?? '',
    rawIdea: ideaDraft?.rawIdea ?? '',
    targetUser: ideaDraft?.targetUser ?? '',
    problem: ideaDraft?.problem ?? '',
    constraints: ideaDraft?.constraints ?? '',
    notes: ideaDraft?.notes ?? '',
  })

  // Only show validation errors after user has attempted to submit
  const [submitted, setSubmitted] = useState(false)
  const [saved, setSaved] = useState(false)

  const validation = validateIdeaDraft(form)
  const gate = canAdvanceFromIdea(validation.valid ? form : null)

  function handleChange(field: keyof IdeaDraft, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function handleSave() {
    setSubmitted(true)
    if (!validation.valid) return

    if (!activeProject) {
      setActiveProject({
        id: generateId('proj'),
        name: form.title.trim() || 'Untitled Project',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'active',
        currentStage: 'idea',
      })
    }

    setIdeaDraft(form)
    setCurrentStage('idea')
    setSaved(true)
  }

  function handleContinue() {
    setSubmitted(true)
    if (!validation.valid) return
    handleSave()
    navigate('/research')
  }

  const showErrors = submitted
  const hasErrors = !validation.valid

  return (
    <div className="space-y-6">
      <PageHeader
        title="Idea"
        icon="💡"
        description="Describe your product idea. More context leads to better research, a more accurate spec, and stronger prompts."
        badge={
          activeProject ? (
            <Badge variant="success">Project active</Badge>
          ) : (
            <Badge variant="muted">No project yet</Badge>
          )
        }
        action={
          <Button
            onClick={handleContinue}
            size="sm"
            disabled={showErrors && hasErrors}
            title={gate.reason ?? undefined}
          >
            Save & Continue to Research →
          </Button>
        }
      />

      {/* Core idea */}
      <Card>
        <CardHeader
          title="Your product idea"
          description="Describe it in plain language — what it does, who it's for, what problem it solves."
          icon="✏️"
        />
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Project name <span className="text-zinc-400">(optional)</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. TaskFlow — AI-assisted project manager"
              className={inputCls()}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Raw idea <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.rawIdea}
              onChange={(e) => handleChange('rawIdea', e.target.value)}
              onBlur={() => setSubmitted(true)}
              placeholder={PLACEHOLDER_IDEA}
              rows={5}
              className={`${inputCls('textarea')} ${
                showErrors && validation.errors.rawIdea
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-700 dark:focus:border-red-500'
                  : ''
              }`}
            />
            <IdeaCharProgress length={form.rawIdea.trim().length} />
            {showErrors && <FieldError message={validation.errors.rawIdea} />}
          </div>
        </div>
      </Card>

      {/* Validation warnings (soft suggestions, not blockers) */}
      {validation.warnings.length > 0 && form.rawIdea.trim().length >= IDEA_MIN_LENGTH && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Tips for better results
          </p>
          {validation.warnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-700 dark:text-amber-400">
              💡 {w}
            </p>
          ))}
        </div>
      )}

      {/* Optional context */}
      <Card>
        <CardHeader
          title="Optional context"
          description="Helps generate more targeted research and more relevant spec outputs. Leave blank to skip."
          icon="🧩"
        />
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Target user
            </label>
            <input
              type="text"
              value={form.targetUser}
              onChange={(e) => handleChange('targetUser', e.target.value)}
              placeholder="e.g. Solo developers managing side projects"
              className={inputCls()}
            />
            <p className="mt-1 text-xs text-zinc-400">
              Defining your user sharpens research quality significantly.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Core problem
            </label>
            <textarea
              value={form.problem}
              onChange={(e) => handleChange('problem', e.target.value)}
              placeholder="e.g. Most PM tools require too much manual structure. People skip planning and end up with vague todos."
              rows={3}
              className={inputCls('textarea')}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Constraints
            </label>
            <input
              type="text"
              value={form.constraints}
              onChange={(e) => handleChange('constraints', e.target.value)}
              placeholder="e.g. Must work offline. No account required to try it. Mobile-friendly."
              className={inputCls()}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Notes / inspiration
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="e.g. Inspired by Linear + Notion but much simpler."
              rows={2}
              className={inputCls('textarea')}
            />
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={handleSave}
          variant="secondary"
          disabled={!form.rawIdea.trim()}
        >
          {saved ? '✓ Saved' : 'Save Draft'}
        </Button>
        <Button onClick={handleContinue}>
          Save & Continue to Research →
        </Button>
      </div>

      {/* Blocked state explanation */}
      {showErrors && hasErrors && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-950/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            ⚠️ Fix the issues above before continuing.
          </p>
          {gate.reason && (
            <p className="mt-0.5 text-xs text-red-600 dark:text-red-500">{gate.reason}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Shared input class helper ────────────────────────────────────────────────

function inputCls(type: 'input' | 'textarea' = 'input') {
  const base =
    'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900'
  return type === 'textarea' ? `${base} resize-none` : base
}
