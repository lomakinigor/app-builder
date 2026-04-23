// T-408 — InviteApi HTTP adapter contract tests (Group L)
//
// Verifies that sharingApiHttp resolveInvite / acceptInvite:
//   - hits GET /api/invites/:inviteToken (resolveInvite)
//   - hits POST /api/invites/:inviteToken/accept (acceptInvite)
//   - maps response 1:1 to InviteInfo / AcceptedInvite
//   - throws ApiError on non-2xx

import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { sharingApiHttp } from './sharingApi.http'
import type { InviteInfo, AcceptedInvite } from '../types'

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

const inviteInfoFixture: InviteInfo = {
  projectId: 'proj-demo',
  projectName: 'AI Product Studio Demo',
  role: 'editor',
  email: 'bob@example.com',
}

const acceptedInviteFixture: AcceptedInvite = {
  projectId: 'proj-demo',
  role: 'editor',
}

// ─── L. InviteApi HTTP contract (T-408) ──────────────────────────────────────

describe('L. InviteApi HTTP contract', () => {
  it('resolveInvite — GET /api/invites/:token, maps InviteInfo', async () => {
    let capturedUrl: string | null = null

    server.use(
      http.get(`${BASE}/api/invites/:inviteToken`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(inviteInfoFixture)
      }),
    )

    const result = await sharingApiHttp.resolveInvite('invite-collab-2')

    expect(capturedUrl).toContain('/api/invites/invite-collab-2')
    expect(result.projectId).toBe('proj-demo')
    expect(result.projectName).toBe('AI Product Studio Demo')
    expect(result.role).toBe('editor')
    expect(result.email).toBe('bob@example.com')
  })

  it('acceptInvite — POST /api/invites/:token/accept, maps AcceptedInvite', async () => {
    let capturedUrl: string | null = null

    server.use(
      http.post(`${BASE}/api/invites/:inviteToken/accept`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(acceptedInviteFixture)
      }),
    )

    const result = await sharingApiHttp.acceptInvite('invite-collab-2')

    expect(capturedUrl).toContain('/api/invites/invite-collab-2/accept')
    expect(result.projectId).toBe('proj-demo')
    expect(result.role).toBe('editor')
  })

  it('resolveInvite — throws ApiError on 404', async () => {
    server.use(
      http.get(`${BASE}/api/invites/:inviteToken`, () =>
        HttpResponse.json({ message: 'Invite not found' }, { status: 404 }),
      ),
    )

    await expect(
      sharingApiHttp.resolveInvite('invite-invalid'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Invite not found',
    })
  })

  it('acceptInvite — throws ApiError on 410 (already used)', async () => {
    server.use(
      http.post(`${BASE}/api/invites/:inviteToken/accept`, () =>
        HttpResponse.json({ message: 'Invite already accepted' }, { status: 410 }),
      ),
    )

    await expect(
      sharingApiHttp.acceptInvite('invite-collab-1'),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 410,
      message: 'Invite already accepted',
    })
  })

  it('resolveInvite — viewer role mapped correctly', async () => {
    server.use(
      http.get(`${BASE}/api/invites/:inviteToken`, () =>
        HttpResponse.json({ ...inviteInfoFixture, role: 'viewer', email: 'alice@example.com' }),
      ),
    )

    const result = await sharingApiHttp.resolveInvite('invite-collab-1')
    expect(result.role).toBe('viewer')
    expect(result.email).toBe('alice@example.com')
  })
})
