/**
 * Stream Server - WebSocket streaming for pair browsing
 * Adapted from agent-browser/src/stream-server.ts
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { BrowserManager } from '../browser/manager.js';
import type {
  FrameMessage,
  InputMouseMessage,
  InputKeyboardMessage,
  InputTouchMessage,
  StreamMessage,
  FrameMetadata,
} from '../core/types.js';

// ============================================================================
// Types
// ============================================================================

interface ScreencastFrame {
  data: string;
  metadata: FrameMetadata;
}

interface ErrorMessage {
  type: 'error';
  error: string;
}

interface StateMessage {
  type: 'state';
  connected: boolean;
  streaming: boolean;
  clients: number;
}

type OutgoingMessage = FrameMessage | ErrorMessage | StateMessage;

// ============================================================================
// Stream Server Class
// ============================================================================

export class StreamServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private port: number;
  private browser: BrowserManager;
  private isStreaming = false;

  constructor(browser: BrowserManager, port: number = 9223) {
    this.browser = browser;
    this.port = port;
  }

  /**
   * Start the WebSocket server and screencast
   */
  async start(options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    everyNthFrame?: number;
  }): Promise<void> {
    if (this.wss) {
      throw new Error('Stream server already running');
    }

    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      console.log(`Stream client connected (${this.clients.size} total)`);

      // Send current state
      this.send(ws, {
        type: 'state',
        connected: true,
        streaming: this.isStreaming,
        clients: this.clients.size,
      });

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString()) as StreamMessage;
          await this.handleMessage(message, ws);
        } catch (err) {
          const error = err instanceof Error ? err.message : String(err);
          this.sendError(ws, error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`Stream client disconnected (${this.clients.size} remaining)`);

        // Stop streaming if no clients
        if (this.clients.size === 0 && this.isStreaming) {
          this.stopScreencast().catch(console.error);
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
        this.clients.delete(ws);
      });
    });

    // Start screencast
    await this.startScreencast(options);

    console.log(`Stream server listening on ws://localhost:${this.port}`);
  }

  /**
   * Stop the WebSocket server and screencast
   */
  async stop(): Promise<void> {
    await this.stopScreencast();

    if (this.wss) {
      // Close all client connections
      for (const client of this.clients) {
        client.close();
      }
      this.clients.clear();

      // Close server
      await new Promise<void>((resolve, reject) => {
        this.wss!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      this.wss = null;
    }

    console.log('Stream server stopped');
  }

  /**
   * Start CDP screencast
   */
  private async startScreencast(options?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    everyNthFrame?: number;
  }): Promise<void> {
    if (this.isStreaming) return;

    await this.browser.startScreencast(
      (frame) => this.broadcastFrame(frame),
      {
        quality: options?.quality ?? 80,
        maxWidth: options?.maxWidth,
        maxHeight: options?.maxHeight,
        everyNthFrame: options?.everyNthFrame ?? 1,
      }
    );

    this.isStreaming = true;
    this.broadcastState();
  }

  /**
   * Stop CDP screencast
   */
  private async stopScreencast(): Promise<void> {
    if (!this.isStreaming) return;

    await this.browser.stopScreencast();
    this.isStreaming = false;
    this.broadcastState();
  }

  /**
   * Handle incoming messages from clients (input injection)
   */
  private async handleMessage(message: StreamMessage, ws: WebSocket): Promise<void> {
    switch (message.type) {
      case 'input_mouse':
        await this.browser.injectMouseEvent({
          type: message.eventType,
          x: message.x,
          y: message.y,
          button: message.button,
          clickCount: message.clickCount,
          deltaX: message.deltaX,
          deltaY: message.deltaY,
          modifiers: message.modifiers,
        });
        break;

      case 'input_keyboard':
        await this.browser.injectKeyboardEvent({
          type: message.eventType,
          key: message.key,
          code: message.code,
          text: message.text,
          modifiers: message.modifiers,
        });
        break;

      case 'input_touch':
        await this.browser.injectTouchEvent({
          type: message.eventType,
          touchPoints: message.touchPoints,
          modifiers: message.modifiers,
        });
        break;

      default:
        // Handle unknown message type gracefully
        console.warn('Unknown message type:', (message as any).type);
    }
  }

  /**
   * Broadcast a frame to all connected clients
   */
  private broadcastFrame(frame: ScreencastFrame): void {
    const message: FrameMessage = {
      type: 'frame',
      data: frame.data,
      metadata: frame.metadata,
    };

    this.broadcast(message);
  }

  /**
   * Broadcast current state to all clients
   */
  private broadcastState(): void {
    this.broadcast({
      type: 'state',
      connected: true,
      streaming: this.isStreaming,
      clients: this.clients.size,
    });
  }

  /**
   * Send a message to a specific client
   */
  private send(ws: WebSocket, message: OutgoingMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send an error to a specific client
   */
  private sendError(ws: WebSocket, error: string): void {
    this.send(ws, { type: 'error', error });
  }

  /**
   * Broadcast a message to all connected clients
   */
  private broadcast(message: OutgoingMessage): void {
    const payload = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  /**
   * Get the number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Check if the server is streaming
   */
  isStreamingActive(): boolean {
    return this.isStreaming;
  }
}

export default StreamServer;
