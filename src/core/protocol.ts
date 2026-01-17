/**
 * Protocol layer - Zod schema validation for commands
 * Adapted from agent-browser/src/protocol.ts
 */

import { z } from 'zod';
import { ViewportSchema, ProxyConfigSchema } from './types.js';

// ============================================================================
// Base Command Schema
// ============================================================================

const baseCommandSchema = z.object({
  id: z.string(),
});

// ============================================================================
// Browser Lifecycle Commands
// ============================================================================

const launchSchema = baseCommandSchema.extend({
  action: z.literal('launch'),
  headless: z.boolean().optional().default(true),
  viewport: ViewportSchema.optional(),
  browser: z.enum(['chromium', 'firefox', 'webkit']).optional().default('chromium'),
  cdpPort: z.number().positive().optional(),
  executablePath: z.string().optional(),
  extensions: z.array(z.string()).optional(),
  headers: z.record(z.string()).optional(),
  proxy: ProxyConfigSchema.optional(),
  userDataDir: z.string().optional(),
  slowMo: z.number().optional(),
  timeout: z.number().positive().optional(),
});

const closeSchema = baseCommandSchema.extend({
  action: z.literal('close'),
});

// ============================================================================
// Navigation Commands
// ============================================================================

const navigateSchema = baseCommandSchema.extend({
  action: z.literal('navigate'),
  url: z.string().url(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  timeout: z.number().positive().optional(),
});

const goBackSchema = baseCommandSchema.extend({
  action: z.literal('back'),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
});

const goForwardSchema = baseCommandSchema.extend({
  action: z.literal('forward'),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
});

const reloadSchema = baseCommandSchema.extend({
  action: z.literal('reload'),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
});

// ============================================================================
// Interaction Commands
// ============================================================================

const clickSchema = baseCommandSchema.extend({
  action: z.literal('click'),
  selector: z.string(),
  button: z.enum(['left', 'right', 'middle']).optional(),
  clickCount: z.number().positive().optional(),
  delay: z.number().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  modifiers: z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift'])).optional(),
  force: z.boolean().optional(),
  noWaitAfter: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const doubleClickSchema = baseCommandSchema.extend({
  action: z.literal('dblclick'),
  selector: z.string(),
  button: z.enum(['left', 'right', 'middle']).optional(),
  delay: z.number().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  modifiers: z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift'])).optional(),
  force: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const typeSchema = baseCommandSchema.extend({
  action: z.literal('type'),
  selector: z.string(),
  text: z.string(),
  delay: z.number().optional(),
  noWaitAfter: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const fillSchema = baseCommandSchema.extend({
  action: z.literal('fill'),
  selector: z.string(),
  value: z.string(),
  force: z.boolean().optional(),
  noWaitAfter: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const clearSchema = baseCommandSchema.extend({
  action: z.literal('clear'),
  selector: z.string(),
  force: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const checkSchema = baseCommandSchema.extend({
  action: z.literal('check'),
  selector: z.string(),
  force: z.boolean().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  timeout: z.number().positive().optional(),
});

const uncheckSchema = baseCommandSchema.extend({
  action: z.literal('uncheck'),
  selector: z.string(),
  force: z.boolean().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  timeout: z.number().positive().optional(),
});

const selectSchema = baseCommandSchema.extend({
  action: z.literal('select'),
  selector: z.string(),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  label: z.union([z.string(), z.array(z.string())]).optional(),
  index: z.union([z.number(), z.array(z.number())]).optional(),
  force: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const hoverSchema = baseCommandSchema.extend({
  action: z.literal('hover'),
  selector: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  modifiers: z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift'])).optional(),
  force: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const focusSchema = baseCommandSchema.extend({
  action: z.literal('focus'),
  selector: z.string(),
  timeout: z.number().positive().optional(),
});

const pressSchema = baseCommandSchema.extend({
  action: z.literal('press'),
  selector: z.string().optional(),
  key: z.string(),
  delay: z.number().optional(),
  noWaitAfter: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const scrollSchema = baseCommandSchema.extend({
  action: z.literal('scroll'),
  selector: z.string().optional(),
  direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  amount: z.number().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  behavior: z.enum(['auto', 'smooth', 'instant']).optional(),
});

const dragSchema = baseCommandSchema.extend({
  action: z.literal('drag'),
  source: z.string(),
  target: z.string(),
  force: z.boolean().optional(),
  noWaitAfter: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const uploadSchema = baseCommandSchema.extend({
  action: z.literal('upload'),
  selector: z.string(),
  files: z.union([z.string(), z.array(z.string())]),
  noWaitAfter: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

// ============================================================================
// Information Commands
// ============================================================================

const snapshotSchema = baseCommandSchema.extend({
  action: z.literal('snapshot'),
  selector: z.string().optional(),
  interactive: z.boolean().optional(),
  depth: z.number().positive().optional(),
  includeHidden: z.boolean().optional(),
  compact: z.boolean().optional(),
});

const screenshotSchema = baseCommandSchema.extend({
  action: z.literal('screenshot'),
  selector: z.string().optional(),
  path: z.string().optional(),
  fullPage: z.boolean().optional(),
  quality: z.number().min(0).max(100).optional(),
  type: z.enum(['png', 'jpeg']).optional(),
  omitBackground: z.boolean().optional(),
  timeout: z.number().positive().optional(),
});

const getTextSchema = baseCommandSchema.extend({
  action: z.literal('getText'),
  selector: z.string(),
  timeout: z.number().positive().optional(),
});

const getHtmlSchema = baseCommandSchema.extend({
  action: z.literal('getHtml'),
  selector: z.string().optional(),
  outer: z.boolean().optional(),
});

const getAttributeSchema = baseCommandSchema.extend({
  action: z.literal('getAttribute'),
  selector: z.string(),
  name: z.string(),
  timeout: z.number().positive().optional(),
});

const getValueSchema = baseCommandSchema.extend({
  action: z.literal('getValue'),
  selector: z.string(),
  timeout: z.number().positive().optional(),
});

const getBoundingBoxSchema = baseCommandSchema.extend({
  action: z.literal('getBoundingBox'),
  selector: z.string(),
  timeout: z.number().positive().optional(),
});

const getTitleSchema = baseCommandSchema.extend({
  action: z.literal('getTitle'),
});

const getUrlSchema = baseCommandSchema.extend({
  action: z.literal('getUrl'),
});

const getCountSchema = baseCommandSchema.extend({
  action: z.literal('getCount'),
  selector: z.string(),
});

// ============================================================================
// State Check Commands
// ============================================================================

const isVisibleSchema = baseCommandSchema.extend({
  action: z.literal('isVisible'),
  selector: z.string(),
});

const isEnabledSchema = baseCommandSchema.extend({
  action: z.literal('isEnabled'),
  selector: z.string(),
});

const isCheckedSchema = baseCommandSchema.extend({
  action: z.literal('isChecked'),
  selector: z.string(),
});

const isEditableSchema = baseCommandSchema.extend({
  action: z.literal('isEditable'),
  selector: z.string(),
});

const isHiddenSchema = baseCommandSchema.extend({
  action: z.literal('isHidden'),
  selector: z.string(),
});

// ============================================================================
// Wait Commands
// ============================================================================

const waitSchema = baseCommandSchema.extend({
  action: z.literal('wait'),
  timeout: z.number().positive(),
});

const waitForSelectorSchema = baseCommandSchema.extend({
  action: z.literal('waitForSelector'),
  selector: z.string(),
  state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional(),
  timeout: z.number().positive().optional(),
});

const waitForNavigationSchema = baseCommandSchema.extend({
  action: z.literal('waitForNavigation'),
  url: z.union([z.string(), z.instanceof(RegExp)]).optional(),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  timeout: z.number().positive().optional(),
});

const waitForLoadStateSchema = baseCommandSchema.extend({
  action: z.literal('waitForLoadState'),
  state: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  timeout: z.number().positive().optional(),
});

const waitForUrlSchema = baseCommandSchema.extend({
  action: z.literal('waitForUrl'),
  url: z.union([z.string(), z.instanceof(RegExp)]),
  timeout: z.number().positive().optional(),
});

const waitForTextSchema = baseCommandSchema.extend({
  action: z.literal('waitForText'),
  text: z.string(),
  selector: z.string().optional(),
  timeout: z.number().positive().optional(),
});

const waitForFunctionSchema = baseCommandSchema.extend({
  action: z.literal('waitForFunction'),
  expression: z.string(),
  timeout: z.number().positive().optional(),
  polling: z.union([z.literal('raf'), z.number()]).optional(),
});

// ============================================================================
// Debug Commands (Tier 1)
// ============================================================================

const pauseSchema = baseCommandSchema.extend({
  action: z.literal('pause'),
});

const highlightSchema = baseCommandSchema.extend({
  action: z.literal('highlight'),
  selector: z.string(),
});

// ============================================================================
// Console/Error Commands (Tier 1)
// ============================================================================

const getConsoleSchema = baseCommandSchema.extend({
  action: z.literal('getConsole'),
  clear: z.boolean().optional(),
  type: z.enum(['log', 'warning', 'error', 'info', 'debug', 'all']).optional().default('all'),
});

const getErrorsSchema = baseCommandSchema.extend({
  action: z.literal('getErrors'),
  clear: z.boolean().optional(),
});

// ============================================================================
// State Management Commands (Tier 1)
// ============================================================================

const saveStateSchema = baseCommandSchema.extend({
  action: z.literal('saveState'),
  path: z.string(),
});

const loadStateSchema = baseCommandSchema.extend({
  action: z.literal('loadState'),
  path: z.string(),
});

// ============================================================================
// Semantic Locator Commands (Tier 1)
// ============================================================================

const findByRoleSchema = baseCommandSchema.extend({
  action: z.literal('findByRole'),
  role: z.string(),
  name: z.string().optional(),
  exact: z.boolean().optional(),
  includeHidden: z.boolean().optional(),
});

const findByTextSchema = baseCommandSchema.extend({
  action: z.literal('findByText'),
  text: z.string(),
  exact: z.boolean().optional(),
});

const findByLabelSchema = baseCommandSchema.extend({
  action: z.literal('findByLabel'),
  label: z.string(),
  exact: z.boolean().optional(),
});

const findByPlaceholderSchema = baseCommandSchema.extend({
  action: z.literal('findByPlaceholder'),
  placeholder: z.string(),
  exact: z.boolean().optional(),
});

const findByAltSchema = baseCommandSchema.extend({
  action: z.literal('findByAlt'),
  alt: z.string(),
  exact: z.boolean().optional(),
});

const findByTitleSchema = baseCommandSchema.extend({
  action: z.literal('findByTitle'),
  title: z.string(),
  exact: z.boolean().optional(),
});

const findByTestIdSchema = baseCommandSchema.extend({
  action: z.literal('findByTestId'),
  testId: z.string(),
});

// ============================================================================
// Session Storage Commands (Tier 1)
// ============================================================================

const getSessionStorageSchema = baseCommandSchema.extend({
  action: z.literal('getSessionStorage'),
  key: z.string().optional(),
});

const setSessionStorageSchema = baseCommandSchema.extend({
  action: z.literal('setSessionStorage'),
  key: z.string(),
  value: z.string(),
});

const clearSessionStorageSchema = baseCommandSchema.extend({
  action: z.literal('clearSessionStorage'),
});

// ============================================================================
// Frame Commands
// ============================================================================

const switchToFrameSchema = baseCommandSchema.extend({
  action: z.literal('switchToFrame'),
  selector: z.string().optional(),
  name: z.string().optional(),
  url: z.string().optional(),
});

const switchToMainFrameSchema = baseCommandSchema.extend({
  action: z.literal('switchToMainFrame'),
});

const getFramesSchema = baseCommandSchema.extend({
  action: z.literal('getFrames'),
});

// ============================================================================
// Page/Tab Management Commands
// ============================================================================

const newPageSchema = baseCommandSchema.extend({
  action: z.literal('newPage'),
  url: z.string().url().optional(),
});

const switchPageSchema = baseCommandSchema.extend({
  action: z.literal('switchPage'),
  index: z.number().optional(),
  url: z.string().optional(),
  title: z.string().optional(),
});

const closePageSchema = baseCommandSchema.extend({
  action: z.literal('closePage'),
  index: z.number().optional(),
});

const getPagesSchema = baseCommandSchema.extend({
  action: z.literal('getPages'),
});

// ============================================================================
// JavaScript Execution Commands
// ============================================================================

const evaluateSchema = baseCommandSchema.extend({
  action: z.literal('evaluate'),
  script: z.string(),
  args: z.array(z.unknown()).optional(),
});

const evaluateHandleSchema = baseCommandSchema.extend({
  action: z.literal('evaluateHandle'),
  script: z.string(),
  args: z.array(z.unknown()).optional(),
});

// ============================================================================
// Network Commands
// ============================================================================

const setExtraHeadersSchema = baseCommandSchema.extend({
  action: z.literal('setExtraHeaders'),
  headers: z.record(z.string()),
});

const setOfflineSchema = baseCommandSchema.extend({
  action: z.literal('setOffline'),
  offline: z.boolean(),
});

const routeSchema = baseCommandSchema.extend({
  action: z.literal('route'),
  url: z.string(),
  handler: z.enum(['abort', 'continue', 'fulfill']),
  response: z.object({
    status: z.number().optional(),
    headers: z.record(z.string()).optional(),
    body: z.string().optional(),
  }).optional(),
});

const unrouteSchema = baseCommandSchema.extend({
  action: z.literal('unroute'),
  url: z.string().optional(),
});

// ============================================================================
// Cookie/Storage Commands
// ============================================================================

const getCookiesSchema = baseCommandSchema.extend({
  action: z.literal('getCookies'),
  urls: z.array(z.string()).optional(),
});

const setCookiesSchema = baseCommandSchema.extend({
  action: z.literal('setCookies'),
  cookies: z.array(z.object({
    name: z.string(),
    value: z.string(),
    url: z.string().optional(),
    domain: z.string().optional(),
    path: z.string().optional(),
    expires: z.number().optional(),
    httpOnly: z.boolean().optional(),
    secure: z.boolean().optional(),
    sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
  })),
});

const clearCookiesSchema = baseCommandSchema.extend({
  action: z.literal('clearCookies'),
});

const getLocalStorageSchema = baseCommandSchema.extend({
  action: z.literal('getLocalStorage'),
  key: z.string().optional(),
});

const setLocalStorageSchema = baseCommandSchema.extend({
  action: z.literal('setLocalStorage'),
  key: z.string(),
  value: z.string(),
});

const clearLocalStorageSchema = baseCommandSchema.extend({
  action: z.literal('clearLocalStorage'),
});

// ============================================================================
// Dialog Commands
// ============================================================================

const handleDialogSchema = baseCommandSchema.extend({
  action: z.literal('handleDialog'),
  accept: z.boolean(),
  promptText: z.string().optional(),
});

// ============================================================================
// Viewport Commands
// ============================================================================

const setViewportSchema = baseCommandSchema.extend({
  action: z.literal('setViewport'),
  viewport: ViewportSchema,
});

const emulateDeviceSchema = baseCommandSchema.extend({
  action: z.literal('emulateDevice'),
  device: z.string(),
});

const setGeolocationSchema = baseCommandSchema.extend({
  action: z.literal('setGeolocation'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
});

// ============================================================================
// Recording Commands
// ============================================================================

const startRecordingSchema = baseCommandSchema.extend({
  action: z.literal('startRecording'),
  path: z.string(),
});

const stopRecordingSchema = baseCommandSchema.extend({
  action: z.literal('stopRecording'),
});

const pdfSchema = baseCommandSchema.extend({
  action: z.literal('pdf'),
  path: z.string().optional(),
  format: z.enum(['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6']).optional(),
  landscape: z.boolean().optional(),
  printBackground: z.boolean().optional(),
  scale: z.number().min(0.1).max(2).optional(),
  margin: z.object({
    top: z.string().optional(),
    right: z.string().optional(),
    bottom: z.string().optional(),
    left: z.string().optional(),
  }).optional(),
});

// ============================================================================
// Streaming Commands
// ============================================================================

const startStreamSchema = baseCommandSchema.extend({
  action: z.literal('startStream'),
  port: z.number().positive().optional(),
  quality: z.number().min(0).max(100).optional(),
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
  everyNthFrame: z.number().positive().optional(),
});

const stopStreamSchema = baseCommandSchema.extend({
  action: z.literal('stopStream'),
});

// ============================================================================
// Agent Commands
// ============================================================================

const agentRunSchema = baseCommandSchema.extend({
  action: z.literal('agentRun'),
  task: z.string(),
  maxSteps: z.number().positive().optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
});

const agentStepSchema = baseCommandSchema.extend({
  action: z.literal('agentStep'),
  state: z.unknown(),
});

// ============================================================================
// Tier 2: HAR/Trace Recording
// ============================================================================

const startHarSchema = baseCommandSchema.extend({
  action: z.literal('startHar'),
  path: z.string(),
});

const stopHarSchema = baseCommandSchema.extend({
  action: z.literal('stopHar'),
});

const startTraceSchema = baseCommandSchema.extend({
  action: z.literal('startTrace'),
  path: z.string().optional(),
  screenshots: z.boolean().optional().default(true),
  snapshots: z.boolean().optional().default(true),
  sources: z.boolean().optional().default(false),
});

const stopTraceSchema = baseCommandSchema.extend({
  action: z.literal('stopTrace'),
  path: z.string().optional(),
});

// ============================================================================
// Tier 2: Clipboard Operations
// ============================================================================

const clipboardCopySchema = baseCommandSchema.extend({
  action: z.literal('clipboardCopy'),
  selector: z.string().optional(),
});

const clipboardPasteSchema = baseCommandSchema.extend({
  action: z.literal('clipboardPaste'),
  selector: z.string().optional(),
});

const clipboardReadSchema = baseCommandSchema.extend({
  action: z.literal('clipboardRead'),
});

const selectAllSchema = baseCommandSchema.extend({
  action: z.literal('selectAll'),
  selector: z.string().optional(),
});

// ============================================================================
// Tier 2: Emulation Options
// ============================================================================

const setTimezoneSchema = baseCommandSchema.extend({
  action: z.literal('setTimezone'),
  timezoneId: z.string(),
});

const setLocaleSchema = baseCommandSchema.extend({
  action: z.literal('setLocale'),
  locale: z.string(),
});

const setPermissionsSchema = baseCommandSchema.extend({
  action: z.literal('setPermissions'),
  origin: z.string(),
  permissions: z.array(z.string()),
});

const emulateMediaSchema = baseCommandSchema.extend({
  action: z.literal('emulateMedia'),
  media: z.enum(['screen', 'print', 'null']).optional(),
  colorScheme: z.enum(['light', 'dark', 'no-preference', 'null']).optional(),
  reducedMotion: z.enum(['reduce', 'no-preference', 'null']).optional(),
  forcedColors: z.enum(['active', 'none', 'null']).optional(),
});

// ============================================================================
// Tier 2: Vision/Screenshot Analysis
// ============================================================================

const analyzeScreenshotSchema = baseCommandSchema.extend({
  action: z.literal('analyzeScreenshot'),
  prompt: z.string().optional(),
  selector: z.string().optional(),
  fullPage: z.boolean().optional(),
});

// ============================================================================
// Tier 2: Element Highlighting Demo Mode
// ============================================================================

const highlightElementsSchema = baseCommandSchema.extend({
  action: z.literal('highlightElements'),
  selectors: z.array(z.string()).optional(),
  interactive: z.boolean().optional().default(true),
  showLabels: z.boolean().optional().default(true),
  duration: z.number().optional(),
});

const clearHighlightsSchema = baseCommandSchema.extend({
  action: z.literal('clearHighlights'),
});

// ============================================================================
// Tier 2: GIF Generation
// ============================================================================

const startGifRecordingSchema = baseCommandSchema.extend({
  action: z.literal('startGifRecording'),
  maxFrames: z.number().optional().default(100),
  frameDelay: z.number().optional().default(100),
});

const stopGifRecordingSchema = baseCommandSchema.extend({
  action: z.literal('stopGifRecording'),
  path: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const captureGifFrameSchema = baseCommandSchema.extend({
  action: z.literal('captureGifFrame'),
  label: z.string().optional(),
});

// ============================================================================
// Tier 2: Sensitive Data Handling
// ============================================================================

const setSensitiveDataSchema = baseCommandSchema.extend({
  action: z.literal('setSensitiveData'),
  data: z.record(z.record(z.string())),
});

// ============================================================================
// Tier 3: Scroll Into View
// ============================================================================

const scrollIntoViewSchema = baseCommandSchema.extend({
  action: z.literal('scrollIntoView'),
  selector: z.string(),
  block: z.enum(['start', 'center', 'end', 'nearest']).optional(),
  inline: z.enum(['start', 'center', 'end', 'nearest']).optional(),
});

// ============================================================================
// Tier 3: Network Request Viewing
// ============================================================================

const getRequestsSchema = baseCommandSchema.extend({
  action: z.literal('getRequests'),
  urlPattern: z.string().optional(),
  clear: z.boolean().optional(),
});

// ============================================================================
// Tier 3: New Window Management
// ============================================================================

const newWindowSchema = baseCommandSchema.extend({
  action: z.literal('newWindow'),
  url: z.string().url().optional(),
});

const bringToFrontSchema = baseCommandSchema.extend({
  action: z.literal('bringToFront'),
});

// ============================================================================
// Combined Command Schema (Discriminated Union)
// ============================================================================

export const commandSchema = z.discriminatedUnion('action', [
  // Lifecycle
  launchSchema,
  closeSchema,
  // Navigation
  navigateSchema,
  goBackSchema,
  goForwardSchema,
  reloadSchema,
  // Interaction
  clickSchema,
  doubleClickSchema,
  typeSchema,
  fillSchema,
  clearSchema,
  checkSchema,
  uncheckSchema,
  selectSchema,
  hoverSchema,
  focusSchema,
  pressSchema,
  scrollSchema,
  dragSchema,
  uploadSchema,
  // Information
  snapshotSchema,
  screenshotSchema,
  getTextSchema,
  getHtmlSchema,
  getAttributeSchema,
  getValueSchema,
  getBoundingBoxSchema,
  getTitleSchema,
  getUrlSchema,
  getCountSchema,
  // State checks
  isVisibleSchema,
  isEnabledSchema,
  isCheckedSchema,
  isEditableSchema,
  isHiddenSchema,
  // Wait
  waitSchema,
  waitForSelectorSchema,
  waitForNavigationSchema,
  waitForLoadStateSchema,
  waitForUrlSchema,
  waitForTextSchema,
  waitForFunctionSchema,
  // Frames
  switchToFrameSchema,
  switchToMainFrameSchema,
  getFramesSchema,
  // Pages
  newPageSchema,
  switchPageSchema,
  closePageSchema,
  getPagesSchema,
  // JavaScript
  evaluateSchema,
  evaluateHandleSchema,
  // Network
  setExtraHeadersSchema,
  setOfflineSchema,
  routeSchema,
  unrouteSchema,
  getRequestsSchema,
  // Cookies/Storage
  getCookiesSchema,
  setCookiesSchema,
  clearCookiesSchema,
  getLocalStorageSchema,
  setLocalStorageSchema,
  clearLocalStorageSchema,
  getSessionStorageSchema,
  setSessionStorageSchema,
  clearSessionStorageSchema,
  // Dialog
  handleDialogSchema,
  // Viewport
  setViewportSchema,
  emulateDeviceSchema,
  setGeolocationSchema,
  // Recording
  startRecordingSchema,
  stopRecordingSchema,
  pdfSchema,
  // Streaming
  startStreamSchema,
  stopStreamSchema,
  // Agent
  agentRunSchema,
  agentStepSchema,
  // Tier 1: Debug Commands
  pauseSchema,
  highlightSchema,
  // Tier 1: Console/Error Commands
  getConsoleSchema,
  getErrorsSchema,
  // Tier 1: State Management
  saveStateSchema,
  loadStateSchema,
  // Tier 1: Semantic Locators
  findByRoleSchema,
  findByTextSchema,
  findByLabelSchema,
  findByPlaceholderSchema,
  findByAltSchema,
  findByTitleSchema,
  findByTestIdSchema,
  // Tier 2: HAR/Trace Recording
  startHarSchema,
  stopHarSchema,
  startTraceSchema,
  stopTraceSchema,
  // Tier 2: Clipboard Operations
  clipboardCopySchema,
  clipboardPasteSchema,
  clipboardReadSchema,
  selectAllSchema,
  // Tier 2: Emulation Options
  setTimezoneSchema,
  setLocaleSchema,
  setPermissionsSchema,
  emulateMediaSchema,
  // Tier 2: Vision/Screenshot Analysis
  analyzeScreenshotSchema,
  // Tier 2: Element Highlighting Demo Mode
  highlightElementsSchema,
  clearHighlightsSchema,
  // Tier 2: GIF Generation
  startGifRecordingSchema,
  stopGifRecordingSchema,
  captureGifFrameSchema,
  // Tier 2: Sensitive Data Handling
  setSensitiveDataSchema,
  // Tier 3: Scroll Into View
  scrollIntoViewSchema,
  // Tier 3: New Window Management
  newWindowSchema,
  bringToFrontSchema,
]);

export type Command = z.infer<typeof commandSchema>;

// ============================================================================
// Parse Result Types
// ============================================================================

export type ParseResult =
  | { success: true; command: Command }
  | { success: false; error: string; id?: string };

/**
 * Parse a JSON string into a validated command
 */
export function parseCommand(input: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch {
    return { success: false, error: 'Invalid JSON' };
  }

  const id = typeof json === 'object' && json !== null && 'id' in json
    ? String((json as { id: unknown }).id)
    : undefined;

  const result = commandSchema.safeParse(json);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    return { success: false, error: `Validation error: ${errors}`, id };
  }

  return { success: true, command: result.data };
}

/**
 * Serialize a command for transmission
 */
export function serializeCommand(command: Command): string {
  return JSON.stringify(command);
}

// ============================================================================
// Response Types
// ============================================================================

export interface Response {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export function successResponse(id: string, result?: unknown): Response {
  return { id, success: true, result };
}

export function errorResponse(id: string, error: string): Response {
  return { id, success: false, error };
}

export function serializeResponse(response: Response): string {
  return JSON.stringify(response);
}
