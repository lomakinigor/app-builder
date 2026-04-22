// T-301 — Adapter factory unit tests
// Verifies that VITE_API_MODE correctly selects mock vs http adapters.

import { describe, it, expect, vi, afterEach } from 'vitest'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setApiMode(mode: string | undefined) {
  vi.stubEnv('VITE_API_MODE', mode as string)
}

afterEach(() => {
  vi.unstubAllEnvs()
  // Clear module cache so each test gets a fresh factory evaluation
  vi.resetModules()
})

// ─── A. mock mode (default) ───────────────────────────────────────────────────

describe('A. VITE_API_MODE=mock (default) — returns mock adapters', () => {
  it('getSpecApi() returns specApiMock when mode is "mock"', async () => {
    setApiMode('mock')
    const { getSpecApi } = await import('./index')
    const { specApiMock } = await import('./mock/specApi.mock')
    expect(getSpecApi()).toBe(specApiMock)
  })

  it('getPromptLoopApi() returns promptLoopApiMock when mode is "mock"', async () => {
    setApiMode('mock')
    const { getPromptLoopApi } = await import('./index')
    const { promptLoopApiMock } = await import('./mock/promptLoopApi.mock')
    expect(getPromptLoopApi()).toBe(promptLoopApiMock)
  })

  it('getResearchApi() returns researchApiMock when mode is "mock"', async () => {
    setApiMode('mock')
    const { getResearchApi } = await import('./index')
    const { researchApiMock } = await import('./mock/researchApi.mock')
    expect(getResearchApi()).toBe(researchApiMock)
  })

  it('returns mock adapter when VITE_API_MODE is unset (no env var)', async () => {
    vi.stubEnv('VITE_API_MODE', '')
    const { getSpecApi } = await import('./index')
    const { specApiMock } = await import('./mock/specApi.mock')
    expect(getSpecApi()).toBe(specApiMock)
  })
})

// ─── B. real mode — returns http adapters ─────────────────────────────────────

describe('B. VITE_API_MODE=real — returns http adapters', () => {
  it('getSpecApi() returns specApiHttp when mode is "real"', async () => {
    setApiMode('real')
    const { getSpecApi } = await import('./index')
    const { specApiHttp } = await import('./http/specApi.http')
    expect(getSpecApi()).toBe(specApiHttp)
  })

  it('getPromptLoopApi() returns promptLoopApiHttp when mode is "real"', async () => {
    setApiMode('real')
    const { getPromptLoopApi } = await import('./index')
    const { promptLoopApiHttp } = await import('./http/promptLoopApi.http')
    expect(getPromptLoopApi()).toBe(promptLoopApiHttp)
  })

  it('getResearchApi() returns researchApiHttp when mode is "real"', async () => {
    setApiMode('real')
    const { getResearchApi } = await import('./index')
    const { researchApiHttp } = await import('./http/researchApi.http')
    expect(getResearchApi()).toBe(researchApiHttp)
  })
})

// ─── C. adapter interface contract — mock adapters are callable ───────────────

describe('C. mock adapter contract — methods are callable functions', () => {
  it('specApiMock.generateSpec is a function', async () => {
    const { specApiMock } = await import('./mock/specApi.mock')
    expect(typeof specApiMock.generateSpec).toBe('function')
    expect(typeof specApiMock.generateArchitecture).toBe('function')
  })

  it('promptLoopApiMock has generateFirstPrompt, parseClaudeResponse, generateNextPrompt', async () => {
    const { promptLoopApiMock } = await import('./mock/promptLoopApi.mock')
    expect(typeof promptLoopApiMock.generateFirstPrompt).toBe('function')
    expect(typeof promptLoopApiMock.parseClaudeResponse).toBe('function')
    expect(typeof promptLoopApiMock.generateNextPrompt).toBe('function')
  })

  it('researchApiMock has runResearch and normalizeImportedArtifact', async () => {
    const { researchApiMock } = await import('./mock/researchApi.mock')
    expect(typeof researchApiMock.runResearch).toBe('function')
    expect(typeof researchApiMock.normalizeImportedArtifact).toBe('function')
  })
})

// ─── D. (Phase 1 complete — all three HTTP adapters are production-ready) ────
// ResearchApi: T-303, PromptLoopApi: T-304, SpecApi: T-305
// No throw-stub tests remain; see groups E, F, G for per-adapter contracts.

// ─── G. specApiHttp — real HTTP adapter (T-305) ───────────────────────────────

describe('G. specApiHttp — real HTTP adapter contract', () => {
  it('generateSpec is a function (not a stub)', async () => {
    const { specApiHttp } = await import('./http/specApi.http')
    expect(typeof specApiHttp.generateSpec).toBe('function')
  })

  it('generateArchitecture is a function (not a stub)', async () => {
    const { specApiHttp } = await import('./http/specApi.http')
    expect(typeof specApiHttp.generateArchitecture).toBe('function')
  })

  it('generateSpec throws a network/URL error when VITE_API_BASE_URL is unset (no backend)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { specApiHttp } = await import('./http/specApi.http')
    const brief = {
      problemSummary: '', targetUsers: [], valueHypothesis: '', competitorNotes: '',
      risks: [], opportunities: [], recommendedMVP: '', openQuestions: [], sourcesNote: '', sourceIds: [],
    } as never
    await expect(specApiHttp.generateSpec(brief, 'application')).rejects.toThrow()
  })

  it('generateArchitecture throws a network/URL error when VITE_API_BASE_URL is unset (no backend)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { specApiHttp } = await import('./http/specApi.http')
    const spec = {
      projectType: 'application', productSummary: '', MVPScope: '',
      featureList: [], constraints: [], assumptions: [], acceptanceNotes: '',
    } as never
    await expect(specApiHttp.generateArchitecture(spec, 'application')).rejects.toThrow()
  })
})

// ─── E. researchApiHttp — real HTTP adapter (T-303) ──────────────────────────


describe('E. researchApiHttp — real HTTP adapter contract', () => {
  it('runResearch is a function (not a stub)', async () => {
    const { researchApiHttp } = await import('./http/researchApi.http')
    expect(typeof researchApiHttp.runResearch).toBe('function')
  })

  it('normalizeImportedArtifact is a function (not a stub)', async () => {
    const { researchApiHttp } = await import('./http/researchApi.http')
    expect(typeof researchApiHttp.normalizeImportedArtifact).toBe('function')
  })

  it('runResearch throws a network/URL error when VITE_API_BASE_URL is unset (no backend)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { researchApiHttp } = await import('./http/researchApi.http')
    await expect(
      researchApiHttp.runResearch({ projectId: 'x', mode: 'quick', inputSummary: '' }),
    ).rejects.toThrow()
  })
})

// ─── F. promptLoopApiHttp — real HTTP adapter (T-304) ────────────────────────

describe('F. promptLoopApiHttp — real HTTP adapter contract', () => {
  it('generateFirstPrompt is a function (not a stub)', async () => {
    const { promptLoopApiHttp } = await import('./http/promptLoopApi.http')
    expect(typeof promptLoopApiHttp.generateFirstPrompt).toBe('function')
  })

  it('generateNextPrompt is a function (not a stub)', async () => {
    const { promptLoopApiHttp } = await import('./http/promptLoopApi.http')
    expect(typeof promptLoopApiHttp.generateNextPrompt).toBe('function')
  })

  it('parseClaudeResponse throws — it is client-side only', async () => {
    const { promptLoopApiHttp } = await import('./http/promptLoopApi.http')
    expect(() => promptLoopApiHttp.parseClaudeResponse('any text')).toThrow(/client-side/i)
  })

  it('generateFirstPrompt throws a network/URL error when VITE_API_BASE_URL is unset (no backend)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { promptLoopApiHttp } = await import('./http/promptLoopApi.http')
    await expect(
      promptLoopApiHttp.generateFirstPrompt(
        { productSummary: '', MVPScope: '', featureList: [], constraints: [] } as never,
        { roadmapPhases: [], recommendedStack: [] } as never,
        'application',
        'proj-1',
        'prompt-1',
        null,
        null,
      ),
    ).rejects.toThrow()
  })

  it('generateNextPrompt throws a network/URL error when VITE_API_BASE_URL is unset (no backend)', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const { promptLoopApiHttp } = await import('./http/promptLoopApi.http')
    const prevIteration = {
      id: 'it-1',
      iterationNumber: 1,
      targetTaskId: null,
      roadmapPhaseNumber: null,
    } as never
    const parsed = {
      implementationSummary: '',
      changedFiles: [],
      nextStep: '',
      hasTests: false,
      nextTaskId: null,
      implementedTaskIds: [],
    } as never
    await expect(
      promptLoopApiHttp.generateNextPrompt(prevIteration, parsed, 'application', 'proj-1', 'prompt-2', 2),
    ).rejects.toThrow()
  })
})
