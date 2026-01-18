import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * IPC Handler Tests
 *
 * Tests the Electron IPC handlers for:
 * - Session CRUD operations
 * - Artifact management
 * - Workflow step tracking
 * - Stats retrieval
 * - Folder operations
 *
 * Note: These tests mock the Electron IPC system and database to test
 * the handler logic in isolation.
 */

// Mock the database
const mockDatabase = {
  init: vi.fn(),
  createSession: vi.fn(),
  getSession: vi.fn(),
  getSessions: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  addArtifact: vi.fn(),
  getArtifact: vi.fn(),
  getSessionArtifacts: vi.fn(),
  addWorkflowStep: vi.fn(),
  updateWorkflowStep: vi.fn(),
  getSessionSteps: vi.fn(),
  getStats: vi.fn(),
  close: vi.fn(),
  sessionsDir: '/mock/sessions',
  globalDir: '/mock/global',
  exportsDir: '/mock/exports',
}

// Mock Electron
const mockBrowserWindow = {
  webContents: {
    send: vi.fn(),
  },
  isDestroyed: vi.fn(() => false),
}

const mockShell = {
  openPath: vi.fn(),
}

// Mock ipcMain handlers storage
const ipcHandlers: Record<string, Function> = {}

const mockIpcMain = {
  handle: vi.fn((channel: string, handler: Function) => {
    ipcHandlers[channel] = handler
  }),
}

// Simulate calling an IPC handler
async function invokeHandler(channel: string, ...args: any[]) {
  const handler = ipcHandlers[channel]
  if (!handler) {
    throw new Error(`No handler registered for channel: ${channel}`)
  }
  return handler({}, ...args)
}

// IPC handler initializer - mirrors main.js logic
function initializeIPC(sessionDB: typeof mockDatabase, mainWindow: typeof mockBrowserWindow) {
  // Session operations
  mockIpcMain.handle('session:create', async (_event: any, data: any) => {
    try {
      return { success: true, session: sessionDB.createSession(data) }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  mockIpcMain.handle('session:get', async (_event: any, id: string) => {
    try {
      const session = sessionDB.getSession(id)
      return { success: true, session }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  mockIpcMain.handle('session:list', async (_event: any, filters = {}) => {
    try {
      const sessions = sessionDB.getSessions(filters)
      return { success: true, sessions }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  mockIpcMain.handle('session:update', async (_event: any, id: string, data: any) => {
    try {
      const session = sessionDB.updateSession(id, data)
      if (mainWindow) {
        mainWindow.webContents.send('session:updated', session)
      }
      return { success: true, session }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  mockIpcMain.handle('session:delete', async (_event: any, id: string) => {
    try {
      sessionDB.deleteSession(id)
      if (mainWindow) {
        mainWindow.webContents.send('session:deleted', id)
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Artifact operations
  mockIpcMain.handle('artifact:add', async (_event: any, sessionId: string, data: any) => {
    try {
      const artifact = sessionDB.addArtifact(sessionId, data)
      if (mainWindow) {
        mainWindow.webContents.send('artifact:added', { sessionId, artifact })
      }
      return { success: true, artifact }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  mockIpcMain.handle('artifact:get', async (_event: any, id: string) => {
    try {
      const artifact = sessionDB.getArtifact(id)
      return { success: true, artifact }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  mockIpcMain.handle('artifact:list', async (_event: any, sessionId: string) => {
    try {
      const artifacts = sessionDB.getSessionArtifacts(sessionId)
      return { success: true, artifacts }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Workflow step operations
  mockIpcMain.handle('step:add', async (_event: any, sessionId: string, stepData: any) => {
    try {
      const stepId = sessionDB.addWorkflowStep(sessionId, stepData)
      if (mainWindow) {
        mainWindow.webContents.send('step:added', { sessionId, stepId, ...stepData })
      }
      return { success: true, stepId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  mockIpcMain.handle('step:update', async (_event: any, id: string, data: any) => {
    try {
      sessionDB.updateWorkflowStep(id, data)
      if (mainWindow) {
        mainWindow.webContents.send('step:updated', { id, ...data })
      }
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  mockIpcMain.handle('step:list', async (_event: any, sessionId: string) => {
    try {
      const steps = sessionDB.getSessionSteps(sessionId)
      return { success: true, steps }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Stats
  mockIpcMain.handle('stats:get', async () => {
    try {
      const stats = sessionDB.getStats()
      return { success: true, stats }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // Paths
  mockIpcMain.handle('sessions:folder', async () => {
    return sessionDB.sessionsDir
  })

  mockIpcMain.handle('webwright:path', async () => {
    return {
      global: sessionDB.globalDir,
      sessions: sessionDB.sessionsDir,
      exports: sessionDB.exportsDir,
    }
  })

  // Folder open
  mockIpcMain.handle('folder:open', async (_event: any, folderPath: string) => {
    mockShell.openPath(folderPath)
    return { success: true }
  })
}

describe('IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear handlers
    Object.keys(ipcHandlers).forEach(key => delete ipcHandlers[key])
    // Initialize handlers
    initializeIPC(mockDatabase, mockBrowserWindow)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Session Handlers', () => {
    describe('session:create', () => {
      it('should create a session successfully', async () => {
        const mockSession = {
          id: 'session_123',
          task_description: 'Test task',
          task_type: 'api_discovery',
          status: 'running'
        }
        mockDatabase.createSession.mockReturnValue(mockSession)

        const result = await invokeHandler('session:create', {
          taskDescription: 'Test task',
          taskType: 'api_discovery'
        })

        expect(result.success).toBe(true)
        expect(result.session).toEqual(mockSession)
        expect(mockDatabase.createSession).toHaveBeenCalledWith({
          taskDescription: 'Test task',
          taskType: 'api_discovery'
        })
      })

      it('should return error on failure', async () => {
        mockDatabase.createSession.mockImplementation(() => {
          throw new Error('Database error')
        })

        const result = await invokeHandler('session:create', {
          taskDescription: 'Test task',
          taskType: 'api_discovery'
        })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Database error')
      })
    })

    describe('session:get', () => {
      it('should get a session by ID', async () => {
        const mockSession = { id: 'session_123', status: 'completed' }
        mockDatabase.getSession.mockReturnValue(mockSession)

        const result = await invokeHandler('session:get', 'session_123')

        expect(result.success).toBe(true)
        expect(result.session).toEqual(mockSession)
        expect(mockDatabase.getSession).toHaveBeenCalledWith('session_123')
      })

      it('should return undefined for non-existent session', async () => {
        mockDatabase.getSession.mockReturnValue(undefined)

        const result = await invokeHandler('session:get', 'non_existent')

        expect(result.success).toBe(true)
        expect(result.session).toBeUndefined()
      })
    })

    describe('session:list', () => {
      it('should list all sessions', async () => {
        const mockSessions = [
          { id: 'session_1', status: 'completed' },
          { id: 'session_2', status: 'running' }
        ]
        mockDatabase.getSessions.mockReturnValue(mockSessions)

        const result = await invokeHandler('session:list')

        expect(result.success).toBe(true)
        expect(result.sessions).toHaveLength(2)
        expect(mockDatabase.getSessions).toHaveBeenCalledWith({})
      })

      it('should pass filters to database', async () => {
        mockDatabase.getSessions.mockReturnValue([])

        await invokeHandler('session:list', { status: 'completed', limit: 10 })

        expect(mockDatabase.getSessions).toHaveBeenCalledWith({ status: 'completed', limit: 10 })
      })
    })

    describe('session:update', () => {
      it('should update a session', async () => {
        const mockSession = { id: 'session_123', status: 'completed' }
        mockDatabase.updateSession.mockReturnValue(mockSession)

        const result = await invokeHandler('session:update', 'session_123', { status: 'completed' })

        expect(result.success).toBe(true)
        expect(result.session).toEqual(mockSession)
        expect(mockDatabase.updateSession).toHaveBeenCalledWith('session_123', { status: 'completed' })
      })

      it('should notify renderer of update', async () => {
        const mockSession = { id: 'session_123', status: 'completed' }
        mockDatabase.updateSession.mockReturnValue(mockSession)

        await invokeHandler('session:update', 'session_123', { status: 'completed' })

        expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('session:updated', mockSession)
      })
    })

    describe('session:delete', () => {
      it('should delete a session', async () => {
        mockDatabase.deleteSession.mockReturnValue(true)

        const result = await invokeHandler('session:delete', 'session_123')

        expect(result.success).toBe(true)
        expect(mockDatabase.deleteSession).toHaveBeenCalledWith('session_123')
      })

      it('should notify renderer of deletion', async () => {
        mockDatabase.deleteSession.mockReturnValue(true)

        await invokeHandler('session:delete', 'session_123')

        expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('session:deleted', 'session_123')
      })
    })
  })

  describe('Artifact Handlers', () => {
    describe('artifact:add', () => {
      it('should add an artifact', async () => {
        const mockArtifact = { id: 'artifact_123', type: 'screenshot' }
        mockDatabase.addArtifact.mockReturnValue(mockArtifact)

        const result = await invokeHandler('artifact:add', 'session_123', {
          type: 'screenshot',
          content: 'base64data'
        })

        expect(result.success).toBe(true)
        expect(result.artifact).toEqual(mockArtifact)
        expect(mockDatabase.addArtifact).toHaveBeenCalledWith('session_123', {
          type: 'screenshot',
          content: 'base64data'
        })
      })

      it('should notify renderer of new artifact', async () => {
        const mockArtifact = { id: 'artifact_123', type: 'screenshot' }
        mockDatabase.addArtifact.mockReturnValue(mockArtifact)

        await invokeHandler('artifact:add', 'session_123', { type: 'screenshot' })

        expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('artifact:added', {
          sessionId: 'session_123',
          artifact: mockArtifact
        })
      })

      it('should return error for non-existent session', async () => {
        mockDatabase.addArtifact.mockImplementation(() => {
          throw new Error('Session not found')
        })

        const result = await invokeHandler('artifact:add', 'non_existent', { type: 'screenshot' })

        expect(result.success).toBe(false)
        expect(result.error).toBe('Session not found')
      })
    })

    describe('artifact:get', () => {
      it('should get an artifact by ID', async () => {
        const mockArtifact = { id: 'artifact_123', type: 'screenshot', file_path: '/path/to/file' }
        mockDatabase.getArtifact.mockReturnValue(mockArtifact)

        const result = await invokeHandler('artifact:get', 'artifact_123')

        expect(result.success).toBe(true)
        expect(result.artifact).toEqual(mockArtifact)
      })
    })

    describe('artifact:list', () => {
      it('should list artifacts for a session', async () => {
        const mockArtifacts = [
          { id: 'artifact_1', type: 'screenshot' },
          { id: 'artifact_2', type: 'elements' }
        ]
        mockDatabase.getSessionArtifacts.mockReturnValue(mockArtifacts)

        const result = await invokeHandler('artifact:list', 'session_123')

        expect(result.success).toBe(true)
        expect(result.artifacts).toHaveLength(2)
        expect(mockDatabase.getSessionArtifacts).toHaveBeenCalledWith('session_123')
      })
    })
  })

  describe('Workflow Step Handlers', () => {
    describe('step:add', () => {
      it('should add a workflow step', async () => {
        mockDatabase.addWorkflowStep.mockReturnValue('step_123')

        const result = await invokeHandler('step:add', 'session_123', {
          stepId: 'navigate',
          stepName: 'Navigate to URL',
          tool: 'webwright_stealth',
          action: 'navigate'
        })

        expect(result.success).toBe(true)
        expect(result.stepId).toBe('step_123')
      })

      it('should notify renderer of new step', async () => {
        mockDatabase.addWorkflowStep.mockReturnValue('step_123')

        await invokeHandler('step:add', 'session_123', {
          stepId: 'navigate',
          stepName: 'Navigate',
          tool: 'stealth',
          action: 'navigate'
        })

        // The handler sends the input data to the renderer
        expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('step:added', {
          sessionId: 'session_123',
          stepId: 'navigate',
          stepName: 'Navigate',
          tool: 'stealth',
          action: 'navigate'
        })
      })
    })

    describe('step:update', () => {
      it('should update a workflow step', async () => {
        const result = await invokeHandler('step:update', 'step_123', {
          status: 'completed',
          result: { url: 'https://example.com' }
        })

        expect(result.success).toBe(true)
        expect(mockDatabase.updateWorkflowStep).toHaveBeenCalledWith('step_123', {
          status: 'completed',
          result: { url: 'https://example.com' }
        })
      })

      it('should notify renderer of step update', async () => {
        await invokeHandler('step:update', 'step_123', { status: 'completed' })

        expect(mockBrowserWindow.webContents.send).toHaveBeenCalledWith('step:updated', {
          id: 'step_123',
          status: 'completed'
        })
      })
    })

    describe('step:list', () => {
      it('should list steps for a session', async () => {
        const mockSteps = [
          { id: 'step_1', status: 'completed' },
          { id: 'step_2', status: 'running' }
        ]
        mockDatabase.getSessionSteps.mockReturnValue(mockSteps)

        const result = await invokeHandler('step:list', 'session_123')

        expect(result.success).toBe(true)
        expect(result.steps).toHaveLength(2)
        expect(mockDatabase.getSessionSteps).toHaveBeenCalledWith('session_123')
      })
    })
  })

  describe('Stats Handler', () => {
    it('should get stats', async () => {
      const mockStats = {
        totalSessions: 10,
        completedSessions: 8,
        totalArtifacts: 50,
        totalSteps: 100
      }
      mockDatabase.getStats.mockReturnValue(mockStats)

      const result = await invokeHandler('stats:get')

      expect(result.success).toBe(true)
      expect(result.stats).toEqual(mockStats)
    })
  })

  describe('Path Handlers', () => {
    it('should get sessions folder path', async () => {
      const result = await invokeHandler('sessions:folder')

      expect(result).toBe('/mock/sessions')
    })

    it('should get all WebWright paths', async () => {
      const result = await invokeHandler('webwright:path')

      expect(result).toEqual({
        global: '/mock/global',
        sessions: '/mock/sessions',
        exports: '/mock/exports'
      })
    })
  })

  describe('Folder Open Handler', () => {
    it('should open folder in system file manager', async () => {
      const result = await invokeHandler('folder:open', '/path/to/folder')

      expect(result.success).toBe(true)
      expect(mockShell.openPath).toHaveBeenCalledWith('/path/to/folder')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabase.getSessions.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const result = await invokeHandler('session:list')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database connection failed')
    })

    it('should handle null/undefined inputs gracefully', async () => {
      mockDatabase.getSession.mockReturnValue(undefined)

      const result = await invokeHandler('session:get', null as any)

      expect(result.success).toBe(true)
      expect(result.session).toBeUndefined()
    })
  })

  describe('Renderer Notifications', () => {
    it('should not throw if mainWindow is null during update notification', async () => {
      // Reinitialize without mainWindow
      Object.keys(ipcHandlers).forEach(key => delete ipcHandlers[key])
      initializeIPC(mockDatabase, null as any)

      const mockSession = { id: 'session_123', status: 'completed' }
      mockDatabase.updateSession.mockReturnValue(mockSession)

      const result = await invokeHandler('session:update', 'session_123', { status: 'completed' })

      expect(result.success).toBe(true)
      // Should not have called send since mainWindow is null
      expect(mockBrowserWindow.webContents.send).not.toHaveBeenCalled()
    })
  })
})
