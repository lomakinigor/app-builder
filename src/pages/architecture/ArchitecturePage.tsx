import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { mockSpecService } from '../../mocks/services/specService'
import { canAdvanceFromArchitecture } from '../../shared/lib/stageGates'
import { EditableArchitectureDraft } from '../../features/architecture-output/EditableArchitectureDraft'
import type { ArchitectureDraft } from '../../shared/types'

// ─── Gate banner ──────────────────────────────────────────────────────────────

function GateBanner({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
      <span className="mt-0.5 text-lg">⚠️</span>
      <p className="text-sm text-amber-800 dark:text-amber-300">{reason}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ArchitecturePage() {
  const navigate = useNavigate()
  const { specPack, architectureDraft, setArchitectureDraft, updateArchitectureDraft, setCurrentStage } =
    useProjectStore()
  const [generating, setGenerating] = useState(false)

  const archGate = canAdvanceFromArchitecture(architectureDraft)

  async function handleGenerate() {
    if (!specPack) return
    setGenerating(true)
    try {
      const arch = await mockSpecService.generateArchitecture(specPack)
      setArchitectureDraft(arch)
      setCurrentStage('architecture')
    } finally {
      setGenerating(false)
    }
  }

  function handleSaveArch(updated: ArchitectureDraft) {
    updateArchitectureDraft(updated)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Architecture"
        icon="🏗️"
        description="Define your recommended tech stack, module architecture, data flow, and phased roadmap."
        badge={
          architectureDraft
            ? <Badge variant="success">Generated</Badge>
            : <Badge variant="muted">Not generated</Badge>
        }
      />

      {/* Blocked: no spec */}
      {!specPack && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Specification required</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400">
                Complete the Spec stage first.{' '}
                <button onClick={() => navigate('/spec')} className="underline">
                  Go to Spec →
                </button>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Generate panel — shown when spec exists but no arch yet */}
      {specPack && !architectureDraft && (
        <Card>
          <CardHeader
            title="Generate architecture"
            description="Produces stack recommendation, module structure, data flow, and phased roadmap."
            icon="⚙️"
          />
          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">What will be generated</p>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Recommended tech stack with rationale</li>
                <li>• Module architecture overview</li>
                <li>• Data flow description</li>
                <li>• Phased implementation roadmap</li>
                <li>• Technical risks</li>
              </ul>
            </div>
            <Button onClick={handleGenerate} loading={generating} fullWidth>
              {generating ? 'Generating architecture…' : 'Generate Architecture'}
            </Button>
          </div>
        </Card>
      )}

      {/* Editable architecture output */}
      {architectureDraft && (
        <EditableArchitectureDraft arch={architectureDraft} onSave={handleSaveArch} />
      )}

      {/* Bottom action bar */}
      {architectureDraft && (
        <div className="space-y-3">
          {!archGate.canAdvance && archGate.reason && (
            <GateBanner reason={archGate.reason} />
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleGenerate} loading={generating} disabled={!specPack}>
              Regenerate
            </Button>
            <Button
              onClick={() => navigate('/prompt-loop')}
              disabled={!archGate.canAdvance}
              title={archGate.reason ?? undefined}
            >
              Continue to Prompt Loop →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
