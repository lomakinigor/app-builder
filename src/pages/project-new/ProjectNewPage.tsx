// ─── Project Creation Page ────────────────────────────────────────────────────
// Implements T-202 / F-025 / F-027.
//
// Collects project name + type (application | website), creates the project in
// the registry, selects it (bridging to projectStore), then routes to /idea so
// the user enters the Brainstorm phase immediately.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectRegistry } from '../../app/store/projectRegistryStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import type { ProjectType } from '../../shared/types'

// ─── Project type segmented control ──────────────────────────────────────────

function ProjectTypeSelector({
  value,
  onChange,
  showError,
}: {
  value: ProjectType | null
  onChange: (v: ProjectType) => void
  showError: boolean
}) {
  const options: { type: ProjectType; label: string; icon: string; description: string }[] = [
    { type: 'application', label: 'Приложение', icon: '📱', description: 'Веб или мобильное приложение с динамической логикой' },
    { type: 'website', label: 'Сайт', icon: '🌐', description: 'Контентный или маркетинговый сайт' },
  ]

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Тип проекта <span className="text-red-400">*</span>
      </label>
      <div
        className={`flex gap-3 ${
          showError && !value ? 'rounded-xl border border-red-300 p-3 dark:border-red-700' : ''
        }`}
      >
        {options.map(({ type, label, icon, description }) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`flex flex-1 flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors ${
              value === type
                ? 'border-violet-400 bg-violet-50 dark:border-violet-600 dark:bg-violet-950/30'
                : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <span
                className={`text-sm font-medium ${
                  value === type
                    ? 'text-violet-700 dark:text-violet-300'
                    : 'text-zinc-800 dark:text-zinc-200'
                }`}
              >
                {label}
              </span>
              {value === type && (
                <span className="ml-auto text-violet-500 dark:text-violet-400">✓</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
          </button>
        ))}
      </div>
      {showError && !value && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
          <span>⚠</span>
          Выберите, что вы создаёте — приложение или сайт.
        </p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProjectNewPage() {
  const navigate = useNavigate()
  const { createProject, selectProject } = useProjectRegistry()

  const [name, setName] = useState('')
  const [projectType, setProjectType] = useState<ProjectType | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const nameError = name.trim().length === 0 ? 'Название проекта обязательно.' : undefined
  const isValid = !nameError && projectType !== null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) {
      setShowErrors(true)
      return
    }
    const project = createProject({ name: name.trim(), projectType: projectType! })
    selectProject(project.id)
    navigate('/idea')
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Новый проект"
        description="Дайте проекту название и выберите тип, чтобы начать."
      />

      <Card>
        <CardHeader title="Детали проекта" icon="✨" />
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Project name */}
          <div>
            <label
              htmlFor="project-name"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Название проекта <span className="text-red-400">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="напр. Менеджер задач, Портфолио"
              autoFocus
              className={`w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 ${
                showErrors && nameError
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-zinc-200 dark:border-zinc-700'
              }`}
            />
            {showErrors && nameError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                <span>⚠</span>
                {nameError}
              </p>
            )}
          </div>

          {/* Project type */}
          <ProjectTypeSelector
            value={projectType}
            onChange={setProjectType}
            showError={showErrors}
          />

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={showErrors && !isValid}>
              Создать проект
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/')}>
              Отмена
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
