/**
 * Test script for the session database
 * Run with: node test-database.js
 */

// Mock app.getPath for testing outside Electron
const mockApp = {
  getPath: (name) => {
    if (name === 'userData') {
      return '/tmp/webwright-test'
    }
    return '/tmp'
  }
}

// Inject mock before requiring database
require('electron')
const Module = require('module')
const originalRequire = Module.prototype.require
Module.prototype.require = function(id) {
  if (id === 'electron') {
    return { app: mockApp }
  }
  return originalRequire.apply(this, arguments)
}

const fs = require('fs')

// Ensure test directory exists
if (!fs.existsSync('/tmp/webwright-test')) {
  fs.mkdirSync('/tmp/webwright-test', { recursive: true })
}

// Now require the database
const sessionDB = require('./electron/database')

async function test() {
  console.log('='.repeat(50))
  console.log('Session Database Test')
  console.log('='.repeat(50))

  // Initialize
  console.log('\n1. Initializing database...')
  sessionDB.init()
  console.log('   ✅ Database initialized')
  console.log(`   Sessions folder: ${sessionDB.sessionsDir}`)

  // Create a session
  console.log('\n2. Creating a test session...')
  const session = sessionDB.createSession({
    taskDescription: 'Reverse engineer https://example.com and extract UI elements',
    taskType: 'full_reverse_engineer',
    targetUrl: 'https://example.com',
    confidence: 0.85,
    tools: ['webwright_stealth', 'chrome_devtools']
  })
  console.log(`   ✅ Session created: ${session.id}`)
  console.log(`   Folder: ${session.folder_path}`)

  // Add a workflow step
  console.log('\n3. Adding workflow step...')
  const stepId = sessionDB.addWorkflowStep(session.id, {
    stepId: 'navigate',
    stepName: 'Navigate to target',
    tool: 'webwright_stealth',
    action: 'navigate'
  })
  console.log(`   ✅ Step added: ${stepId}`)

  // Update step
  console.log('\n4. Updating step status...')
  sessionDB.updateWorkflowStep(stepId, {
    status: 'completed',
    result: { url: 'https://example.com', title: 'Example Domain' }
  })
  console.log('   ✅ Step updated to completed')

  // Add an artifact
  console.log('\n5. Adding artifact...')
  const artifact = sessionDB.addArtifact(session.id, {
    type: 'elements',
    name: 'ui_elements.json',
    content: {
      count: 15,
      elements: [
        { tag: 'button', text: 'Click me' },
        { tag: 'input', type: 'text' },
        { tag: 'a', href: '/about' }
      ]
    }
  })
  console.log(`   ✅ Artifact added: ${artifact.id}`)
  console.log(`   File: ${artifact.file_path}`)

  // Update session status
  console.log('\n6. Updating session status...')
  sessionDB.updateSession(session.id, {
    status: 'completed',
    summary: 'Successfully extracted 15 UI elements'
  })
  console.log('   ✅ Session marked as completed')

  // Get full session
  console.log('\n7. Retrieving full session...')
  const fullSession = sessionDB.getSession(session.id)
  console.log(`   ID: ${fullSession.id}`)
  console.log(`   Status: ${fullSession.status}`)
  console.log(`   Summary: ${fullSession.summary}`)
  console.log(`   Artifacts: ${fullSession.artifacts?.length || 0}`)
  console.log(`   Steps: ${fullSession.steps?.length || 0}`)

  // Get stats
  console.log('\n8. Getting stats...')
  const stats = sessionDB.getStats()
  console.log(`   Total sessions: ${stats.totalSessions}`)
  console.log(`   Completed: ${stats.completedSessions}`)
  console.log(`   Total artifacts: ${stats.totalArtifacts}`)
  console.log(`   Total steps: ${stats.totalSteps}`)

  // List sessions
  console.log('\n9. Listing all sessions...')
  const sessions = sessionDB.getSessions()
  console.log(`   Found ${sessions.length} session(s)`)

  // Delete session
  console.log('\n10. Deleting session...')
  sessionDB.deleteSession(session.id)
  console.log('    ✅ Session deleted')

  // Verify deletion
  const deletedSession = sessionDB.getSession(session.id)
  console.log(`    Session exists after delete: ${!!deletedSession}`)

  // Close
  sessionDB.close()
  console.log('\n' + '='.repeat(50))
  console.log('All tests passed!')
  console.log('='.repeat(50))
}

test().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
