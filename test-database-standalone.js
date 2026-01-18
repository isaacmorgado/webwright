/**
 * Standalone test for session database
 * Run with: node test-database-standalone.js
 *
 * Tests the global WebWright storage structure:
 *   ~/WebWright/
 *   ├── webwright.db
 *   ├── sessions/
 *   │   └── 2026-01-18_api-discovery_example-com_143022/
 *   │       ├── session.json
 *   │       ├── screenshots/
 *   │       ├── elements/
 *   │       └── ...
 *   └── exports/
 */

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Use actual global path for testing (in Documents for easy access)
const globalDir = path.join(os.homedir(), 'Documents', 'WebWright Sessions')
const dbPath = path.join(globalDir, 'webwright.db')
const sessionsDir = path.join(globalDir, 'sessions')
const exportsDir = path.join(globalDir, 'exports')

// Ensure global directories exist
if (!fs.existsSync(globalDir)) {
  fs.mkdirSync(globalDir, { recursive: true })
}
if (!fs.existsSync(sessionsDir)) {
  fs.mkdirSync(sessionsDir, { recursive: true })
}
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true })
}

console.log('='.repeat(50))
console.log('Session Database Standalone Test')
console.log('='.repeat(50))

// 1. Create database
console.log('\n1. Creating database...')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
console.log(`   ✅ Database created at ${dbPath}`)

// 2. Create tables
console.log('\n2. Creating tables...')
db.exec(`
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

db.exec(`
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

db.exec(`
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
console.log('   ✅ Tables created')

// 3. Create a session with proper folder naming
console.log('\n3. Creating a test session...')
const sessionId = `session_${Date.now()}_test123`
const now = Date.now()
const dateStr = new Date().toISOString().split('T')[0]
const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '')
const folderName = `${dateStr}_full-reverse-engineer_example-com_${timeStr}`
const folderPath = path.join(sessionsDir, folderName)
fs.mkdirSync(folderPath, { recursive: true })
fs.mkdirSync(path.join(folderPath, 'screenshots'), { recursive: true })
fs.mkdirSync(path.join(folderPath, 'elements'), { recursive: true })
fs.mkdirSync(path.join(folderPath, 'snapshots'), { recursive: true })
fs.mkdirSync(path.join(folderPath, 'har'), { recursive: true })
fs.mkdirSync(path.join(folderPath, 'code'), { recursive: true })

db.prepare(`
  INSERT INTO sessions (id, created_at, updated_at, task_description, task_type, target_url, status, confidence, tools, folder_path)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  sessionId,
  now,
  now,
  'Reverse engineer https://example.com and extract UI elements',
  'full_reverse_engineer',
  'https://example.com',
  'running',
  0.85,
  JSON.stringify(['webwright_stealth', 'chrome_devtools']),
  folderPath
)

// Write session.json index file
const sessionIndex = {
  id: sessionId,
  created: new Date(now).toISOString(),
  task: 'Reverse engineer https://example.com and extract UI elements',
  type: 'full_reverse_engineer',
  url: 'https://example.com',
  tools: ['webwright_stealth', 'chrome_devtools'],
  status: 'running'
}
fs.writeFileSync(path.join(folderPath, 'session.json'), JSON.stringify(sessionIndex, null, 2))

console.log(`   ✅ Session created: ${sessionId}`)
console.log(`   Folder: ${folderPath}`)

// 4. Add a workflow step
console.log('\n4. Adding workflow step...')
const stepId = `step_${Date.now()}_nav`
db.prepare(`
  INSERT INTO workflow_steps (id, session_id, step_id, step_name, tool, action, status, started_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run(stepId, sessionId, 'navigate', 'Navigate to target', 'webwright_stealth', 'navigate', 'running', now)
console.log(`   ✅ Step added: ${stepId}`)

// 5. Update step to completed
console.log('\n5. Updating step status...')
db.prepare(`
  UPDATE workflow_steps SET status = ?, completed_at = ?, duration = ?, result = ? WHERE id = ?
`).run('completed', Date.now(), 1234, JSON.stringify({ url: 'https://example.com' }), stepId)
console.log('   ✅ Step updated to completed')

// 6. Add an artifact
console.log('\n6. Adding artifact...')
const artifactId = `artifact_${Date.now()}_elem`
const artifactPath = path.join(folderPath, 'elements', 'ui_elements.json')
const elements = {
  count: 15,
  elements: [
    { tag: 'button', text: 'Click me' },
    { tag: 'input', type: 'text' },
    { tag: 'a', href: '/about' }
  ]
}
fs.writeFileSync(artifactPath, JSON.stringify(elements, null, 2))

db.prepare(`
  INSERT INTO artifacts (id, session_id, created_at, type, name, file_path, size)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(artifactId, sessionId, Date.now(), 'elements', 'ui_elements.json', artifactPath, fs.statSync(artifactPath).size)
console.log(`   ✅ Artifact added: ${artifactId}`)
console.log(`   File: ${artifactPath}`)

// 7. Update session status
console.log('\n7. Updating session status...')
db.prepare(`
  UPDATE sessions SET status = ?, summary = ?, updated_at = ? WHERE id = ?
`).run('completed', 'Successfully extracted 15 UI elements', Date.now(), sessionId)
console.log('   ✅ Session marked as completed')

// 8. Query the session with all related data
console.log('\n8. Retrieving full session...')
const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId)
const artifacts = db.prepare('SELECT * FROM artifacts WHERE session_id = ?').all(sessionId)
const steps = db.prepare('SELECT * FROM workflow_steps WHERE session_id = ?').all(sessionId)

console.log(`   ID: ${session.id}`)
console.log(`   Status: ${session.status}`)
console.log(`   Summary: ${session.summary}`)
console.log(`   Tools: ${session.tools}`)
console.log(`   Artifacts: ${artifacts.length}`)
console.log(`   Steps: ${steps.length}`)

// 9. Get stats
console.log('\n9. Getting stats...')
const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count
const completedSessions = db.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'completed'").get().count
const totalArtifacts = db.prepare('SELECT COUNT(*) as count FROM artifacts').get().count
console.log(`   Total sessions: ${totalSessions}`)
console.log(`   Completed: ${completedSessions}`)
console.log(`   Total artifacts: ${totalArtifacts}`)

// 10. Verify folder structure
console.log('\n10. Verifying folder structure...')
const folderContents = fs.readdirSync(folderPath)
console.log(`   Session folder contents: ${folderContents.join(', ')}`)
const elementsContents = fs.readdirSync(path.join(folderPath, 'elements'))
console.log(`   Elements folder contents: ${elementsContents.join(', ')}`)

// Don't clean up - keep the session for inspection
db.close()

console.log('\n' + '='.repeat(50))
console.log('All tests passed!')
console.log('='.repeat(50))
console.log('\nGlobal WebWright storage:')
console.log(`  ~/Documents/WebWright Sessions/`)
console.log(`  ├── webwright.db`)
console.log(`  ├── sessions/`)
console.log(`  │   └── ${folderName}/`)
console.log(`  │       ├── session.json`)
console.log(`  │       ├── screenshots/`)
console.log(`  │       ├── snapshots/`)
console.log(`  │       ├── elements/`)
console.log(`  │       │   └── ui_elements.json`)
console.log(`  │       ├── har/`)
console.log(`  │       └── code/`)
console.log(`  └── exports/`)
console.log('\nOpen in Finder: open ~/Documents/WebWright\\ Sessions')
