import { useState } from 'react'
import type { ArchitectureDraft, StackItem, RoadmapPhase } from '../../shared/types'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { Badge } from '../../shared/ui/Badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditState {
  moduleArchitecture: string
  dataFlow: string
  technicalRisks: string   // one per line
  recommendedStack: StackItem[]
  roadmapPhases: RoadmapPhase[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function listToText(items: string[]): string {
  return items.join('\n')
}

function textToList(text: string): string[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean)
}

function archToEditState(arch: ArchitectureDraft): EditState {
  return {
    moduleArchitecture: arch.moduleArchitecture,
    dataFlow: arch.dataFlow,
    technicalRisks: listToText(arch.technicalRisks),
    recommendedStack: arch.recommendedStack.map((s) => ({ ...s })),
    roadmapPhases: arch.roadmapPhases.map((p) => ({ ...p, goals: [...p.goals] })),
  }
}

function editStateToArch(state: EditState): Omit<ArchitectureDraft, 'projectType'> {
  return {
    moduleArchitecture: state.moduleArchitecture.trim(),
    dataFlow: state.dataFlow.trim(),
    technicalRisks: textToList(state.technicalRisks),
    recommendedStack: state.recommendedStack,
    roadmapPhases: state.roadmapPhases,
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900'

const textareaCls = `${inputCls} resize-none`

// ─── Complexity config ────────────────────────────────────────────────────────

const COMPLEXITY_COLORS: Record<RoadmapPhase['estimatedComplexity'], string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const COMPLEXITIES: RoadmapPhase['estimatedComplexity'][] = ['low', 'medium', 'high']

// ─── Stack item row (edit) ────────────────────────────────────────────────────

interface StackRowProps {
  item: StackItem
  index: number
  onChange: (index: number, patch: Partial<StackItem>) => void
  onRemove: (index: number) => void
}

function StackRow({ item, index, onChange, onRemove }: StackRowProps) {
  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange(index, { name: e.target.value })}
          placeholder="Название технологии"
          className={inputCls}
        />
        <input
          type="text"
          value={item.role}
          onChange={(e) => onChange(index, { role: e.target.value })}
          placeholder="Роль (напр. UI-фреймворк)"
          className={inputCls}
        />
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={item.rationale}
          onChange={(e) => onChange(index, { rationale: e.target.value })}
          placeholder="Почему именно это?"
          className={`${inputCls} flex-1`}
        />
        <button
          onClick={() => onRemove(index)}
          className="shrink-0 text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
        >
          Удалить
        </button>
      </div>
    </div>
  )
}

// ─── Roadmap phase row (edit) ─────────────────────────────────────────────────

interface PhaseRowProps {
  phase: RoadmapPhase
  index: number
  onChange: (index: number, patch: Partial<RoadmapPhase>) => void
  onRemove: (index: number) => void
}

function PhaseRow({ phase, index, onChange, onRemove }: PhaseRowProps) {
  const goalsText = phase.goals.join('\n')

  return (
    <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          {phase.phase}
        </span>
        <input
          type="text"
          value={phase.title}
          onChange={(e) => onChange(index, { title: e.target.value })}
          placeholder="Название фазы"
          className={`${inputCls} flex-1`}
        />
        <select
          value={phase.estimatedComplexity}
          onChange={(e) =>
            onChange(index, { estimatedComplexity: e.target.value as RoadmapPhase['estimatedComplexity'] })
          }
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-700 focus:border-violet-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {COMPLEXITIES.map((c) => (
            <option key={c} value={c}>{c === 'low' ? 'низкая' : c === 'medium' ? 'средняя' : 'высокая'}</option>
          ))}
        </select>
        <button
          onClick={() => onRemove(index)}
          className="shrink-0 text-xs text-zinc-400 hover:text-red-500 dark:hover:text-red-400"
        >
          Удалить
        </button>
      </div>
      <textarea
        value={goalsText}
        onChange={(e) =>
          onChange(index, { goals: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })
        }
        rows={3}
        placeholder="Цели — одна на строку"
        className={`${textareaCls} mt-2 font-mono text-xs`}
      />
    </div>
  )
}

// ─── View-mode subcomponents ──────────────────────────────────────────────────

function StackViewRow({ item }: { item: StackItem }) {
  return (
    <div className="rounded-xl border border-zinc-100 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.name}</span>
        <Badge variant="muted">{item.role}</Badge>
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.rationale}</p>
    </div>
  )
}

function PhaseViewRow({ phase, isLast }: { phase: RoadmapPhase; isLast: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          {phase.phase}
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-zinc-200 dark:bg-zinc-700" />}
      </div>
      <div className="pb-4">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">{phase.title}</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COMPLEXITY_COLORS[phase.estimatedComplexity]}`}>
            {phase.estimatedComplexity === 'low' ? 'низкая' : phase.estimatedComplexity === 'medium' ? 'средняя' : 'высокая'}
          </span>
        </div>
        <ul className="mt-1 space-y-0.5">
          {phase.goals.map((goal, i) => (
            <li key={i} className="text-sm text-zinc-600 dark:text-zinc-400">• {goal}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface EditableArchitectureDraftProps {
  arch: ArchitectureDraft
  onSave: (arch: ArchitectureDraft) => void
}

export function EditableArchitectureDraft({ arch, onSave }: EditableArchitectureDraftProps) {
  const [editing, setEditing] = useState(false)
  const [editState, setEditState] = useState<EditState>(() => archToEditState(arch))

  function handleEdit() {
    setEditState(archToEditState(arch))
    setEditing(true)
  }

  function handleSave() {
    onSave({ ...editStateToArch(editState), projectType: arch.projectType })
    setEditing(false)
  }

  function handleCancel() {
    setEditState(archToEditState(arch))
    setEditing(false)
  }

  function updateStackItem(index: number, patch: Partial<StackItem>) {
    setEditState((prev) => ({
      ...prev,
      recommendedStack: prev.recommendedStack.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }

  function removeStackItem(index: number) {
    setEditState((prev) => ({
      ...prev,
      recommendedStack: prev.recommendedStack.filter((_, i) => i !== index),
    }))
  }

  function addStackItem() {
    setEditState((prev) => ({
      ...prev,
      recommendedStack: [...prev.recommendedStack, { name: '', role: '', rationale: '' }],
    }))
  }

  function updatePhase(index: number, patch: Partial<RoadmapPhase>) {
    setEditState((prev) => ({
      ...prev,
      roadmapPhases: prev.roadmapPhases.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }))
  }

  function removePhase(index: number) {
    setEditState((prev) => ({
      ...prev,
      roadmapPhases: prev.roadmapPhases
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, phase: i + 1 })),
    }))
  }

  function addPhase() {
    const nextNum = editState.roadmapPhases.length + 1
    setEditState((prev) => ({
      ...prev,
      roadmapPhases: [
        ...prev.roadmapPhases,
        { phase: nextNum, title: '', goals: [], estimatedComplexity: 'medium' },
      ],
    }))
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 dark:border-violet-800/40 dark:bg-violet-950/20">
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">Редактирование архитектуры</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleCancel}>Отменить</Button>
            <Button size="sm" onClick={handleSave}>Сохранить</Button>
          </div>
        </div>

        <Card>
          <CardHeader title="Рекомендуемый стек" description="Одна технология на строку" icon="🛠️" />
          <div className="space-y-2">
            {editState.recommendedStack.map((item, i) => (
              <StackRow key={i} item={item} index={i} onChange={updateStackItem} onRemove={removeStackItem} />
            ))}
            <Button size="sm" variant="secondary" onClick={addStackItem}>+ Добавить технологию</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Модульная архитектура" icon="🧩" />
          <textarea
            value={editState.moduleArchitecture}
            onChange={(e) => setEditState((p) => ({ ...p, moduleArchitecture: e.target.value }))}
            rows={4}
            className={textareaCls}
            placeholder="Опишите структуру модулей…"
          />
        </Card>

        <Card>
          <CardHeader title="Поток данных" icon="🔄" />
          <textarea
            value={editState.dataFlow}
            onChange={(e) => setEditState((p) => ({ ...p, dataFlow: e.target.value }))}
            rows={4}
            className={textareaCls}
            placeholder="Опишите, как данные движутся через систему…"
          />
        </Card>

        <Card>
          <CardHeader title="Поэтапный роадмап" description="Одна фаза на строку" icon="🗺️" />
          <div className="space-y-2">
            {editState.roadmapPhases.map((phase, i) => (
              <PhaseRow key={phase.phase} phase={phase} index={i} onChange={updatePhase} onRemove={removePhase} />
            ))}
            <Button size="sm" variant="secondary" onClick={addPhase}>+ Добавить фазу</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Технические риски" description="Один на строку" icon="⚠️" />
          <textarea
            value={editState.technicalRisks}
            onChange={(e) => setEditState((p) => ({ ...p, technicalRisks: e.target.value }))}
            rows={5}
            className={`${textareaCls} font-mono text-xs`}
            placeholder="Один риск на строку…"
          />
        </Card>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleCancel}>Отменить</Button>
          <Button onClick={handleSave}>Сохранить</Button>
        </div>
      </div>
    )
  }

  // View mode
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={handleEdit}>Редактировать архитектуру</Button>
      </div>

      <Card>
        <CardHeader title="Рекомендуемый стек" icon="🛠️" />
        <div className="grid gap-2 sm:grid-cols-2">
          {arch.recommendedStack.map((item, i) => (
            <StackViewRow key={i} item={item} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Модульная архитектура" icon="🧩" />
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{arch.moduleArchitecture}</p>
      </Card>

      <Card>
        <CardHeader title="Поток данных" icon="🔄" />
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{arch.dataFlow}</p>
      </Card>

      <Card>
        <CardHeader title="Поэтапный роадмап" icon="🗺️" />
        <div className="space-y-3">
          {arch.roadmapPhases.map((phase, i) => (
            <PhaseViewRow key={phase.phase} phase={phase} isLast={i === arch.roadmapPhases.length - 1} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Технические риски" icon="⚠️" />
        <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          {arch.technicalRisks.map((risk, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-500">▲</span>
              {risk}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
