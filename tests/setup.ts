import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Fix jsdom environment issues with window APIs
// @ts-ignore
if (typeof window !== 'undefined' && !window.HTMLElement.prototype.scrollIntoView) {
  // @ts-ignore
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
}

// Mock matchMedia which is not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver which is not available in jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver which is not available in jsdom
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  root: null,
  rootMargin: '',
  thresholds: [],
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  takeRecords: vi.fn().mockReturnValue([]),
}))

// Mock window.electron for tests
const mockElectron = {
  platform: 'darwin',
  sessions: {
    create: vi.fn().mockResolvedValue({ success: true, session: {} }),
    get: vi.fn().mockResolvedValue({ success: true, session: null }),
    list: vi.fn().mockResolvedValue({ success: true, sessions: [] }),
    update: vi.fn().mockResolvedValue({ success: true, session: {} }),
    delete: vi.fn().mockResolvedValue({ success: true }),
    getFolder: vi.fn().mockResolvedValue('/mock/folder'),
  },
  artifacts: {
    add: vi.fn().mockResolvedValue({ success: true, artifact: {} }),
    get: vi.fn().mockResolvedValue({ success: true, artifact: null }),
    list: vi.fn().mockResolvedValue({ success: true, artifacts: [] }),
  },
  steps: {
    add: vi.fn().mockResolvedValue({ success: true, stepId: 'step_123' }),
    update: vi.fn().mockResolvedValue({ success: true }),
    list: vi.fn().mockResolvedValue({ success: true, steps: [] }),
  },
  stats: {
    get: vi.fn().mockResolvedValue({ success: true, stats: {} }),
  },
  paths: {
    get: vi.fn().mockResolvedValue({ global: '/mock', sessions: '/mock/sessions', exports: '/mock/exports' }),
  },
  folder: {
    open: vi.fn().mockResolvedValue({ success: true }),
  },
  on: vi.fn(),
  off: vi.fn(),
}

// Set window.electron
Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true,
})

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
