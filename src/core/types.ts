/**
 * Core type definitions for AgentBrowser Pro
 * Combines type patterns from agent-browser and browser-use
 */

import { z } from 'zod';

// ============================================================================
// Base Types
// ============================================================================

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export interface Viewport {
  width: number;
  height: number;
}

export interface ProxyConfig {
  server: string;
  bypass?: string;
  username?: string;
  password?: string;
}

export interface DOMRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Ref System (from agent-browser)
// ============================================================================

export interface RefData {
  selector: string;
  role: string;
  name?: string;
  nth?: number;
}

export type RefMap = Record<string, RefData>;

// ============================================================================
// Command Response Types
// ============================================================================

export interface CommandResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface SnapshotResponse extends CommandResponse {
  result: {
    tree: string;
    refs: RefMap;
    url: string;
    title: string;
  };
}

export interface ScreenshotResponse extends CommandResponse {
  result: {
    data: string; // base64
    path?: string;
  };
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionInfo {
  id: string;
  pid: number;
  socketPath: string;
  startedAt: number;
  browser?: BrowserType;
  headless: boolean;
}

// ============================================================================
// Stream Types (from agent-browser pair browsing)
// ============================================================================

export interface FrameMetadata {
  offsetTop: number;
  pageScaleFactor: number;
  deviceWidth: number;
  deviceHeight: number;
  scrollOffsetX: number;
  scrollOffsetY: number;
  timestamp?: number;
}

export interface FrameMessage {
  type: 'frame';
  data: string; // base64 encoded image
  metadata: FrameMetadata;
}

export interface InputMouseMessage {
  type: 'input_mouse';
  eventType: 'mousePressed' | 'mouseReleased' | 'mouseMoved' | 'mouseWheel';
  x: number;
  y: number;
  button?: 'left' | 'right' | 'middle' | 'none';
  clickCount?: number;
  deltaX?: number;
  deltaY?: number;
  modifiers?: number;
}

export interface InputKeyboardMessage {
  type: 'input_keyboard';
  eventType: 'keyDown' | 'keyUp' | 'char';
  key: string;
  code?: string;
  text?: string;
  modifiers?: number;
}

export interface InputTouchMessage {
  type: 'input_touch';
  eventType: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel';
  touchPoints: Array<{
    x: number;
    y: number;
    id: number;
    radiusX?: number;
    radiusY?: number;
    force?: number;
  }>;
  modifiers?: number;
}

export type StreamMessage = FrameMessage | InputMouseMessage | InputKeyboardMessage | InputTouchMessage;

// ============================================================================
// DOM Types (from browser-use multi-source fusion)
// ============================================================================

export type NodeType =
  | 'element'
  | 'text'
  | 'document'
  | 'documentType'
  | 'documentFragment'
  | 'comment';

export type ShadowRootType = 'open' | 'closed';

export interface EnhancedAXNode {
  nodeId: number;
  role: string;
  name?: string;
  description?: string;
  value?: string;
  checked?: boolean | 'mixed';
  selected?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  focused?: boolean;
  multiselectable?: boolean;
  required?: boolean;
  invalid?: boolean;
  level?: number;
  autocomplete?: string;
  children?: EnhancedAXNode[];
}

export interface EnhancedSnapshotNode {
  nodeType: number;
  nodeName: string;
  nodeValue?: string;
  backendNodeId: number;
  attributes?: Record<string, string>;
  boundingBox?: DOMRect;
  isVisible?: boolean;
  isClickable?: boolean;
  paintOrder?: number;
}

export interface EnhancedDOMTreeNode {
  // DOM Node data
  nodeId: number;
  backendNodeId: number;
  nodeType: NodeType;
  nodeName: string;
  nodeValue?: string;
  attributes: Record<string, string>;
  isScrollable?: boolean;
  isVisible?: boolean;
  absolutePosition?: DOMRect;

  // Frame & Shadow DOM
  targetId?: string;
  frameId?: string;
  sessionId?: string;
  contentDocument?: EnhancedDOMTreeNode;
  shadowRootType?: ShadowRootType;
  shadowRoots?: EnhancedDOMTreeNode[];

  // Navigation
  parentNode?: EnhancedDOMTreeNode;
  childrenNodes?: EnhancedDOMTreeNode[];

  // Accessibility & Snapshot Fusion
  axNode?: EnhancedAXNode;
  snapshotNode?: EnhancedSnapshotNode;

  // Stable element hash for cross-session matching
  stableHash?: string;
}

export interface DOMState {
  tree: EnhancedDOMTreeNode;
  refs: RefMap;
  url: string;
  title: string;
  devicePixelRatio: number;
  viewport: Viewport;
  scrollPosition: { x: number; y: number };
}

// ============================================================================
// Agent Types (from browser-use agent loop)
// ============================================================================

export type ActionType =
  | 'click'
  | 'type'
  | 'fill'
  | 'navigate'
  | 'scroll'
  | 'screenshot'
  | 'snapshot'
  | 'wait'
  | 'extract'
  | 'done';

export interface AgentAction {
  type: ActionType;
  target?: string; // selector or ref
  value?: string;
  options?: Record<string, unknown>;
}

export interface AgentThought {
  thinking: string;
  evaluationPreviousGoal?: string;
  memory?: string;
  nextGoal?: string;
}

export interface AgentOutput {
  thought?: AgentThought;
  actions: AgentAction[];
}

export interface AgentState {
  step: number;
  totalSteps: number;
  goal: string;
  currentUrl: string;
  previousActions: AgentAction[];
  failureCount: number;
  lastError?: string;
}

export interface JudgementResult {
  success: boolean;
  reason: string;
  confidence: number;
}

// ============================================================================
// LLM Integration Types (from browser-use)
// ============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  name: string;
  invoke(messages: LLMMessage[]): Promise<LLMResponse>;
  invokeWithSchema<T>(messages: LLMMessage[], schema: z.ZodType<T>): Promise<T>;
}

// ============================================================================
// MCP Types
// ============================================================================

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.ZodType<unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description: string;
    required?: boolean;
  }>;
}

// ============================================================================
// Zod Schemas for Runtime Validation
// ============================================================================

export const ViewportSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

export const ProxyConfigSchema = z.object({
  server: z.string().min(1),
  bypass: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export const DOMRectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const RefDataSchema = z.object({
  selector: z.string(),
  role: z.string(),
  name: z.string().optional(),
  nth: z.number().optional(),
});

export const AgentActionSchema = z.object({
  type: z.enum(['click', 'type', 'fill', 'navigate', 'scroll', 'screenshot', 'snapshot', 'wait', 'extract', 'done']),
  target: z.string().optional(),
  value: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

export const AgentOutputSchema = z.object({
  thought: z.object({
    thinking: z.string(),
    evaluationPreviousGoal: z.string().optional(),
    memory: z.string().optional(),
    nextGoal: z.string().optional(),
  }).optional(),
  actions: z.array(AgentActionSchema).min(1),
});
