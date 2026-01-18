#!/usr/bin/env node

/**
 * WebWright HTTP Bridge
 *
 * HTTP API wrapper that connects to the WebWright daemon via Unix socket/TCP.
 * Allows the Electron desktop app to communicate with WebWright via HTTP.
 */

const express = require('express');
const cors = require('cors');
const net = require('net');
const os = require('os');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3456;

app.use(cors());
app.use(express.json());

// ============================================================================
// WebWright Daemon Connection
// ============================================================================

const isWindows = process.platform === 'win32';
const SESSION = process.env.AGENT_BROWSER_SESSION || 'default';

function getSocketPath() {
  if (isWindows) {
    // Windows uses TCP port
    let hash = 0;
    for (let i = 0; i < SESSION.length; i++) {
      hash = (hash << 5) - hash + SESSION.charCodeAt(i);
      hash |= 0;
    }
    return 49152 + (Math.abs(hash) % 16383);
  }
  // Unix socket path
  return path.join(os.tmpdir(), `agentbrowser-pro-${SESSION}.sock`);
}

function checkDaemonRunning() {
  const pidFile = path.join(os.tmpdir(), `agentbrowser-pro-${SESSION}.pid`);
  if (!fs.existsSync(pidFile)) return false;

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
    process.kill(pid, 0); // Check if process exists
    return true;
  } catch {
    return false;
  }
}

/**
 * Send command to WebWright daemon and get response
 */
async function sendToDaemon(command) {
  return new Promise((resolve, reject) => {
    const socketPath = getSocketPath();
    let client;

    if (isWindows) {
      client = net.createConnection({ port: socketPath, host: '127.0.0.1' });
    } else {
      client = net.createConnection({ path: socketPath });
    }

    let buffer = '';

    client.on('connect', () => {
      const message = JSON.stringify(command) + '\n';
      client.write(message);
    });

    client.on('data', (data) => {
      buffer += data.toString();

      if (buffer.includes('\n')) {
        try {
          const response = JSON.parse(buffer.trim());
          client.end();
          resolve(response);
        } catch (err) {
          client.end();
          reject(new Error(`Failed to parse daemon response: ${err.message}`));
        }
      }
    });

    client.on('error', (err) => {
      reject(new Error(`Daemon connection error: ${err.message}`));
    });

    client.on('timeout', () => {
      client.end();
      reject(new Error('Daemon request timeout'));
    });

    client.setTimeout(30000); // 30 second timeout
  });
}

// ============================================================================
// HTTP API Endpoints
// ============================================================================

/**
 * POST /api/command
 * Generic command endpoint - sends command to daemon
 */
app.post('/api/command', async (req, res) => {
  try {
    const { command, params } = req.body;

    if (!command) {
      return res.status(400).json({
        error: 'Missing command parameter',
      });
    }

    // Check if daemon is running
    if (!checkDaemonRunning()) {
      return res.status(503).json({
        error: 'WebWright daemon is not running',
        message: 'Start the daemon with: webwright daemon',
      });
    }

    // Generate unique ID for this command
    const commandId = `http-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Send to daemon
    const daemonCommand = {
      id: commandId,
      action: command,
      ...params,
    };

    const response = await sendToDaemon(daemonCommand);

    // Return result
    if (response.success) {
      res.json({ result: response.result });
    } else {
      res.status(500).json({
        error: response.error || 'Command execution failed',
        detail: response.message,
      });
    }
  } catch (error) {
    console.error('Command error:', error);
    res.status(500).json({
      error: error.message,
      message: 'Failed to communicate with WebWright daemon',
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  const running = checkDaemonRunning();
  res.json({
    bridge: 'running',
    daemon: running ? 'running' : 'offline',
    session: SESSION,
  });
});

/**
 * GET /api/daemon-status
 * Get daemon status
 */
app.get('/api/daemon-status', async (req, res) => {
  try {
    if (!checkDaemonRunning()) {
      return res.status(503).json({
        running: false,
        message: 'Daemon is offline',
      });
    }

    // Ping daemon
    const response = await sendToDaemon({
      id: `ping-${Date.now()}`,
      action: 'ping',
    });

    res.json({
      running: true,
      version: 'v1.0.0',
      sessions: 0, // TODO: Track sessions
      uptime: 0,   // TODO: Track uptime
    });
  } catch (error) {
    res.status(503).json({
      running: false,
      error: error.message,
    });
  }
});

// ============================================================================
// Server Startup
// ============================================================================

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════╗`);
  console.log(`║  WebWright HTTP Bridge                             ║`);
  console.log(`╠════════════════════════════════════════════════════╣`);
  console.log(`║  HTTP API: http://localhost:${PORT}                  ║`);
  console.log(`║  Session:  ${SESSION.padEnd(40)} ║`);
  console.log(`║  Daemon:   ${(checkDaemonRunning() ? '✓ Running' : '✗ Offline').padEnd(40)} ║`);
  console.log(`╚════════════════════════════════════════════════════╝\n`);

  if (!checkDaemonRunning()) {
    console.log('⚠️  WebWright daemon is not running!');
    console.log('   Start it with: webwright daemon\n');
  }
});
