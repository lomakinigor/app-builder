// T-401 — ViewingMode: owner vs viewer (read-only share access)
// T-405 — Added 'editor' role: write access to product workflow, no sharing management
//
// Non-persisted. Resets to 'owner' on each page load.
// Set by SharedProjectPage based on ResolvedShare.canEdit:
//   canEdit=true  → 'editor'
//   canEdit=false → 'viewer'

import { create } from 'zustand'

export type ViewingMode = 'owner' | 'editor' | 'viewer'

interface ViewingModeState {
  viewingMode: ViewingMode
  setViewingMode: (mode: ViewingMode) => void
  resetToOwner: () => void
}

export const useViewingModeStore = create<ViewingModeState>()((set) => ({
  viewingMode: 'owner',
  setViewingMode: (mode) => set({ viewingMode: mode }),
  resetToOwner: () => set({ viewingMode: 'owner' }),
}))

/** Returns true only when the current session is a read-only viewer (no write access). */
export function useIsViewer(): boolean {
  return useViewingModeStore((s) => s.viewingMode === 'viewer')
}

/** Returns true for owner and editor — any session that may modify product artifacts. */
export function useCanEditProject(): boolean {
  return useViewingModeStore((s) => s.viewingMode === 'owner' || s.viewingMode === 'editor')
}

/** Returns true only for the owner — governs sharing controls, audit trail, project completion. */
export function useCanManageSharing(): boolean {
  return useViewingModeStore((s) => s.viewingMode === 'owner')
}
