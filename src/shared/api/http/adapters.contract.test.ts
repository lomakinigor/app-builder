// T-306 — HTTP adapter contract tests (ResearchApi, PromptLoopApi, SpecApi)
// T-307 — Extended with Group E: header / auth contract
// T-309 — Extended with Group F: tracing contract (X-Request-Id, X-Session-Id)
// T-310 — Extended with Group G: error correlation contract (ApiError.requestId)
// T-403 — Extended with Group H: SharingApi HTTP contract
// T-404 — Extended with Group I: getAuditTrail contract
// T-406 — Extended with Group J: listCollaborators, updateCollaboratorRole, revokeCollaborator, inviteByEmail role
//
// Verifies that each HTTP adapter:
//   - hits the correct URL and uses POST
//   - serialises a compact request body matching the documented contract
//   - maps the response 1:1 to the matching entity type
//   - throws ApiError on non-2xx with the message from response.json().message
//   - sends Content-Type + Accept headers on every request
//   - sends Authorization: Bearer <token> when a token is configured
//   - omits Authorization when no token is configured
//   - sends X-Request-Id on every request; value is overrideable per-test
//   - sends X-Session-Id when session provider is set
//   - ApiError.requestId is populated from error body { requestId } or X-Request-Id response header
//
// MSW v2 intercepts fetch() in Node so no real backend is needed.
// Adapters are imported directly (not through the factory) so mock mode is
// unaffected and env stubs are confined to this file.

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { setMaxListeners } from 'events'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import { researchApiHttp } from './researchApi.http'
import { promptLoopApiHttp } from './promptLoopApi.http'
import { specApiHttp } from './specApi.http'
import { sharingApiHttp } from './sharingApi.http'
import {
  setApiTokenProvider,
  resetApiTokenProvider,
  setApiRequestIdProvider,
  resetApiRequestIdProvider,
  setApiSessionIdProvider,
  resetApiSessionIdProvider,
} from './client'

import type {
  ResearchBrief,
  ImportedResearchArtifact,
  SpecPack,
  ArchitectureDraft,
  PromptIteration,
  ParsedClaudeResponse,
  IdeaDraft,
} from '../../types'

// ─── Test base URL ─────────────────────────────────────────────────────────────
// All contract tests run against this URL; MSW intercepts it.

const BASE = 'http://test-backend'

// ─── Minimal response fixtures ────────────────────────────────────────────────

const briefFixture: ResearchBrief = {
  problemSummary: 'Problem',
  targetUsers: ['Developer'],
  valueHypothesis: 'Value',
  competitorNotes: 'None',
  risks: ['Risk A'],
  opportunities: ['Opp A'],
  recommendedMVP: 'MVP desc',
  openQuestions: ['Q1'],
  sourcesNote: '',
  sourceIds: ['art-1'],
}

const specFixture: SpecPack = {
  projectType: 'application',
  productSummary: 'An app',
  MVPScope: 'MVP',
  featureList: [{ id: 'f-1', name: 'Feature', description: 'Desc', priority: 'must' }],
  assumptions: ['Assumption'],
  constraints: ['Constraint'],
  acceptanceNotes: 'Notes',
}

const archFixture: ArchitectureDraft = {
  projectType: 'application',
  recommendedStack: [{ name: 'React', role: 'UI', rationale: 'Ecosystem' }],
  moduleArchitecture: 'Feature-sliced',
  dataFlow: 'Store → components',
  roadmapPhases: [{ phase: 0, title: 'Foundation', goals: ['Shell'], estimatedComplexity: 'low' }],
  technicalRisks: ['Risk'],
}

const parsedFixture: ParsedClaudeResponse = {
  analysis: 'Analysis',
  plan: 'Plan',
  changedFiles: ['src/app.ts'],
  implementationSummary: 'Done',
  nextStep: 'Next',
  warnings: [],
  hasTests: true,
  implementedTaskIds: ['T-001'],
  nextTaskId: 'T-002',
  inferredNextPhase: 'code_and_tests',
}

const iterationFixture: PromptIteration = {
  id: 'iter-1',
  projectId: 'proj-1',
  iterationNumber: 1,
  promptText: 'Build X',
  claudeResponseRaw: null,
  parsedSummary: parsedFixture,
  recommendedNextStep: 'Continue',
  status: 'draft',
  createdAt: '2026-01-01T00:00:00Z',
  projectType: 'application',
  cyclePhase: 'code_and_tests',
  targetTaskId: 'T-001',
  roadmapPhaseNumber: 0,
}

// ─── MSW server ───────────────────────────────────────────────────────────────

const server = setupServer()

beforeAll(() => {
  // MSW registers many AbortSignal listeners across tests; raise the limit to suppress the warning.
  setMaxListeners(20)
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

// ─── A. ResearchApi ───────────────────────────────────────────────────────────

describe('A. ResearchApi HTTP contract', () => {
  it('runResearch — sends compact payload to POST /api/research/run and maps response', async () => {
    let capturedBody: unknown = null

    server.use(
      http.post(`${BASE}/api/research/run`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(briefFixture)
      }),
    )

    const result = await researchApiHttp.runResearch({
      projectId: 'proj-1',
      mode: 'quick',
      inputSummary: 'summary text',
    })

    expect(capturedBody).toEqual({ projectId: 'proj-1', mode: 'quick', inputSummary: 'summary text' })
    expect(result.problemSummary).toBe(briefFixture.problemSummary)
    expect(result.targetUsers).toEqual(briefFixture.targetUsers)
    expect(result.valueHypothesis).toBe(briefFixture.valueHypothesis)
  })

  it('normalizeImportedArtifact — sends artifact + ideaDraft to POST /api/research/normalize and maps response', async () => {
    let capturedBody: unknown = null

    const artifact: ImportedResearchArtifact = {
      id: 'art-1',
      projectId: 'proj-1',
      title: 'Notes',
      sourceType: 'markdown_notes',
      sourceLabel: 'My notes',
      rawContent: '# Problem\nProblem text',
      importedAt: '2026-01-01T00:00:00Z',
      notes: '',
    }

    const ideaDraft: IdeaDraft = {
      rawIdea: 'My idea',
      targetUser: 'Developer',
      problem: 'Problem',
      constraints: '',
      projectType: 'application',
    }

    server.use(
      http.post(`${BASE}/api/research/normalize`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ brief: briefFixture, warnings: ['W1'] })
      }),
    )

    const result = await researchApiHttp.normalizeImportedArtifact(artifact, ideaDraft)

    expect(capturedBody).toMatchObject({ artifact, ideaDraft })
    expect(result.brief).toMatchObject({ problemSummary: briefFixture.problemSummary })
    expect(result.warnings).toEqual(['W1'])
  })

  it('non-2xx response throws ApiError with message from response body', async () => {
    server.use(
      http.post(`${BASE}/api/research/run`, () =>
        HttpResponse.json({ message: 'Rate limit exceeded' }, { status: 429 }),
      ),
    )

    await expect(
      researchApiHttp.runResearch({ projectId: 'p', mode: 'quick', inputSummary: '' }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 429, message: 'Rate limit exceeded' })
  })
})

// ─── B. PromptLoopApi ─────────────────────────────────────────────────────────

describe('B. PromptLoopApi HTTP contract', () => {
  it('generateFirstPrompt — sends compact spec+arch context to POST /api/prompt-loop/first and maps response', async () => {
    let capturedBody: unknown = null

    server.use(
      http.post(`${BASE}/api/prompt-loop/first`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(iterationFixture)
      }),
    )

    const result = await promptLoopApiHttp.generateFirstPrompt(
      specFixture,
      archFixture,
      'application',
      'proj-1',
      'prompt-1',
      'T-001',
      'Build the foundation',
    )

    expect(capturedBody).toMatchObject({
      projectId: 'proj-1',
      projectType: 'application',
      taskId: 'T-001',
      taskDescription: 'Build the foundation',
      spec: {
        productSummary: specFixture.productSummary,
        MVPScope: specFixture.MVPScope,
        featureList: specFixture.featureList,
        constraints: specFixture.constraints,
      },
      arch: {
        roadmapPhases: archFixture.roadmapPhases,
        recommendedStack: archFixture.recommendedStack,
      },
    })
    expect(result.id).toBe(iterationFixture.id)
    expect(result.projectType).toBe('application')
    expect(result.cyclePhase).toBe('code_and_tests')
  })

  it('generateNextPrompt — sends prev iteration metadata + parsedSummary to POST /api/prompt-loop/next', async () => {
    let capturedBody: unknown = null

    const prevIteration = iterationFixture

    server.use(
      http.post(`${BASE}/api/prompt-loop/next`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...iterationFixture, id: 'iter-2', iterationNumber: 2 })
      }),
    )

    const result = await promptLoopApiHttp.generateNextPrompt(
      prevIteration,
      parsedFixture,
      'application',
      'proj-1',
      'prompt-2',
      2,
      'code_and_tests',
    )

    expect(capturedBody).toMatchObject({
      projectId: 'proj-1',
      projectType: 'application',
      nextIterationNumber: 2,
      targetPhase: 'code_and_tests',
      prevIteration: {
        id: prevIteration.id,
        iterationNumber: prevIteration.iterationNumber,
        targetTaskId: prevIteration.targetTaskId,
        roadmapPhaseNumber: prevIteration.roadmapPhaseNumber,
      },
      parsedSummary: {
        implementationSummary: parsedFixture.implementationSummary,
        changedFiles: parsedFixture.changedFiles,
        nextStep: parsedFixture.nextStep,
        hasTests: parsedFixture.hasTests,
        nextTaskId: parsedFixture.nextTaskId,
        implementedTaskIds: parsedFixture.implementedTaskIds,
      },
    })
    expect(result.iterationNumber).toBe(2)
  })

  it('non-2xx response throws ApiError with message from response body', async () => {
    server.use(
      http.post(`${BASE}/api/prompt-loop/first`, () =>
        HttpResponse.json({ message: 'Context too large' }, { status: 413 }),
      ),
    )

    await expect(
      promptLoopApiHttp.generateFirstPrompt(
        specFixture,
        archFixture,
        'application',
        'proj-1',
        'prompt-1',
        null,
        null,
      ),
    ).rejects.toMatchObject({ name: 'ApiError', status: 413, message: 'Context too large' })
  })
})

// ─── C. SpecApi ───────────────────────────────────────────────────────────────

describe('C. SpecApi HTTP contract', () => {
  it('generateSpec — sends compact brief to POST /api/spec/generate and maps response to SpecPack', async () => {
    let capturedBody: unknown = null

    server.use(
      http.post(`${BASE}/api/spec/generate`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(specFixture)
      }),
    )

    const result = await specApiHttp.generateSpec(briefFixture, 'application')

    expect(capturedBody).toEqual({
      projectType: 'application',
      brief: {
        problemSummary: briefFixture.problemSummary,
        targetUsers: briefFixture.targetUsers,
        valueHypothesis: briefFixture.valueHypothesis,
        competitorNotes: briefFixture.competitorNotes,
        risks: briefFixture.risks,
        opportunities: briefFixture.opportunities,
        recommendedMVP: briefFixture.recommendedMVP,
        openQuestions: briefFixture.openQuestions,
      },
    })
    expect(result.productSummary).toBe(specFixture.productSummary)
    expect(result.projectType).toBe('application')
    expect(result.featureList).toEqual(specFixture.featureList)
  })

  it('generateArchitecture — sends compact spec to POST /api/architecture/generate and maps response to ArchitectureDraft', async () => {
    let capturedBody: unknown = null

    server.use(
      http.post(`${BASE}/api/architecture/generate`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(archFixture)
      }),
    )

    const result = await specApiHttp.generateArchitecture(specFixture, 'application')

    expect(capturedBody).toEqual({
      projectType: 'application',
      spec: {
        productSummary: specFixture.productSummary,
        MVPScope: specFixture.MVPScope,
        featureList: specFixture.featureList,
        constraints: specFixture.constraints,
        assumptions: specFixture.assumptions,
      },
    })
    expect(result.projectType).toBe('application')
    expect(result.recommendedStack).toEqual(archFixture.recommendedStack)
    expect(result.roadmapPhases).toEqual(archFixture.roadmapPhases)
  })

  it('non-2xx response throws ApiError with message from response body', async () => {
    server.use(
      http.post(`${BASE}/api/spec/generate`, () =>
        HttpResponse.json({ message: 'Brief too short' }, { status: 422 }),
      ),
    )

    await expect(specApiHttp.generateSpec(briefFixture, 'application')).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      message: 'Brief too short',
    })
  })
})

// ─── D. Error semantics ───────────────────────────────────────────────────────

describe('D. Error semantics — all adapters', () => {
  it('ApiError falls back to "HTTP <status>" when response body has no message field', async () => {
    server.use(
      http.post(`${BASE}/api/spec/generate`, () =>
        HttpResponse.json({ error: 'oops' }, { status: 503 }),
      ),
    )

    await expect(specApiHttp.generateSpec(briefFixture, 'website')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: 'HTTP 503',
    })
  })

  it('ApiError falls back gracefully when response body is not JSON', async () => {
    server.use(
      http.post(`${BASE}/api/research/run`, () =>
        new HttpResponse('Service Unavailable', { status: 503, headers: { 'Content-Type': 'text/plain' } }),
      ),
    )

    await expect(
      researchApiHttp.runResearch({ projectId: 'p', mode: 'quick', inputSummary: '' }),
    ).rejects.toMatchObject({ name: 'ApiError', status: 503, message: 'HTTP 503' })
  })
})

// ─── E. Header / auth contract ────────────────────────────────────────────────
// T-307: verifies all adapters use the shared client and send correct headers.
// T-309: verifies X-Request-Id tracing header is present and overrideable.
// One representative call per adapter domain is sufficient because headers come
// from the shared buildApiHeaders() helper, not per-adapter logic.

describe('E. Header / auth contract', () => {
  afterEach(() => {
    resetApiTokenProvider()
  })

  it('all adapters send Content-Type and Accept headers', async () => {
    const capturedHeaders: Record<string, string[]> = {
      research: [],
      promptLoop: [],
      spec: [],
    }

    server.use(
      http.post(`${BASE}/api/research/run`, ({ request }) => {
        capturedHeaders.research = [
          request.headers.get('Content-Type') ?? '',
          request.headers.get('Accept') ?? '',
        ]
        return HttpResponse.json(briefFixture)
      }),
      http.post(`${BASE}/api/prompt-loop/first`, ({ request }) => {
        capturedHeaders.promptLoop = [
          request.headers.get('Content-Type') ?? '',
          request.headers.get('Accept') ?? '',
        ]
        return HttpResponse.json(iterationFixture)
      }),
      http.post(`${BASE}/api/spec/generate`, ({ request }) => {
        capturedHeaders.spec = [
          request.headers.get('Content-Type') ?? '',
          request.headers.get('Accept') ?? '',
        ]
        return HttpResponse.json(specFixture)
      }),
    )

    await researchApiHttp.runResearch({ projectId: 'p', mode: 'quick', inputSummary: 's' })
    await promptLoopApiHttp.generateFirstPrompt(specFixture, archFixture, 'application', 'p', 'pr-1', null, null)
    await specApiHttp.generateSpec(briefFixture, 'application')

    for (const [domain, headers] of Object.entries(capturedHeaders)) {
      expect(headers[0], `${domain}: Content-Type`).toContain('application/json')
      expect(headers[1], `${domain}: Accept`).toBe('application/json')
    }
  })

  it('Authorization header is sent when token is configured — one call per domain', async () => {
    const TEST_TOKEN = 'test-bearer-xyz'
    setApiTokenProvider(() => TEST_TOKEN)

    const capturedAuth: Record<string, string | null> = {
      research: null,
      promptLoop: null,
      spec: null,
    }

    server.use(
      http.post(`${BASE}/api/research/run`, ({ request }) => {
        capturedAuth.research = request.headers.get('Authorization')
        return HttpResponse.json(briefFixture)
      }),
      http.post(`${BASE}/api/prompt-loop/first`, ({ request }) => {
        capturedAuth.promptLoop = request.headers.get('Authorization')
        return HttpResponse.json(iterationFixture)
      }),
      http.post(`${BASE}/api/spec/generate`, ({ request }) => {
        capturedAuth.spec = request.headers.get('Authorization')
        return HttpResponse.json(specFixture)
      }),
    )

    await researchApiHttp.runResearch({ projectId: 'p', mode: 'quick', inputSummary: 's' })
    await promptLoopApiHttp.generateFirstPrompt(specFixture, archFixture, 'application', 'p', 'pr-1', null, null)
    await specApiHttp.generateSpec(briefFixture, 'application')

    expect(capturedAuth.research).toBe(`Bearer ${TEST_TOKEN}`)
    expect(capturedAuth.promptLoop).toBe(`Bearer ${TEST_TOKEN}`)
    expect(capturedAuth.spec).toBe(`Bearer ${TEST_TOKEN}`)
  })

  it('Authorization header is omitted when no token is configured', async () => {
    setApiTokenProvider(() => null)

    let capturedAuth: string | null = 'not-checked'

    server.use(
      http.post(`${BASE}/api/spec/generate`, ({ request }) => {
        capturedAuth = request.headers.get('Authorization')
        return HttpResponse.json(specFixture)
      }),
    )

    await specApiHttp.generateSpec(briefFixture, 'application')

    expect(capturedAuth).toBeNull()
  })
})

// ─── F. Tracing contract ──────────────────────────────────────────────────────
// T-309: verifies X-Request-Id and X-Session-Id tracing headers.
// Uses one representative adapter call per scenario — headers are shared client
// behaviour, not adapter-specific.

describe('F. Tracing contract', () => {
  afterEach(() => {
    resetApiRequestIdProvider()
    resetApiSessionIdProvider()
  })

  it('X-Request-Id is present on every request (default provider)', async () => {
    const capturedIds: (string | null)[] = []

    server.use(
      http.post(`${BASE}/api/research/run`, ({ request }) => {
        capturedIds.push(request.headers.get('X-Request-Id'))
        return HttpResponse.json(briefFixture)
      }),
    )

    await researchApiHttp.runResearch({ projectId: 'p', mode: 'quick', inputSummary: 's' })
    await researchApiHttp.runResearch({ projectId: 'p', mode: 'quick', inputSummary: 's' })

    expect(capturedIds).toHaveLength(2)
    expect(capturedIds[0]).toBeTruthy()
    expect(capturedIds[1]).toBeTruthy()
    // Default provider generates a new id per call — values must differ
    expect(capturedIds[0]).not.toBe(capturedIds[1])
  })

  it('custom request id provider is used when set', async () => {
    const FIXED_ID = 'test-request-id-123'
    setApiRequestIdProvider(() => FIXED_ID)

    let capturedId: string | null = null

    server.use(
      http.post(`${BASE}/api/spec/generate`, ({ request }) => {
        capturedId = request.headers.get('X-Request-Id')
        return HttpResponse.json(specFixture)
      }),
    )

    await specApiHttp.generateSpec(briefFixture, 'application')

    expect(capturedId).toBe(FIXED_ID)
  })

  it('X-Session-Id header is sent when session id provider is set', async () => {
    const FIXED_SESSION = 'test-session-xyz'
    setApiSessionIdProvider(() => FIXED_SESSION)

    let capturedSessionId: string | null = null

    server.use(
      http.post(`${BASE}/api/prompt-loop/first`, ({ request }) => {
        capturedSessionId = request.headers.get('X-Session-Id')
        return HttpResponse.json(iterationFixture)
      }),
    )

    await promptLoopApiHttp.generateFirstPrompt(
      specFixture, archFixture, 'application', 'p', 'pr-1', null, null,
    )

    expect(capturedSessionId).toBe(FIXED_SESSION)
  })

  it('X-Session-Id header is omitted when no session id provider is set', async () => {
    let capturedSessionId: string | null = 'not-checked'

    server.use(
      http.post(`${BASE}/api/research/run`, ({ request }) => {
        capturedSessionId = request.headers.get('X-Session-Id')
        return HttpResponse.json(briefFixture)
      }),
    )

    await researchApiHttp.runResearch({ projectId: 'p', mode: 'quick', inputSummary: 's' })

    expect(capturedSessionId).toBeNull()
  })
})

// ─── G. Error correlation contract ───────────────────────────────────────────
// T-310: verifies that ApiError carries requestId extracted from the backend
// error response body (primary) or response header (fallback).
// All scenarios live in the shared client — one adapter endpoint is enough.

describe('G. Error correlation contract', () => {
  it('ApiError includes requestId from JSON error body', async () => {
    server.use(
      http.post(`${BASE}/api/spec/generate`, () =>
        HttpResponse.json(
          { message: 'Backend failed', requestId: 'req-abc-123' },
          { status: 500 },
        ),
      ),
    )

    await expect(specApiHttp.generateSpec(briefFixture, 'application')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Backend failed',
      requestId: 'req-abc-123',
    })
  })

  it('ApiError uses HTTP <status> message when body has no message field, but still captures requestId', async () => {
    server.use(
      http.post(`${BASE}/api/research/run`, () =>
        HttpResponse.json({ requestId: 'req-502-xyz' }, { status: 502 }),
      ),
    )

    await expect(
      researchApiHttp.runResearch({ projectId: 'p', mode: 'quick', inputSummary: '' }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 502,
      message: 'HTTP 502',
      requestId: 'req-502-xyz',
    })
  })

  it('ApiError falls back to response X-Request-Id header when body has no requestId', async () => {
    server.use(
      http.post(`${BASE}/api/spec/generate`, () =>
        new HttpResponse(JSON.stringify({ message: 'Server error' }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': 'header-req-id-789',
          },
        }),
      ),
    )

    await expect(specApiHttp.generateSpec(briefFixture, 'application')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: 'Server error',
      requestId: 'header-req-id-789',
    })
  })

  it('ApiError has null requestId when body is non-JSON and no header is present', async () => {
    server.use(
      http.post(`${BASE}/api/research/run`, () =>
        new HttpResponse('Service Unavailable', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )

    let caught: unknown
    try {
      await researchApiHttp.runResearch({ projectId: 'p', mode: 'quick', inputSummary: '' })
    } catch (e) {
      caught = e
    }

    expect(caught).toMatchObject({ name: 'ApiError', status: 503, message: 'HTTP 503' })
    expect((caught as { requestId: unknown }).requestId).toBeNull()
  })
})

// ─── H. SharingApi HTTP contract (T-403) ─────────────────────────────────────

describe('H. SharingApi HTTP contract', () => {
  it('generateShareToken — POST /api/shares with projectId body, maps ShareInfo response', async () => {
    let capturedBody: unknown = null

    server.use(
      http.post(`${BASE}/api/shares`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ shareId: 'share-proj-1', shareUrl: '/shared/share-proj-1' })
      }),
    )

    const result = await sharingApiHttp.generateShareToken('proj-1')

    expect(capturedBody).toEqual({ projectId: 'proj-1' })
    expect(result.shareId).toBe('share-proj-1')
    expect(result.shareUrl).toBe('/shared/share-proj-1')
  })

  it('resolveShare — GET /api/shares/:shareId, maps ResolvedShare response', async () => {
    let capturedUrl: string | null = null

    server.use(
      http.get(`${BASE}/api/shares/:shareId`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ projectId: 'proj-1', canEdit: false })
      }),
    )

    const result = await sharingApiHttp.resolveShare('share-proj-1')

    expect(capturedUrl).toContain('/api/shares/share-proj-1')
    expect(result.projectId).toBe('proj-1')
    expect(result.canEdit).toBe(false)
  })

  it('inviteByEmail — POST /api/shares/:shareId/invite with email body, maps InviteResult', async () => {
    let capturedBody: unknown = null
    let capturedUrl: string | null = null

    server.use(
      http.post(`${BASE}/api/shares/:shareId/invite`, async ({ request }) => {
        capturedUrl = request.url
        capturedBody = await request.json()
        return HttpResponse.json({ invitedEmail: 'user@example.com', status: 'sent' })
      }),
    )

    const result = await sharingApiHttp.inviteByEmail('share-proj-1', 'user@example.com')

    expect(capturedUrl).toContain('/api/shares/share-proj-1/invite')
    expect(capturedBody).toEqual({ email: 'user@example.com', role: 'viewer' })
    expect(result.invitedEmail).toBe('user@example.com')
    expect(result.status).toBe('sent')
  })

  it('resolveShare throws ApiError on 404 (share not found)', async () => {
    server.use(
      http.get(`${BASE}/api/shares/:shareId`, () =>
        HttpResponse.json({ message: 'Share not found' }, { status: 404 }),
      ),
    )

    await expect(sharingApiHttp.resolveShare('invalid-token')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Share not found',
    })
  })

  it('inviteByEmail throws ApiError on 400 (invalid email)', async () => {
    server.use(
      http.post(`${BASE}/api/shares/:shareId/invite`, () =>
        HttpResponse.json({ message: 'Invalid email address' }, { status: 400 }),
      ),
    )

    await expect(
      sharingApiHttp.inviteByEmail('share-proj-1', 'not-an-email'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Invalid email address',
    })
  })

  it('inviteByEmail throws ApiError on 409 (already invited)', async () => {
    server.use(
      http.post(`${BASE}/api/shares/:shareId/invite`, () =>
        HttpResponse.json({ message: 'Already invited' }, { status: 409 }),
      ),
    )

    await expect(
      sharingApiHttp.inviteByEmail('share-proj-1', 'user@example.com'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      message: 'Already invited',
    })
  })

  it('generateShareToken throws ApiError on non-2xx with message from body', async () => {
    server.use(
      http.post(`${BASE}/api/shares`, () =>
        HttpResponse.json({ message: 'Project not found' }, { status: 404 }),
      ),
    )

    await expect(sharingApiHttp.generateShareToken('proj-missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Project not found',
    })
  })
})

// ─── I. getAuditTrail HTTP contract (T-404) ───────────────────────────────────

describe('I. getAuditTrail HTTP contract', () => {
  it('getAuditTrail — GET /api/projects/:projectId/sharing-audit, maps SharingAuditEvent[]', async () => {
    let capturedUrl: string | null = null

    const auditFixture = [
      {
        id: 'audit-proj-1-1',
        projectId: 'proj-1',
        type: 'share_link_created',
        timestamp: '2026-04-22T10:15:00.000Z',
        actorLabel: 'owner',
        shareId: 'share-proj-1',
      },
      {
        id: 'audit-proj-1-2',
        projectId: 'proj-1',
        type: 'share_invite_sent',
        timestamp: '2026-04-22T10:18:00.000Z',
        actorLabel: 'owner',
        targetEmail: 'alice@example.com',
        shareId: 'share-proj-1',
      },
    ]

    server.use(
      http.get(`${BASE}/api/projects/:projectId/sharing-audit`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(auditFixture)
      }),
    )

    const result = await sharingApiHttp.getAuditTrail('proj-1')

    expect(capturedUrl).toContain('/api/projects/proj-1/sharing-audit')
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('share_link_created')
    expect(result[1].targetEmail).toBe('alice@example.com')
  })

  it('getAuditTrail — returns empty array when no events', async () => {
    server.use(
      http.get(`${BASE}/api/projects/:projectId/sharing-audit`, () =>
        HttpResponse.json([]),
      ),
    )

    const result = await sharingApiHttp.getAuditTrail('proj-empty')
    expect(result).toEqual([])
  })

  it('getAuditTrail — throws ApiError on non-2xx (e.g. 403 forbidden)', async () => {
    server.use(
      http.get(`${BASE}/api/projects/:projectId/sharing-audit`, () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    )

    await expect(sharingApiHttp.getAuditTrail('proj-1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Forbidden',
    })
  })
})

// ─── J. Collaborator management HTTP contract (T-406) ────────────────────────

describe('J. Collaborator management HTTP contract', () => {
  const collaboratorFixture = {
    id: 'collab-1',
    email: 'alice@example.com',
    role: 'viewer' as const,
    status: 'active' as const,
    invitedAt: '2026-04-22T10:18:00.000Z',
  }

  it('listCollaborators — GET /api/projects/:projectId/collaborators, maps ProjectCollaborator[]', async () => {
    let capturedUrl: string | null = null

    server.use(
      http.get(`${BASE}/api/projects/:projectId/collaborators`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([collaboratorFixture])
      }),
    )

    const result = await sharingApiHttp.listCollaborators('proj-1')

    expect(capturedUrl).toContain('/api/projects/proj-1/collaborators')
    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('alice@example.com')
    expect(result[0].role).toBe('viewer')
  })

  it('updateCollaboratorRole — PATCH /api/collaborators/:id with { role } body, maps updated collaborator', async () => {
    let capturedBody: unknown = null
    let capturedUrl: string | null = null

    server.use(
      http.patch(`${BASE}/api/collaborators/:collaboratorId`, async ({ request }) => {
        capturedUrl = request.url
        capturedBody = await request.json()
        return HttpResponse.json({ ...collaboratorFixture, role: 'editor' })
      }),
    )

    const result = await sharingApiHttp.updateCollaboratorRole('collab-1', 'editor')

    expect(capturedUrl).toContain('/api/collaborators/collab-1')
    expect(capturedBody).toEqual({ role: 'editor' })
    expect(result.role).toBe('editor')
  })

  it('revokeCollaborator — DELETE /api/collaborators/:id, returns { success: true }', async () => {
    let capturedUrl: string | null = null

    server.use(
      http.delete(`${BASE}/api/collaborators/:collaboratorId`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json({ success: true })
      }),
    )

    const result = await sharingApiHttp.revokeCollaborator('collab-1')

    expect(capturedUrl).toContain('/api/collaborators/collab-1')
    expect(result).toEqual({ success: true })
  })

  it('inviteByEmail — sends role in request body alongside email', async () => {
    let capturedBody: unknown = null

    server.use(
      http.post(`${BASE}/api/shares/:shareId/invite`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ invitedEmail: 'bob@example.com', status: 'sent' })
      }),
    )

    await sharingApiHttp.inviteByEmail('share-proj-1', 'bob@example.com', 'editor')

    expect(capturedBody).toEqual({ email: 'bob@example.com', role: 'editor' })
  })
})
