// @vitest-environment jsdom
// Tests for the copyMarkdown clipboard/download utility.
// Implements T-112 / F-012 / D-006.
//
// D-006 (Option A): copyMarkdown produces one-off clipboard/download output only.
// These tests never assert filesystem writes or per-project docs/ folder creation.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { copyMarkdown } from './copyMarkdown'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setClipboard(impl: { writeText: ReturnType<typeof vi.fn> } | undefined) {
  Object.defineProperty(navigator, 'clipboard', {
    value: impl,
    writable: true,
    configurable: true,
  })
}

function stubUrlMethods() {
  // jsdom does not implement URL.createObjectURL / revokeObjectURL.
  // Stub them so triggerDownload() can execute without throwing.
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn().mockReturnValue('blob:mock-url'),
    writable: true,
    configurable: true,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })
}

// ─── Clipboard success path ───────────────────────────────────────────────────

describe('copyMarkdown — clipboard path', () => {
  beforeEach(() => {
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns method "clipboard" on success', async () => {
    const result = await copyMarkdown('hello world')
    expect(result.method).toBe('clipboard')
  })

  it('calls navigator.clipboard.writeText with the markdown string', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    await copyMarkdown('# My spec\n\ncontent here')
    expect(writeText).toHaveBeenCalledOnce()
    expect(writeText).toHaveBeenCalledWith('# My spec\n\ncontent here')
  })

  it('does not append any anchor element to the DOM on clipboard success', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    await copyMarkdown('no download needed')
    const anchorAppended = appendSpy.mock.calls.some(
      (call) => call[0] instanceof HTMLAnchorElement,
    )
    expect(anchorAppended).toBe(false)
  })
})

// ─── Download fallback path ───────────────────────────────────────────────────

describe('copyMarkdown — download fallback', () => {
  beforeEach(() => {
    stubUrlMethods()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns method "download" when clipboard.writeText rejects', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('permission denied')) })
    const result = await copyMarkdown('fallback content', 'spec.md')
    expect(result.method).toBe('download')
  })

  it('appends an anchor element with the correct download filename', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    await copyMarkdown('download me', 'architecture.md')

    const anchors = appendSpy.mock.calls
      .map((call) => call[0])
      .filter((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement)
    expect(anchors.length).toBeGreaterThan(0)
    expect(anchors[0].download).toBe('architecture.md')
  })

  it('sets the anchor href to the object URL', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    await copyMarkdown('content', 'research-brief.md')

    const anchor = appendSpy.mock.calls
      .map((call) => call[0])
      .find((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement)
    expect(anchor?.href).toContain('blob:')
  })

  it('returns method "download" when clipboard API is absent', async () => {
    setClipboard(undefined)
    const result = await copyMarkdown('no clipboard available', 'export.md')
    expect(result.method).toBe('download')
    expect(result.error).toBeUndefined()
  })

  it('uses default filename "artifact.md" when none is given', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    const appendSpy = vi.spyOn(document.body, 'appendChild')

    await copyMarkdown('default filename test')

    const anchor = appendSpy.mock.calls
      .map((call) => call[0])
      .find((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement)
    expect(anchor?.download).toBe('artifact.md')
  })
})

// ─── Error path ───────────────────────────────────────────────────────────────

describe('copyMarkdown — error path', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns method "failed" when both clipboard and download fail', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })

    // Make URL.createObjectURL throw to force triggerDownload to fail
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn().mockImplementation(() => { throw new Error('not supported') }),
      writable: true,
      configurable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    })

    const result = await copyMarkdown('should fail', 'fail.md')
    expect(result.method).toBe('failed')
    expect(result.error).toBeDefined()
  })
})
