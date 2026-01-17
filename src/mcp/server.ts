/**
 * MCP Server - Model Context Protocol integration for Claude Code + Roo Code
 * Implements MCP tools, resources, and prompts for browser automation
 */

import { z } from 'zod';
import type { Page } from 'playwright-core';
import { BrowserManager } from '../browser/manager.js';
import { ActionExecutor } from '../actions/executor.js';
import { getEnhancedSnapshot } from '../dom/snapshot.js';
import type {
  MCPTool,
  MCPResource,
  MCPPrompt,
  RefMap,
  Viewport,
} from '../core/types.js';

// ============================================================================
// MCP Tool Definitions
// ============================================================================

const navigateTool: MCPTool = {
  name: 'browser_navigate',
  description: 'Navigate to a URL in the browser',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to navigate to'),
    waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional()
      .describe('When to consider navigation complete'),
  }),
};

const clickTool: MCPTool = {
  name: 'browser_click',
  description: 'Click an element by ref (e.g., @e1), selector, or coordinates',
  inputSchema: z.object({
    target: z.string().describe('Element ref (@e1), CSS selector, or coordinates (x,y)'),
    button: z.enum(['left', 'right', 'middle']).optional().describe('Mouse button'),
  }),
};

const typeTool: MCPTool = {
  name: 'browser_type',
  description: 'Type text into an input element',
  inputSchema: z.object({
    target: z.string().describe('Element ref (@e1) or CSS selector'),
    text: z.string().describe('Text to type'),
    delay: z.number().optional().describe('Delay between keystrokes in ms'),
  }),
};

const fillTool: MCPTool = {
  name: 'browser_fill',
  description: 'Fill an input element with text (clears first)',
  inputSchema: z.object({
    target: z.string().describe('Element ref (@e1) or CSS selector'),
    value: z.string().describe('Value to fill'),
  }),
};

const scrollTool: MCPTool = {
  name: 'browser_scroll',
  description: 'Scroll the page or an element',
  inputSchema: z.object({
    target: z.string().optional().describe('Element ref or selector (omit for page scroll)'),
    direction: z.enum(['up', 'down', 'left', 'right']).optional(),
    amount: z.number().optional().describe('Scroll amount in pixels'),
  }),
};

const snapshotTool: MCPTool = {
  name: 'browser_snapshot',
  description: 'Get the accessibility tree of the page with element refs',
  inputSchema: z.object({
    interactive: z.boolean().optional().default(true)
      .describe('Only include interactive elements'),
    selector: z.string().optional().describe('Scope to a specific element'),
    depth: z.number().optional().describe('Maximum tree depth'),
    compact: z.boolean().optional().describe('Compact single-line output format'),
  }),
};

const screenshotTool: MCPTool = {
  name: 'browser_screenshot',
  description: 'Take a screenshot of the page or element',
  inputSchema: z.object({
    selector: z.string().optional().describe('Element to screenshot'),
    fullPage: z.boolean().optional().describe('Capture full page'),
    type: z.enum(['png', 'jpeg']).optional().describe('Image format'),
  }),
};

const stateTool: MCPTool = {
  name: 'browser_state',
  description: 'Get current browser state (URL, title, viewport)',
  inputSchema: z.object({}),
};

const backTool: MCPTool = {
  name: 'browser_back',
  description: 'Go back in browser history',
  inputSchema: z.object({}),
};

const forwardTool: MCPTool = {
  name: 'browser_forward',
  description: 'Go forward in browser history',
  inputSchema: z.object({}),
};

const reloadTool: MCPTool = {
  name: 'browser_reload',
  description: 'Reload the current page',
  inputSchema: z.object({}),
};

const waitTool: MCPTool = {
  name: 'browser_wait',
  description: 'Wait for a selector to appear or a timeout',
  inputSchema: z.object({
    selector: z.string().optional().describe('Wait for this selector'),
    timeout: z.number().optional().describe('Maximum wait time in ms'),
    state: z.enum(['attached', 'detached', 'visible', 'hidden']).optional(),
  }),
};

const executeTool: MCPTool = {
  name: 'browser_execute',
  description: 'Execute JavaScript in the page context',
  inputSchema: z.object({
    script: z.string().describe('JavaScript to execute'),
  }),
};

const selectTool: MCPTool = {
  name: 'browser_select',
  description: 'Select an option from a dropdown',
  inputSchema: z.object({
    target: z.string().describe('Element ref or selector'),
    value: z.string().optional().describe('Option value'),
    label: z.string().optional().describe('Option label'),
    index: z.number().optional().describe('Option index'),
  }),
};

const checkTool: MCPTool = {
  name: 'browser_check',
  description: 'Check a checkbox or radio button',
  inputSchema: z.object({
    target: z.string().describe('Element ref or selector'),
  }),
};

const uncheckTool: MCPTool = {
  name: 'browser_uncheck',
  description: 'Uncheck a checkbox',
  inputSchema: z.object({
    target: z.string().describe('Element ref or selector'),
  }),
};

const hoverTool: MCPTool = {
  name: 'browser_hover',
  description: 'Hover over an element',
  inputSchema: z.object({
    target: z.string().describe('Element ref or selector'),
  }),
};

const pressTool: MCPTool = {
  name: 'browser_press',
  description: 'Press a keyboard key',
  inputSchema: z.object({
    key: z.string().describe('Key to press (e.g., Enter, Escape, Tab)'),
    target: z.string().optional().describe('Element to focus first'),
  }),
};

const cookiesTool: MCPTool = {
  name: 'browser_cookies',
  description: 'Get or set cookies',
  inputSchema: z.object({
    action: z.enum(['get', 'set', 'clear']).describe('Cookie action'),
    cookies: z.array(z.object({
      name: z.string(),
      value: z.string(),
      domain: z.string().optional(),
      path: z.string().optional(),
    })).optional().describe('Cookies to set'),
  }),
};

const networkTool: MCPTool = {
  name: 'browser_network',
  description: 'Intercept or mock network requests',
  inputSchema: z.object({
    url: z.string().describe('URL pattern to intercept'),
    handler: z.enum(['abort', 'continue', 'fulfill']).describe('How to handle'),
    response: z.object({
      status: z.number().optional(),
      body: z.string().optional(),
      headers: z.record(z.string()).optional(),
    }).optional().describe('Mock response (for fulfill)'),
  }),
};

const agentRunTool: MCPTool = {
  name: 'agent_run',
  description: 'Run an autonomous browser agent to complete a task',
  inputSchema: z.object({
    task: z.string().describe('Natural language description of the task'),
    maxSteps: z.number().optional().default(20).describe('Maximum steps before stopping'),
    model: z.string().optional().describe('LLM model to use'),
  }),
};

const agentStepTool: MCPTool = {
  name: 'agent_step',
  description: 'Execute a single agent step and return the result',
  inputSchema: z.object({
    thought: z.string().optional().describe('Current thinking/plan'),
    action: z.object({
      type: z.enum(['click', 'type', 'fill', 'navigate', 'scroll', 'screenshot', 'snapshot', 'wait', 'extract', 'done']),
      target: z.string().optional(),
      value: z.string().optional(),
    }).describe('Action to execute'),
  }),
};

// ============================================================================
// Tier 1: Debug Tools
// ============================================================================

const pauseTool: MCPTool = {
  name: 'browser_pause',
  description: 'Pause execution for debugging (opens Playwright Inspector)',
  inputSchema: z.object({}),
};

const highlightTool: MCPTool = {
  name: 'browser_highlight',
  description: 'Highlight an element on the page for visual debugging',
  inputSchema: z.object({
    target: z.string().describe('Element ref or selector to highlight'),
  }),
};

// ============================================================================
// Tier 1: Console/Error Tools
// ============================================================================

const consoleTool: MCPTool = {
  name: 'browser_console',
  description: 'Get console messages from the page',
  inputSchema: z.object({
    type: z.enum(['log', 'warning', 'error', 'info', 'debug', 'all']).optional()
      .describe('Filter by message type'),
    clear: z.boolean().optional().describe('Clear messages after reading'),
  }),
};

const errorsTool: MCPTool = {
  name: 'browser_errors',
  description: 'Get page errors (uncaught exceptions)',
  inputSchema: z.object({
    clear: z.boolean().optional().describe('Clear errors after reading'),
  }),
};

// ============================================================================
// Tier 1: State Management Tools
// ============================================================================

const saveStateTool: MCPTool = {
  name: 'browser_save_state',
  description: 'Save authentication/session state to a file for later use',
  inputSchema: z.object({
    path: z.string().describe('Path to save the state file'),
  }),
};

const loadStateTool: MCPTool = {
  name: 'browser_load_state',
  description: 'Load authentication/session state from a file',
  inputSchema: z.object({
    path: z.string().describe('Path to the state file'),
  }),
};

// ============================================================================
// Tier 1: Semantic Locator Tools
// ============================================================================

const findByRoleTool: MCPTool = {
  name: 'browser_find_by_role',
  description: 'Find elements by ARIA role',
  inputSchema: z.object({
    role: z.string().describe('ARIA role (button, link, textbox, etc.)'),
    name: z.string().optional().describe('Accessible name'),
    exact: z.boolean().optional().describe('Exact name match'),
  }),
};

const findByTextTool: MCPTool = {
  name: 'browser_find_by_text',
  description: 'Find elements by text content',
  inputSchema: z.object({
    text: z.string().describe('Text to find'),
    exact: z.boolean().optional().describe('Exact text match'),
  }),
};

const findByLabelTool: MCPTool = {
  name: 'browser_find_by_label',
  description: 'Find form elements by their label',
  inputSchema: z.object({
    label: z.string().describe('Label text'),
    exact: z.boolean().optional().describe('Exact label match'),
  }),
};

// ============================================================================
// Tier 1: Session Storage Tools
// ============================================================================

const sessionStorageTool: MCPTool = {
  name: 'browser_session_storage',
  description: 'Get or set sessionStorage values',
  inputSchema: z.object({
    action: z.enum(['get', 'set', 'clear']).describe('Action to perform'),
    key: z.string().optional().describe('Storage key'),
    value: z.string().optional().describe('Value to set'),
  }),
};

// ============================================================================
// Tier 2: Element Highlighting Demo Mode
// ============================================================================

const highlightElementsTool: MCPTool = {
  name: 'browser_highlight_elements',
  description: 'Highlight all interactive elements with colored overlays (demo mode)',
  inputSchema: z.object({
    showLabels: z.boolean().optional().default(true)
      .describe('Show element labels'),
    duration: z.number().optional().describe('Duration in ms before highlights fade'),
  }),
};

// ============================================================================
// Tier 2: GIF Recording Tools
// ============================================================================

const startGifTool: MCPTool = {
  name: 'browser_start_gif',
  description: 'Start recording frames for GIF generation',
  inputSchema: z.object({
    maxFrames: z.number().optional().default(100).describe('Max frames to capture'),
  }),
};

const captureFrameTool: MCPTool = {
  name: 'browser_capture_frame',
  description: 'Capture a frame for the GIF (call after each action)',
  inputSchema: z.object({
    label: z.string().optional().describe('Label for this frame'),
  }),
};

const stopGifTool: MCPTool = {
  name: 'browser_stop_gif',
  description: 'Stop GIF recording and save frames',
  inputSchema: z.object({
    path: z.string().describe('Output path for the GIF'),
  }),
};

// ============================================================================
// Tier 2: Trace/HAR Recording Tools
// ============================================================================

const startTraceTool: MCPTool = {
  name: 'browser_start_trace',
  description: 'Start recording a trace for debugging',
  inputSchema: z.object({
    screenshots: z.boolean().optional().default(true).describe('Include screenshots'),
    snapshots: z.boolean().optional().default(true).describe('Include DOM snapshots'),
  }),
};

const stopTraceTool: MCPTool = {
  name: 'browser_stop_trace',
  description: 'Stop trace recording and save to file',
  inputSchema: z.object({
    path: z.string().describe('Output path for the trace'),
  }),
};

// ============================================================================
// Tier 2: Network Request Viewing
// ============================================================================

const getRequestsTool: MCPTool = {
  name: 'browser_get_requests',
  description: 'Get recorded network requests',
  inputSchema: z.object({
    urlPattern: z.string().optional().describe('Filter by URL pattern (regex)'),
    clear: z.boolean().optional().describe('Clear requests after reading'),
  }),
};

// ============================================================================
// Tier 2: Emulation Tools
// ============================================================================

const emulateMediaTool: MCPTool = {
  name: 'browser_emulate_media',
  description: 'Emulate media features (color scheme, reduced motion, etc.)',
  inputSchema: z.object({
    colorScheme: z.enum(['light', 'dark', 'no-preference']).optional()
      .describe('Preferred color scheme'),
    reducedMotion: z.enum(['reduce', 'no-preference']).optional()
      .describe('Reduced motion preference'),
  }),
};

// ============================================================================
// Tier 3: Clipboard Tools
// ============================================================================

const clipboardTool: MCPTool = {
  name: 'browser_clipboard',
  description: 'Clipboard operations (copy, paste, read)',
  inputSchema: z.object({
    action: z.enum(['copy', 'paste', 'read', 'selectAll']).describe('Clipboard action'),
    target: z.string().optional().describe('Element to focus first'),
  }),
};

// ============================================================================
// Tier 2: Sensitive Data Handling
// ============================================================================

const setSensitiveDataTool: MCPTool = {
  name: 'browser_set_sensitive_data',
  description: 'Set sensitive data for placeholder replacement (passwords, API keys). Use <secret>key</secret> placeholders in fill commands.',
  inputSchema: z.object({
    data: z.record(z.record(z.string()))
      .describe('Domain-keyed secrets: { "example.com": { "password": "xxx", "apiKey": "yyy" } }'),
  }),
};

// ============================================================================
// Tier 2: Vision/Screenshot Analysis
// ============================================================================

const analyzeScreenshotTool: MCPTool = {
  name: 'browser_analyze_screenshot',
  description: 'Take a screenshot and return base64 data for vision/LLM analysis',
  inputSchema: z.object({
    selector: z.string().optional().describe('Element to screenshot (omit for full page)'),
    fullPage: z.boolean().optional().describe('Capture full scrollable page'),
    prompt: z.string().optional().describe('Analysis prompt to include with the screenshot'),
  }),
};

// ============================================================================
// All Tools
// ============================================================================

export const mcpTools: MCPTool[] = [
  // Core navigation
  navigateTool,
  backTool,
  forwardTool,
  reloadTool,
  // Interaction
  clickTool,
  typeTool,
  fillTool,
  scrollTool,
  selectTool,
  checkTool,
  uncheckTool,
  hoverTool,
  pressTool,
  // Information
  snapshotTool,
  screenshotTool,
  stateTool,
  waitTool,
  executeTool,
  // Storage
  cookiesTool,
  sessionStorageTool,
  // Network
  networkTool,
  getRequestsTool,
  // Agent
  agentRunTool,
  agentStepTool,
  // Tier 1: Debug
  pauseTool,
  highlightTool,
  // Tier 1: Console/Errors
  consoleTool,
  errorsTool,
  // Tier 1: State Management
  saveStateTool,
  loadStateTool,
  // Tier 1: Semantic Locators
  findByRoleTool,
  findByTextTool,
  findByLabelTool,
  // Tier 2: Element Highlighting
  highlightElementsTool,
  // Tier 2: GIF Recording
  startGifTool,
  captureFrameTool,
  stopGifTool,
  // Tier 2: Trace Recording
  startTraceTool,
  stopTraceTool,
  // Tier 2: Emulation
  emulateMediaTool,
  // Tier 3: Clipboard
  clipboardTool,
  // Tier 2: Additional
  setSensitiveDataTool,
  analyzeScreenshotTool,
];

// ============================================================================
// MCP Resources
// ============================================================================

export const mcpResources: MCPResource[] = [
  {
    uri: 'browser://state',
    name: 'Browser State',
    description: 'Current browser state including URL, title, and viewport',
    mimeType: 'application/json',
  },
  {
    uri: 'browser://history',
    name: 'Navigation History',
    description: 'Browser navigation history',
    mimeType: 'application/json',
  },
  {
    uri: 'browser://screenshot',
    name: 'Current Screenshot',
    description: 'Screenshot of the current page',
    mimeType: 'image/png',
  },
  {
    uri: 'browser://snapshot',
    name: 'DOM Snapshot',
    description: 'Accessibility tree snapshot with element refs',
    mimeType: 'text/plain',
  },
];

// ============================================================================
// MCP Prompts
// ============================================================================

export const mcpPrompts: MCPPrompt[] = [
  {
    name: 'browse',
    description: 'Start a browser session and navigate to a URL',
    arguments: [
      {
        name: 'url',
        description: 'URL to navigate to',
        required: true,
      },
    ],
  },
  {
    name: 'fill_form',
    description: 'Fill out a form on the page',
    arguments: [
      {
        name: 'fields',
        description: 'JSON object with field selectors and values',
        required: true,
      },
    ],
  },
  {
    name: 'extract_data',
    description: 'Extract structured data from the page',
    arguments: [
      {
        name: 'schema',
        description: 'JSON schema describing the data to extract',
        required: true,
      },
    ],
  },
];

// ============================================================================
// MCP Server Class
// ============================================================================

export class MCPServer {
  private browser: BrowserManager;
  private executor: ActionExecutor;
  private refMap: RefMap = {};

  constructor() {
    this.browser = new BrowserManager();
    this.executor = new ActionExecutor(this.browser);
  }

  /**
   * Get all available tools
   */
  getTools(): MCPTool[] {
    return mcpTools;
  }

  /**
   * Get all available resources
   */
  getResources(): MCPResource[] {
    return mcpResources;
  }

  /**
   * Get all available prompts
   */
  getPrompts(): MCPPrompt[] {
    return mcpPrompts;
  }

  /**
   * Execute a tool
   */
  async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // Ensure browser is launched
    if (!this.browser.isLaunched() && name !== 'browser_navigate') {
      await this.browser.launch({ headless: true });
    }

    switch (name) {
      case 'browser_navigate':
        if (!this.browser.isLaunched()) {
          await this.browser.launch({ headless: true });
        }
        await this.browser.getPage().goto(args.url as string, {
          waitUntil: (args.waitUntil as 'load' | 'domcontentloaded' | 'networkidle') ?? 'load',
        });
        return {
          url: this.browser.getPage().url(),
          title: await this.browser.getPage().title(),
        };

      case 'browser_click':
        await this.browser.getLocator(args.target as string).click({
          button: args.button as 'left' | 'right' | 'middle',
        });
        return { clicked: args.target };

      case 'browser_type':
        await this.browser.getLocator(args.target as string).pressSequentially(
          args.text as string,
          { delay: args.delay as number }
        );
        return { typed: args.text };

      case 'browser_fill':
        await this.browser.getLocator(args.target as string).fill(args.value as string);
        return { filled: args.value };

      case 'browser_scroll':
        if (args.target) {
          await this.browser.getLocator(args.target as string).scrollIntoViewIfNeeded();
        } else if (args.direction && args.amount) {
          const delta = args.amount as number;
          await this.browser.getPage().evaluate(
            ({ direction, delta }) => {
              switch (direction) {
                case 'up': window.scrollBy(0, -delta); break;
                case 'down': window.scrollBy(0, delta); break;
                case 'left': window.scrollBy(-delta, 0); break;
                case 'right': window.scrollBy(delta, 0); break;
              }
            },
            { direction: args.direction as string, delta }
          );
        }
        return { scrolled: true };

      case 'browser_snapshot':
        const snapshot = await getEnhancedSnapshot(this.browser.getPage(), {
          interactive: args.interactive as boolean ?? true,
          selector: args.selector as string,
          depth: args.depth as number,
        });
        this.refMap = snapshot.refs;
        this.browser.setRefMap(snapshot.refs);
        return {
          tree: snapshot.tree,
          refs: Object.keys(snapshot.refs),
          url: this.browser.getPage().url(),
          title: await this.browser.getPage().title(),
        };

      case 'browser_screenshot':
        const screenshotBuffer = args.selector
          ? await this.browser.getLocator(args.selector as string).screenshot({
              type: args.type as 'png' | 'jpeg',
            })
          : await this.browser.getPage().screenshot({
              fullPage: args.fullPage as boolean,
              type: args.type as 'png' | 'jpeg',
            });
        return { data: screenshotBuffer.toString('base64') };

      case 'browser_state':
        const page = this.browser.getPage();
        return {
          url: page.url(),
          title: await page.title(),
          viewport: page.viewportSize(),
        };

      case 'browser_back':
        await this.browser.getPage().goBack();
        return { url: this.browser.getPage().url() };

      case 'browser_forward':
        await this.browser.getPage().goForward();
        return { url: this.browser.getPage().url() };

      case 'browser_reload':
        await this.browser.getPage().reload();
        return { url: this.browser.getPage().url() };

      case 'browser_wait':
        if (args.selector) {
          await this.browser.getLocator(args.selector as string).waitFor({
            state: args.state as 'attached' | 'detached' | 'visible' | 'hidden',
            timeout: args.timeout as number,
          });
          return { found: args.selector };
        } else if (args.timeout) {
          await new Promise((resolve) => setTimeout(resolve, args.timeout as number));
          return { waited: args.timeout };
        }
        return { waited: true };

      case 'browser_execute':
        const result = await this.browser.getPage().evaluate(args.script as string);
        return { result };

      case 'browser_select':
        const selectLocator = this.browser.getLocator(args.target as string);
        if (args.value) {
          await selectLocator.selectOption(args.value as string);
        } else if (args.label) {
          await selectLocator.selectOption({ label: args.label as string });
        } else if (args.index !== undefined) {
          await selectLocator.selectOption({ index: args.index as number });
        }
        return { selected: args.target };

      case 'browser_check':
        await this.browser.getLocator(args.target as string).check();
        return { checked: args.target };

      case 'browser_uncheck':
        await this.browser.getLocator(args.target as string).uncheck();
        return { unchecked: args.target };

      case 'browser_hover':
        await this.browser.getLocator(args.target as string).hover();
        return { hovered: args.target };

      case 'browser_press':
        if (args.target) {
          await this.browser.getLocator(args.target as string).press(args.key as string);
        } else {
          await this.browser.getPage().keyboard.press(args.key as string);
        }
        return { pressed: args.key };

      case 'browser_cookies':
        switch (args.action) {
          case 'get':
            return { cookies: await this.browser.getPage().context().cookies() };
          case 'set':
            await this.browser.getPage().context().addCookies(args.cookies as any[]);
            return { set: true };
          case 'clear':
            await this.browser.getPage().context().clearCookies();
            return { cleared: true };
        }
        break;

      case 'browser_network':
        await this.browser.getPage().route(args.url as string, async (route) => {
          switch (args.handler) {
            case 'abort':
              await route.abort();
              break;
            case 'continue':
              await route.continue();
              break;
            case 'fulfill':
              const response = args.response as any;
              await route.fulfill({
                status: response?.status,
                body: response?.body,
                headers: response?.headers,
              });
              break;
          }
        });
        return { routed: args.url };

      case 'agent_run':
        // Agent execution would be handled by a separate Agent service
        return { info: 'Agent execution requires Agent service integration' };

      case 'agent_step':
        // Single step execution
        const action = args.action as { type: string; target?: string; value?: string };
        // Execute based on action type
        switch (action.type) {
          case 'click':
            if (action.target) await this.browser.getLocator(action.target).click();
            break;
          case 'type':
            if (action.target && action.value) {
              await this.browser.getLocator(action.target).pressSequentially(action.value);
            }
            break;
          case 'fill':
            if (action.target && action.value) {
              await this.browser.getLocator(action.target).fill(action.value);
            }
            break;
          case 'navigate':
            if (action.value) await this.browser.getPage().goto(action.value);
            break;
          case 'scroll':
            if (action.target) {
              await this.browser.getLocator(action.target).scrollIntoViewIfNeeded();
            }
            break;
          case 'wait':
            await new Promise((r) => setTimeout(r, 1000));
            break;
          case 'done':
            return { done: true, thought: args.thought };
        }
        return { executed: action.type, thought: args.thought };

      // ============ Tier 1: Debug ============
      case 'browser_pause':
        await this.browser.getPage().pause();
        return { paused: true };

      case 'browser_highlight':
        await this.browser.highlightElement(args.target as string);
        return { highlighted: args.target };

      // ============ Tier 1: Console/Errors ============
      case 'browser_console':
        return {
          messages: this.browser.getConsoleMessages({
            type: args.type as string,
            clear: args.clear as boolean,
          }),
        };

      case 'browser_errors':
        return {
          errors: this.browser.getPageErrors(args.clear as boolean),
        };

      // ============ Tier 1: State Management ============
      case 'browser_save_state':
        await this.browser.saveStorageState(args.path as string);
        return { saved: args.path };

      case 'browser_load_state':
        await this.browser.loadStorageState(args.path as string);
        return { loaded: args.path };

      // ============ Tier 1: Semantic Locators ============
      case 'browser_find_by_role':
        const roleLocator = this.browser.getPage().getByRole(
          args.role as Parameters<Page['getByRole']>[0],
          { name: args.name as string, exact: args.exact as boolean }
        );
        return { found: await roleLocator.count() };

      case 'browser_find_by_text':
        const textLocator = this.browser.getPage().getByText(
          args.text as string,
          { exact: args.exact as boolean }
        );
        return { found: await textLocator.count() };

      case 'browser_find_by_label':
        const labelLocator = this.browser.getPage().getByLabel(
          args.label as string,
          { exact: args.exact as boolean }
        );
        return { found: await labelLocator.count() };

      // ============ Tier 1: Session Storage ============
      case 'browser_session_storage':
        switch (args.action) {
          case 'get':
            if (args.key) {
              const value = await this.browser.getPage().evaluate(
                (key) => sessionStorage.getItem(key),
                args.key as string
              );
              return { value };
            } else {
              const storage = await this.browser.getPage().evaluate(() => {
                const items: Record<string, string> = {};
                for (let i = 0; i < sessionStorage.length; i++) {
                  const key = sessionStorage.key(i);
                  if (key) items[key] = sessionStorage.getItem(key) ?? '';
                }
                return items;
              });
              return { storage };
            }
          case 'set':
            await this.browser.getPage().evaluate(
              ({ key, value }) => sessionStorage.setItem(key, value),
              { key: args.key as string, value: args.value as string }
            );
            return { set: true };
          case 'clear':
            await this.browser.getPage().evaluate(() => sessionStorage.clear());
            return { cleared: true };
        }
        break;

      // ============ Tier 2: Element Highlighting ============
      case 'browser_highlight_elements':
        await this.browser.highlightInteractiveElements({
          showLabels: args.showLabels as boolean,
          duration: args.duration as number,
        });
        return { highlighted: true };

      // ============ Tier 2: GIF Recording ============
      case 'browser_start_gif':
        this.browser.startGifRecording(args.maxFrames as number);
        return { started: true };

      case 'browser_capture_frame':
        await this.browser.captureGifFrame(args.label as string);
        return { captured: true };

      case 'browser_stop_gif':
        const frames = this.browser.stopGifRecording();
        return { stopped: true, frameCount: frames.length };

      // ============ Tier 2: Trace Recording ============
      case 'browser_start_trace':
        await this.browser.getPage().context().tracing.start({
          screenshots: args.screenshots as boolean ?? true,
          snapshots: args.snapshots as boolean ?? true,
        });
        return { started: true };

      case 'browser_stop_trace':
        await this.browser.getPage().context().tracing.stop({
          path: args.path as string,
        });
        return { stopped: true, path: args.path };

      // ============ Tier 2: Network Requests ============
      case 'browser_get_requests':
        return {
          requests: this.browser.getNetworkRequests({
            urlPattern: args.urlPattern as string,
            clear: args.clear as boolean,
          }),
        };

      // ============ Tier 2: Emulation ============
      case 'browser_emulate_media':
        await this.browser.getPage().emulateMedia({
          colorScheme: args.colorScheme as 'light' | 'dark' | 'no-preference',
          reducedMotion: args.reducedMotion as 'reduce' | 'no-preference',
        });
        return { emulated: true };

      // ============ Tier 3: Clipboard ============
      case 'browser_clipboard':
        if (args.target) {
          await this.browser.getLocator(args.target as string).focus();
        }
        // Use Meta key on macOS, Control on others
        const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
        switch (args.action) {
          case 'copy':
            await this.browser.getPage().keyboard.press(`${modifier}+c`);
            return { copied: true };
          case 'paste':
            await this.browser.getPage().keyboard.press(`${modifier}+v`);
            return { pasted: true };
          case 'read':
            const text = await this.browser.getPage().evaluate(
              () => navigator.clipboard.readText()
            );
            return { text };
          case 'selectAll':
            await this.browser.getPage().keyboard.press(`${modifier}+a`);
            return { selected: true };
        }
        break;

      // ============ Tier 2: Sensitive Data ============
      case 'browser_set_sensitive_data':
        this.browser.setSensitiveData(args.data as Record<string, Record<string, string>>);
        return { set: true, domains: Object.keys(args.data as Record<string, unknown>) };

      // ============ Tier 2: Vision/Screenshot Analysis ============
      case 'browser_analyze_screenshot':
        const analysisScreenshot = args.selector
          ? await this.browser.getLocator(args.selector as string).screenshot({ type: 'png' })
          : await this.browser.getPage().screenshot({
              type: 'png',
              fullPage: args.fullPage as boolean,
            });
        return {
          data: analysisScreenshot.toString('base64'),
          prompt: args.prompt as string ?? 'Describe what you see in this screenshot',
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<{ content: string; mimeType: string }> {
    if (!this.browser.isLaunched()) {
      throw new Error('Browser not launched. Navigate to a URL first.');
    }

    switch (uri) {
      case 'browser://state':
        const page = this.browser.getPage();
        return {
          content: JSON.stringify({
            url: page.url(),
            title: await page.title(),
            viewport: page.viewportSize(),
          }, null, 2),
          mimeType: 'application/json',
        };

      case 'browser://screenshot':
        const screenshot = await this.browser.getPage().screenshot({ type: 'png' });
        return {
          content: screenshot.toString('base64'),
          mimeType: 'image/png',
        };

      case 'browser://snapshot':
        const snapshot = await getEnhancedSnapshot(this.browser.getPage(), {
          interactive: true,
        });
        return {
          content: snapshot.tree,
          mimeType: 'text/plain',
        };

      case 'browser://history':
        // Playwright doesn't expose history directly
        return {
          content: JSON.stringify({ current: this.browser.getPage().url() }),
          mimeType: 'application/json',
        };

      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, args: Record<string, string>): Promise<string> {
    switch (name) {
      case 'browse':
        return `Navigate to ${args.url} and analyze the page content. Use browser_snapshot to see interactive elements.`;

      case 'fill_form':
        return `Fill out the form on this page with the following values:\n${args.fields}\n\nUse browser_snapshot first to identify form fields, then use browser_fill to enter values.`;

      case 'extract_data':
        return `Extract data from this page matching the following schema:\n${args.schema}\n\nUse browser_execute to run JavaScript that extracts the data.`;

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser.isLaunched()) {
      await this.browser.close();
    }
  }
}

export default MCPServer;
