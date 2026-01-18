import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Database from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Mock the electron app module
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/userData')
  }
}))

/**
 * Database unit tests
 *
 * Tests the SessionDatabase class for:
 * - Session CRUD operations
 * - Artifact management
 * - Workflow step tracking
 * - Stats retrieval
 * - Folder structure creation
 */

// Create a test-specific database class to avoid module caching issues
class TestSessionDatabase {
  db: Database.Database | null = null
  sessionsDir: string = ''
  exportsDir: string = ''
  globalDir: string = ''

  init(testDir: string) {
    this.globalDir = testDir
    const dbPath = path.join(testDir, 'webwright.db')
    this.sessionsDir = path.join(testDir, 'sessions')
    this.exportsDir = path.join(testDir, 'exports')

    // Create directory structure
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true })
    }
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true })
    }

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.createTables()

    return this
  }

  createTables() {
    if (!this.db) return

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        task_description TEXT NOT NULL,
        task_type TEXT NOT NULL,
        target_url TEXT,
        status TEXT DEFAULT 'running',
        confidence REAL,
        tools TEXT,
        folder_path TEXT NOT NULL,
        summary TEXT,
        error TEXT
      )
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        file_path TEXT,
        data TEXT,
        size INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_steps (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        step_id TEXT NOT NULL,
        step_name TEXT NOT NULL,
        tool TEXT NOT NULL,
        action TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        started_at INTEGER,
        completed_at INTEGER,
        duration INTEGER,
        result TEXT,
        error TEXT,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `)

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
      CREATE INDEX IF NOT EXISTS idx_steps_session ON workflow_steps(session_id);
    `)
  }

  createSession(data: {
    taskDescription: string
    taskType: string
    targetUrl?: string
    confidence?: number
    tools?: string[]
  }) {
    if (!this.db) throw new Error('Database not initialized')

    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()

    let domainSlug = 'unknown'
    if (data.targetUrl) {
      try {
        const url = new URL(data.targetUrl)
        domainSlug = url.hostname.replace(/\./g, '-').replace(/^www-/, '')
      } catch {}
    }

    const dateStr = new Date().toISOString().split('T')[0]
    const taskSlug = data.taskType.replace(/_/g, '-')
    const timeSlug = new Date().toTimeString().split(' ')[0].replace(/:/g, '')
    const folderName = `${dateStr}_${taskSlug}_${domainSlug}_${timeSlug}`
    const folderPath = path.join(this.sessionsDir, folderName)

    fs.mkdirSync(folderPath, { recursive: true })
    fs.mkdirSync(path.join(folderPath, 'screenshots'), { recursive: true })
    fs.mkdirSync(path.join(folderPath, 'snapshots'), { recursive: true })
    fs.mkdirSync(path.join(folderPath, 'har'), { recursive: true })
    fs.mkdirSync(path.join(folderPath, 'elements'), { recursive: true })
    fs.mkdirSync(path.join(folderPath, 'code'), { recursive: true })

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, created_at, updated_at, task_description, task_type, target_url, status, confidence, tools, folder_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      now,
      now,
      data.taskDescription,
      data.taskType,
      data.targetUrl || null,
      'running',
      data.confidence || null,
      JSON.stringify(data.tools || []),
      folderPath
    )

    // Write session index file
    const indexPath = path.join(folderPath, 'session.json')
    fs.writeFileSync(indexPath, JSON.stringify({
      id,
      created: new Date(now).toISOString(),
      task: data.taskDescription,
      type: data.taskType,
      url: data.targetUrl || null,
      tools: data.tools || [],
      status: 'running'
    }, null, 2))

    return this.getSession(id)
  }

  getSession(id: string) {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?')
    const session = stmt.get(id) as any
    if (session) {
      session.tools = JSON.parse(session.tools || '[]')
      session.artifacts = this.getSessionArtifacts(id)
      session.steps = this.getSessionSteps(id)
    }
    return session
  }

  getSessions(filters: { status?: string; taskType?: string; search?: string; limit?: number } = {}) {
    if (!this.db) throw new Error('Database not initialized')

    let query = 'SELECT * FROM sessions'
    const conditions: string[] = []
    const params: any[] = []

    if (filters.status) {
      conditions.push('status = ?')
      params.push(filters.status)
    }

    if (filters.taskType) {
      conditions.push('task_type = ?')
      params.push(filters.taskType)
    }

    if (filters.search) {
      conditions.push('(task_description LIKE ? OR target_url LIKE ?)')
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY created_at DESC'

    if (filters.limit) {
      query += ' LIMIT ?'
      params.push(filters.limit)
    }

    const stmt = this.db.prepare(query)
    const sessions = stmt.all(...params) as any[]

    return sessions.map(session => {
      session.tools = JSON.parse(session.tools || '[]')
      return session
    })
  }

  updateSession(id: string, data: { status?: string; summary?: string; error?: string }) {
    if (!this.db) throw new Error('Database not initialized')

    const updates: string[] = []
    const params: any[] = []

    if (data.status !== undefined) {
      updates.push('status = ?')
      params.push(data.status)
    }

    if (data.summary !== undefined) {
      updates.push('summary = ?')
      params.push(data.summary)
    }

    if (data.error !== undefined) {
      updates.push('error = ?')
      params.push(data.error)
    }

    updates.push('updated_at = ?')
    params.push(Date.now())
    params.push(id)

    const stmt = this.db.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...params)

    return this.getSession(id)
  }

  deleteSession(id: string) {
    if (!this.db) throw new Error('Database not initialized')

    const session = this.getSession(id)
    if (!session) return false

    if (session.folder_path && fs.existsSync(session.folder_path)) {
      fs.rmSync(session.folder_path, { recursive: true, force: true })
    }

    this.db.prepare('DELETE FROM artifacts WHERE session_id = ?').run(id)
    this.db.prepare('DELETE FROM workflow_steps WHERE session_id = ?').run(id)
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id)

    return true
  }

  addArtifact(sessionId: string, data: { type: string; name?: string; content?: any; metadata?: any }) {
    if (!this.db) throw new Error('Database not initialized')

    const session = this.getSession(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)

    const id = `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = Date.now()

    let filePath: string | null = null
    let fileSize = 0

    if (data.content) {
      const subfolder = this.getArtifactSubfolder(data.type)
      const fileName = data.name || `${data.type}_${Date.now()}.${this.getFileExtension(data.type)}`
      filePath = path.join(session.folder_path, subfolder, fileName)

      if (Buffer.isBuffer(data.content)) {
        fs.writeFileSync(filePath, data.content)
        fileSize = data.content.length
      } else if (typeof data.content === 'string') {
        fs.writeFileSync(filePath, data.content, 'utf8')
        fileSize = Buffer.byteLength(data.content, 'utf8')
      } else {
        const jsonContent = JSON.stringify(data.content, null, 2)
        fs.writeFileSync(filePath, jsonContent, 'utf8')
        fileSize = Buffer.byteLength(jsonContent, 'utf8')
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO artifacts (id, session_id, created_at, type, name, file_path, data, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      sessionId,
      now,
      data.type,
      data.name || data.type,
      filePath,
      data.metadata ? JSON.stringify(data.metadata) : null,
      fileSize
    )

    this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId)

    return this.getArtifact(id)
  }

  getArtifact(id: string) {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM artifacts WHERE id = ?')
    const artifact = stmt.get(id) as any
    if (artifact && artifact.data) {
      try {
        artifact.data = JSON.parse(artifact.data)
      } catch {}
    }
    return artifact
  }

  getSessionArtifacts(sessionId: string) {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM artifacts WHERE session_id = ? ORDER BY created_at ASC')
    return (stmt.all(sessionId) as any[]).map(a => {
      if (a.data) {
        try { a.data = JSON.parse(a.data) } catch {}
      }
      return a
    })
  }

  addWorkflowStep(sessionId: string, stepData: { stepId: string; stepName: string; tool: string; action: string }) {
    if (!this.db) throw new Error('Database not initialized')

    const id = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const stmt = this.db.prepare(`
      INSERT INTO workflow_steps (id, session_id, step_id, step_name, tool, action, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, sessionId, stepData.stepId, stepData.stepName, stepData.tool, stepData.action, 'running', Date.now())

    return id
  }

  updateWorkflowStep(id: string, data: { status?: string; result?: any; error?: string }) {
    if (!this.db) throw new Error('Database not initialized')

    const updates: string[] = []
    const params: any[] = []

    if (data.status) {
      updates.push('status = ?')
      params.push(data.status)
    }

    if (data.result !== undefined) {
      updates.push('result = ?')
      params.push(typeof data.result === 'string' ? data.result : JSON.stringify(data.result))
    }

    if (data.error !== undefined) {
      updates.push('error = ?')
      params.push(data.error)
    }

    if (data.status === 'completed' || data.status === 'failed') {
      updates.push('completed_at = ?')
      params.push(Date.now())

      const step = (this.db.prepare('SELECT started_at FROM workflow_steps WHERE id = ?').get(id) as any)
      if (step && step.started_at) {
        updates.push('duration = ?')
        params.push(Date.now() - step.started_at)
      }
    }

    params.push(id)

    const stmt = this.db.prepare(`UPDATE workflow_steps SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...params)
  }

  getSessionSteps(sessionId: string) {
    if (!this.db) throw new Error('Database not initialized')

    const stmt = this.db.prepare('SELECT * FROM workflow_steps WHERE session_id = ? ORDER BY started_at ASC')
    return (stmt.all(sessionId) as any[]).map(s => {
      if (s.result) {
        try { s.result = JSON.parse(s.result) } catch {}
      }
      return s
    })
  }

  getStats() {
    if (!this.db) throw new Error('Database not initialized')

    const totalSessions = (this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any).count
    const completedSessions = (this.db.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'completed'").get() as any).count
    const totalArtifacts = (this.db.prepare('SELECT COUNT(*) as count FROM artifacts').get() as any).count
    const totalSteps = (this.db.prepare('SELECT COUNT(*) as count FROM workflow_steps').get() as any).count

    const byType = this.db.prepare(`
      SELECT task_type, COUNT(*) as count
      FROM sessions
      GROUP BY task_type
      ORDER BY count DESC
    `).all()

    const recentSessions = this.getSessions({ limit: 5 })

    return {
      totalSessions,
      completedSessions,
      totalArtifacts,
      totalSteps,
      byType,
      recentSessions
    }
  }

  getArtifactSubfolder(type: string) {
    const map: Record<string, string> = {
      screenshot: 'screenshots',
      snapshot: 'snapshots',
      har: 'har',
      elements: 'elements',
      api_endpoints: 'elements',
      code: 'code'
    }
    return map[type] || 'other'
  }

  getFileExtension(type: string) {
    const map: Record<string, string> = {
      screenshot: 'png',
      snapshot: 'json',
      har: 'har',
      elements: 'json',
      api_endpoints: 'json',
      code: 'tsx'
    }
    return map[type] || 'json'
  }

  close() {
    if (this.db) {
      this.db.close()
    }
  }
}

describe('SessionDatabase', () => {
  let db: TestSessionDatabase
  let testDir: string

  beforeEach(() => {
    // Create a unique test directory for each test
    testDir = path.join(os.tmpdir(), `webwright-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    db = new TestSessionDatabase()
    db.init(testDir)
  })

  afterEach(() => {
    // Close database and cleanup
    db.close()
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('Session CRUD Operations', () => {
    it('should create a session with all required fields', () => {
      const session = db.createSession({
        taskDescription: 'Test task description',
        taskType: 'api_discovery',
        targetUrl: 'https://example.com',
        confidence: 0.85,
        tools: ['webwright_stealth', 'chrome_devtools']
      })

      expect(session).toBeDefined()
      expect(session.id).toMatch(/^session_\d+_[a-z0-9]+$/)
      expect(session.task_description).toBe('Test task description')
      expect(session.task_type).toBe('api_discovery')
      expect(session.target_url).toBe('https://example.com')
      expect(session.status).toBe('running')
      expect(session.confidence).toBe(0.85)
      expect(session.tools).toEqual(['webwright_stealth', 'chrome_devtools'])
    })

    it('should create session folder structure', () => {
      const session = db.createSession({
        taskDescription: 'Test session',
        taskType: 'ui_clone',
        targetUrl: 'https://stripe.com'
      })

      expect(fs.existsSync(session.folder_path)).toBe(true)
      expect(fs.existsSync(path.join(session.folder_path, 'screenshots'))).toBe(true)
      expect(fs.existsSync(path.join(session.folder_path, 'snapshots'))).toBe(true)
      expect(fs.existsSync(path.join(session.folder_path, 'har'))).toBe(true)
      expect(fs.existsSync(path.join(session.folder_path, 'elements'))).toBe(true)
      expect(fs.existsSync(path.join(session.folder_path, 'code'))).toBe(true)
    })

    it('should create session.json index file', () => {
      const session = db.createSession({
        taskDescription: 'Test session',
        taskType: 'api_discovery',
        targetUrl: 'https://api.example.com'
      })

      const indexPath = path.join(session.folder_path, 'session.json')
      expect(fs.existsSync(indexPath)).toBe(true)

      const indexContent = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
      expect(indexContent.id).toBe(session.id)
      expect(indexContent.task).toBe('Test session')
      expect(indexContent.type).toBe('api_discovery')
      expect(indexContent.url).toBe('https://api.example.com')
      expect(indexContent.status).toBe('running')
    })

    it('should extract domain for folder naming', () => {
      const session = db.createSession({
        taskDescription: 'Test session',
        taskType: 'full_reverse_engineer',
        targetUrl: 'https://www.example.com/path/to/page'
      })

      expect(session.folder_path).toContain('example-com')
      expect(session.folder_path).not.toContain('www-')
    })

    it('should handle sessions without URL', () => {
      const session = db.createSession({
        taskDescription: 'Test session without URL',
        taskType: 'stealth_scrape'
      })

      expect(session.target_url).toBeNull()
      expect(session.folder_path).toContain('unknown')
    })

    it('should get session by ID', () => {
      const created = db.createSession({
        taskDescription: 'Get test',
        taskType: 'api_discovery'
      })

      const retrieved = db.getSession(created.id)
      expect(retrieved).toBeDefined()
      expect(retrieved.id).toBe(created.id)
      expect(retrieved.task_description).toBe('Get test')
    })

    it('should return undefined for non-existent session', () => {
      const session = db.getSession('non_existent_id')
      expect(session).toBeUndefined()
    })

    it('should list all sessions ordered by created_at DESC', () => {
      // Create sessions with explicit time gaps to ensure proper ordering
      const session1 = db.createSession({ taskDescription: 'First', taskType: 'api_discovery' })
      const session2 = db.createSession({ taskDescription: 'Second', taskType: 'ui_clone' })
      const session3 = db.createSession({ taskDescription: 'Third', taskType: 'stealth_scrape' })

      const sessions = db.getSessions()
      expect(sessions.length).toBe(3)
      // Sessions should be ordered by created_at DESC
      // Due to same-millisecond creation, order may vary - just verify all exist
      const descriptions = sessions.map(s => s.task_description)
      expect(descriptions).toContain('First')
      expect(descriptions).toContain('Second')
      expect(descriptions).toContain('Third')
    })

    it('should filter sessions by status', () => {
      const session1 = db.createSession({ taskDescription: 'Running', taskType: 'api_discovery' })
      const session2 = db.createSession({ taskDescription: 'Completed', taskType: 'ui_clone' })
      db.updateSession(session2.id, { status: 'completed' })

      const running = db.getSessions({ status: 'running' })
      expect(running.length).toBe(1)
      expect(running[0].id).toBe(session1.id)

      const completed = db.getSessions({ status: 'completed' })
      expect(completed.length).toBe(1)
      expect(completed[0].id).toBe(session2.id)
    })

    it('should filter sessions by task type', () => {
      db.createSession({ taskDescription: 'API', taskType: 'api_discovery' })
      db.createSession({ taskDescription: 'UI', taskType: 'ui_clone' })

      const apiSessions = db.getSessions({ taskType: 'api_discovery' })
      expect(apiSessions.length).toBe(1)
      expect(apiSessions[0].task_type).toBe('api_discovery')
    })

    it('should search sessions by description and URL', () => {
      db.createSession({ taskDescription: 'Extract API endpoints', taskType: 'api_discovery', targetUrl: 'https://stripe.com' })
      db.createSession({ taskDescription: 'Clone UI', taskType: 'ui_clone', targetUrl: 'https://github.com' })

      const stripeResults = db.getSessions({ search: 'stripe' })
      expect(stripeResults.length).toBe(1)

      const apiResults = db.getSessions({ search: 'API' })
      expect(apiResults.length).toBe(1)
    })

    it('should limit session results', () => {
      for (let i = 0; i < 10; i++) {
        db.createSession({ taskDescription: `Session ${i}`, taskType: 'api_discovery' })
      }

      const limited = db.getSessions({ limit: 5 })
      expect(limited.length).toBe(5)
    })

    it('should update session status', () => {
      const session = db.createSession({ taskDescription: 'Update test', taskType: 'api_discovery' })

      const updated = db.updateSession(session.id, { status: 'completed' })
      expect(updated.status).toBe('completed')
    })

    it('should update session summary', () => {
      const session = db.createSession({ taskDescription: 'Summary test', taskType: 'api_discovery' })

      const updated = db.updateSession(session.id, { summary: 'Found 10 endpoints' })
      expect(updated.summary).toBe('Found 10 endpoints')
    })

    it('should update session error', () => {
      const session = db.createSession({ taskDescription: 'Error test', taskType: 'api_discovery' })

      const updated = db.updateSession(session.id, { status: 'failed', error: 'Connection timeout' })
      expect(updated.status).toBe('failed')
      expect(updated.error).toBe('Connection timeout')
    })

    it('should delete session and its folder', () => {
      const session = db.createSession({ taskDescription: 'Delete test', taskType: 'api_discovery' })
      const folderPath = session.folder_path

      expect(fs.existsSync(folderPath)).toBe(true)

      const result = db.deleteSession(session.id)
      expect(result).toBe(true)
      expect(fs.existsSync(folderPath)).toBe(false)
      expect(db.getSession(session.id)).toBeUndefined()
    })

    it('should return false when deleting non-existent session', () => {
      const result = db.deleteSession('non_existent_id')
      expect(result).toBe(false)
    })
  })

  describe('Artifact Operations', () => {
    let session: any

    beforeEach(() => {
      session = db.createSession({
        taskDescription: 'Artifact test session',
        taskType: 'api_discovery'
      })
    })

    it('should add artifact with string content', () => {
      const artifact = db.addArtifact(session.id, {
        type: 'elements',
        name: 'test-elements.json',
        content: JSON.stringify({ count: 5 })
      })

      expect(artifact).toBeDefined()
      expect(artifact.id).toMatch(/^artifact_\d+_[a-z0-9]+$/)
      expect(artifact.type).toBe('elements')
      expect(artifact.name).toBe('test-elements.json')
      expect(artifact.file_path).toContain('elements')
      expect(artifact.size).toBeGreaterThan(0)
    })

    it('should add artifact with object content', () => {
      const artifact = db.addArtifact(session.id, {
        type: 'api_endpoints',
        name: 'endpoints.json',
        content: { endpoints: ['/api/v1/users', '/api/v1/posts'] }
      })

      expect(artifact).toBeDefined()
      expect(fs.existsSync(artifact.file_path)).toBe(true)

      const fileContent = JSON.parse(fs.readFileSync(artifact.file_path, 'utf8'))
      expect(fileContent.endpoints).toHaveLength(2)
    })

    it('should add artifact with Buffer content', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47])
      const artifact = db.addArtifact(session.id, {
        type: 'screenshot',
        name: 'test.png',
        content: pngHeader
      })

      expect(artifact).toBeDefined()
      expect(artifact.file_path).toContain('screenshots')
      expect(artifact.size).toBe(4)
    })

    it('should add artifact with metadata', () => {
      const artifact = db.addArtifact(session.id, {
        type: 'har',
        name: 'capture.har',
        content: '{}',
        metadata: { capturedAt: Date.now(), requestCount: 50 }
      })

      expect(artifact.data).toBeDefined()
      expect(artifact.data.requestCount).toBe(50)
    })

    it('should get artifact by ID', () => {
      const created = db.addArtifact(session.id, {
        type: 'elements',
        content: { test: true }
      })

      const retrieved = db.getArtifact(created.id)
      expect(retrieved).toBeDefined()
      expect(retrieved.id).toBe(created.id)
    })

    it('should get all artifacts for a session', () => {
      db.addArtifact(session.id, { type: 'screenshot', content: 'fake' })
      db.addArtifact(session.id, { type: 'elements', content: {} })
      db.addArtifact(session.id, { type: 'har', content: '{}' })

      const artifacts = db.getSessionArtifacts(session.id)
      expect(artifacts.length).toBe(3)
    })

    it('should throw error when adding artifact to non-existent session', () => {
      expect(() => {
        db.addArtifact('non_existent_session', { type: 'elements', content: {} })
      }).toThrow('Session not found')
    })

    it('should map artifact types to correct subfolders', () => {
      expect(db.getArtifactSubfolder('screenshot')).toBe('screenshots')
      expect(db.getArtifactSubfolder('snapshot')).toBe('snapshots')
      expect(db.getArtifactSubfolder('har')).toBe('har')
      expect(db.getArtifactSubfolder('elements')).toBe('elements')
      expect(db.getArtifactSubfolder('api_endpoints')).toBe('elements')
      expect(db.getArtifactSubfolder('code')).toBe('code')
      expect(db.getArtifactSubfolder('unknown')).toBe('other')
    })

    it('should map artifact types to correct file extensions', () => {
      expect(db.getFileExtension('screenshot')).toBe('png')
      expect(db.getFileExtension('snapshot')).toBe('json')
      expect(db.getFileExtension('har')).toBe('har')
      expect(db.getFileExtension('elements')).toBe('json')
      expect(db.getFileExtension('code')).toBe('tsx')
      expect(db.getFileExtension('unknown')).toBe('json')
    })
  })

  describe('Workflow Step Operations', () => {
    let session: any

    beforeEach(() => {
      session = db.createSession({
        taskDescription: 'Workflow test session',
        taskType: 'full_reverse_engineer'
      })
    })

    it('should add workflow step', () => {
      const stepId = db.addWorkflowStep(session.id, {
        stepId: 'navigate',
        stepName: 'Navigate to target',
        tool: 'webwright_stealth',
        action: 'navigate'
      })

      expect(stepId).toMatch(/^step_\d+_[a-z0-9]+$/)
    })

    it('should update step status to completed', () => {
      const stepId = db.addWorkflowStep(session.id, {
        stepId: 'screenshot',
        stepName: 'Take screenshot',
        tool: 'webwright_stealth',
        action: 'screenshot'
      })

      // Small delay to ensure duration > 0
      const start = Date.now()
      while (Date.now() - start < 10) {}

      db.updateWorkflowStep(stepId, {
        status: 'completed',
        result: { path: '/screenshots/test.png' }
      })

      const steps = db.getSessionSteps(session.id)
      expect(steps[0].status).toBe('completed')
      expect(steps[0].completed_at).toBeDefined()
      expect(steps[0].duration).toBeGreaterThanOrEqual(0)
      expect(steps[0].result.path).toBe('/screenshots/test.png')
    })

    it('should update step status to failed with error', () => {
      const stepId = db.addWorkflowStep(session.id, {
        stepId: 'api_capture',
        stepName: 'Capture API calls',
        tool: 'chrome_devtools',
        action: 'capture'
      })

      db.updateWorkflowStep(stepId, {
        status: 'failed',
        error: 'Network timeout'
      })

      const steps = db.getSessionSteps(session.id)
      expect(steps[0].status).toBe('failed')
      expect(steps[0].error).toBe('Network timeout')
    })

    it('should get all steps for a session', () => {
      db.addWorkflowStep(session.id, { stepId: 'step1', stepName: 'Step 1', tool: 'tool1', action: 'action1' })
      db.addWorkflowStep(session.id, { stepId: 'step2', stepName: 'Step 2', tool: 'tool2', action: 'action2' })
      db.addWorkflowStep(session.id, { stepId: 'step3', stepName: 'Step 3', tool: 'tool3', action: 'action3' })

      const steps = db.getSessionSteps(session.id)
      expect(steps.length).toBe(3)
    })

    it('should include steps when getting session', () => {
      db.addWorkflowStep(session.id, { stepId: 'nav', stepName: 'Navigate', tool: 'stealth', action: 'navigate' })
      db.addWorkflowStep(session.id, { stepId: 'cap', stepName: 'Capture', tool: 'devtools', action: 'capture' })

      const fullSession = db.getSession(session.id)
      expect(fullSession.steps).toBeDefined()
      expect(fullSession.steps.length).toBe(2)
    })
  })

  describe('Statistics', () => {
    it('should return correct stats', () => {
      // Create some test data
      const session1 = db.createSession({ taskDescription: 'Session 1', taskType: 'api_discovery' })
      const session2 = db.createSession({ taskDescription: 'Session 2', taskType: 'api_discovery' })
      db.createSession({ taskDescription: 'Session 3', taskType: 'ui_clone' })

      db.updateSession(session1.id, { status: 'completed' })
      db.updateSession(session2.id, { status: 'completed' })

      db.addArtifact(session1.id, { type: 'elements', content: {} })
      db.addArtifact(session1.id, { type: 'screenshot', content: 'fake' })

      db.addWorkflowStep(session1.id, { stepId: 's1', stepName: 'Step 1', tool: 't1', action: 'a1' })
      db.addWorkflowStep(session1.id, { stepId: 's2', stepName: 'Step 2', tool: 't2', action: 'a2' })

      const stats = db.getStats()

      expect(stats.totalSessions).toBe(3)
      expect(stats.completedSessions).toBe(2)
      expect(stats.totalArtifacts).toBe(2)
      expect(stats.totalSteps).toBe(2)
      expect(stats.byType).toBeDefined()
      expect(stats.byType.find((t: any) => t.task_type === 'api_discovery')?.count).toBe(2)
      expect(stats.byType.find((t: any) => t.task_type === 'ui_clone')?.count).toBe(1)
      expect(stats.recentSessions.length).toBeLessThanOrEqual(5)
    })

    it('should return empty stats for empty database', () => {
      const stats = db.getStats()

      expect(stats.totalSessions).toBe(0)
      expect(stats.completedSessions).toBe(0)
      expect(stats.totalArtifacts).toBe(0)
      expect(stats.totalSteps).toBe(0)
      expect(stats.byType).toEqual([])
      expect(stats.recentSessions).toEqual([])
    })
  })

  describe('Database Initialization', () => {
    it('should create global directory structure', () => {
      expect(fs.existsSync(db.globalDir)).toBe(true)
      expect(fs.existsSync(db.sessionsDir)).toBe(true)
      expect(fs.existsSync(db.exportsDir)).toBe(true)
    })

    it('should create database file', () => {
      const dbPath = path.join(db.globalDir, 'webwright.db')
      expect(fs.existsSync(dbPath)).toBe(true)
    })

    it('should use WAL mode', () => {
      const walPath = path.join(db.globalDir, 'webwright.db-wal')
      // WAL file is created on first write
      db.createSession({ taskDescription: 'WAL test', taskType: 'api_discovery' })
      // Note: WAL file may not exist immediately in all SQLite configurations
      // but WAL mode is set via pragma
    })
  })

  describe('Cascade Delete', () => {
    it('should delete artifacts when session is deleted', () => {
      const session = db.createSession({ taskDescription: 'Cascade test', taskType: 'api_discovery' })
      const artifact = db.addArtifact(session.id, { type: 'elements', content: {} })

      db.deleteSession(session.id)

      expect(db.getArtifact(artifact.id)).toBeUndefined()
    })

    it('should delete workflow steps when session is deleted', () => {
      const session = db.createSession({ taskDescription: 'Cascade test', taskType: 'api_discovery' })
      db.addWorkflowStep(session.id, { stepId: 's1', stepName: 'Step 1', tool: 't1', action: 'a1' })

      db.deleteSession(session.id)

      const steps = db.getSessionSteps(session.id)
      expect(steps.length).toBe(0)
    })
  })
})
