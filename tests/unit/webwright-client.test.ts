import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebWrightClient, WebWrightAPIError } from '../../src/lib/webwright-client'

/**
 * WebWright Client Tests
 *
 * Tests the WebWrightClient class for:
 * - Navigation commands
 * - Interaction commands
 * - Information commands
 * - Advanced commands (console, network, HAR)
 * - Session management
 * - Error handling
 */

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('WebWrightClient', () => {
  let client: WebWrightClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new WebWrightClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to mock successful responses
  const mockSuccessResponse = (result: any) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result })
    })
  }

  // Helper to mock error responses
  const mockErrorResponse = (status: number, message: string, detail?: string) => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      json: async () => ({ message, detail })
    })
  }

  describe('Configuration', () => {
    it('should use default baseUrl when not provided', () => {
      const defaultClient = new WebWrightClient()
      mockSuccessResponse({ alive: true })

      defaultClient.ping()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3456/api/command',
        expect.any(Object)
      )
    })

    it('should use custom baseUrl when provided', () => {
      const customClient = new WebWrightClient({ baseUrl: 'http://custom:8080' })
      mockSuccessResponse({ alive: true })

      customClient.ping()

      expect(mockFetch).toHaveBeenCalledWith(
        'http://custom:8080/api/command',
        expect.any(Object)
      )
    })

    it('should use custom timeout when provided', async () => {
      const customClient = new WebWrightClient({ timeout: 100 }) // Short timeout

      // Mock fetch that respects abort signal
      mockFetch.mockImplementationOnce((url: string, options: RequestInit) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve({ ok: true, json: () => Promise.resolve({ result: {} }) })
          }, 500)

          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timer)
            const abortError = new Error('Aborted')
            abortError.name = 'AbortError'
            reject(abortError)
          })
        })
      })

      await expect(customClient.ping()).rejects.toThrow('Request timeout')
    })
  })

  describe('Navigation Commands', () => {
    it('should navigate to URL with stealth by default', async () => {
      mockSuccessResponse({ success: true })

      await client.navigate('https://example.com')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            command: 'browser_navigate',
            params: { url: 'https://example.com', stealth: true }
          })
        })
      )
    })

    it('should navigate without stealth when specified', async () => {
      mockSuccessResponse({ success: true })

      await client.navigate('https://example.com', { stealth: false })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_navigate',
            params: { url: 'https://example.com', stealth: false }
          })
        })
      )
    })

    it('should navigate back', async () => {
      mockSuccessResponse({ success: true })

      await client.back()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ command: 'browser_back', params: {} })
        })
      )
    })

    it('should navigate forward', async () => {
      mockSuccessResponse({ success: true })

      await client.forward()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ command: 'browser_forward', params: {} })
        })
      )
    })

    it('should reload page', async () => {
      mockSuccessResponse({ success: true })

      await client.reload()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ command: 'browser_reload', params: {} })
        })
      )
    })
  })

  describe('Interaction Commands', () => {
    it('should click element by ref', async () => {
      mockSuccessResponse({ success: true })

      await client.click('ref_123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ command: 'browser_click', params: { ref: 'ref_123' } })
        })
      )
    })

    it('should type text', async () => {
      mockSuccessResponse({ success: true })

      await client.type('Hello World')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ command: 'browser_type', params: { text: 'Hello World' } })
        })
      )
    })

    it('should fill input by ref', async () => {
      mockSuccessResponse({ success: true })

      await client.fill('ref_input', 'test@example.com')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_fill',
            params: { ref: 'ref_input', value: 'test@example.com' }
          })
        })
      )
    })

    it('should scroll with direction and amount', async () => {
      mockSuccessResponse({ success: true })

      await client.scroll('down', 500)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_scroll',
            params: { direction: 'down', amount: 500 }
          })
        })
      )
    })

    it('should select option by value', async () => {
      mockSuccessResponse({ success: true })

      await client.select('ref_dropdown', 'option1')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_select',
            params: { ref: 'ref_dropdown', value: 'option1' }
          })
        })
      )
    })

    it('should check checkbox', async () => {
      mockSuccessResponse({ success: true })

      await client.check('ref_checkbox')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ command: 'browser_check', params: { ref: 'ref_checkbox' } })
        })
      )
    })

    it('should uncheck checkbox', async () => {
      mockSuccessResponse({ success: true })

      await client.uncheck('ref_checkbox')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ command: 'browser_uncheck', params: { ref: 'ref_checkbox' } })
        })
      )
    })

    it('should hover over element', async () => {
      mockSuccessResponse({ success: true })

      await client.hover('ref_menu')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ command: 'browser_hover', params: { ref: 'ref_menu' } })
        })
      )
    })

    it('should press key', async () => {
      mockSuccessResponse({ success: true })

      await client.press('Enter')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ command: 'browser_press', params: { key: 'Enter' } })
        })
      )
    })
  })

  describe('Information Commands', () => {
    it('should get page snapshot', async () => {
      const snapshotData = {
        refs: [
          { ref: 'ref_1', tag: 'button', text: 'Click me', role: 'button' },
          { ref: 'ref_2', tag: 'input', text: '', role: 'textbox' }
        ],
        url: 'https://example.com',
        title: 'Example Page'
      }
      mockSuccessResponse(snapshotData)

      const result = await client.snapshot()

      expect(result.refs).toHaveLength(2)
      expect(result.url).toBe('https://example.com')
      expect(result.title).toBe('Example Page')
    })

    it('should take screenshot', async () => {
      mockSuccessResponse({ base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...' })

      const result = await client.screenshot()

      expect(result.base64).toBeDefined()
      expect(result.base64).toContain('iVBOR')
    })

    it('should get browser state', async () => {
      const stateData = {
        url: 'https://example.com/page',
        title: 'Current Page',
        viewport: { width: 1920, height: 1080 }
      }
      mockSuccessResponse(stateData)

      const result = await client.state()

      expect(result.url).toBe('https://example.com/page')
      expect(result.title).toBe('Current Page')
      expect(result.viewport).toEqual({ width: 1920, height: 1080 })
    })
  })

  describe('Advanced Commands', () => {
    it('should wait with selector and timeout', async () => {
      mockSuccessResponse({ success: true })

      await client.wait('#loading', 5000)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_wait',
            params: { selector: '#loading', timeout: 5000 }
          })
        })
      )
    })

    it('should execute JavaScript', async () => {
      mockSuccessResponse({ returnValue: 42 })

      const result = await client.execute('return 21 * 2')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_execute',
            params: { script: 'return 21 * 2' }
          })
        })
      )
    })

    it('should get cookies', async () => {
      mockSuccessResponse([
        { name: 'session', value: 'abc123', domain: 'example.com' }
      ])

      await client.getCookies()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_cookies',
            params: { action: 'get' }
          })
        })
      )
    })

    it('should set cookie', async () => {
      mockSuccessResponse({ success: true })

      await client.setCookie('auth', 'token123', { domain: 'example.com' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_cookies',
            params: { action: 'set', name: 'auth', value: 'token123', domain: 'example.com' }
          })
        })
      )
    })
  })

  describe('Console & Network Monitoring', () => {
    it('should get console messages', async () => {
      const messages = [
        { type: 'log', text: 'Hello', timestamp: 1234567890 },
        { type: 'error', text: 'Oops', timestamp: 1234567891 }
      ]
      mockSuccessResponse(messages)

      const result = await client.getConsoleMessages()

      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('log')
      expect(result[1].type).toBe('error')
    })

    it('should get console messages filtered by type', async () => {
      mockSuccessResponse([{ type: 'error', text: 'Error only', timestamp: 123 }])

      await client.getConsoleMessages({ type: 'error' })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_console',
            params: { type: 'error' }
          })
        })
      )
    })

    it('should get page errors', async () => {
      const errors = [
        { message: 'Uncaught ReferenceError', stack: 'at line 10', timestamp: 123 }
      ]
      mockSuccessResponse(errors)

      const result = await client.getPageErrors()

      expect(result).toHaveLength(1)
      expect(result[0].message).toContain('ReferenceError')
    })

    it('should get network requests', async () => {
      const requests = [
        { url: 'https://api.example.com/users', method: 'GET', status: 200, timestamp: 123 },
        { url: 'https://api.example.com/posts', method: 'POST', status: 201, timestamp: 124 }
      ]
      mockSuccessResponse(requests)

      const result = await client.getNetworkRequests()

      expect(result).toHaveLength(2)
      expect(result[0].method).toBe('GET')
      expect(result[1].method).toBe('POST')
    })

    it('should setup network intercept', async () => {
      mockSuccessResponse({ success: true })

      await client.setupNetworkIntercept('**/api/**', 'continue')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_network',
            params: { url: '**/api/**', handler: 'continue', response: undefined }
          })
        })
      )
    })
  })

  describe('HAR Export', () => {
    it('should start HAR recording', async () => {
      mockSuccessResponse({ success: true })

      await client.startHARRecording('/path/to/capture.har')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_start_har',
            params: { path: '/path/to/capture.har' }
          })
        })
      )
    })

    it('should stop HAR recording', async () => {
      mockSuccessResponse({ path: '/path/to/capture.har' })

      const result = await client.stopHARRecording()

      expect(result.path).toBe('/path/to/capture.har')
    })
  })

  describe('Trace Recording', () => {
    it('should start trace with options', async () => {
      mockSuccessResponse({ success: true })

      await client.startTrace('/path/to/trace.zip', { screenshots: true, snapshots: true })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'browser_start_trace',
            params: { path: '/path/to/trace.zip', screenshots: true, snapshots: true }
          })
        })
      )
    })

    it('should stop trace recording', async () => {
      mockSuccessResponse({ path: '/path/to/trace.zip' })

      const result = await client.stopTrace()

      expect(result.path).toBe('/path/to/trace.zip')
    })
  })

  describe('Agent Commands', () => {
    it('should run agent with task', async () => {
      mockSuccessResponse({ sessionId: 'session_123' })

      const result = await client.runAgent('Find login button and click it')

      expect(result.sessionId).toBe('session_123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'agent_run',
            params: { task: 'Find login button and click it', stealth: true }
          })
        })
      )
    })

    it('should step agent', async () => {
      mockSuccessResponse({ action: 'click', ref: 'ref_btn' })

      await client.stepAgent('Click the submit button')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'agent_step',
            params: { task: 'Click the submit button' }
          })
        })
      )
    })
  })

  describe('Session Management', () => {
    it('should list sessions', async () => {
      const sessions = [
        { id: 'session_1', task: 'Task 1', status: 'running', createdAt: '2024-01-01' },
        { id: 'session_2', task: 'Task 2', status: 'completed', createdAt: '2024-01-02' }
      ]
      mockSuccessResponse(sessions)

      const result = await client.listSessions()

      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('running')
      expect(result[1].status).toBe('completed')
    })

    it('should get session by ID', async () => {
      const session = { id: 'session_123', task: 'Test task', status: 'running', createdAt: '2024-01-01' }
      mockSuccessResponse(session)

      const result = await client.getSession('session_123')

      expect(result.id).toBe('session_123')
      expect(result.task).toBe('Test task')
    })

    it('should stop session', async () => {
      mockSuccessResponse({ success: true })

      await client.stopSession('session_123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'stop_session',
            params: { sessionId: 'session_123' }
          })
        })
      )
    })

    it('should delete session', async () => {
      mockSuccessResponse({ success: true })

      await client.deleteSession('session_123')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            command: 'delete_session',
            params: { sessionId: 'session_123' }
          })
        })
      )
    })
  })

  describe('Daemon Status', () => {
    it('should get daemon status', async () => {
      const status = {
        running: true,
        sessions: 3,
        uptime: 3600,
        version: '1.0.0'
      }
      mockSuccessResponse(status)

      const result = await client.getDaemonStatus()

      expect(result.running).toBe(true)
      expect(result.sessions).toBe(3)
      expect(result.uptime).toBe(3600)
      expect(result.version).toBe('1.0.0')
    })

    it('should ping daemon', async () => {
      mockSuccessResponse({ alive: true })

      const result = await client.ping()

      expect(result.alive).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should throw WebWrightAPIError on HTTP error', async () => {
      mockErrorResponse(404, 'Session not found', 'Session ID does not exist')

      try {
        await client.getSession('invalid_id')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(WebWrightAPIError)
        expect((error as WebWrightAPIError).message).toBe('Session not found')
        expect((error as WebWrightAPIError).statusCode).toBe(404)
      }
    })

    it('should throw WebWrightAPIError on server error', async () => {
      mockErrorResponse(500, 'Internal server error')

      try {
        await client.ping()
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(WebWrightAPIError)
        expect((error as WebWrightAPIError).statusCode).toBe(500)
      }
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      try {
        await client.ping()
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(WebWrightAPIError)
        expect((error as WebWrightAPIError).message).toBe('Network failure')
      }
    })

    it('should handle timeout errors', async () => {
      const shortTimeoutClient = new WebWrightClient({ timeout: 100 })

      // Mock fetch that respects abort signal
      mockFetch.mockImplementationOnce((url: string, options: RequestInit) => {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            resolve({ ok: true, json: () => Promise.resolve({ result: {} }) })
          }, 500)

          options?.signal?.addEventListener('abort', () => {
            clearTimeout(timer)
            const abortError = new Error('Aborted')
            abortError.name = 'AbortError'
            reject(abortError)
          })
        })
      })

      try {
        await shortTimeoutClient.ping()
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(WebWrightAPIError)
        expect((error as WebWrightAPIError).message).toBe('Request timeout')
        expect((error as WebWrightAPIError).statusCode).toBe(408)
      }
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new SyntaxError('Unexpected token') }
      })

      await expect(client.ping()).rejects.toThrow(WebWrightAPIError)
    })

    it('should preserve original error type for WebWrightAPIError', async () => {
      mockErrorResponse(401, 'Unauthorized')

      try {
        await client.ping()
      } catch (error) {
        expect(error).toBeInstanceOf(WebWrightAPIError)
        expect((error as WebWrightAPIError).name).toBe('WebWrightAPIError')
      }
    })
  })

  describe('Request Headers', () => {
    it('should send correct Content-Type header', async () => {
      mockSuccessResponse({ alive: true })

      await client.ping()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
    })
  })
})
