// Vitest global setup for component tests.
// Extends Vitest's expect with jest-dom matchers (toBeInTheDocument, toBeDisabled, etc.)
// Registers afterEach(cleanup) so RTL unmounts components between tests.
// Referenced via setupFiles in vite.config.ts.

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)
