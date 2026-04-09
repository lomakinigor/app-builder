import { useState } from 'react'
import type { SpecPack, SpecFeature } from '../../shared/types'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { generateId } from '../../shared/lib/id'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditState {
  productSummary: string
  MVPScope: string
  acceptanceNotes: string
  assumptions: string  // one item per line
  constraints: string  // one item per line
  featureList: SpecFeature[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listToText(items: string[]): string {
  return items.join('\n')
}

function textToList(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean)
}

function specToEditState(spec: SpecPack): EditState {
  return {
    productSummary: spec.productSummary,
    MVPScope: spec.MVPScope,
    acceptanceNotes: spec.acceptanceNotes,
    assumptions: listToText(spec.assumptions),
    constraints: listToText(spec.constraints),
    featureList: spec.featureList.map((f) => ({ ...f })),
  }
}

function editStateToSpec(state: EditState): SpecPack {
  return {
    productSummary: state.productSummary.trim(),
    MVPScope: state.MVPScope.trim(),
    acceptanceNotes: state.acceptanceNotes.trim(),
    assumptions: textToList(state.assumptions),
    constraints: textToList(state.constraints),
    featureList: state.featureList,
  }
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900'

const textareaCls = `${inputCls} resize-none`

// ─── Priority config ──────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<SpecFeature['priority'], string> = {
  must: 'Must',
  should: 'Should',
  could: 'Could',
  wont: "Won't",
}

const PRIORITY_COLORS: Record<SpecFeature['priority'], string> = {
  must: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  should: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  could: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  wont: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

const PRIORITIES: SpecFeature['priority'][] = ['must', 'should', 'could', 'wont']

// ─── Feature row (edit mode) ──────────────────────────────────────────────────

interface FeatureRowProps {
  feature: SpecFeature
  index: number
  onChange: (index: number, patch: Partial<SpecFeature>) => void
  onRemove: (index: number) => void
}

function FeatureRow({ feature, index, onChange, onRemove }: FeatureRowProps) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <input
            type="text"
            value={feature.name}
            onChange={(e) => onChange(index, { name: e.target.value })}
            placeholder="Feature name"
            className={inputCls}
          />
          <input
            type="text"
            value={feature.description}
            onChange={(e) => onChange(index, { description: e.target.value })}
            placeholder="Short description (optional)"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col items-end gap-2">
          <select
            value={feature.priority}
            onChange={(e) => onChange(index, { priority: e.target.value as SpecFeature['priority'] })}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-700 focus:border-violet-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
            ))}
          </select>
          <button
            onClick={() => onRemove(index)}
            className="text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
            title="Remove feature"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Feature row (view mode) ──────────────────────────────────────────────────

function FeatureViewRow({ feature }: { feature: SpecFeature }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
      <span className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[feature.priority]}`}>
        {PRIORITY_LABELS[feature.priority]}
      </span>
      <div>
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{feature.name}</p>
        {feature.description && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{feature.description}</p>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface EditableSpecPackProps {
  spec: SpecPack
  onSave: (spec: SpecPack) => void
}

export function EditableSpecPack({ spec, onSave }: EditableSpecPackProps) {
  const [editing, setEditing] = useState(false)
  const [editState, setEditState] = useState<EditState>(() => specToEditState(spec))

  function handleEdit() {
    setEditState(specToEditState(spec))
    setEditing(true)
  }

  function handleSave() {
    onSave(editStateToSpec(editState))
    setEditing(false)
  }

  function handleCancel() {
    setEditState(specToEditState(spec))
    setEditing(false)
  }

  function updateFeature(index: number, patch: Partial<SpecFeature>) {
    setEditState((prev) => ({
      ...prev,
      featureList: prev.featureList.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }))
  }

  function removeFeature(index: number) {
    setEditState((prev) => ({
      ...prev,
      featureList: prev.featureList.filter((_, i) => i !== index),
    }))
  }

  function addFeature() {
    const newFeature: SpecFeature = {
      id: generateId('feat'),
      name: '',
      description: '',
      priority: 'should',
    }
    setEditState((prev) => ({
      ...prev,
      featureList: [...prev.featureList, newFeature],
    }))
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 dark:border-violet-800/40 dark:bg-violet-950/20">
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Editing specification</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save changes</Button>
          </div>
        </div>

        <Card>
          <CardHeader title="Product summary" icon="📌" />
          <textarea
            value={editState.productSummary}
            onChange={(e) => setEditState((p) => ({ ...p, productSummary: e.target.value }))}
            rows={3}
            className={textareaCls}
            placeholder="What this product does and who it serves…"
          />
        </Card>

        <Card>
          <CardHeader title="MVP scope" icon="🎯" />
          <textarea
            value={editState.MVPScope}
            onChange={(e) => setEditState((p) => ({ ...p, MVPScope: e.target.value }))}
            rows={3}
            className={textareaCls}
            placeholder="What is and isn't included in the first release…"
          />
        </Card>

        <Card>
          <CardHeader
            title="Feature list"
            description="Each feature has a name, optional description, and MoSCoW priority."
            icon="✅"
          />
          <div className="space-y-2">
            {editState.featureList.map((feature, i) => (
              <FeatureRow
                key={feature.id}
                feature={feature}
                index={i}
                onChange={updateFeature}
                onRemove={removeFeature}
              />
            ))}
            <Button size="sm" variant="secondary" onClick={addFeature}>
              + Add feature
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader title="Assumptions" description="One per line" icon="💭" />
            <textarea
              value={editState.assumptions}
              onChange={(e) => setEditState((p) => ({ ...p, assumptions: e.target.value }))}
              rows={5}
              className={`${textareaCls} font-mono text-xs`}
              placeholder="One assumption per line…"
            />
          </Card>
          <Card>
            <CardHeader title="Constraints" description="One per line" icon="🚧" />
            <textarea
              value={editState.constraints}
              onChange={(e) => setEditState((p) => ({ ...p, constraints: e.target.value }))}
              rows={5}
              className={`${textareaCls} font-mono text-xs`}
              placeholder="One constraint per line…"
            />
          </Card>
        </div>

        <Card>
          <CardHeader title="Acceptance notes" icon="📝" />
          <textarea
            value={editState.acceptanceNotes}
            onChange={(e) => setEditState((p) => ({ ...p, acceptanceNotes: e.target.value }))}
            rows={3}
            className={textareaCls}
            placeholder="How will you know the MVP is done?…"
          />
        </Card>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save changes</Button>
        </div>
      </div>
    )
  }

  // View mode
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={handleEdit}>Edit spec</Button>
      </div>

      <Card>
        <CardHeader title="Product summary" icon="📌" />
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{spec.productSummary}</p>
      </Card>

      <Card>
        <CardHeader title="MVP scope" icon="🎯" />
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{spec.MVPScope}</p>
      </Card>

      <Card>
        <CardHeader title="Feature list" description="MoSCoW priority breakdown" icon="✅" />
        <div className="space-y-2">
          {spec.featureList.map((feature) => (
            <FeatureViewRow key={feature.id} feature={feature} />
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Assumptions" icon="💭" />
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {spec.assumptions.map((a, i) => <li key={i}>• {a}</li>)}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Constraints" icon="🚧" />
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {spec.constraints.map((c, i) => <li key={i}>• {c}</li>)}
          </ul>
        </Card>
      </div>

      {spec.acceptanceNotes && (
        <Card>
          <CardHeader title="Acceptance notes" icon="📝" />
          <p className="text-sm text-zinc-700 dark:text-zinc-300">{spec.acceptanceNotes}</p>
        </Card>
      )}
    </div>
  )
}
