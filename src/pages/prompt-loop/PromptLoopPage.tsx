import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjectStore } from '../../app/store/projectStore'
import { Button } from '../../shared/ui/Button'
import { Card, CardHeader } from '../../shared/ui/Card'
import { PageHeader } from '../../shared/ui/PageHeader'
import { Badge } from '../../shared/ui/Badge'
import { EmptyState } from '../../shared/ui/EmptyState'
import { mockPromptService } from '../../mocks/services/promptService'
import { generateId } from '../../shared/lib/id'

export function PromptLoopPage() {
  const navigate = useNavigate()
  const {
    activeProject,
    specPack,
    architectureDraft,
    promptIterations,
    addPromptIteration,
    updatePromptIteration,
    setCurrentStage,
  } = useProjectStore()

  const [generating, setGenerating] = useState(false)
  const [activeIterationId, setActiveIterationId] = useState<string | null>(
    promptIterations.length > 0 ? promptIterations[promptIterations.length - 1].id : null
  )
  const [responseInput, setResponseInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [copied, setCopied] = useState(false)

  const activeIteration = promptIterations.find((p) => p.id === activeIterationId) ?? null
  const latestIteration = promptIterations.length > 0
    ? promptIterations[promptIterations.length - 1]
    : null

  async function handleGenerateFirst() {
    if (!specPack || !architectureDraft || !activeProject) return
    setGenerating(true)
    try {
      const iteration = await mockPromptService.generateFirstPrompt(
        specPack,
        architectureDraft,
        activeProject.id,
        generateId('prompt')
      )
      addPromptIteration(iteration)
      setActiveIterationId(iteration.id)
      setCurrentStage('first_prompt')
    } finally {
      setGenerating(false)
    }
  }

  async function handleParseResponse() {
    if (!activeIteration || !responseInput.trim()) return
    setParsing(true)
    try {
      const parsed = mockPromptService.parseClaudeResponse(responseInput)
      updatePromptIteration(activeIteration.id, {
        claudeResponseRaw: responseInput,
        parsedSummary: parsed,
        recommendedNextStep: parsed.nextStep,
        status: 'parsed',
      })
      setResponseInput('')
    } finally {
      setParsing(false)
    }
  }

  async function handleGenerateNext() {
    if (!activeProject || !latestIteration?.parsedSummary) return
    setGenerating(true)
    try {
      const next = await mockPromptService.generateNextPrompt(
        latestIteration,
        latestIteration.parsedSummary,
        activeProject.id,
        generateId('prompt'),
        promptIterations.length + 1
      )
      addPromptIteration(next)
      setActiveIterationId(next.id)
      setCurrentStage('iterative_loop')
    } finally {
      setGenerating(false)
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const hasReadyIteration = !!latestIteration?.parsedSummary

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prompt Loop"
        icon="⚡"
        description="Generate Claude Code prompts, paste responses, parse results, generate next prompt. One task at a time."
        badge={
          promptIterations.length > 0
            ? <Badge variant="info">Iteration {promptIterations.length}</Badge>
            : <Badge variant="muted">Not started</Badge>
        }
        action={
          hasReadyIteration ? (
            <Button size="sm" variant="secondary" onClick={() => navigate('/history')}>
              View History
            </Button>
          ) : undefined
        }
      />

      {!architectureDraft && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Architecture required</p>
              <p className="text-sm text-amber-700/80 dark:text-amber-400">
                Complete the Architecture stage first.{' '}
                <button onClick={() => navigate('/architecture')} className="underline">
                  Go to Architecture →
                </button>
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Generate first prompt */}
      {promptIterations.length === 0 && (
        <Card>
          <CardHeader
            title="Generate first Claude Code prompt"
            description="Creates a structured prompt from your spec and architecture for Phase 0."
            icon="⚡"
          />
          <div className="space-y-3">
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">What the prompt will contain</p>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <li>• Product context and stack</li>
                <li>• Phase 0 goals</li>
                <li>• Must-have features</li>
                <li>• Constraints and rules</li>
                <li>• Required response format</li>
              </ul>
            </div>
            <Button
              onClick={handleGenerateFirst}
              loading={generating}
              disabled={!specPack || !architectureDraft}
              fullWidth
            >
              {generating ? 'Generating…' : 'Generate First Prompt'}
            </Button>
          </div>
        </Card>
      )}

      {/* Active prompt */}
      {activeIteration && (
        <Card>
          <CardHeader
            title={`Iteration ${activeIteration.iterationNumber}`}
            icon="📝"
            action={
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    activeIteration.status === 'parsed' ? 'success'
                    : activeIteration.status === 'sent' ? 'info'
                    : 'muted'
                  }
                >
                  {activeIteration.status}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCopy(activeIteration.promptText)}
                >
                  {copied ? '✓ Copied' : 'Copy prompt'}
                </Button>
              </div>
            }
          />

          {/* Prompt text */}
          <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
            <pre className="max-h-80 overflow-y-auto p-4 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-mono">
              {activeIteration.promptText}
            </pre>
          </div>

          <div className="rounded-xl bg-violet-50 p-3 text-sm text-violet-800 dark:bg-violet-950/30 dark:text-violet-300">
            <span className="font-medium">Next:</span> Copy the prompt above and paste it into Claude Code.
            Then paste Claude's response below to parse it.
          </div>
        </Card>
      )}

      {/* Paste Claude response */}
      {activeIteration && activeIteration.status !== 'parsed' && (
        <Card>
          <CardHeader
            title="Paste Claude's response"
            description="Paste the full response from Claude Code. The parser will extract analysis, plan, files, implementation summary, and next step."
            icon="📋"
          />
          <div className="space-y-3">
            <textarea
              value={responseInput}
              onChange={(e) => setResponseInput(e.target.value)}
              placeholder="Paste Claude's full response here…"
              rows={8}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-violet-500 dark:focus:bg-zinc-900 font-mono"
            />
            <Button
              onClick={handleParseResponse}
              loading={parsing}
              disabled={!responseInput.trim()}
              fullWidth
            >
              {parsing ? 'Parsing…' : 'Parse Response'}
            </Button>
          </div>
        </Card>
      )}

      {/* Parsed result */}
      {activeIteration?.parsedSummary && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Parsed response" icon="🔍" action={<Badge variant="success">Parsed</Badge>} />
            <div className="space-y-4">
              {activeIteration.parsedSummary.analysis && (
                <ParsedSection label="Brief analysis" content={activeIteration.parsedSummary.analysis} />
              )}
              {activeIteration.parsedSummary.plan && (
                <ParsedSection label="Implementation plan" content={activeIteration.parsedSummary.plan} />
              )}
              {activeIteration.parsedSummary.changedFiles.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Files changed</p>
                  <div className="flex flex-wrap gap-1.5">
                    {activeIteration.parsedSummary.changedFiles.map((f) => (
                      <span key={f} className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {activeIteration.parsedSummary.nextStep && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Recommended next step</p>
                  <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">
                    {activeIteration.parsedSummary.nextStep}
                  </p>
                </div>
              )}
              {activeIteration.parsedSummary.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Parse warnings</p>
                  {activeIteration.parsedSummary.warnings.map((w, i) => (
                    <p key={i} className="mt-1 text-sm text-amber-700 dark:text-amber-400">⚠️ {w}</p>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Generate next */}
          <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800/40 dark:bg-violet-950/20">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-violet-800 dark:text-violet-300">Ready for iteration {promptIterations.length + 1}</p>
                <p className="mt-0.5 text-sm text-violet-700/80 dark:text-violet-400">
                  Generate the next prompt based on what was implemented and the recommended next step.
                </p>
              </div>
              <Button onClick={handleGenerateNext} loading={generating}>
                Generate Next Prompt →
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Iteration switcher */}
      {promptIterations.length > 1 && (
        <Card>
          <CardHeader title="All iterations" icon="🔄" />
          <div className="flex flex-wrap gap-2">
            {promptIterations.map((iter) => (
              <button
                key={iter.id}
                onClick={() => setActiveIterationId(iter.id)}
                className={[
                  'rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
                  activeIterationId === iter.id
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700',
                ].join(' ')}
              >
                #{iter.iterationNumber}
                {iter.status === 'parsed' && ' ✓'}
              </button>
            ))}
          </div>
        </Card>
      )}

      {promptIterations.length === 0 && !architectureDraft && (
        <EmptyState
          icon="⚡"
          title="Complete architecture first"
          description="The prompt loop requires a completed spec and architecture draft."
          action={{ label: 'Go to Architecture', onClick: () => navigate('/architecture') }}
        />
      )}
    </div>
  )
}

function ParsedSection({ label, content }: { label: string; content: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{content}</p>
    </div>
  )
}
