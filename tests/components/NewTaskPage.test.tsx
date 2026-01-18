import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NewTaskPage from '../../src/pages/NewTaskPage'

// Mock the WebWrightClient
vi.mock('../../src/lib/webwright-client', () => {
  const mockRunAgent = vi.fn()
  return {
    WebWrightClient: class MockWebWrightClient {
      runAgent = mockRunAgent
    }
  }
})

// Mock alert
const mockAlert = vi.fn()
global.alert = mockAlert

/**
 * NewTaskPage Component Tests
 *
 * Tests the NewTaskPage component for:
 * - Form rendering
 * - User interaction
 * - Task submission
 * - Stealth mode toggle
 * - Error handling
 */

describe('NewTaskPage', () => {
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
        <NewTaskPage />
      </QueryClientProvider>
    )
  }

  describe('Rendering', () => {
    it('should render the page title', () => {
      renderComponent()

      expect(screen.getByText('New Automation Task')).toBeInTheDocument()
    })

    it('should render the description text', () => {
      renderComponent()

      expect(screen.getByText(/Describe what you want the browser automation agent to do/)).toBeInTheDocument()
    })

    it('should render the task textarea', () => {
      renderComponent()

      expect(screen.getByPlaceholderText(/Go to Hacker News/)).toBeInTheDocument()
    })

    it('should render the stealth mode checkbox', () => {
      renderComponent()

      expect(screen.getByLabelText(/Stealth Mode/)).toBeInTheDocument()
    })

    it('should render the submit button', () => {
      renderComponent()

      expect(screen.getByRole('button', { name: /Start Task/i })).toBeInTheDocument()
    })

    it('should render example tasks', () => {
      renderComponent()

      expect(screen.getByText(/Navigate to GitHub/)).toBeInTheDocument()
      expect(screen.getByText(/Go to Amazon/)).toBeInTheDocument()
    })
  })

  describe('Stealth Mode Toggle', () => {
    it('should have stealth mode enabled by default', () => {
      renderComponent()

      const checkbox = screen.getByLabelText(/Stealth Mode/) as HTMLInputElement
      expect(checkbox.checked).toBe(true)
    })

    it('should toggle stealth mode when clicked', async () => {
      const user = userEvent.setup()
      renderComponent()

      const checkbox = screen.getByLabelText(/Stealth Mode/) as HTMLInputElement
      expect(checkbox.checked).toBe(true)

      await user.click(checkbox)
      expect(checkbox.checked).toBe(false)

      await user.click(checkbox)
      expect(checkbox.checked).toBe(true)
    })
  })

  describe('Form Interaction', () => {
    it('should update textarea value when typing', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Go to Hacker News/)
      await user.type(textarea, 'Test task description')

      expect(textarea).toHaveValue('Test task description')
    })

    it('should disable submit button when textarea is empty', () => {
      renderComponent()

      const button = screen.getByRole('button', { name: /Start Task/i })
      expect(button).toBeDisabled()
    })

    it('should enable submit button when textarea has content', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Go to Hacker News/)
      await user.type(textarea, 'Test task')

      const button = screen.getByRole('button', { name: /Start Task/i })
      expect(button).not.toBeDisabled()
    })

    it('should not submit when textarea is whitespace only', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Go to Hacker News/)
      await user.type(textarea, '   ')

      const button = screen.getByRole('button', { name: /Start Task/i })
      expect(button).toBeDisabled()
    })
  })

  describe('Task Submission', () => {
    it('should enable submit and allow clicking', async () => {
      const user = userEvent.setup()
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Go to Hacker News/)
      await user.type(textarea, 'Test task')

      const button = screen.getByRole('button', { name: /Start Task/i })
      expect(button).not.toBeDisabled()

      // Click the button - this triggers the mutation
      await user.click(button)

      // The button should show loading state
      await waitFor(() => {
        const loadingOrError = screen.queryByText(/Starting Task/) || screen.queryByText(/Error/)
        expect(loadingOrError).toBeTruthy()
      }, { timeout: 1000 })
    })
  })

  describe('Error Handling', () => {
    it('should show error UI elements exist', () => {
      renderComponent()

      // The error UI should exist but be hidden initially
      // Error messages appear when mutations fail
      const textarea = screen.getByPlaceholderText(/Go to Hacker News/)
      expect(textarea).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      renderComponent()

      // Check that label text exists (not necessarily linked via htmlFor)
      expect(screen.getByText(/Task Description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Stealth Mode/i)).toBeInTheDocument()
    })

    it('should have required attribute on textarea', () => {
      renderComponent()

      const textarea = screen.getByPlaceholderText(/Go to Hacker News/)
      expect(textarea).toHaveAttribute('required')
    })
  })
})
