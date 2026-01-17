/**
 * Browser Manager - Multi-tab/window management with Playwright
 * Adapted from agent-browser/src/browser.ts with enhancements from browser-use
 */

import {
  Browser,
  BrowserContext,
  Page,
  Frame,
  Locator,
  CDPSession,
  BrowserType,
  chromium,
  firefox,
  webkit,
} from 'playwright-core';
import type {
  Viewport,
  ProxyConfig,
  RefMap,
  RefData,
  DOMRect,
  FrameMetadata,
} from '../core/types.js';
import { parseRef } from '../dom/snapshot.js';

// ============================================================================
// Browser Launch Options
// ============================================================================

export interface BrowserLaunchOptions {
  browser?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  viewport?: Viewport;
  cdpPort?: number;
  executablePath?: string;
  extensions?: string[];
  headers?: Record<string, string>;
  proxy?: ProxyConfig;
  userDataDir?: string;
  slowMo?: number;
  timeout?: number;
}

// ============================================================================
// Screencast Types
// ============================================================================

interface ScreencastFrame {
  data: string;
  metadata: FrameMetadata;
}

type ScreencastCallback = (frame: ScreencastFrame) => void;

// ============================================================================
// Browser Manager Class
// ============================================================================

export class BrowserManager {
  private browser: Browser | null = null;
  private browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium';
  private isPersistentContext = false;
  private contexts: BrowserContext[] = [];
  private pages: Page[] = [];
  private activePageIndex = 0;
  private activeFrame: Frame | null = null;
  private refMap: RefMap = {};

  // CDP session for screencast and input injection
  private cdpSession: CDPSession | null = null;
  private screencastActive = false;
  private screencastCallback: ScreencastCallback | null = null;

  // Launch options
  private launchOptions: BrowserLaunchOptions = {};

  // Console and error tracking
  private consoleMessages: Array<{
    type: string;
    text: string;
    timestamp: number;
    location?: { url: string; lineNumber: number; columnNumber: number };
  }> = [];
  private pageErrors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }> = [];

  // Network request tracking
  private networkRequests: Array<{
    url: string;
    method: string;
    status?: number;
    resourceType: string;
    timestamp: number;
    responseHeaders?: Record<string, string>;
  }> = [];

  // GIF recording state
  private gifFrames: Array<{
    data: string;
    label?: string;
    timestamp: number;
  }> = [];
  private gifRecordingActive = false;
  private gifMaxFrames = 100;
  private gifFrameDelay = 100;

  // Sensitive data for masking
  private sensitiveData: Record<string, Record<string, string>> = {};

  // HAR recording state
  private harRecordingActive = false;
  private harPath: string | null = null;

  // ============================================================================
  // Lifecycle Methods
  // ============================================================================

  async launch(options: BrowserLaunchOptions = {}): Promise<void> {
    if (this.browser) {
      throw new Error('Browser already launched. Call close() first.');
    }

    this.launchOptions = options;
    this.browserType = options.browser ?? 'chromium';

    const browserTypeInstance = this.getBrowserType();
    const launchArgs: string[] = [];

    // Add CDP port for Chromium
    if (options.cdpPort && this.browserType === 'chromium') {
      launchArgs.push(`--remote-debugging-port=${options.cdpPort}`);
    }

    // Add extensions for Chromium
    if (options.extensions?.length && this.browserType === 'chromium') {
      launchArgs.push(`--disable-extensions-except=${options.extensions.join(',')}`);
      launchArgs.push(`--load-extension=${options.extensions.join(',')}`);
    }

    // Use persistent context if userDataDir is provided
    if (options.userDataDir) {
      this.isPersistentContext = true;
      const context = await browserTypeInstance.launchPersistentContext(options.userDataDir, {
        headless: options.headless ?? true,
        viewport: options.viewport ?? { width: 1280, height: 720 },
        executablePath: options.executablePath,
        args: launchArgs.length > 0 ? launchArgs : undefined,
        proxy: options.proxy,
        slowMo: options.slowMo,
        extraHTTPHeaders: options.headers,
        timeout: options.timeout,
      });

      this.contexts.push(context);
      this.pages = context.pages();
      if (this.pages.length === 0) {
        const page = await context.newPage();
        this.pages.push(page);
        this.setupPageListeners(page);
      } else {
        for (const page of this.pages) {
          this.setupPageListeners(page);
        }
      }
    } else {
      // Standard launch
      this.browser = await browserTypeInstance.launch({
        headless: options.headless ?? true,
        executablePath: options.executablePath,
        args: launchArgs.length > 0 ? launchArgs : undefined,
        slowMo: options.slowMo,
        timeout: options.timeout,
      });

      // Create default context with options
      const context = await this.browser.newContext({
        viewport: options.viewport ?? { width: 1280, height: 720 },
        proxy: options.proxy,
        extraHTTPHeaders: options.headers,
      });

      this.contexts.push(context);
      const page = await context.newPage();
      this.pages.push(page);
      this.setupPageListeners(page);
    }

    this.activePageIndex = 0;
    this.activeFrame = null;
  }

  /**
   * Set up console, error, and network listeners on a page
   */
  private setupPageListeners(page: Page): void {
    // Console message tracking
    page.on('console', (msg) => {
      this.consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
        location: msg.location() ? {
          url: msg.location().url,
          lineNumber: msg.location().lineNumber,
          columnNumber: msg.location().columnNumber,
        } : undefined,
      });
    });

    // Page error tracking
    page.on('pageerror', (error) => {
      this.pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      });
    });

    // Network request tracking
    page.on('request', (request) => {
      this.networkRequests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        timestamp: Date.now(),
      });
    });

    page.on('response', (response) => {
      // Update the matching request with response info
      const requestIndex = this.networkRequests.findIndex(
        (r) => r.url === response.url() && !r.status
      );
      if (requestIndex !== -1) {
        this.networkRequests[requestIndex].status = response.status();
        this.networkRequests[requestIndex].responseHeaders = response.headers();
      }
    });
  }

  async close(): Promise<void> {
    if (this.screencastActive) {
      await this.stopScreencast();
    }

    if (this.cdpSession) {
      await this.cdpSession.detach().catch(() => {});
      this.cdpSession = null;
    }

    if (this.isPersistentContext && this.contexts.length > 0) {
      await this.contexts[0].close();
    } else if (this.browser) {
      await this.browser.close();
    }

    this.browser = null;
    this.contexts = [];
    this.pages = [];
    this.activePageIndex = 0;
    this.activeFrame = null;
    this.refMap = {};
    this.isPersistentContext = false;
  }

  isLaunched(): boolean {
    return this.browser !== null || this.isPersistentContext;
  }

  // ============================================================================
  // Page Management
  // ============================================================================

  getPage(): Page {
    if (this.pages.length === 0) {
      throw new Error('No pages available. Launch browser first.');
    }
    return this.pages[this.activePageIndex];
  }

  getActiveFrame(): Frame {
    return this.activeFrame ?? this.getPage().mainFrame();
  }

  async newPage(url?: string): Promise<Page> {
    const context = this.getContext();
    const page = await context.newPage();
    this.pages.push(page);
    this.activePageIndex = this.pages.length - 1;
    this.activeFrame = null;

    if (url) {
      await page.goto(url);
    }

    return page;
  }

  async closePage(index?: number): Promise<void> {
    const idx = index ?? this.activePageIndex;
    if (idx < 0 || idx >= this.pages.length) {
      throw new Error(`Invalid page index: ${idx}`);
    }

    const page = this.pages[idx];
    await page.close();
    this.pages.splice(idx, 1);

    // Adjust active page index
    if (this.pages.length === 0) {
      const context = this.getContext();
      const newPage = await context.newPage();
      this.pages.push(newPage);
      this.activePageIndex = 0;
    } else if (this.activePageIndex >= this.pages.length) {
      this.activePageIndex = this.pages.length - 1;
    }

    this.activeFrame = null;
  }

  async switchPage(options: { index?: number; url?: string; title?: string }): Promise<void> {
    if (options.index !== undefined) {
      if (options.index < 0 || options.index >= this.pages.length) {
        throw new Error(`Invalid page index: ${options.index}`);
      }
      this.activePageIndex = options.index;
    } else if (options.url) {
      const index = this.pages.findIndex((p) => p.url().includes(options.url!));
      if (index === -1) {
        throw new Error(`No page found with URL containing: ${options.url}`);
      }
      this.activePageIndex = index;
    } else if (options.title) {
      const titles = await Promise.all(this.pages.map((p) => p.title()));
      const index = titles.findIndex((t) => t.includes(options.title!));
      if (index === -1) {
        throw new Error(`No page found with title containing: ${options.title}`);
      }
      this.activePageIndex = index;
    }

    this.activeFrame = null;
  }

  getPages(): Array<{ index: number; url: string; title: string }> {
    return this.pages.map((page, index) => ({
      index,
      url: page.url(),
      title: '', // Will be populated async
    }));
  }

  async getPagesWithTitles(): Promise<Array<{ index: number; url: string; title: string }>> {
    return Promise.all(
      this.pages.map(async (page, index) => ({
        index,
        url: page.url(),
        title: await page.title(),
      }))
    );
  }

  // ============================================================================
  // Frame Management
  // ============================================================================

  async switchToFrame(options: { selector?: string; name?: string; url?: string }): Promise<void> {
    const page = this.getPage();

    if (options.selector) {
      const frameElement = await page.$(options.selector);
      if (!frameElement) {
        throw new Error(`Frame not found: ${options.selector}`);
      }
      const frame = await frameElement.contentFrame();
      if (!frame) {
        throw new Error(`Element is not a frame: ${options.selector}`);
      }
      this.activeFrame = frame;
    } else if (options.name) {
      const frame = page.frame({ name: options.name });
      if (!frame) {
        throw new Error(`Frame not found with name: ${options.name}`);
      }
      this.activeFrame = frame;
    } else if (options.url) {
      const frame = page.frame({ url: options.url });
      if (!frame) {
        throw new Error(`Frame not found with URL: ${options.url}`);
      }
      this.activeFrame = frame;
    }
  }

  switchToMainFrame(): void {
    this.activeFrame = null;
  }

  getFrames(): Array<{ name: string; url: string }> {
    const page = this.getPage();
    return page.frames().map((frame) => ({
      name: frame.name(),
      url: frame.url(),
    }));
  }

  // ============================================================================
  // Ref-Based Locator System
  // ============================================================================

  setRefMap(refMap: RefMap): void {
    this.refMap = refMap;
  }

  getRefMap(): RefMap {
    return this.refMap;
  }

  /**
   * Get locator - supports both refs and regular selectors
   */
  getLocator(selectorOrRef: string): Locator {
    // Check if it's a ref first
    const locator = this.getLocatorFromRef(selectorOrRef);
    if (locator) return locator;

    // Otherwise treat as regular selector
    const frame = this.getActiveFrame();
    return frame.locator(selectorOrRef);
  }

  /**
   * Get a locator from a ref (e.g., "e1", "@e1", "ref=e1")
   */
  getLocatorFromRef(refArg: string): Locator | null {
    const ref = parseRef(refArg);
    if (!ref) return null;

    const refData = this.refMap[ref];
    if (!refData) return null;

    const frame = this.getActiveFrame();

    // Build locator with exact: true to avoid substring matches
    let locator: Locator;
    if (refData.name) {
      locator = frame.getByRole(refData.role as Parameters<typeof frame.getByRole>[0], {
        name: refData.name,
        exact: true,
      });
    } else {
      locator = frame.getByRole(refData.role as Parameters<typeof frame.getByRole>[0]);
    }

    // If an nth index is stored (for disambiguation), use it
    if (refData.nth !== undefined) {
      locator = locator.nth(refData.nth);
    }

    return locator;
  }

  // ============================================================================
  // CDP Session Management
  // ============================================================================

  async getCDPSession(): Promise<CDPSession> {
    if (this.cdpSession) return this.cdpSession;

    if (this.browserType !== 'chromium') {
      throw new Error('CDP sessions are only available for Chromium-based browsers');
    }

    const page = this.getPage();
    this.cdpSession = await page.context().newCDPSession(page);
    return this.cdpSession;
  }

  // ============================================================================
  // Screencast (for pair browsing)
  // ============================================================================

  async startScreencast(
    callback: ScreencastCallback,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      everyNthFrame?: number;
    }
  ): Promise<void> {
    if (this.screencastActive) {
      throw new Error('Screencast already active');
    }

    const cdp = await this.getCDPSession();
    this.screencastCallback = callback;

    cdp.on('Page.screencastFrame', async (params: any) => {
      if (this.screencastCallback) {
        this.screencastCallback({
          data: params.data,
          metadata: {
            offsetTop: params.metadata.offsetTop,
            pageScaleFactor: params.metadata.pageScaleFactor,
            deviceWidth: params.metadata.deviceWidth,
            deviceHeight: params.metadata.deviceHeight,
            scrollOffsetX: params.metadata.scrollOffsetX,
            scrollOffsetY: params.metadata.scrollOffsetY,
            timestamp: params.metadata.timestamp,
          },
        });
      }

      // Acknowledge frame receipt
      await cdp.send('Page.screencastFrameAck', {
        sessionId: params.sessionId,
      });
    });

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: options?.quality ?? 80,
      maxWidth: options?.maxWidth,
      maxHeight: options?.maxHeight,
      everyNthFrame: options?.everyNthFrame ?? 1,
    });

    this.screencastActive = true;
  }

  async stopScreencast(): Promise<void> {
    if (!this.screencastActive) return;

    if (this.cdpSession) {
      await this.cdpSession.send('Page.stopScreencast');
    }

    this.screencastActive = false;
    this.screencastCallback = null;
  }

  // ============================================================================
  // Input Injection (for pair browsing)
  // ============================================================================

  async injectMouseEvent(params: {
    type: string;
    x: number;
    y: number;
    button?: string;
    clickCount?: number;
    deltaX?: number;
    deltaY?: number;
    modifiers?: number;
  }): Promise<void> {
    const cdp = await this.getCDPSession();

    if (params.type === 'mouseWheel') {
      await cdp.send('Input.dispatchMouseEvent', {
        type: 'mouseWheel',
        x: params.x,
        y: params.y,
        deltaX: params.deltaX ?? 0,
        deltaY: params.deltaY ?? 0,
        modifiers: params.modifiers,
      });
    } else {
      await cdp.send('Input.dispatchMouseEvent', {
        type: params.type as 'mousePressed' | 'mouseReleased' | 'mouseMoved',
        x: params.x,
        y: params.y,
        button: (params.button ?? 'left') as 'left' | 'right' | 'middle' | 'none',
        clickCount: params.clickCount ?? 1,
        modifiers: params.modifiers,
      });
    }
  }

  async injectKeyboardEvent(params: {
    type: string;
    key: string;
    code?: string;
    text?: string;
    modifiers?: number;
  }): Promise<void> {
    const cdp = await this.getCDPSession();

    if (params.type === 'char') {
      await cdp.send('Input.dispatchKeyEvent', {
        type: 'char',
        text: params.text ?? params.key,
        modifiers: params.modifiers,
      });
    } else {
      await cdp.send('Input.dispatchKeyEvent', {
        type: params.type as 'keyDown' | 'keyUp' | 'rawKeyDown',
        key: params.key,
        code: params.code ?? params.key,
        modifiers: params.modifiers,
      });
    }
  }

  async injectTouchEvent(params: {
    type: string;
    touchPoints: Array<{
      x: number;
      y: number;
      id: number;
      radiusX?: number;
      radiusY?: number;
      force?: number;
    }>;
    modifiers?: number;
  }): Promise<void> {
    const cdp = await this.getCDPSession();

    await cdp.send('Input.dispatchTouchEvent', {
      type: params.type as 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel',
      touchPoints: params.touchPoints.map((tp) => ({
        x: tp.x,
        y: tp.y,
        id: tp.id,
        radiusX: tp.radiusX,
        radiusY: tp.radiusY,
        force: tp.force,
      })),
      modifiers: params.modifiers,
    });
  }

  // ============================================================================
  // Console & Error Methods
  // ============================================================================

  getConsoleMessages(options?: { type?: string; clear?: boolean }): typeof this.consoleMessages {
    let messages = this.consoleMessages;
    if (options?.type && options.type !== 'all') {
      messages = messages.filter((m) => m.type === options.type);
    }
    if (options?.clear) {
      this.consoleMessages = [];
    }
    return messages;
  }

  getPageErrors(clear?: boolean): typeof this.pageErrors {
    const errors = this.pageErrors;
    if (clear) {
      this.pageErrors = [];
    }
    return errors;
  }

  clearConsole(): void {
    this.consoleMessages = [];
  }

  clearErrors(): void {
    this.pageErrors = [];
  }

  // ============================================================================
  // Network Request Methods
  // ============================================================================

  getNetworkRequests(options?: { urlPattern?: string; clear?: boolean }): typeof this.networkRequests {
    let requests = this.networkRequests;
    if (options?.urlPattern) {
      const pattern = new RegExp(options.urlPattern);
      requests = requests.filter((r) => pattern.test(r.url));
    }
    if (options?.clear) {
      this.networkRequests = [];
    }
    return requests;
  }

  clearNetworkRequests(): void {
    this.networkRequests = [];
  }

  // ============================================================================
  // State Save/Load Methods (Auth Persistence)
  // ============================================================================

  async saveStorageState(path: string): Promise<void> {
    const context = this.getContext();
    await context.storageState({ path });
  }

  async loadStorageState(path: string): Promise<void> {
    // Note: Loading storage state requires re-creating the context
    // This is a limitation of Playwright
    const fs = await import('fs');
    const state = JSON.parse(await fs.promises.readFile(path, 'utf-8'));

    const context = this.getContext();
    // Add cookies
    if (state.cookies?.length > 0) {
      await context.addCookies(state.cookies);
    }
    // Set local storage via evaluate
    if (state.origins?.length > 0) {
      for (const origin of state.origins) {
        if (origin.localStorage?.length > 0) {
          const page = this.getPage();
          if (page.url().startsWith(origin.origin)) {
            await page.evaluate((items) => {
              for (const item of items) {
                localStorage.setItem(item.name, item.value);
              }
            }, origin.localStorage);
          }
        }
      }
    }
  }

  // ============================================================================
  // GIF Recording Methods
  // ============================================================================

  startGifRecording(maxFrames = 100, frameDelay = 100): void {
    this.gifRecordingActive = true;
    this.gifMaxFrames = maxFrames;
    this.gifFrameDelay = frameDelay;
    this.gifFrames = [];
  }

  async captureGifFrame(label?: string): Promise<void> {
    if (!this.gifRecordingActive) return;
    if (this.gifFrames.length >= this.gifMaxFrames) return;

    const screenshot = await this.getPage().screenshot({ type: 'png' });
    this.gifFrames.push({
      data: screenshot.toString('base64'),
      label,
      timestamp: Date.now(),
    });
  }

  getGifFrames(): typeof this.gifFrames {
    return this.gifFrames;
  }

  stopGifRecording(): typeof this.gifFrames {
    this.gifRecordingActive = false;
    return this.gifFrames;
  }

  isGifRecording(): boolean {
    return this.gifRecordingActive;
  }

  // ============================================================================
  // Sensitive Data Handling
  // ============================================================================

  setSensitiveData(data: Record<string, Record<string, string>>): void {
    this.sensitiveData = data;
  }

  getSensitiveData(): Record<string, Record<string, string>> {
    return this.sensitiveData;
  }

  /**
   * Replace sensitive data placeholders with actual values
   * Format: <secret>key_name</secret>
   */
  replaceSensitiveData(text: string, domain?: string): string {
    let result = text;

    // Get domain-specific data
    const domainData = domain ? this.sensitiveData[domain] : undefined;

    // Replace placeholders
    const placeholderRegex = /<secret>([^<]+)<\/secret>/g;
    result = result.replace(placeholderRegex, (match, key) => {
      // Check domain-specific first
      if (domainData && domainData[key]) {
        return domainData[key];
      }
      // Check global sensitive data
      for (const [, siteData] of Object.entries(this.sensitiveData)) {
        if (siteData[key]) {
          return siteData[key];
        }
      }
      // Return placeholder if not found
      return match;
    });

    return result;
  }

  // ============================================================================
  // HAR Recording Methods
  // ============================================================================

  async startHarRecording(path: string): Promise<void> {
    if (this.harRecordingActive) {
      throw new Error('HAR recording already active');
    }
    this.harRecordingActive = true;
    this.harPath = path;
    // Note: HAR recording is handled at context level
    // This is a simplified implementation
  }

  async stopHarRecording(): Promise<string | null> {
    if (!this.harRecordingActive) {
      return null;
    }
    this.harRecordingActive = false;
    const path = this.harPath;
    this.harPath = null;
    return path;
  }

  // ============================================================================
  // Element Highlighting for Demo Mode
  // ============================================================================

  async highlightElement(selector: string): Promise<void> {
    const locator = this.getLocator(selector);
    await locator.highlight();
  }

  async highlightInteractiveElements(options?: { showLabels?: boolean; duration?: number }): Promise<void> {
    const page = this.getPage();
    const showLabels = options?.showLabels ?? true;
    const duration = options?.duration ?? 5000;

    // Inject highlighting script
    await page.evaluate(({ showLabels, duration }) => {
      // Color mapping for different element types
      const colors: Record<string, string> = {
        button: '#FF6B6B',
        input: '#4ECDC4',
        select: '#45B7D1',
        a: '#96CEB4',
        textarea: '#FF8C42',
        default: '#DDA0DD',
      };

      // Find all interactive elements
      const interactiveSelectors = [
        'button', 'input', 'select', 'textarea', 'a[href]',
        '[role="button"]', '[role="link"]', '[role="checkbox"]',
        '[role="radio"]', '[role="textbox"]', '[role="combobox"]',
        '[onclick]', '[tabindex]:not([tabindex="-1"])',
      ];

      const elements = document.querySelectorAll(interactiveSelectors.join(','));
      const overlays: HTMLElement[] = [];

      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const tagName = el.tagName.toLowerCase();
        const color = colors[tagName] || colors.default;

        // Create highlight overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          left: ${rect.left}px;
          top: ${rect.top}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          border: 2px solid ${color};
          background: ${color}20;
          pointer-events: none;
          z-index: 999999;
          box-sizing: border-box;
        `;

        if (showLabels) {
          const label = document.createElement('div');
          label.textContent = `e${index + 1}`;
          label.style.cssText = `
            position: absolute;
            top: -20px;
            left: 0;
            background: ${color};
            color: white;
            padding: 2px 6px;
            font-size: 11px;
            font-family: monospace;
            border-radius: 3px;
          `;
          overlay.appendChild(label);
        }

        document.body.appendChild(overlay);
        overlays.push(overlay);
      });

      // Remove overlays after duration
      setTimeout(() => {
        overlays.forEach((o) => o.remove());
      }, duration);
    }, { showLabels, duration });
  }

  async clearHighlights(): Promise<void> {
    const page = this.getPage();
    await page.evaluate(() => {
      const overlays = document.querySelectorAll('[data-webwright-highlight]');
      overlays.forEach((o) => o.remove());
    });
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getBrowserType(): BrowserType {
    switch (this.browserType) {
      case 'firefox':
        return firefox;
      case 'webkit':
        return webkit;
      default:
        return chromium;
    }
  }

  private getContext(): BrowserContext {
    if (this.contexts.length === 0) {
      throw new Error('No browser context available. Launch browser first.');
    }
    return this.contexts[0];
  }
}

export default BrowserManager;
