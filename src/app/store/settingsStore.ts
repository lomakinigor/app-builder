import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  setSoundNotificationsEnabled as syncAudio,
} from '../../shared/lib/attentionSignal'

// ─── State shape ──────────────────────────────────────────────────────────────

interface SettingsState {
  soundNotificationsEnabled: boolean
}

// ─── Actions ──────────────────────────────────────────────────────────────────

interface SettingsActions {
  setSoundNotificationsEnabled: (enabled: boolean) => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      soundNotificationsEnabled: true,

      setSoundNotificationsEnabled: (enabled) => {
        set({ soundNotificationsEnabled: enabled })
        syncAudio(enabled)
      },
    }),
    {
      name: 'app-builder-settings',

      // After localStorage hydration, sync the module-level audio state so that
      // a user who disabled sound on a previous session keeps it disabled.
      onRehydrateStorage: () => (state) => {
        if (state) syncAudio(state.soundNotificationsEnabled)
      },
    },
  ),
)
