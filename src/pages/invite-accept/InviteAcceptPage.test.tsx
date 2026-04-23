// @vitest-environment jsdom
// T-408 — InviteAcceptPage UI tests.
//
// Coverage:
//   A. Valid invite — shows project name + role
//   B. Accept button — calls acceptInvite, sets viewingMode, redirects /history
//   C. Editor invite → viewingMode=editor
//   D. Viewer invite → viewingMode=viewer
//   E. Invalid/expired invite → error state
//   F. Missing inviteToken param → error state

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InviteAcceptPage } from './InviteAcceptPage'
import type { InviteInfo, AcceptedInvite } from '../../shared/api'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockNavigate,
}))

const mockUseParams = vi.fn(() => ({ inviteToken: 'invite-collab-2' }))

const mockResolveInvite = vi.fn()
const mockAcceptInvite = vi.fn()
vi.mock('../../shared/api', () => ({
  getSharingApi: () => ({
    resolveInvite: mockResolveInvite,
    acceptInvite: mockAcceptInvite,
  }),
}))

const mockSelectProject = vi.fn()
const mockProjects = [
  { id: 'proj-demo', name: 'AI Product Studio Demo' },
]
vi.mock('../../app/store/projectRegistryStore', () => ({
  useProjectRegistry: () => ({
    projects: mockProjects,
    selectProject: mockSelectProject,
  }),
}))

const mockSetViewingMode = vi.fn()
vi.mock('../../app/store/viewingModeStore', () => ({
  useViewingModeStore: () => ({
    setViewingMode: mockSetViewingMode,
  }),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const editorInviteInfo: InviteInfo = {
  projectId: 'proj-demo',
  projectName: 'AI Product Studio Demo',
  role: 'editor',
  email: 'bob@example.com',
}

const viewerInviteInfo: InviteInfo = {
  projectId: 'proj-demo',
  projectName: 'AI Product Studio Demo',
  role: 'viewer',
  email: 'alice@example.com',
}

const editorAccepted: AcceptedInvite = { projectId: 'proj-demo', role: 'editor' }
const viewerAccepted: AcceptedInvite = { projectId: 'proj-demo', role: 'viewer' }

beforeEach(() => {
  vi.clearAllMocks()
  mockUseParams.mockReturnValue({ inviteToken: 'invite-collab-2' })
  mockResolveInvite.mockResolvedValue(editorInviteInfo)
  mockAcceptInvite.mockResolvedValue(editorAccepted)
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('A. Valid invite — shows project context', () => {
  it('renders project name and role after resolveInvite', async () => {
    render(<InviteAcceptPage />)
    await waitFor(() => {
      expect(screen.getByTestId('invite-project-name')).toHaveTextContent('AI Product Studio Demo')
    })
    expect(screen.getByTestId('invite-role')).toHaveTextContent('редактор')
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('shows accept button', async () => {
    render(<InviteAcceptPage />)
    await waitFor(() => {
      expect(screen.getByTestId('accept-invite-btn')).toBeInTheDocument()
    })
  })
})

describe('B. Accept button — activates collaborator and redirects', () => {
  it('calls acceptInvite with correct token on click', async () => {
    render(<InviteAcceptPage />)
    await waitFor(() => expect(screen.getByTestId('accept-invite-btn')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('accept-invite-btn'))

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalledWith('invite-collab-2')
    })
  })

  it('selects project and redirects to /history after accept', async () => {
    render(<InviteAcceptPage />)
    await waitFor(() => expect(screen.getByTestId('accept-invite-btn')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('accept-invite-btn'))

    await waitFor(() => {
      expect(mockSelectProject).toHaveBeenCalledWith('proj-demo')
      expect(mockNavigate).toHaveBeenCalledWith('/history', { replace: true })
    })
  })
})

describe('C. Editor invite → viewingMode=editor', () => {
  it('sets viewingMode to editor when role=editor', async () => {
    mockResolveInvite.mockResolvedValue(editorInviteInfo)
    mockAcceptInvite.mockResolvedValue(editorAccepted)

    render(<InviteAcceptPage />)
    await waitFor(() => expect(screen.getByTestId('accept-invite-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('accept-invite-btn'))

    await waitFor(() => {
      expect(mockSetViewingMode).toHaveBeenCalledWith('editor')
    })
  })
})

describe('D. Viewer invite → viewingMode=viewer', () => {
  it('sets viewingMode to viewer when role=viewer', async () => {
    mockResolveInvite.mockResolvedValue(viewerInviteInfo)
    mockAcceptInvite.mockResolvedValue(viewerAccepted)

    render(<InviteAcceptPage />)
    await waitFor(() => expect(screen.getByTestId('accept-invite-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('accept-invite-btn'))

    await waitFor(() => {
      expect(mockSetViewingMode).toHaveBeenCalledWith('viewer')
    })
  })
})

describe('E. Invalid/expired invite → error state', () => {
  it('shows error when resolveInvite rejects', async () => {
    mockResolveInvite.mockRejectedValue(new Error('Invite not found'))

    render(<InviteAcceptPage />)
    await waitFor(() => {
      expect(screen.getByTestId('invite-error')).toBeInTheDocument()
    })
    expect(screen.getByTestId('invite-error')).toHaveTextContent('Invite not found')
  })

  it('shows error when acceptInvite rejects', async () => {
    mockAcceptInvite.mockRejectedValue(new Error('Invite already accepted'))

    render(<InviteAcceptPage />)
    await waitFor(() => expect(screen.getByTestId('accept-invite-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('accept-invite-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('invite-error')).toHaveTextContent('Invite already accepted')
    })
  })
})

describe('F. Missing inviteToken param → error state', () => {
  it('shows error when inviteToken is undefined', async () => {
    mockUseParams.mockReturnValue({ inviteToken: undefined })

    render(<InviteAcceptPage />)
    await waitFor(() => {
      expect(screen.getByTestId('invite-error')).toBeInTheDocument()
    })
  })
})

describe('G. Retry button after accept failure (T-410 hardening)', () => {
  it('shows retry button when accept fails (inviteInfo is available)', async () => {
    mockAcceptInvite.mockRejectedValue(new Error('Transient error'))

    render(<InviteAcceptPage />)
    await waitFor(() => expect(screen.getByTestId('accept-invite-btn')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('accept-invite-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('retry-invite-btn')).toBeInTheDocument()
    })
  })

  it('retry button restores accept button so user can retry', async () => {
    mockAcceptInvite.mockRejectedValueOnce(new Error('Transient error'))
    mockAcceptInvite.mockResolvedValueOnce(editorAccepted)

    render(<InviteAcceptPage />)
    await waitFor(() => expect(screen.getByTestId('accept-invite-btn')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('accept-invite-btn'))
    await waitFor(() => expect(screen.getByTestId('retry-invite-btn')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('retry-invite-btn'))
    await waitFor(() => expect(screen.getByTestId('accept-invite-btn')).toBeInTheDocument())
  })

  it('does NOT show retry button when resolveInvite itself fails (no project context)', async () => {
    mockResolveInvite.mockRejectedValue(new Error('Not found'))

    render(<InviteAcceptPage />)
    await waitFor(() => expect(screen.getByTestId('invite-error')).toBeInTheDocument())

    expect(screen.queryByTestId('retry-invite-btn')).not.toBeInTheDocument()
  })
})
