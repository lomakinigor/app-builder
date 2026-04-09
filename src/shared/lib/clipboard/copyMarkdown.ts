// ─── Clipboard / download utility ────────────────────────────────────────────
// Implements F-012 / T-111.
//
// Primary path: navigator.clipboard.writeText (modern browsers, HTTPS/localhost).
// Fallback: Blob + temporary <a download="*.md"> element (clipboard unavailable or denied).
//
// D-006 note: this utility produces an on-demand file download only when the
// clipboard is unavailable. It does NOT create or maintain a per-project
// docs/ folder. Export is additive; in-app entities remain canonical (F-026).

export interface CopyMarkdownResult {
  method: 'clipboard' | 'download' | 'failed'
  error?: string
}

/**
 * Copy `markdown` to the clipboard.
 * Falls back to triggering a .md file download if clipboard access fails.
 *
 * @param markdown   The formatted markdown string to copy/download.
 * @param filename   Suggested filename for the download fallback (default: "artifact.md").
 * @returns          A result object indicating which path succeeded.
 */
export async function copyMarkdown(
  markdown: string,
  filename = 'artifact.md',
): Promise<CopyMarkdownResult> {
  // ── Primary: Clipboard API ────────────────────────────────────────────────
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(markdown)
      return { method: 'clipboard' }
    } catch (clipboardError) {
      console.warn('[copyMarkdown] Clipboard write failed, falling back to download.', clipboardError)
      // Fall through to download
    }
  }

  // ── Fallback: Blob download ───────────────────────────────────────────────
  try {
    triggerDownload(markdown, filename)
    return { method: 'download' }
  } catch (downloadError) {
    const message = downloadError instanceof Error ? downloadError.message : String(downloadError)
    console.error('[copyMarkdown] Download fallback also failed.', downloadError)
    return { method: 'failed', error: message }
  }
}

function triggerDownload(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  // Clean up: defer removal so the browser has time to start the download
  setTimeout(() => {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, 100)
}
