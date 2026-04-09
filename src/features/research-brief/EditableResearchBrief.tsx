import { useState } from 'react'
import { Button } from '../../shared/ui/Button'
import { Badge } from '../../shared/ui/Badge'
import type { ResearchBrief } from '../../shared/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listToText(items: string[]): string {
  return items.join('\n')
}

function textToList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

// ─── Editable brief local state ───────────────────────────────────────────────

interface EditState {
  problemSummary: string
  valueHypothesis: string
  competitorNotes: string
  recommendedMVP: string
  targetUsers: string      // joined with \n
  risks: string
  opportunities: string
  openQuestions: string
  sourcesNote: string
}

function briefToEditState(brief: ResearchBrief): EditState {
  return {
    problemSummary: brief.problemSummary,
    valueHypothesis: brief.valueHypothesis,
    competitorNotes: brief.competitorNotes,
    recommendedMVP: brief.recommendedMVP,
    targetUsers: listToText(brief.targetUsers),
    risks: listToText(brief.risks),
    opportunities: listToText(brief.opportunities),
    openQuestions: listToText(brief.openQuestions),
    sourcesNote: brief.sourcesNote,
  }
}

function editStateToBrief(state: EditState, original: ResearchBrief): ResearchBrief {
  return {
    ...original,
    problemSummary: state.problemSummary.trim(),
    valueHypothesis: state.valueHypothesis.trim(),
    competitorNotes: state.competitorNotes.trim(),
    recommendedMVP: state.recommendedMVP.trim(),
    targetUsers: textToList(state.targetUsers),
    risks: textToList(state.risks),
    opportunities: textToList(state.opportunities),
    openQuestions: textToList(state.openQuestions),
    sourcesNote: state.sourcesNote.trim(),
  }
}

// ─── Source attribution banner ────────────────────────────────────────────────

interface SourceBannerProps {
  brief: ResearchBrief
  artifactTitle?: string
}

function SourceBanner({ brief, artifactTitle }: SourceBannerProps) {
  if (brief.briefSource === 'imported') {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-800/40 dark:bg-sky-950/20">
        <span className="mt-0.5 shrink-0 text-base">📥</span>
        <div className="text-sm">
          <span className="font-semibold text-sky-800 dark:text-sky-300">Imported research</span>
          {artifactTitle && (
            <span className="text-sky-700 dark:text-sky-400"> — normalized from "{artifactTitle}"</span>
          )}
          <p className="mt-0.5 text-xs text-sky-600 dark:text-sky-500">
            This brief was extracted from your imported text. Review and edit any sections that need correction.
          </p>
        </div>
      </div>
    )
  }

  if (brief.briefSource === 'manual') {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800/40 dark:bg-amber-950/20">
        <span className="text-base">✍️</span>
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Manual research</span>
        <span className="text-sm text-amber-700 dark:text-amber-400">— entered directly</span>
      </div>
    )
  }

  // generated
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
      <span className="text-base">🔬</span>
      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Generated research</span>
      <span className="text-sm text-emerald-700 dark:text-emerald-400">— produced by mock provider</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface EditableResearchBriefProps {
  brief: ResearchBrief
  artifactTitle?: string
  normalizationWarnings?: string[]
  onSave: (updated: ResearchBrief) => void
}

export function EditableResearchBrief({
  brief,
  artifactTitle,
  normalizationWarnings = [],
  onSave,
}: EditableResearchBriefProps) {
  const [editing, setEditing] = useState(false)
  const [state, setState] = useState<EditState>(() => briefToEditState(brief))
  const [saved, setSaved] = useState(false)

  function handleChange(field: keyof EditState, value: string) {
    setState((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function handleSave() {
    onSave(editStateToBrief(state, brief))
    setSaved(true)
    setEditing(false)
  }

  function handleDiscard() {
    setState(briefToEditState(brief))
    setEditing(false)
    setSaved(false)
  }

  return (
    <div className="space-y-4">
      {/* Source attribution */}
      <SourceBanner brief={brief} artifactTitle={artifactTitle} />

      {/* Normalization warnings */}
      {normalizationWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
            Normalization notes
          </p>
          {normalizationWarnings.map((w, i) => (
            <p key={i} className="text-sm text-amber-700 dark:text-amber-400">
              ⚠️ {w}
            </p>
          ))}
        </div>
      )}

      {/* Header with edit toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Research Brief</h3>
          <Badge variant="success">Ready</Badge>
          {saved && <Badge variant="info">Saved</Badge>}
        </div>
        {!editing ? (
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            ✏️ Edit brief
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleDiscard}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save changes
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        // ─── Edit mode ────────────────────────────────────────────────────────
        <div className="space-y-4">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Edit any section below. For list fields, put one item per line.
          </p>

          <EditTextField
            label="Problem summary"
            value={state.problemSummary}
            onChange={(v) => handleChange('problemSummary', v)}
            rows={4}
          />
          <EditTextField
            label="Value hypothesis"
            value={state.valueHypothesis}
            onChange={(v) => handleChange('valueHypothesis', v)}
            rows={3}
          />
          <EditTextField
            label="Recommended MVP"
            value={state.recommendedMVP}
            onChange={(v) => handleChange('recommendedMVP', v)}
            rows={3}
          />
          <EditTextField
            label="Competitor notes"
            value={state.competitorNotes}
            onChange={(v) => handleChange('competitorNotes', v)}
            rows={3}
          />
          <EditListField
            label="Target users"
            hint="One user type per line"
            value={state.targetUsers}
            onChange={(v) => handleChange('targetUsers', v)}
          />
          <EditListField
            label="Risks"
            hint="One risk per line"
            value={state.risks}
            onChange={(v) => handleChange('risks', v)}
          />
          <EditListField
            label="Opportunities"
            hint="One opportunity per line"
            value={state.opportunities}
            onChange={(v) => handleChange('opportunities', v)}
          />
          <EditListField
            label="Open questions"
            hint="One question per line"
            value={state.openQuestions}
            onChange={(v) => handleChange('openQuestions', v)}
          />
          <EditTextField
            label="Sources note"
            value={state.sourcesNote}
            onChange={(v) => handleChange('sourcesNote', v)}
            rows={2}
          />

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave}>Save changes</Button>
            <Button variant="secondary" onClick={handleDiscard}>Discard</Button>
          </div>
        </div>
      ) : (
        // ─── View mode ────────────────────────────────────────────────────────
        <div className="space-y-4">
          <ViewSection label="Problem summary" content={brief.problemSummary} />
          <ViewSection label="Value hypothesis" content={brief.valueHypothesis} />
          <ViewSection label="Recommended MVP" content={brief.recommendedMVP} />

          {brief.competitorNotes && (
            <ViewSection label="Competitor notes" content={brief.competitorNotes} />
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <ViewListSection label="Target users" items={brief.targetUsers} />
            <ViewListSection label="Opportunities" items={brief.opportunities} />
          </div>

          {brief.risks.length > 0 && (
            <ViewListSection label="Risks" items={brief.risks} prefix="⚠️ " />
          )}

          {brief.openQuestions.length > 0 && (
            <ViewListSection label="Open questions" items={brief.openQuestions} prefix="? " />
          )}

          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            📍 {brief.sourcesNote}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ViewSection({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{content}</p>
    </div>
  )
}

function ViewListSection({
  label,
  items,
  prefix = '• ',
}: {
  label: string
  items: string[]
  prefix?: string
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
            {prefix}{item}
          </li>
        ))}
      </ul>
    </div>
  )
}

const fieldCls =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900'

function EditTextField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`${fieldCls} resize-none`}
      />
    </div>
  )
}

function EditListField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        <span className="ml-1.5 font-normal text-zinc-400">({hint})</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={`${fieldCls} resize-none font-mono text-xs`}
        placeholder={`One item per line…`}
      />
    </div>
  )
}
