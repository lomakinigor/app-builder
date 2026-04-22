// T-407 — CommentsApi HTTP adapter contract tests (Group K)
//
// Verifies that commentsApiHttp:
//   - hits the correct URL with query params (listComments GET)
//   - sends correct POST body (addComment)
//   - maps response 1:1 to ArtifactComment
//   - throws ApiError on non-2xx

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { commentsApiHttp } from './commentsApi.http'
import type { ArtifactComment } from '../types'

// ─── MSW server ───────────────────────────────────────────────────────────────

const BASE = 'http://test-backend'
const server = setupServer()

beforeAll(() => {
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  server.listen({ onUnhandledRequest: 'error' })
})
afterEach(() => server.resetHandlers())
afterAll(() => {
  server.close()
  vi.unstubAllEnvs()
})

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const commentFixture: ArtifactComment = {
  id: 'comment-1',
  projectId: 'proj-1',
  artifactType: 'spec',
  artifactId: 'proj-1',
  body: 'Looks good!',
  authorLabel: 'owner',
  createdAt: '2026-04-22T10:00:00.000Z',
}

// ─── K. CommentsApi HTTP contract (T-407) ────────────────────────────────────

describe('K. CommentsApi HTTP contract', () => {
  it('listComments — GET with artifactType+artifactId query params, maps ArtifactComment[]', async () => {
    let capturedUrl: string | null = null

    server.use(
      http.get(`${BASE}/api/projects/:projectId/comments`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json([commentFixture])
      }),
    )

    const result = await commentsApiHttp.listComments('proj-1', 'spec', 'proj-1')

    expect(capturedUrl).toContain('/api/projects/proj-1/comments')
    expect(capturedUrl).toContain('artifactType=spec')
    expect(capturedUrl).toContain('artifactId=proj-1')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('comment-1')
    expect(result[0].body).toBe('Looks good!')
    expect(result[0].authorLabel).toBe('owner')
  })

  it('listComments — returns empty array when no comments', async () => {
    server.use(
      http.get(`${BASE}/api/projects/:projectId/comments`, () =>
        HttpResponse.json([]),
      ),
    )

    const result = await commentsApiHttp.listComments('proj-1', 'architecture', 'proj-1')
    expect(result).toEqual([])
  })

  it('addComment — POST with correct body, maps ArtifactComment', async () => {
    let capturedUrl: string | null = null
    let capturedBody: unknown = null

    server.use(
      http.post(`${BASE}/api/projects/:projectId/comments`, async ({ request }) => {
        capturedUrl = request.url
        capturedBody = await request.json()
        return HttpResponse.json(commentFixture)
      }),
    )

    const result = await commentsApiHttp.addComment({
      projectId: 'proj-1',
      artifactType: 'spec',
      artifactId: 'proj-1',
      body: 'Looks good!',
    })

    expect(capturedUrl).toContain('/api/projects/proj-1/comments')
    expect(capturedBody).toEqual({ artifactType: 'spec', artifactId: 'proj-1', body: 'Looks good!' })
    expect(result.id).toBe('comment-1')
    expect(result.authorLabel).toBe('owner')
  })

  it('listComments — throws ApiError on non-2xx (403 forbidden)', async () => {
    server.use(
      http.get(`${BASE}/api/projects/:projectId/comments`, () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 403 }),
      ),
    )

    await expect(
      commentsApiHttp.listComments('proj-1', 'spec', 'proj-1'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Forbidden',
    })
  })

  it('addComment — throws ApiError on non-2xx (400 bad request)', async () => {
    server.use(
      http.post(`${BASE}/api/projects/:projectId/comments`, () =>
        HttpResponse.json({ message: 'Body is required' }, { status: 400 }),
      ),
    )

    await expect(
      commentsApiHttp.addComment({
        projectId: 'proj-1',
        artifactType: 'spec',
        artifactId: 'proj-1',
        body: '',
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'Body is required',
    })
  })
})
