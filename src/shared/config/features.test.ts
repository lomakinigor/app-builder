// T-402 — Feature flag helper tests.
//
// Coverage:
//   A. isSharingEnabled() returns true when VITE_FEATURE_SHARING='true'
//   B. isSharingEnabled() returns false when unset
//   C. isSharingEnabled() returns false for any other value

import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('A. VITE_FEATURE_SHARING=true', () => {
  it('isSharingEnabled() returns true', async () => {
    vi.stubEnv('VITE_FEATURE_SHARING', 'true')
    const { isSharingEnabled } = await import('./features')
    expect(isSharingEnabled()).toBe(true)
  })
})

describe('B. VITE_FEATURE_SHARING unset or empty', () => {
  it('returns false when env var is empty string', async () => {
    vi.stubEnv('VITE_FEATURE_SHARING', '')
    const { isSharingEnabled } = await import('./features')
    expect(isSharingEnabled()).toBe(false)
  })

  it('returns false when env var is undefined', async () => {
    vi.stubEnv('VITE_FEATURE_SHARING', undefined as unknown as string)
    const { isSharingEnabled } = await import('./features')
    expect(isSharingEnabled()).toBe(false)
  })
})

describe('C. Non-true values are falsy', () => {
  it('returns false for "false"', async () => {
    vi.stubEnv('VITE_FEATURE_SHARING', 'false')
    const { isSharingEnabled } = await import('./features')
    expect(isSharingEnabled()).toBe(false)
  })

  it('returns false for "1"', async () => {
    vi.stubEnv('VITE_FEATURE_SHARING', '1')
    const { isSharingEnabled } = await import('./features')
    expect(isSharingEnabled()).toBe(false)
  })
})
