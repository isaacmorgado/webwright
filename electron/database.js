/**
 * Session Database - SQLite storage for RE sessions and artifacts
 *
 * Each session has:
 * - Unique ID and timestamp
 * - Task description and type
 * - Status (running, completed, failed)
 * - Folder path for artifacts
 * - Associated artifacts (screenshots, snapshots, HAR files, etc.)
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class SessionDatabase {
  constructor() {
    this.db = null;
    this.sessionsDir = null;
    this.exportsDir = null;
    this.globalDir = null;
  }

  /**
   * Initialize database and session storage
   *
   * Global storage location: ~/WebWright/
   * Structure:
   *   ~/WebWright/
   *   ├── webwright.db           # SQLite database
   *   ├── sessions/              # All RE sessions
   *   │   ├── 2026-01-18_api-discovery_example-com/
   *   │   ├── 2026-01-18_ui-clone_stripe-com/
   *   │   └── ...
   *   └── exports/               # Exported reports, HAR files
   */
  init() {
    // Global storage in user's Documents folder
    const homeDir = require('os').homedir();
    this.globalDir = path.join(homeDir, 'Documents', 'WebWright Sessions');
    const globalDir = this.globalDir;
    const dbPath = path.join(globalDir, 'webwright.db');
    this.sessionsDir = path.join(globalDir, 'sessions');
    this.exportsDir = path.join(globalDir, 'exports');

    // Create directory structure
    if (!fs.existsSync(globalDir)) {
      fs.mkdirSync(globalDir, { recursive: true });
    }
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }

    // Open database
    this.db = new Database(dbPath);

    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.createTables();

    console.log(`[SessionDB] Global storage: ${globalDir}`);
    console.log(`[SessionDB] Database: ${dbPath}`);
    console.log(`[SessionDB] Sessions: ${this.sessionsDir}`);

    return this;
  }

  /**
   * Create database schema
   */
  createTables() {
    // Sessions table
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
    `);

    // Artifacts table
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
    `);

    // Workflow steps table
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
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_artifacts_session ON artifacts(session_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
      CREATE INDEX IF NOT EXISTS idx_steps_session ON workflow_steps(session_id);
    `);
  }

  /**
   * Create a new RE session
   *
   * Folder naming: YYYY-MM-DD_task-type_domain/
   * Example: 2026-01-18_api-discovery_example-com/
   */
  createSession(data) {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // Extract domain from URL for folder naming
    let domainSlug = 'unknown';
    if (data.targetUrl) {
      try {
        const url = new URL(data.targetUrl);
        domainSlug = url.hostname.replace(/\./g, '-').replace(/^www-/, '');
      } catch {}
    }

    // Create readable folder name: date_task-type_domain
    const dateStr = new Date().toISOString().split('T')[0];
    const taskSlug = data.taskType.replace(/_/g, '-');
    const timeSlug = new Date().toTimeString().split(' ')[0].replace(/:/g, '');
    const folderName = `${dateStr}_${taskSlug}_${domainSlug}_${timeSlug}`;
    const folderPath = path.join(this.sessionsDir, folderName);
    fs.mkdirSync(folderPath, { recursive: true });

    // Create subfolders for artifacts
    fs.mkdirSync(path.join(folderPath, 'screenshots'), { recursive: true });
    fs.mkdirSync(path.join(folderPath, 'snapshots'), { recursive: true });
    fs.mkdirSync(path.join(folderPath, 'har'), { recursive: true });
    fs.mkdirSync(path.join(folderPath, 'elements'), { recursive: true });
    fs.mkdirSync(path.join(folderPath, 'code'), { recursive: true });

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, created_at, updated_at, task_description, task_type, target_url, status, confidence, tools, folder_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

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
    );

    // Write session index file for easy reference
    const indexPath = path.join(folderPath, 'session.json');
    fs.writeFileSync(indexPath, JSON.stringify({
      id,
      created: new Date(now).toISOString(),
      task: data.taskDescription,
      type: data.taskType,
      url: data.targetUrl || null,
      tools: data.tools || [],
      status: 'running'
    }, null, 2));

    return this.getSession(id);
  }

  /**
   * Get session by ID
   */
  getSession(id) {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const session = stmt.get(id);
    if (session) {
      session.tools = JSON.parse(session.tools || '[]');
      session.artifacts = this.getSessionArtifacts(id);
      session.steps = this.getSessionSteps(id);
    }
    return session;
  }

  /**
   * Get all sessions with optional filters
   */
  getSessions(filters = {}) {
    let query = 'SELECT * FROM sessions';
    const conditions = [];
    const params = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    if (filters.taskType) {
      conditions.push('task_type = ?');
      params.push(filters.taskType);
    }

    if (filters.search) {
      conditions.push('(task_description LIKE ? OR target_url LIKE ?)');
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    const stmt = this.db.prepare(query);
    const sessions = stmt.all(...params);

    return sessions.map(session => {
      session.tools = JSON.parse(session.tools || '[]');
      return session;
    });
  }

  /**
   * Update session
   */
  updateSession(id, data) {
    const updates = [];
    const params = [];

    if (data.status !== undefined) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.summary !== undefined) {
      updates.push('summary = ?');
      params.push(data.summary);
    }

    if (data.error !== undefined) {
      updates.push('error = ?');
      params.push(data.error);
    }

    updates.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE sessions SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...params);

    // Update session.json file
    const session = this.getSession(id);
    if (session && session.folder_path) {
      const indexPath = path.join(session.folder_path, 'session.json');
      if (fs.existsSync(indexPath)) {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        indexData.status = session.status;
        indexData.summary = session.summary;
        indexData.updated = new Date().toISOString();
        if (session.error) indexData.error = session.error;
        fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
      }
    }

    return session;
  }

  /**
   * Get the global WebWright folder path
   */
  getGlobalPath() {
    const homeDir = require('os').homedir();
    return path.join(homeDir, 'WebWright');
  }

  /**
   * Add artifact to session
   */
  addArtifact(sessionId, data) {
    const session = this.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const id = `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    let filePath = null;
    let fileSize = 0;

    // Save file to session folder if data is provided
    if (data.content) {
      const subfolder = this.getArtifactSubfolder(data.type);
      const fileName = data.name || `${data.type}_${Date.now()}.${this.getFileExtension(data.type)}`;
      filePath = path.join(session.folder_path, subfolder, fileName);

      if (Buffer.isBuffer(data.content)) {
        fs.writeFileSync(filePath, data.content);
        fileSize = data.content.length;
      } else if (typeof data.content === 'string') {
        fs.writeFileSync(filePath, data.content, 'utf8');
        fileSize = Buffer.byteLength(data.content, 'utf8');
      } else {
        const jsonContent = JSON.stringify(data.content, null, 2);
        fs.writeFileSync(filePath, jsonContent, 'utf8');
        fileSize = Buffer.byteLength(jsonContent, 'utf8');
      }
    }

    const stmt = this.db.prepare(`
      INSERT INTO artifacts (id, session_id, created_at, type, name, file_path, data, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sessionId,
      now,
      data.type,
      data.name || data.type,
      filePath,
      data.metadata ? JSON.stringify(data.metadata) : null,
      fileSize
    );

    // Update session timestamp
    this.db.prepare('UPDATE sessions SET updated_at = ? WHERE id = ?').run(now, sessionId);

    return this.getArtifact(id);
  }

  /**
   * Get artifact by ID
   */
  getArtifact(id) {
    const stmt = this.db.prepare('SELECT * FROM artifacts WHERE id = ?');
    const artifact = stmt.get(id);
    if (artifact && artifact.data) {
      try {
        artifact.data = JSON.parse(artifact.data);
      } catch {}
    }
    return artifact;
  }

  /**
   * Get all artifacts for a session
   */
  getSessionArtifacts(sessionId) {
    const stmt = this.db.prepare('SELECT * FROM artifacts WHERE session_id = ? ORDER BY created_at ASC');
    return stmt.all(sessionId).map(a => {
      if (a.data) {
        try { a.data = JSON.parse(a.data); } catch {}
      }
      return a;
    });
  }

  /**
   * Add workflow step
   */
  addWorkflowStep(sessionId, stepData) {
    const id = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stmt = this.db.prepare(`
      INSERT INTO workflow_steps (id, session_id, step_id, step_name, tool, action, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      sessionId,
      stepData.stepId,
      stepData.stepName,
      stepData.tool,
      stepData.action,
      'running',
      Date.now()
    );

    return id;
  }

  /**
   * Update workflow step
   */
  updateWorkflowStep(id, data) {
    const updates = [];
    const params = [];

    if (data.status) {
      updates.push('status = ?');
      params.push(data.status);
    }

    if (data.result !== undefined) {
      updates.push('result = ?');
      params.push(typeof data.result === 'string' ? data.result : JSON.stringify(data.result));
    }

    if (data.error !== undefined) {
      updates.push('error = ?');
      params.push(data.error);
    }

    if (data.status === 'completed' || data.status === 'failed') {
      updates.push('completed_at = ?');
      params.push(Date.now());

      // Calculate duration
      const step = this.db.prepare('SELECT started_at FROM workflow_steps WHERE id = ?').get(id);
      if (step && step.started_at) {
        updates.push('duration = ?');
        params.push(Date.now() - step.started_at);
      }
    }

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE workflow_steps SET ${updates.join(', ')} WHERE id = ?
    `);

    stmt.run(...params);
  }

  /**
   * Get workflow steps for a session
   */
  getSessionSteps(sessionId) {
    const stmt = this.db.prepare('SELECT * FROM workflow_steps WHERE session_id = ? ORDER BY started_at ASC');
    return stmt.all(sessionId).map(s => {
      if (s.result) {
        try { s.result = JSON.parse(s.result); } catch {}
      }
      return s;
    });
  }

  /**
   * Delete a session and all associated data
   */
  deleteSession(id) {
    const session = this.getSession(id);
    if (!session) return false;

    // Delete folder and all files
    if (session.folder_path && fs.existsSync(session.folder_path)) {
      fs.rmSync(session.folder_path, { recursive: true, force: true });
    }

    // Delete from database (cascade deletes artifacts and steps)
    this.db.prepare('DELETE FROM artifacts WHERE session_id = ?').run(id);
    this.db.prepare('DELETE FROM workflow_steps WHERE session_id = ?').run(id);
    this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);

    return true;
  }

  /**
   * Get stats
   */
  getStats() {
    const totalSessions = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;
    const completedSessions = this.db.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'completed'").get().count;
    const totalArtifacts = this.db.prepare('SELECT COUNT(*) as count FROM artifacts').get().count;
    const totalSteps = this.db.prepare('SELECT COUNT(*) as count FROM workflow_steps').get().count;

    const byType = this.db.prepare(`
      SELECT task_type, COUNT(*) as count
      FROM sessions
      GROUP BY task_type
      ORDER BY count DESC
    `).all();

    const recentSessions = this.getSessions({ limit: 5 });

    return {
      totalSessions,
      completedSessions,
      totalArtifacts,
      totalSteps,
      byType,
      recentSessions
    };
  }

  /**
   * Helper: Get subfolder for artifact type
   */
  getArtifactSubfolder(type) {
    const map = {
      screenshot: 'screenshots',
      snapshot: 'snapshots',
      har: 'har',
      elements: 'elements',
      api_endpoints: 'elements',
      code: 'code'
    };
    return map[type] || 'other';
  }

  /**
   * Helper: Get file extension for artifact type
   */
  getFileExtension(type) {
    const map = {
      screenshot: 'png',
      snapshot: 'json',
      har: 'har',
      elements: 'json',
      api_endpoints: 'json',
      code: 'tsx'
    };
    return map[type] || 'json';
  }

  /**
   * Close database
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = new SessionDatabase();
