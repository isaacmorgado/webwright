/**
 * Daemon Server - Unix socket (macOS/Linux) or TCP (Windows) IPC
 * Adapted from agent-browser/src/daemon.ts
 */

import * as net from 'net';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BrowserManager } from '../browser/manager.js';
import { ActionExecutor } from '../actions/executor.js';
import { parseCommand, serializeResponse, errorResponse, type Response } from './protocol.js';
import { StreamServer } from '../stream/server.js';

// ============================================================================
// Platform Detection
// ============================================================================

const isWindows = process.platform === 'win32';
let currentSession = process.env.AGENT_BROWSER_SESSION ?? 'default';

// ============================================================================
// Session Path Management
// ============================================================================

/**
 * Get port number for TCP mode (Windows)
 * Uses a hash of the session name to get a consistent port
 */
function getPortForSession(session: string): number {
  let hash = 0;
  for (let i = 0; i < session.length; i++) {
    hash = (hash << 5) - hash + session.charCodeAt(i);
    hash |= 0;
  }
  // Port range 49152-65535 (dynamic/private ports)
  return 49152 + (Math.abs(hash) % 16383);
}

/**
 * Get the socket path for the current session (Unix) or port (Windows)
 */
export function getSocketPath(session?: string): string {
  const sess = session ?? currentSession;
  if (isWindows) {
    return String(getPortForSession(sess));
  }
  return path.join(os.tmpdir(), `agentbrowser-pro-${sess}.sock`);
}

/**
 * Get the PID file path
 */
export function getPidFile(session?: string): string {
  const sess = session ?? currentSession;
  return path.join(os.tmpdir(), `agentbrowser-pro-${sess}.pid`);
}

/**
 * Clean up socket file
 */
function cleanupSocket(session?: string): void {
  const socketPath = getSocketPath(session);
  if (!isWindows && fs.existsSync(socketPath)) {
    try {
      fs.unlinkSync(socketPath);
    } catch {
      // Ignore errors
    }
  }

  const pidFile = getPidFile(session);
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Check if daemon is running for the current session
 */
export function isDaemonRunning(session?: string): boolean {
  const pidFile = getPidFile(session);
  if (!fs.existsSync(pidFile)) return false;

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10);
    process.kill(pid, 0); // Check if process exists
    return true;
  } catch {
    cleanupSocket(session);
    return false;
  }
}

// ============================================================================
// Daemon Server
// ============================================================================

export interface DaemonOptions {
  session?: string;
  streamPort?: number;
  headed?: boolean;
  executablePath?: string;
  extensions?: string[];
}

/**
 * Start the daemon server
 */
export async function startDaemon(options: DaemonOptions = {}): Promise<void> {
  if (options.session) {
    currentSession = options.session;
  }

  cleanupSocket();

  const browser = new BrowserManager();
  const executor = new ActionExecutor(browser);
  let streamServer: StreamServer | null = null;
  let shuttingDown = false;

  const server = net.createServer((socket) => {
    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();

      // Process complete lines
      while (buffer.includes('\n')) {
        const newlineIdx = buffer.indexOf('\n');
        const line = buffer.substring(0, newlineIdx);
        buffer = buffer.substring(newlineIdx + 1);

        if (!line.trim()) continue;

        try {
          const parseResult = parseCommand(line);

          if (!parseResult.success) {
            const resp = errorResponse(parseResult.id ?? 'unknown', parseResult.error);
            socket.write(serializeResponse(resp) + '\n');
            continue;
          }

          // Auto-launch browser if needed
          if (
            !browser.isLaunched() &&
            parseResult.command.action !== 'launch' &&
            parseResult.command.action !== 'close'
          ) {
            const extensions = process.env.AGENT_BROWSER_EXTENSIONS
              ? process.env.AGENT_BROWSER_EXTENSIONS.split(',')
                  .map((p) => p.trim())
                  .filter(Boolean)
              : options.extensions;

            await browser.launch({
              headless: !(options.headed || process.env.AGENT_BROWSER_HEADED === '1'),
              executablePath: options.executablePath ?? process.env.AGENT_BROWSER_EXECUTABLE_PATH,
              extensions,
            });
          }

          // Handle streaming commands specially
          if (parseResult.command.action === 'startStream') {
            const port = parseResult.command.port ?? options.streamPort ?? 9223;
            streamServer = new StreamServer(browser, port);
            await streamServer.start({
              quality: parseResult.command.quality,
              maxWidth: parseResult.command.maxWidth,
              maxHeight: parseResult.command.maxHeight,
              everyNthFrame: parseResult.command.everyNthFrame,
            });
            socket.write(
              serializeResponse({
                id: parseResult.command.id,
                success: true,
                result: { port, url: `ws://localhost:${port}` },
              }) + '\n'
            );
            continue;
          }

          if (parseResult.command.action === 'stopStream') {
            if (streamServer) {
              await streamServer.stop();
              streamServer = null;
            }
            socket.write(
              serializeResponse({
                id: parseResult.command.id,
                success: true,
                result: { stopped: true },
              }) + '\n'
            );
            continue;
          }

          // Execute command
          const response = await executor.execute(parseResult.command);
          socket.write(serializeResponse(response) + '\n');
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          socket.write(serializeResponse(errorResponse('error', message)) + '\n');
        }
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err.message);
    });
  });

  // Graceful shutdown
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log('\nShutting down daemon...');

    if (streamServer) {
      await streamServer.stop();
    }

    if (browser.isLaunched()) {
      await browser.close();
    }

    server.close();
    cleanupSocket();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Write PID file before listening
  fs.writeFileSync(getPidFile(), process.pid.toString());

  if (isWindows) {
    const port = getPortForSession(currentSession);
    server.listen(port, '127.0.0.1', () => {
      console.log(`AgentBrowser Pro daemon listening on port ${port} (session: ${currentSession})`);
    });
  } else {
    server.listen(getSocketPath(), () => {
      console.log(`AgentBrowser Pro daemon listening on ${getSocketPath()} (session: ${currentSession})`);
    });
  }
}

// ============================================================================
// Client Connection
// ============================================================================

/**
 * Send a command to the daemon and get a response
 */
export async function sendCommand(
  command: string,
  session?: string
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const socketPath = getSocketPath(session);
    let socket: net.Socket;

    if (isWindows) {
      const port = parseInt(socketPath, 10);
      socket = net.createConnection({ port, host: '127.0.0.1' });
    } else {
      socket = net.createConnection({ path: socketPath });
    }

    let buffer = '';

    socket.on('connect', () => {
      socket.write(command + '\n');
    });

    socket.on('data', (data) => {
      buffer += data.toString();

      if (buffer.includes('\n')) {
        const line = buffer.split('\n')[0];
        try {
          const response = JSON.parse(line) as Response;
          socket.end();
          resolve(response);
        } catch (err) {
          socket.end();
          reject(new Error(`Invalid response: ${line}`));
        }
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });

    socket.setTimeout(30000);
  });
}

/**
 * Check if daemon is ready to accept commands
 */
export async function isDaemonReady(session?: string): Promise<boolean> {
  try {
    const response = await sendCommand(
      JSON.stringify({ id: 'ping', action: 'getUrl' }),
      session
    );
    return response.success || (response.error?.includes('No pages') ?? false);
  } catch {
    return false;
  }
}

// ============================================================================
// Entry Point
// ============================================================================

// Start daemon if run directly
if (process.env.AGENT_BROWSER_DAEMON === '1') {
  startDaemon({
    session: process.env.AGENT_BROWSER_SESSION,
    headed: process.env.AGENT_BROWSER_HEADED === '1',
    executablePath: process.env.AGENT_BROWSER_EXECUTABLE_PATH,
    extensions: process.env.AGENT_BROWSER_EXTENSIONS?.split(',').filter(Boolean),
  });
}
