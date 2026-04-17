import type { Page } from '@playwright/test'

/**
 * T-018 — Visual screenshot harness.
 *
 * Brings a page to a deterministic, screenshot-ready state:
 *   1. Disables all CSS animations and transitions so frames are frozen.
 *   2. Waits for Web Fonts to finish loading (document.fonts.ready).
 *   3. Waits for all <img> elements to finish loading.
 *   4. Hides the browser scrollbar to avoid OS-level rendering differences.
 *
 * Call this after navigation and before `expect(page).toHaveScreenshot(...)`.
 */
export async function preparePageForScreenshot(page: Page): Promise<void> {
  // 1. Freeze all animations and transitions
  await page.addStyleTag({
    content: `
      *,
      *::before,
      *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      /* Hide scrollbar to prevent OS-specific rendering differences */
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; }
    `,
  })

  // 2. Wait for Web Fonts
  await page.evaluate(() => document.fonts.ready)

  // 3. Wait for all images to load (or fail gracefully)
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll('img'))
    if (imgs.length === 0) return
    await Promise.allSettled(
      imgs.map(
        (img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true })
                img.addEventListener('error', () => resolve(), { once: true })
              }),
      ),
    )
  })
}

/**
 * Scroll the page to force any lazy-rendered content into view,
 * then scroll back to the top before taking the screenshot.
 *
 * Use when the page has content that only renders after scrolling
 * (e.g. intersection-observer triggered components).
 * HistoryPage does not currently use lazy rendering, so this is
 * provided as an optional helper for future pages.
 */
export async function scrollToRevealAndReset(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Scroll to bottom in steps to trigger any lazy content
    const step = window.innerHeight
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y)
      // Minimal yield — lets intersection observers fire
      await new Promise((r) => setTimeout(r, 50))
    }
    // Return to top
    window.scrollTo(0, 0)
  })
}
