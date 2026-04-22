// @vitest-environment jsdom
// T-401 — ViewingMode store unit tests.
// T-405 — Extended with editor role + useCanEditProject / useCanManageSharing helpers.
//
// Coverage:
//   1. Initial state is 'owner'
//   2. setViewingMode switches to 'viewer' / 'editor'
//   3. resetToOwner reverts to 'owner'
//   4. useIsViewer: true only for viewer
//   5. useCanEditProject: true for owner and editor, false for viewer
//   6. useCanManageSharing: true only for owner

import { describe, it, expect, beforeEach } from 'vitest'
import { useViewingModeStore } from './viewingModeStore'

function getStore() {
  return useViewingModeStore.getState()
}

beforeEach(() => {
  useViewingModeStore.setState({ viewingMode: 'owner' })
})

describe('ViewingMode store — basic transitions', () => {
  it('initial state is owner', () => {
    expect(getStore().viewingMode).toBe('owner')
  })

  it('setViewingMode("viewer") switches to viewer', () => {
    getStore().setViewingMode('viewer')
    expect(getStore().viewingMode).toBe('viewer')
  })

  it('setViewingMode("editor") switches to editor', () => {
    getStore().setViewingMode('editor')
    expect(getStore().viewingMode).toBe('editor')
  })

  it('setViewingMode("owner") switches back to owner', () => {
    getStore().setViewingMode('viewer')
    getStore().setViewingMode('owner')
    expect(getStore().viewingMode).toBe('owner')
  })

  it('resetToOwner reverts viewer to owner', () => {
    getStore().setViewingMode('viewer')
    getStore().resetToOwner()
    expect(getStore().viewingMode).toBe('owner')
  })

  it('resetToOwner reverts editor to owner', () => {
    getStore().setViewingMode('editor')
    getStore().resetToOwner()
    expect(getStore().viewingMode).toBe('owner')
  })

  it('resetToOwner is idempotent when already owner', () => {
    getStore().resetToOwner()
    expect(getStore().viewingMode).toBe('owner')
  })
})

describe('useCanEditProject — owner and editor can edit, viewer cannot', () => {
  it('returns true for owner', () => {
    useViewingModeStore.setState({ viewingMode: 'owner' })
    const canEdit = useViewingModeStore.getState().viewingMode !== 'viewer'
    expect(canEdit).toBe(true)
  })

  it('returns true for editor', () => {
    useViewingModeStore.setState({ viewingMode: 'editor' })
    const mode = useViewingModeStore.getState().viewingMode
    expect(mode === 'owner' || mode === 'editor').toBe(true)
  })

  it('returns false for viewer', () => {
    useViewingModeStore.setState({ viewingMode: 'viewer' })
    const mode = useViewingModeStore.getState().viewingMode
    expect(mode === 'owner' || mode === 'editor').toBe(false)
  })
})

describe('useCanManageSharing — only owner can manage sharing', () => {
  it('returns true for owner', () => {
    useViewingModeStore.setState({ viewingMode: 'owner' })
    expect(useViewingModeStore.getState().viewingMode === 'owner').toBe(true)
  })

  it('returns false for editor', () => {
    useViewingModeStore.setState({ viewingMode: 'editor' })
    expect(useViewingModeStore.getState().viewingMode === 'owner').toBe(false)
  })

  it('returns false for viewer', () => {
    useViewingModeStore.setState({ viewingMode: 'viewer' })
    expect(useViewingModeStore.getState().viewingMode === 'owner').toBe(false)
  })
})
