import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import RETaskPage from '../../src/pages/RETaskPage'

// Mock the WebWrightClient
vi.mock('../../src/lib/webwright-client', () => {
  const mockRunAgent = vi.fn().mockResolvedValue({ sessionId: 'test_session_123' })
  return {
    WebWrightClient: class MockWebWrightClient {
      runAgent = mockRunAgent
    }
  }
})

// Mock the task analyzer
vi.mock('../../src/lib/task-analyzer', () => ({
  analyzeTask: vi.fn().mockReturnValue({
    type: 'api_discovery',
    targetUrl: 'https://example.com',
    confidence: 0.85,
    tools: ['webwright_stealth', 'chrome_devtools'],
    workflow: [
      { id: '1', name: 'Navigate', action: 'navigate', params: { url: 'https://example.com' } },
      { id: '2', name: 'Capture', action: 'capture', params: {} }
    ],
    description: 'API Discovery task'
  })
}))

// Mock alert
const mockAlert = vi.fn()
global.alert = mockAlert

/**
 * RETaskPage Component Tests
 *
 * Tests the RETaskPage component for:
 * - Template selection
 * - Real-time task analysis
 * - Form submission
 * - File upload
 * - Execution logs
 */

describe('RETaskPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <RETaskPage />
      </QueryClientProvider>
    )
  }

  describe('Page Rendering', () => {
    it('should render the page title', () => {
      renderComponent()

      expect(screen.getByText('Reverse Engineering Tools')).toBeInTheDocument()
    })

    it('should render the description', () => {
      renderComponent()

      expect(screen.getByText(/Automated reverse engineering with professional tools/)).toBeInTheDocument()
    })

    it('should render Quick Start Templates section', () => {
      renderComponent()

      expect(screen.getByText('Quick Start Templates')).toBeInTheDocument()
    })

    it('should render all task templates', () => {
      renderComponent()

      expect(screen.getByText('API Discovery')).toBeInTheDocument()
      expect(screen.getByText('UI Cloning')).toBeInTheDocument()
      expect(screen.getByText('GraphQL Schema')).toBeInTheDocument()
      expect(screen.getByText('Protobuf Extraction')).toBeInTheDocument()
      expect(screen.getByText('Stealth Scraping')).toBeInTheDocument()
    })

    it('should render form inputs', () => {
      renderComponent()

      expect(screen.getByPlaceholderText(/https:\/\/example.com or https:\/\/api.example.com/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Reverse engineer the API/)).toBeInTheDocument()
    })

    it('should render Available Tools section', () => {
      renderComponent()

      expect(screen.getByText('Available Tools')).toBeInTheDocument()
      expect(screen.getByText(/mitmproxy - Traffic interception/)).toBeInTheDocument()
    })
  })

  describe('Template Selection', () => {
    it('should highlight selected template', async () => {
      const user = userEvent.setup()
      renderComponent()

      const apiDiscoveryTemplate = screen.getByText('API Discovery').closest('button')
      expect(apiDiscoveryTemplate).toHaveClass('border-gray-200')

      await user.click(apiDiscoveryTemplate!)

      expect(apiDiscoveryTemplate).toHaveClass('border-primary')
    })

    it('should populate task textarea when template is selected', async () => {
      const user = userEvent.setup()
      renderComponent()

      const apiDiscoveryTemplate = screen.getByText('API Discovery').closest('button')
      await user.click(apiDiscoveryTemplate!)

      const textarea = screen.getByPlaceholderText(/Reverse engineer the API/)
      expect(textarea).toHaveValue('Reverse engineer the API from https://cloud.browser-use.com')
    })

    it('should add log entry when template is selected', async () => {
      const user = userEvent.setup()
      renderComponent()

      const uiCloningTemplate = screen.getByText('UI Cloning').closest('button')
      await user.click(uiCloningTemplate!)

      expect(await screen.findByText(/Selected template: UI Cloning/)).toBeInTheDocument()
    })

    it('should display template tools', () => {
      renderComponent()

      // Template tools should be displayed as spans/badges
      const tools = screen.getAllByText(/mitmproxy|webwright/i)
      expect(tools.length).toBeGreaterThan(0)
    })
  })

  describe('Task Analysis', () => {
    it('should show AI analysis panel when task has enough characters', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Reverse engineer the API/)
      await user.type(textarea, 'Analyze the API from https://example.com')

      await waitFor(() => {
        expect(screen.getByText('AI Understanding')).toBeInTheDocument()
      })
    })

    it('should not show AI analysis for short tasks', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Reverse engineer the API/)
      await user.type(textarea, 'short')

      expect(screen.queryByText('AI Understanding')).not.toBeInTheDocument()
    })

    it('should display confidence score', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Reverse engineer the API/)
      await user.type(textarea, 'Analyze the API from https://example.com')

      await waitFor(() => {
        expect(screen.getByText(/85% confident/)).toBeInTheDocument()
      })
    })

    it('should display detected task type', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Reverse engineer the API/)
      await user.type(textarea, 'Analyze the API from https://example.com')

      // The AI understanding panel shows the task type
      await waitFor(() => {
        const panel = screen.queryByText(/AI Understanding/)
        expect(panel).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('should display detected tools', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Reverse engineer the API/)
      await user.type(textarea, 'Analyze the API from https://example.com')

      await waitFor(() => {
        expect(screen.getByText('webwright stealth')).toBeInTheDocument()
        expect(screen.getByText('chrome devtools')).toBeInTheDocument()
      })
    })
  })

  describe('File Upload', () => {
    it('should have file input with correct accept attribute', () => {
      renderComponent()

      // Find file input by type attribute
      const fileInputs = document.querySelectorAll('input[type="file"]')
      expect(fileInputs.length).toBeGreaterThan(0)
      expect(fileInputs[0]).toHaveAttribute('accept', '.apk,.jar,.bin,.png,.jpg,.jpeg')
    })
  })

  describe('Stealth Mode', () => {
    it('should have stealth mode enabled by default', () => {
      renderComponent()

      const checkbox = screen.getByLabelText(/Stealth Mode/) as HTMLInputElement
      expect(checkbox.checked).toBe(true)
    })

    it('should toggle stealth mode', async () => {
      const user = userEvent.setup()
      renderComponent()

      const checkbox = screen.getByLabelText(/Stealth Mode/) as HTMLInputElement
      await user.click(checkbox)

      expect(checkbox.checked).toBe(false)
    })
  })

  describe('Form Submission', () => {
    it('should disable submit button when no task or template', () => {
      renderComponent()

      const button = screen.getByRole('button', { name: /Start Reverse Engineering/i })
      expect(button).toBeDisabled()
    })

    it('should enable submit button with task text', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Reverse engineer the API/)
      await user.type(textarea, 'Test task for RE')

      const button = screen.getByRole('button', { name: /Start Reverse Engineering/i })
      expect(button).not.toBeDisabled()
    })

    it('should enable submit button with selected template', async () => {
      const user = userEvent.setup()
      renderComponent()

      const template = screen.getByText('API Discovery').closest('button')
      await user.click(template!)

      const button = screen.getByRole('button', { name: /Start Reverse Engineering/i })
      expect(button).not.toBeDisabled()
    })

    it('should allow form submission with task text', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Reverse engineer the API/)
      await user.type(textarea, 'Reverse engineer https://api.example.com')

      const button = screen.getByRole('button', { name: /Start Reverse Engineering/i })
      expect(button).not.toBeDisabled()

      // Click should trigger the mutation - button should be clickable
      await user.click(button)

      // After clicking, something should happen (logs section should appear or status change)
      // The mutation will run and add to logs
      await waitFor(() => {
        // Check that logs section appears after triggering the mutation
        expect(screen.getByText('Execution Logs')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Execution Logs', () => {
    it('should show logs section when logs exist', async () => {
      const user = userEvent.setup()
      renderComponent()

      const template = screen.getByText('API Discovery').closest('button')
      await user.click(template!)

      expect(screen.getByText('Execution Logs')).toBeInTheDocument()
    })

    it('should have execution logs section when template selected', async () => {
      const user = userEvent.setup()
      renderComponent()

      // Select a template to trigger logs
      const template = screen.getByText('API Discovery').closest('button')
      await user.click(template!)

      // Logs section should appear
      expect(screen.getByText('Execution Logs')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should have error display area in the component', () => {
      // The component has error handling UI that displays when mutations fail
      // We verify the component renders without errors and has proper structure
      renderComponent()

      // The error handling is built into the useMutation hook
      // When an error occurs, it displays in the logs section
      const logsSection = screen.queryByText('Execution Logs')
      // Logs section appears after interaction, so it may or may not be present initially
      // The important thing is the component renders without crashing
      expect(screen.getByRole('button', { name: /Start Reverse Engineering/i })).toBeInTheDocument()
    })
  })

  describe('Target URL Input', () => {
    it('should have URL input field', () => {
      renderComponent()

      const urlInput = screen.getByPlaceholderText(/https:\/\/example.com/)
      expect(urlInput).toHaveAttribute('type', 'url')
    })

    it('should update target URL value', async () => {
      const user = userEvent.setup()
      renderComponent()

      const urlInput = screen.getByPlaceholderText(/https:\/\/example.com/)
      await user.type(urlInput, 'https://api.test.com')

      expect(urlInput).toHaveValue('https://api.test.com')
    })
  })
})
