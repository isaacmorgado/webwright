/**
 * Error utilities for AgentBrowser Pro
 * AI-friendly error messages with recovery suggestions
 */

// ============================================================================
// Error Classes
// ============================================================================

export class BrowserError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'BrowserError';
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      suggestion: this.suggestion,
    };
  }
}

export class ElementNotFoundError extends BrowserError {
  constructor(selector: string) {
    super(
      `Element "${selector}" not found`,
      'ELEMENT_NOT_FOUND',
      `Run 'snapshot' to see current page elements, or wait for the element to appear.`
    );
    this.name = 'ElementNotFoundError';
  }
}

export class ElementNotVisibleError extends BrowserError {
  constructor(selector: string) {
    super(
      `Element "${selector}" is not visible`,
      'ELEMENT_NOT_VISIBLE',
      `Try scrolling the element into view or check if it's hidden by CSS.`
    );
    this.name = 'ElementNotVisibleError';
  }
}

export class ElementNotInteractableError extends BrowserError {
  constructor(selector: string, blocker?: string) {
    super(
      `Element "${selector}" is blocked${blocker ? ` by ${blocker}` : ''}`,
      'ELEMENT_BLOCKED',
      `Try dismissing any modals, cookie banners, or overlays first.`
    );
    this.name = 'ElementNotInteractableError';
  }
}

export class MultipleElementsError extends BrowserError {
  constructor(selector: string, count: number) {
    super(
      `Selector "${selector}" matched ${count} elements`,
      'MULTIPLE_ELEMENTS',
      `Use a more specific selector or run 'snapshot' to get unique refs.`
    );
    this.name = 'MultipleElementsError';
  }
}

export class NavigationError extends BrowserError {
  constructor(url: string, reason?: string) {
    super(
      `Failed to navigate to "${url}"${reason ? `: ${reason}` : ''}`,
      'NAVIGATION_FAILED',
      `Check if the URL is valid and accessible.`
    );
    this.name = 'NavigationError';
  }
}

export class TimeoutError extends BrowserError {
  constructor(operation: string, timeout: number) {
    super(
      `Operation "${operation}" timed out after ${timeout}ms`,
      'TIMEOUT',
      `Try increasing the timeout or waiting for specific conditions.`
    );
    this.name = 'TimeoutError';
  }
}

export class FrameNotFoundError extends BrowserError {
  constructor(identifier: string) {
    super(
      `Frame "${identifier}" not found`,
      'FRAME_NOT_FOUND',
      `Run 'getFrames' to see available frames.`
    );
    this.name = 'FrameNotFoundError';
  }
}

export class InvalidRefError extends BrowserError {
  constructor(ref: string) {
    super(
      `Invalid or expired ref "${ref}"`,
      'INVALID_REF',
      `Run 'snapshot' to get updated refs. Refs may change after page updates.`
    );
    this.name = 'InvalidRefError';
  }
}

export class BrowserNotLaunchedError extends BrowserError {
  constructor() {
    super(
      `Browser not launched`,
      'BROWSER_NOT_LAUNCHED',
      `Launch the browser first with the 'launch' command or navigate to a URL.`
    );
    this.name = 'BrowserNotLaunchedError';
  }
}

export class SessionNotFoundError extends BrowserError {
  constructor(session: string) {
    super(
      `Session "${session}" not found`,
      'SESSION_NOT_FOUND',
      `Start the daemon for this session first.`
    );
    this.name = 'SessionNotFoundError';
  }
}

// ============================================================================
// Error Mapping
// ============================================================================

const ERROR_PATTERNS = [
  {
    pattern: /strict mode violation.*resolved to (\d+) elements/i,
    create: (match: RegExpMatchArray, selector: string) =>
      new MultipleElementsError(selector, parseInt(match[1], 10)),
  },
  {
    pattern: /intercepts pointer events/i,
    create: (_match: RegExpMatchArray, selector: string) =>
      new ElementNotInteractableError(selector),
  },
  {
    pattern: /not visible/i,
    create: (_match: RegExpMatchArray, selector: string) =>
      new ElementNotVisibleError(selector),
  },
  {
    pattern: /waiting for.*to be visible|timeout/i,
    create: (_match: RegExpMatchArray, selector: string) =>
      new ElementNotFoundError(selector),
  },
  {
    pattern: /not attached to the dom/i,
    create: (_match: RegExpMatchArray, selector: string) =>
      new ElementNotFoundError(selector),
  },
  {
    pattern: /navigation timeout/i,
    create: (_match: RegExpMatchArray, selector: string) =>
      new NavigationError(selector, 'timeout'),
  },
  {
    pattern: /frame not found/i,
    create: (_match: RegExpMatchArray, selector: string) =>
      new FrameNotFoundError(selector),
  },
];

/**
 * Transform a Playwright error into an AI-friendly BrowserError
 */
export function transformError(error: unknown, selector: string = ''): BrowserError {
  const message = error instanceof Error ? error.message : String(error);

  for (const { pattern, create } of ERROR_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      return create(match, selector);
    }
  }

  // Return generic BrowserError if no pattern matches
  return new BrowserError(
    message,
    'UNKNOWN_ERROR',
    `An unexpected error occurred. Check the error message for details.`
  );
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Format an error for CLI output
 */
export function formatErrorForCLI(error: BrowserError): string {
  let output = `\x1b[31m✗\x1b[0m ${error.message}`;

  if (error.suggestion) {
    output += `\n\x1b[33mSuggestion:\x1b[0m ${error.suggestion}`;
  }

  return output;
}

/**
 * Format an error for JSON output
 */
export function formatErrorForJSON(error: BrowserError): object {
  return {
    success: false,
    error: error.message,
    code: error.code,
    suggestion: error.suggestion,
  };
}

/**
 * Format an error for LLM consumption
 */
export function formatErrorForLLM(error: BrowserError): string {
  let output = `Error: ${error.message}`;

  if (error.suggestion) {
    output += `\n\nRecovery: ${error.suggestion}`;
  }

  return output;
}
