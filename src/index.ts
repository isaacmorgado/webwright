/**
 * AgentBrowser Pro - Main Entry Point
 * Next-generation browser automation framework for AI agents
 */

// ============================================================================
// Core Types
// ============================================================================

export type {
  // Base types
  BrowserType,
  Viewport,
  ProxyConfig,
  DOMRect,

  // Ref system
  RefData,
  RefMap,

  // Command/Response
  CommandResponse,
  SnapshotResponse,
  ScreenshotResponse,

  // Session
  SessionInfo,

  // Streaming
  FrameMetadata,
  FrameMessage,
  InputMouseMessage,
  InputKeyboardMessage,
  InputTouchMessage,
  StreamMessage,

  // DOM
  NodeType,
  ShadowRootType,
  EnhancedAXNode,
  EnhancedSnapshotNode,
  EnhancedDOMTreeNode,
  DOMState,

  // Agent
  ActionType,
  AgentAction,
  AgentThought,
  AgentOutput,
  AgentState,
  JudgementResult,

  // LLM
  LLMMessage,
  LLMResponse,
  LLMProvider,

  // MCP
  MCPTool,
  MCPResource,
  MCPPrompt,
} from './core/types.js';

// ============================================================================
// Core Protocol
// ============================================================================

export {
  commandSchema,
  parseCommand,
  serializeCommand,
  successResponse,
  errorResponse,
  serializeResponse,
  type Command,
  type ParseResult,
  type Response,
} from './core/protocol.js';

// ============================================================================
// Browser Manager
// ============================================================================

export {
  BrowserManager,
  type BrowserLaunchOptions,
} from './browser/manager.js';

// ============================================================================
// DOM Snapshot
// ============================================================================

export {
  getEnhancedSnapshot,
  getFullDOMTree,
  parseRef,
  resetRefs,
  snapshotToMarkdown,
  findElementByRef,
  type SnapshotOptions,
  type EnhancedSnapshot,
} from './dom/snapshot.js';

// ============================================================================
// Action Executor
// ============================================================================

export {
  ActionExecutor,
  toAIFriendlyError,
} from './actions/executor.js';

// ============================================================================
// Daemon
// ============================================================================

export {
  startDaemon,
  sendCommand,
  isDaemonRunning,
  isDaemonReady,
  getSocketPath,
  getPidFile,
  type DaemonOptions,
} from './core/daemon.js';

// ============================================================================
// Stream Server
// ============================================================================

export {
  StreamServer,
} from './stream/server.js';

// ============================================================================
// MCP Server
// ============================================================================

export {
  MCPServer,
  mcpTools,
  mcpResources,
  mcpPrompts,
} from './mcp/server.js';

// ============================================================================
// Zod Schemas (for validation)
// ============================================================================

export {
  ViewportSchema,
  ProxyConfigSchema,
  DOMRectSchema,
  RefDataSchema,
  AgentActionSchema,
  AgentOutputSchema,
} from './core/types.js';

// ============================================================================
// Default Export
// ============================================================================

import { BrowserManager } from './browser/manager.js';
import { MCPServer } from './mcp/server.js';
import { ActionExecutor } from './actions/executor.js';
import { startDaemon } from './core/daemon.js';

export default {
  BrowserManager,
  MCPServer,
  ActionExecutor,
  startDaemon,
};
