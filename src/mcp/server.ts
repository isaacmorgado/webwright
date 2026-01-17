/**
 * MCP Server - Model Context Protocol integration for Claude Code + Roo Code
 * Implements MCP tools, resources, and prompts for browser automation
 */

import { z } from 'zod';
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
// All Tools
// ============================================================================

export const mcpTools: MCPTool[] = [
  navigateTool,
  clickTool,
  typeTool,
  fillTool,
  scrollTool,
  snapshotTool,
  screenshotTool,
  stateTool,
  backTool,
  forwardTool,
  reloadTool,
  waitTool,
  executeTool,
  selectTool,
  checkTool,
  uncheckTool,
  hoverTool,
  pressTool,
  cookiesTool,
  networkTool,
  agentRunTool,
  agentStepTool,
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
