/**
 * WebWright Daemon Client
 *
 * TypeScript client for connecting to WebWright daemon via HTTP API.
 * Based on Browser Use API client patterns but adapted for local WebWright daemon.
 *
 * NOW WITH ADVANCED CDP FEATURES:
 * - Network traffic interception
 * - Console log capture
 * - HAR export
 * - Request/response viewing
 */

export interface WebWrightClientConfig {
  baseUrl?: string  // Default: http://localhost:3456
  timeout?: number  // Default: 30000ms
}

export interface WebWrightSession {
  id: string
  task: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  createdAt: string
  url?: string
  error?: string
}

export interface WebWrightSnapshot {
  refs: Array<{
    ref: string
    tag: string
    text: string
    role: string
  }>
  url: string
  title: string
}

export interface WebWrightDaemonStatus {
  running: boolean
  sessions: number
  uptime: number
  version: string
}

export interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug'
  text: string
  timestamp: number
  location?: {
    url: string
    lineNumber?: number
    columnNumber?: number
  }
}

export interface NetworkRequest {
  url: string
  method: string
  status?: number
  responseBody?: string
  requestHeaders?: Record<string, string>
  responseHeaders?: Record<string, string>
  timestamp: number
}

export class WebWrightAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public detail?: string
  ) {
    super(message)
    this.name = 'WebWrightAPIError'
  }
}

export class WebWrightClient {
  private baseUrl: string
  private timeout: number

  constructor(config: WebWrightClientConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:3456'
    this.timeout = config.timeout || 30000
  }

  /**
   * Internal method to send commands to WebWright daemon
   */
  private async sendCommand<T>(command: string, params: any = {}): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}/api/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command, params }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new WebWrightAPIError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData.detail
        )
      }

      const data = await response.json()
      return data.result as T
    } catch (error: any) {
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        throw new WebWrightAPIError('Request timeout', 408)
      }

      if (error instanceof WebWrightAPIError) {
        throw error
      }

      throw new WebWrightAPIError(
        error.message || 'Network error',
        undefined,
        error.toString()
      )
    }
  }

  // ============================================
  // Navigation Commands
  // ============================================

  async navigate(url: string, options?: { stealth?: boolean }) {
    return this.sendCommand('browser_navigate', {
      url,
      stealth: options?.stealth ?? true  // Stealth enabled by default
    })
  }

  async back() {
    return this.sendCommand('browser_back', {})
  }

  async forward() {
    return this.sendCommand('browser_forward', {})
  }

  async reload() {
    return this.sendCommand('browser_reload', {})
  }

  // ============================================
  // Interaction Commands
  // ============================================

  async click(ref: string) {
    return this.sendCommand('browser_click', { ref })
  }

  async type(text: string) {
    return this.sendCommand('browser_type', { text })
  }

  async fill(ref: string, value: string) {
    return this.sendCommand('browser_fill', { ref, value })
  }

  async scroll(direction: 'up' | 'down' | 'left' | 'right', amount?: number) {
    return this.sendCommand('browser_scroll', { direction, amount })
  }

  async select(ref: string, value: string) {
    return this.sendCommand('browser_select', { ref, value })
  }

  async check(ref: string) {
    return this.sendCommand('browser_check', { ref })
  }

  async uncheck(ref: string) {
    return this.sendCommand('browser_uncheck', { ref })
  }

  async hover(ref: string) {
    return this.sendCommand('browser_hover', { ref })
  }

  async press(key: string) {
    return this.sendCommand('browser_press', { key })
  }

  // ============================================
  // Information Commands
  // ============================================

  async snapshot(): Promise<WebWrightSnapshot> {
    return this.sendCommand<WebWrightSnapshot>('browser_snapshot', {})
  }

  async screenshot(): Promise<{ base64: string }> {
    return this.sendCommand('browser_screenshot', {})
  }

  async state(): Promise<{ url: string; title: string; viewport: { width: number; height: number } }> {
    return this.sendCommand('browser_state', {})
  }

  // ============================================
  // Advanced Commands
  // ============================================

  async wait(selector?: string, timeout?: number) {
    return this.sendCommand('browser_wait', { selector, timeout })
  }

  async execute(script: string) {
    return this.sendCommand('browser_execute', { script })
  }

  async getCookies() {
    return this.sendCommand('browser_cookies', { action: 'get' })
  }

  async setCookie(name: string, value: string, options?: any) {
    return this.sendCommand('browser_cookies', { action: 'set', name, value, ...options })
  }

  // ============================================
  // NEW: Console & Network Monitoring
  // ============================================

  /**
   * Get console messages (logs, warnings, errors)
   */
  async getConsoleMessages(options?: { type?: string; clear?: boolean }): Promise<ConsoleMessage[]> {
    return this.sendCommand<ConsoleMessage[]>('browser_console', options || {})
  }

  /**
   * Get page errors (uncaught exceptions)
   */
  async getPageErrors(clear?: boolean): Promise<Array<{ message: string; stack?: string; timestamp: number }>> {
    return this.sendCommand('browser_errors', { clear })
  }

  /**
   * Get network requests
   */
  async getNetworkRequests(): Promise<NetworkRequest[]> {
    return this.sendCommand<NetworkRequest[]>('browser_get_requests', {})
  }

  /**
   * Set up network interception handler
   */
  async setupNetworkIntercept(url: string, handler: 'abort' | 'continue' | 'fulfill', response?: any) {
    return this.sendCommand('browser_network', { url, handler, response })
  }

  // ============================================
  // NEW: HAR Export
  // ============================================

  /**
   * Start HAR recording
   */
  async startHARRecording(path: string) {
    return this.sendCommand('browser_start_har', { path })
  }

  /**
   * Stop HAR recording and get file path
   */
  async stopHARRecording(): Promise<{ path: string }> {
    return this.sendCommand('browser_stop_har', {})
  }

  // ============================================
  // NEW: Trace Recording (with screenshots)
  // ============================================

  /**
   * Start trace recording
   */
  async startTrace(path: string, options?: { screenshots?: boolean; snapshots?: boolean }) {
    return this.sendCommand('browser_start_trace', { path, ...options })
  }

  /**
   * Stop trace recording
   */
  async stopTrace(): Promise<{ path: string }> {
    return this.sendCommand('browser_stop_trace', {})
  }

  // ============================================
  // Agent Commands
  // ============================================

  async runAgent(task: string, options?: { stealth?: boolean }): Promise<{ sessionId: string }> {
    return this.sendCommand('agent_run', {
      task,
      stealth: options?.stealth ?? true  // Stealth enabled by default
    })
  }

  async stepAgent(task: string) {
    return this.sendCommand('agent_step', { task })
  }

  // ============================================
  // Session Management
  // ============================================

  async listSessions(): Promise<WebWrightSession[]> {
    return this.sendCommand<WebWrightSession[]>('list_sessions', {})
  }

  async getSession(sessionId: string): Promise<WebWrightSession> {
    return this.sendCommand<WebWrightSession>('get_session', { sessionId })
  }

  async stopSession(sessionId: string) {
    return this.sendCommand('stop_session', { sessionId })
  }

  async deleteSession(sessionId: string) {
    return this.sendCommand('delete_session', { sessionId })
  }

  // ============================================
  // Daemon Status
  // ============================================

  async getDaemonStatus(): Promise<WebWrightDaemonStatus> {
    return this.sendCommand<WebWrightDaemonStatus>('daemon_status', {})
  }

  async ping(): Promise<{ alive: boolean }> {
    return this.sendCommand('ping', {})
  }
}
