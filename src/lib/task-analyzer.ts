/**
 * AI Task Analyzer - Natural Language to RE Workflow
 *
 * Parses simple prompts like:
 * - "reverse engineer this website and extract the UI elements"
 * - "capture all API calls from example.com"
 * - "clone the UI from this page"
 *
 * Returns a structured workflow with tool selections.
 */

export type RETaskType =
  | 'api_discovery'
  | 'ui_extraction'
  | 'ui_clone'
  | 'traffic_capture'
  | 'graphql_schema'
  | 'protobuf_extract'
  | 'stealth_scrape'
  | 'full_reverse_engineer';

export interface AnalyzedTask {
  type: RETaskType;
  confidence: number;
  targetUrl?: string;
  tools: string[];
  workflow: WorkflowStep[];
  description: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  tool: string;
  action: string;
  params: Record<string, any>;
  dependsOn?: string[];
}

// Intent patterns for task classification
const INTENT_PATTERNS: Record<RETaskType, RegExp[]> = {
  api_discovery: [
    /discover\s*(all\s*)?(api|endpoint|route)/i,
    /find\s*(all\s*)?(api|endpoint)/i,
    /capture\s*(all\s*)?(api|network|request)/i,
    /what\s*api/i,
    /api\s*(endpoint|call|request)/i,
    /reverse\s*engineer.*api/i,
  ],
  ui_extraction: [
    /extract\s*(the\s*)?(ui|interface|element|component)/i,
    /get\s*(all\s*)?(ui|element|component)/i,
    /list\s*(all\s*)?(element|component|button|input)/i,
    /what\s*(element|component|button)/i,
    /accessibility\s*tree/i,
    /dom\s*(tree|structure|element)/i,
  ],
  ui_clone: [
    /clone\s*(the\s*)?(ui|interface|design|page)/i,
    /copy\s*(the\s*)?(ui|design|layout)/i,
    /recreate\s*(the\s*)?(ui|interface)/i,
    /screenshot\s*to\s*code/i,
    /convert.*screenshot/i,
    /replicate\s*(the\s*)?(design|ui)/i,
  ],
  traffic_capture: [
    /capture\s*(all\s*)?(traffic|request|network)/i,
    /intercept\s*(traffic|request)/i,
    /proxy\s*(traffic|request)/i,
    /mitm|man.in.the.middle/i,
    /sniff\s*(traffic|packet)/i,
    /record\s*(network|traffic|request)/i,
  ],
  graphql_schema: [
    /graphql\s*(schema|introspect)/i,
    /extract\s*(graphql|schema)/i,
    /discover\s*graphql/i,
    /graphql\s*endpoint/i,
  ],
  protobuf_extract: [
    /protobuf|proto\s*file/i,
    /grpc\s*(schema|definition)/i,
    /extract\s*proto/i,
    /binary\s*(protocol|format)/i,
  ],
  stealth_scrape: [
    /scrape.*stealth/i,
    /stealth.*scrape/i,
    /bypass\s*(bot|detection|captcha)/i,
    /anti.bot/i,
    /undetected/i,
    /scrape\s*(without|avoid).*block/i,
  ],
  full_reverse_engineer: [
    /reverse\s*engineer\s*(this|the)?\s*(website|site|app|page)/i,
    /fully?\s*reverse\s*engineer/i,
    /complete\s*(re|reverse)/i,
    /analyze\s*(everything|all)/i,
  ],
};

// Tool definitions
const TOOLS = {
  webwright_stealth: {
    name: 'WebWright Stealth',
    description: 'Browser automation with bot detection bypass',
    capabilities: ['navigate', 'click', 'type', 'screenshot', 'snapshot', 'evaluate'],
  },
  mitmproxy: {
    name: 'mitmproxy',
    description: 'HTTP/HTTPS traffic interception',
    capabilities: ['capture', 'export_har', 'filter', 'modify'],
  },
  chrome_devtools: {
    name: 'Chrome DevTools',
    description: 'Built-in browser inspection',
    capabilities: ['network', 'elements', 'console', 'sources'],
  },
  kiterunner: {
    name: 'Kiterunner',
    description: 'API endpoint discovery',
    capabilities: ['scan', 'bruteforce', 'discover_endpoints'],
  },
  screenshot_to_code: {
    name: 'Screenshot to Code',
    description: 'Convert screenshots to React code',
    capabilities: ['screenshot', 'generate_code', 'ui_clone'],
  },
  clairvoyance: {
    name: 'Clairvoyance',
    description: 'GraphQL schema extraction',
    capabilities: ['introspect', 'discover_fields', 'extract_schema'],
  },
};

// Tool selection by task type
const TOOL_SELECTION: Record<RETaskType, string[]> = {
  api_discovery: ['webwright_stealth', 'chrome_devtools', 'kiterunner'],
  ui_extraction: ['webwright_stealth', 'chrome_devtools'],
  ui_clone: ['webwright_stealth', 'screenshot_to_code'],
  traffic_capture: ['mitmproxy', 'webwright_stealth'],
  graphql_schema: ['webwright_stealth', 'clairvoyance'],
  protobuf_extract: ['mitmproxy', 'webwright_stealth'],
  stealth_scrape: ['webwright_stealth'],
  full_reverse_engineer: ['webwright_stealth', 'chrome_devtools', 'kiterunner'],
};

/**
 * Extract URL from user input
 */
function extractUrl(input: string): string | undefined {
  // Match URLs
  const urlPattern = /https?:\/\/[^\s"'<>]+/i;
  const match = input.match(urlPattern);
  if (match) return match[0];

  // Match domain-like patterns
  const domainPattern = /(?:from\s+|at\s+|on\s+)?([a-z0-9][-a-z0-9]*\.)+[a-z]{2,}/i;
  const domainMatch = input.match(domainPattern);
  if (domainMatch) {
    const domain = domainMatch[0].replace(/^(from|at|on)\s+/i, '');
    return `https://${domain}`;
  }

  return undefined;
}

/**
 * Analyze intent from natural language input
 */
function analyzeIntent(input: string): { type: RETaskType; confidence: number } {
  const normalizedInput = input.toLowerCase().trim();

  let bestMatch: { type: RETaskType; confidence: number } = {
    type: 'full_reverse_engineer',
    confidence: 0.3,
  };

  for (const [taskType, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedInput)) {
        const matchLength = normalizedInput.match(pattern)?.[0].length || 0;
        const confidence = Math.min(0.95, 0.6 + (matchLength / normalizedInput.length) * 0.3);

        if (confidence > bestMatch.confidence) {
          bestMatch = { type: taskType as RETaskType, confidence };
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Generate workflow steps for a task
 */
function generateWorkflow(type: RETaskType, targetUrl?: string): WorkflowStep[] {
  const steps: WorkflowStep[] = [];

  switch (type) {
    case 'api_discovery':
      steps.push(
        {
          id: 'navigate',
          name: 'Navigate to target',
          tool: 'webwright_stealth',
          action: 'navigate',
          params: { url: targetUrl, stealth: true },
        },
        {
          id: 'capture_initial',
          name: 'Capture initial network requests',
          tool: 'chrome_devtools',
          action: 'enable_network',
          params: {},
          dependsOn: ['navigate'],
        },
        {
          id: 'interact',
          name: 'Interact with all page elements',
          tool: 'webwright_stealth',
          action: 'interact_all',
          params: { captureNetwork: true },
          dependsOn: ['capture_initial'],
        },
        {
          id: 'export_har',
          name: 'Export HAR file',
          tool: 'chrome_devtools',
          action: 'export_har',
          params: { output: '/tmp/api-discovery.har' },
          dependsOn: ['interact'],
        },
        {
          id: 'analyze',
          name: 'Analyze discovered endpoints',
          tool: 'webwright_stealth',
          action: 'evaluate',
          params: { script: 'extractApiEndpoints()' },
          dependsOn: ['export_har'],
        }
      );
      break;

    case 'ui_extraction':
      steps.push(
        {
          id: 'navigate',
          name: 'Navigate to target',
          tool: 'webwright_stealth',
          action: 'navigate',
          params: { url: targetUrl, stealth: true },
        },
        {
          id: 'snapshot',
          name: 'Get accessibility tree',
          tool: 'webwright_stealth',
          action: 'snapshot',
          params: {},
          dependsOn: ['navigate'],
        },
        {
          id: 'extract_elements',
          name: 'Extract all UI elements',
          tool: 'webwright_stealth',
          action: 'evaluate',
          params: {
            script: `
              const elements = [];
              document.querySelectorAll('button, input, a, form, [role]').forEach(el => {
                elements.push({
                  tag: el.tagName,
                  text: el.textContent?.trim().substring(0, 50),
                  role: el.getAttribute('role'),
                  id: el.id,
                  className: el.className,
                  type: el.getAttribute('type'),
                  href: el.getAttribute('href'),
                });
              });
              return elements;
            `,
          },
          dependsOn: ['snapshot'],
        },
        {
          id: 'screenshot',
          name: 'Capture full page screenshot',
          tool: 'webwright_stealth',
          action: 'screenshot',
          params: { fullPage: true },
          dependsOn: ['extract_elements'],
        }
      );
      break;

    case 'ui_clone':
      steps.push(
        {
          id: 'navigate',
          name: 'Navigate to target',
          tool: 'webwright_stealth',
          action: 'navigate',
          params: { url: targetUrl, stealth: true },
        },
        {
          id: 'screenshot',
          name: 'Capture screenshot',
          tool: 'webwright_stealth',
          action: 'screenshot',
          params: { fullPage: true },
          dependsOn: ['navigate'],
        },
        {
          id: 'extract_styles',
          name: 'Extract CSS styles',
          tool: 'webwright_stealth',
          action: 'evaluate',
          params: { script: 'extractComputedStyles()' },
          dependsOn: ['screenshot'],
        },
        {
          id: 'generate_code',
          name: 'Generate React code from screenshot',
          tool: 'screenshot_to_code',
          action: 'convert',
          params: { framework: 'react', styling: 'tailwind' },
          dependsOn: ['extract_styles'],
        }
      );
      break;

    case 'full_reverse_engineer':
    default:
      steps.push(
        {
          id: 'navigate',
          name: 'Navigate to target',
          tool: 'webwright_stealth',
          action: 'navigate',
          params: { url: targetUrl, stealth: true },
        },
        {
          id: 'snapshot',
          name: 'Capture page structure',
          tool: 'webwright_stealth',
          action: 'snapshot',
          params: {},
          dependsOn: ['navigate'],
        },
        {
          id: 'screenshot',
          name: 'Take screenshot',
          tool: 'webwright_stealth',
          action: 'screenshot',
          params: { fullPage: true },
          dependsOn: ['snapshot'],
        },
        {
          id: 'extract_ui',
          name: 'Extract UI elements',
          tool: 'webwright_stealth',
          action: 'evaluate',
          params: {
            script: `(() => {
              const elements = [];
              document.querySelectorAll('button, input, a, form, select, textarea, [role="button"], [role="link"]').forEach(el => {
                elements.push({
                  tag: el.tagName.toLowerCase(),
                  text: (el.textContent || '').trim().substring(0, 100),
                  role: el.getAttribute('role'),
                  id: el.id || null,
                  className: el.className || null,
                  type: el.getAttribute('type'),
                  href: el.getAttribute('href'),
                });
              });
              return { count: elements.length, elements: elements.slice(0, 50) };
            })()`,
          },
          dependsOn: ['screenshot'],
        },
        {
          id: 'extract_api',
          name: 'Extract API patterns',
          tool: 'webwright_stealth',
          action: 'evaluate',
          params: {
            script: `(() => {
              const patterns = [];
              document.querySelectorAll('script').forEach(s => {
                const text = s.textContent || '';
                const apiMatches = text.match(/["']\\/api\\/[^"']+["']/g) || [];
                patterns.push(...apiMatches);
              });
              return { apiPatterns: [...new Set(patterns)].slice(0, 20) };
            })()`,
          },
          dependsOn: ['extract_ui'],
        }
      );
      break;
  }

  return steps;
}

/**
 * Generate task description
 */
function generateDescription(type: RETaskType, targetUrl?: string): string {
  const descriptions: Record<RETaskType, string> = {
    api_discovery: `Discover and document all API endpoints from ${targetUrl || 'the target'}`,
    ui_extraction: `Extract all UI elements and their properties from ${targetUrl || 'the target'}`,
    ui_clone: `Clone the UI design and generate React code from ${targetUrl || 'the target'}`,
    traffic_capture: `Capture and analyze all HTTP traffic from ${targetUrl || 'the target'}`,
    graphql_schema: `Extract GraphQL schema from ${targetUrl || 'the target'}`,
    protobuf_extract: `Extract Protobuf definitions from ${targetUrl || 'the target'}`,
    stealth_scrape: `Scrape data from ${targetUrl || 'the target'} while bypassing bot detection`,
    full_reverse_engineer: `Fully reverse engineer ${targetUrl || 'the target'}: UI, API, and architecture`,
  };

  return descriptions[type];
}

/**
 * Main entry point - analyze a natural language task
 *
 * @example
 * analyzeTask("reverse engineer this website and extract the UI elements from https://example.com")
 * // Returns structured workflow with tools and steps
 */
export function analyzeTask(input: string): AnalyzedTask {
  const { type, confidence } = analyzeIntent(input);
  const targetUrl = extractUrl(input);
  const tools = TOOL_SELECTION[type];
  const workflow = generateWorkflow(type, targetUrl);
  const description = generateDescription(type, targetUrl);

  return {
    type,
    confidence,
    targetUrl,
    tools,
    workflow,
    description,
  };
}

/**
 * Get available tools info
 */
export function getAvailableTools() {
  return TOOLS;
}

/**
 * Check if a tool is available on the system
 */
export async function checkToolAvailability(tool: string): Promise<boolean> {
  // This would actually check if tools are installed
  const alwaysAvailable = ['webwright_stealth', 'chrome_devtools'];
  return alwaysAvailable.includes(tool);
}
