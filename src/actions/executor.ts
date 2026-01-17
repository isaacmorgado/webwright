/**
 * Action Executor - Command execution with AI-friendly errors
 * Adapted from agent-browser/src/actions.ts
 */

import type { Page, Frame, Locator, Response as PlaywrightResponse, Download, BrowserContext } from 'playwright-core';
import type { BrowserManager } from '../browser/manager.js';
import type { Command, Response } from '../core/protocol.js';
import { successResponse, errorResponse } from '../core/protocol.js';
import { getEnhancedSnapshot, getFullDOMTree } from '../dom/snapshot.js';

// ============================================================================
// AI-Friendly Error Transformation
// ============================================================================

/**
 * Convert Playwright errors to AI-friendly messages with recovery suggestions
 */
export function toAIFriendlyError(error: unknown, selector: string): Error {
  const message = error instanceof Error ? error.message : String(error);

  // Handle strict mode violation (multiple elements match)
  if (message.includes('strict mode violation')) {
    const countMatch = message.match(/resolved to (\d+) elements/);
    const count = countMatch ? countMatch[1] : 'multiple';

    return new Error(
      `Selector "${selector}" matched ${count} elements. ` +
        `Run 'snapshot' to get updated refs, or use a more specific CSS selector.`
    );
  }

  // Handle element not interactable (overlay/modal blocks)
  if (message.includes('intercepts pointer events')) {
    return new Error(
      `Element "${selector}" is blocked by another element (likely a modal or overlay). ` +
        `Try dismissing any modals/cookie banners first.`
    );
  }

  // Handle element not visible
  if (message.includes('not visible') && !message.includes('Timeout')) {
    return new Error(
      `Element "${selector}" is not visible. ` +
        `Try scrolling it into view or check if it's hidden.`
    );
  }

  // Handle element not found (timeout)
  if (
    message.includes('waiting for') &&
    (message.includes('to be visible') || message.includes('Timeout'))
  ) {
    return new Error(
      `Element "${selector}" not found or not visible. ` +
        `Run 'snapshot' to see current page elements.`
    );
  }

  // Handle element detached
  if (message.includes('Element is not attached to the DOM')) {
    return new Error(
      `Element "${selector}" was removed from the page. ` +
        `The page may have updated. Run 'snapshot' to get current elements.`
    );
  }

  // Handle navigation timeout
  if (message.includes('Navigation timeout')) {
    return new Error(
      `Page took too long to load. ` +
        `Try waiting for a specific element instead, or increase the timeout.`
    );
  }

  // Handle frame not found
  if (message.includes('Frame not found')) {
    return new Error(
      `Frame "${selector}" not found. ` +
        `Run 'getFrames' to see available frames.`
    );
  }

  return error instanceof Error ? error : new Error(message);
}

// ============================================================================
// Action Executor Class
// ============================================================================

export class ActionExecutor {
  constructor(private browser: BrowserManager) {}

  /**
   * Execute a command and return a response
   */
  async execute(command: Command): Promise<Response> {
    try {
      const result = await this.executeAction(command);
      return successResponse(command.id, result);
    } catch (error) {
      const selector = 'selector' in command ? String(command.selector) : '';
      const friendlyError = toAIFriendlyError(error, selector);
      return errorResponse(command.id, friendlyError.message);
    }
  }

  /**
   * Execute action based on command type
   */
  private async executeAction(command: Command): Promise<unknown> {
    switch (command.action) {
      // ============ Lifecycle ============
      case 'launch':
        await this.browser.launch({
          browser: command.browser,
          headless: command.headless,
          viewport: command.viewport,
          cdpPort: command.cdpPort,
          executablePath: command.executablePath,
          extensions: command.extensions,
          headers: command.headers,
          proxy: command.proxy,
          userDataDir: command.userDataDir,
          slowMo: command.slowMo,
          timeout: command.timeout,
        });
        return { launched: true };

      case 'close':
        await this.browser.close();
        return { closed: true };

      // ============ Navigation ============
      case 'navigate':
        const navResponse = await this.browser.getPage().goto(command.url, {
          waitUntil: command.waitUntil ?? 'load',
          timeout: command.timeout,
        });
        return {
          url: this.browser.getPage().url(),
          status: navResponse?.status(),
        };

      case 'back':
        await this.browser.getPage().goBack({
          waitUntil: command.waitUntil,
        });
        return { url: this.browser.getPage().url() };

      case 'forward':
        await this.browser.getPage().goForward({
          waitUntil: command.waitUntil,
        });
        return { url: this.browser.getPage().url() };

      case 'reload':
        await this.browser.getPage().reload({
          waitUntil: command.waitUntil,
        });
        return { url: this.browser.getPage().url() };

      // ============ Interaction ============
      case 'click':
        await this.browser.getLocator(command.selector).click({
          button: command.button,
          clickCount: command.clickCount,
          delay: command.delay,
          position: command.position,
          modifiers: command.modifiers,
          force: command.force,
          noWaitAfter: command.noWaitAfter,
          timeout: command.timeout,
        });
        return { clicked: command.selector };

      case 'dblclick':
        await this.browser.getLocator(command.selector).dblclick({
          button: command.button,
          delay: command.delay,
          position: command.position,
          modifiers: command.modifiers,
          force: command.force,
          timeout: command.timeout,
        });
        return { doubleClicked: command.selector };

      case 'type':
        await this.browser.getLocator(command.selector).pressSequentially(command.text, {
          delay: command.delay,
          noWaitAfter: command.noWaitAfter,
          timeout: command.timeout,
        });
        return { typed: command.text };

      case 'fill':
        await this.browser.getLocator(command.selector).fill(command.value, {
          force: command.force,
          noWaitAfter: command.noWaitAfter,
          timeout: command.timeout,
        });
        return { filled: command.value };

      case 'clear':
        await this.browser.getLocator(command.selector).clear({
          force: command.force,
          timeout: command.timeout,
        });
        return { cleared: command.selector };

      case 'check':
        await this.browser.getLocator(command.selector).check({
          force: command.force,
          position: command.position,
          timeout: command.timeout,
        });
        return { checked: command.selector };

      case 'uncheck':
        await this.browser.getLocator(command.selector).uncheck({
          force: command.force,
          position: command.position,
          timeout: command.timeout,
        });
        return { unchecked: command.selector };

      case 'select':
        const selectLocator = this.browser.getLocator(command.selector);
        if (command.value !== undefined) {
          await selectLocator.selectOption(command.value);
        } else if (command.label !== undefined) {
          await selectLocator.selectOption({ label: command.label as string });
        } else if (command.index !== undefined) {
          await selectLocator.selectOption({ index: command.index as number });
        }
        return { selected: command.selector };

      case 'hover':
        await this.browser.getLocator(command.selector).hover({
          position: command.position,
          modifiers: command.modifiers,
          force: command.force,
          timeout: command.timeout,
        });
        return { hovered: command.selector };

      case 'focus':
        await this.browser.getLocator(command.selector).focus({
          timeout: command.timeout,
        });
        return { focused: command.selector };

      case 'press':
        if (command.selector) {
          await this.browser.getLocator(command.selector).press(command.key, {
            delay: command.delay,
            noWaitAfter: command.noWaitAfter,
            timeout: command.timeout,
          });
        } else {
          await this.browser.getPage().keyboard.press(command.key, {
            delay: command.delay,
          });
        }
        return { pressed: command.key };

      case 'scroll':
        if (command.selector) {
          const scrollLocator = this.browser.getLocator(command.selector);
          await scrollLocator.scrollIntoViewIfNeeded();
        } else if (command.position) {
          await this.browser.getPage().evaluate(
            ({ x, y, behavior }) => {
              window.scrollTo({ left: x, top: y, behavior: behavior as ScrollBehavior });
            },
            { x: command.position.x, y: command.position.y, behavior: command.behavior ?? 'auto' }
          );
        } else if (command.direction && command.amount) {
          const delta = command.amount;
          await this.browser.getPage().evaluate(
            ({ direction, delta }) => {
              switch (direction) {
                case 'up':
                  window.scrollBy(0, -delta);
                  break;
                case 'down':
                  window.scrollBy(0, delta);
                  break;
                case 'left':
                  window.scrollBy(-delta, 0);
                  break;
                case 'right':
                  window.scrollBy(delta, 0);
                  break;
              }
            },
            { direction: command.direction, delta }
          );
        }
        return { scrolled: true };

      case 'drag':
        await this.browser.getLocator(command.source).dragTo(
          this.browser.getLocator(command.target),
          {
            force: command.force,
            noWaitAfter: command.noWaitAfter,
            timeout: command.timeout,
          }
        );
        return { dragged: { from: command.source, to: command.target } };

      case 'upload':
        await this.browser.getLocator(command.selector).setInputFiles(command.files, {
          noWaitAfter: command.noWaitAfter,
          timeout: command.timeout,
        });
        return { uploaded: command.files };

      // ============ Information ============
      case 'snapshot':
        const snapshot = await getEnhancedSnapshot(this.browser.getPage(), {
          selector: command.selector,
          interactive: command.interactive,
          depth: command.depth,
          includeHidden: command.includeHidden,
          compact: command.compact,
        });
        this.browser.setRefMap(snapshot.refs);
        return {
          tree: snapshot.tree,
          refs: snapshot.refs,
          url: this.browser.getPage().url(),
          title: await this.browser.getPage().title(),
        };

      case 'screenshot':
        const screenshotOptions: Parameters<Page['screenshot']>[0] = {
          type: command.type ?? 'png',
          quality: command.type === 'jpeg' ? command.quality : undefined,
          fullPage: command.fullPage,
          omitBackground: command.omitBackground,
          timeout: command.timeout,
        };

        let screenshotBuffer: Buffer;
        if (command.selector) {
          screenshotBuffer = await this.browser.getLocator(command.selector).screenshot(screenshotOptions);
        } else {
          screenshotBuffer = await this.browser.getPage().screenshot(screenshotOptions);
        }

        if (command.path) {
          const fs = await import('fs');
          await fs.promises.writeFile(command.path, screenshotBuffer);
          return { path: command.path };
        }

        return { data: screenshotBuffer.toString('base64') };

      case 'getText':
        const text = await this.browser.getLocator(command.selector).textContent({
          timeout: command.timeout,
        });
        return { text: text ?? '' };

      case 'getHtml':
        if (command.selector) {
          if (command.outer) {
            const html = await this.browser.getLocator(command.selector).evaluate((el) => el.outerHTML);
            return { html };
          } else {
            const html = await this.browser.getLocator(command.selector).innerHTML();
            return { html };
          }
        } else {
          const html = await this.browser.getPage().content();
          return { html };
        }

      case 'getAttribute':
        const attr = await this.browser.getLocator(command.selector).getAttribute(command.name, {
          timeout: command.timeout,
        });
        return { value: attr };

      case 'getValue':
        const value = await this.browser.getLocator(command.selector).inputValue({
          timeout: command.timeout,
        });
        return { value };

      case 'getBoundingBox':
        const box = await this.browser.getLocator(command.selector).boundingBox({
          timeout: command.timeout,
        });
        return { box };

      case 'getTitle':
        return { title: await this.browser.getPage().title() };

      case 'getUrl':
        return { url: this.browser.getPage().url() };

      case 'getCount':
        const count = await this.browser.getLocator(command.selector).count();
        return { count };

      // ============ State Checks ============
      case 'isVisible':
        return { visible: await this.browser.getLocator(command.selector).isVisible() };

      case 'isEnabled':
        return { enabled: await this.browser.getLocator(command.selector).isEnabled() };

      case 'isChecked':
        return { checked: await this.browser.getLocator(command.selector).isChecked() };

      case 'isEditable':
        return { editable: await this.browser.getLocator(command.selector).isEditable() };

      case 'isHidden':
        return { hidden: await this.browser.getLocator(command.selector).isHidden() };

      // ============ Wait ============
      case 'wait':
        await new Promise((resolve) => setTimeout(resolve, command.timeout));
        return { waited: command.timeout };

      case 'waitForSelector':
        await this.browser.getLocator(command.selector).waitFor({
          state: command.state,
          timeout: command.timeout,
        });
        return { found: command.selector };

      case 'waitForNavigation':
        await this.browser.getPage().waitForURL(command.url ?? /.*/, {
          waitUntil: command.waitUntil,
          timeout: command.timeout,
        });
        return { url: this.browser.getPage().url() };

      case 'waitForLoadState':
        await this.browser.getPage().waitForLoadState(command.state, {
          timeout: command.timeout,
        });
        return { state: command.state ?? 'load' };

      case 'waitForUrl':
        await this.browser.getPage().waitForURL(command.url, {
          timeout: command.timeout,
        });
        return { url: this.browser.getPage().url() };

      case 'waitForText':
        if (command.selector) {
          await this.browser.getLocator(command.selector).filter({ hasText: command.text }).waitFor({
            timeout: command.timeout,
          });
        } else {
          await this.browser.getPage().locator(`text=${command.text}`).first().waitFor({
            timeout: command.timeout,
          });
        }
        return { found: command.text };

      case 'waitForFunction':
        await this.browser.getPage().waitForFunction(command.expression, {
          timeout: command.timeout,
          polling: command.polling,
        });
        return { evaluated: true };

      // ============ Frames ============
      case 'switchToFrame':
        await this.browser.switchToFrame({
          selector: command.selector,
          name: command.name,
          url: command.url,
        });
        return { switched: true };

      case 'switchToMainFrame':
        this.browser.switchToMainFrame();
        return { switched: true };

      case 'getFrames':
        return { frames: this.browser.getFrames() };

      // ============ Pages ============
      case 'newPage':
        await this.browser.newPage(command.url);
        return { created: true, url: command.url };

      case 'switchPage':
        await this.browser.switchPage({
          index: command.index,
          url: command.url,
          title: command.title,
        });
        return { switched: true };

      case 'closePage':
        await this.browser.closePage(command.index);
        return { closed: true };

      case 'getPages':
        return { pages: await this.browser.getPagesWithTitles() };

      // ============ JavaScript ============
      case 'evaluate':
        const evalResult = await this.browser.getPage().evaluate(command.script, command.args);
        return { result: evalResult };

      case 'evaluateHandle':
        const handle = await this.browser.getPage().evaluateHandle(command.script, command.args);
        const handleResult = await handle.jsonValue();
        return { result: handleResult };

      // ============ Network ============
      case 'setExtraHeaders':
        await this.browser.getPage().setExtraHTTPHeaders(command.headers);
        return { set: true };

      case 'setOffline':
        await this.browser.getPage().context().setOffline(command.offline);
        return { offline: command.offline };

      case 'route':
        await this.browser.getPage().route(command.url, async (route) => {
          switch (command.handler) {
            case 'abort':
              await route.abort();
              break;
            case 'continue':
              await route.continue();
              break;
            case 'fulfill':
              await route.fulfill({
                status: command.response?.status,
                headers: command.response?.headers,
                body: command.response?.body,
              });
              break;
          }
        });
        return { routed: command.url };

      case 'unroute':
        if (command.url) {
          await this.browser.getPage().unroute(command.url);
        } else {
          await this.browser.getPage().unrouteAll();
        }
        return { unrouted: true };

      // ============ Cookies/Storage ============
      case 'getCookies':
        const cookies = await this.browser.getPage().context().cookies(command.urls);
        return { cookies };

      case 'setCookies':
        await this.browser.getPage().context().addCookies(command.cookies);
        return { set: true };

      case 'clearCookies':
        await this.browser.getPage().context().clearCookies();
        return { cleared: true };

      case 'getLocalStorage':
        if (command.key) {
          const item = await this.browser.getPage().evaluate(
            (key) => localStorage.getItem(key),
            command.key
          );
          return { value: item };
        } else {
          const storage = await this.browser.getPage().evaluate(() => {
            const items: Record<string, string> = {};
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                items[key] = localStorage.getItem(key) ?? '';
              }
            }
            return items;
          });
          return { storage };
        }

      case 'setLocalStorage':
        await this.browser.getPage().evaluate(
          ({ key, value }) => localStorage.setItem(key, value),
          { key: command.key, value: command.value }
        );
        return { set: true };

      case 'clearLocalStorage':
        await this.browser.getPage().evaluate(() => localStorage.clear());
        return { cleared: true };

      // ============ Dialog ============
      case 'handleDialog':
        // This needs to be set up before the dialog appears
        this.browser.getPage().once('dialog', async (dialog) => {
          if (command.accept) {
            await dialog.accept(command.promptText);
          } else {
            await dialog.dismiss();
          }
        });
        return { handler: 'set' };

      // ============ Viewport ============
      case 'setViewport':
        await this.browser.getPage().setViewportSize(command.viewport);
        return { viewport: command.viewport };

      case 'emulateDevice':
        // Get device from playwright
        const playwright = await import('playwright-core');
        const device = (playwright.devices as Record<string, any>)[command.device];
        if (!device) {
          throw new Error(`Unknown device: ${command.device}`);
        }
        await this.browser.getPage().setViewportSize(device.viewport);
        return { device: command.device };

      case 'setGeolocation':
        await this.browser.getPage().context().setGeolocation({
          latitude: command.latitude,
          longitude: command.longitude,
          accuracy: command.accuracy,
        });
        return { geolocation: { latitude: command.latitude, longitude: command.longitude } };

      // ============ Recording ============
      case 'startRecording':
        // Video recording requires re-creating context
        // This is a simplified version
        return { error: 'Video recording requires browser re-launch with recordVideo option' };

      case 'stopRecording':
        return { stopped: true };

      case 'pdf':
        const pdfBuffer = await this.browser.getPage().pdf({
          format: command.format,
          landscape: command.landscape,
          printBackground: command.printBackground,
          scale: command.scale,
          margin: command.margin,
        });

        if (command.path) {
          const fs = await import('fs');
          await fs.promises.writeFile(command.path, pdfBuffer);
          return { path: command.path };
        }

        return { data: pdfBuffer.toString('base64') };

      // ============ Streaming ============
      case 'startStream':
        // Streaming is handled by the StreamServer
        return { info: 'Use StreamServer for viewport streaming' };

      case 'stopStream':
        return { stopped: true };

      // ============ Agent ============
      case 'agentRun':
        // Agent is handled by the Agent service
        return { info: 'Use Agent service for autonomous tasks' };

      case 'agentStep':
        return { info: 'Use Agent service for step execution' };

      // ============ Tier 1: Debug Commands ============
      case 'pause':
        await this.browser.getPage().pause();
        return { paused: true };

      case 'highlight':
        await this.browser.highlightElement(command.selector);
        return { highlighted: command.selector };

      // ============ Tier 1: Console/Error Commands ============
      case 'getConsole':
        return {
          messages: this.browser.getConsoleMessages({
            type: command.type,
            clear: command.clear,
          }),
        };

      case 'getErrors':
        return {
          errors: this.browser.getPageErrors(command.clear),
        };

      // ============ Tier 1: State Management ============
      case 'saveState':
        await this.browser.saveStorageState(command.path);
        return { saved: command.path };

      case 'loadState':
        await this.browser.loadStorageState(command.path);
        return { loaded: command.path };

      // ============ Tier 1: Semantic Locators ============
      case 'findByRole':
        const roleLocator = this.browser.getPage().getByRole(
          command.role as Parameters<Page['getByRole']>[0],
          {
            name: command.name,
            exact: command.exact,
            includeHidden: command.includeHidden,
          }
        );
        const roleCount = await roleLocator.count();
        return {
          found: roleCount,
          elements: await Promise.all(
            Array.from({ length: Math.min(roleCount, 10) }, async (_, i) => {
              const el = roleLocator.nth(i);
              return {
                text: await el.textContent().catch(() => null),
                visible: await el.isVisible().catch(() => false),
              };
            })
          ),
        };

      case 'findByText':
        const textLocator = this.browser.getPage().getByText(command.text, {
          exact: command.exact,
        });
        const textCount = await textLocator.count();
        return { found: textCount };

      case 'findByLabel':
        const labelLocator = this.browser.getPage().getByLabel(command.label, {
          exact: command.exact,
        });
        const labelCount = await labelLocator.count();
        return { found: labelCount };

      case 'findByPlaceholder':
        const placeholderLocator = this.browser.getPage().getByPlaceholder(command.placeholder, {
          exact: command.exact,
        });
        const placeholderCount = await placeholderLocator.count();
        return { found: placeholderCount };

      case 'findByAlt':
        const altLocator = this.browser.getPage().getByAltText(command.alt, {
          exact: command.exact,
        });
        const altCount = await altLocator.count();
        return { found: altCount };

      case 'findByTitle':
        const titleLocator = this.browser.getPage().getByTitle(command.title, {
          exact: command.exact,
        });
        const titleCount = await titleLocator.count();
        return { found: titleCount };

      case 'findByTestId':
        const testIdLocator = this.browser.getPage().getByTestId(command.testId);
        const testIdCount = await testIdLocator.count();
        return { found: testIdCount };

      // ============ Tier 1: Session Storage ============
      case 'getSessionStorage':
        if (command.key) {
          const sessionItem = await this.browser.getPage().evaluate(
            (key) => sessionStorage.getItem(key),
            command.key
          );
          return { value: sessionItem };
        } else {
          const sessionStorage = await this.browser.getPage().evaluate(() => {
            const items: Record<string, string> = {};
            for (let i = 0; i < window.sessionStorage.length; i++) {
              const key = window.sessionStorage.key(i);
              if (key) {
                items[key] = window.sessionStorage.getItem(key) ?? '';
              }
            }
            return items;
          });
          return { storage: sessionStorage };
        }

      case 'setSessionStorage':
        await this.browser.getPage().evaluate(
          ({ key, value }) => sessionStorage.setItem(key, value),
          { key: command.key, value: command.value }
        );
        return { set: true };

      case 'clearSessionStorage':
        await this.browser.getPage().evaluate(() => sessionStorage.clear());
        return { cleared: true };

      // ============ Tier 2: HAR/Trace Recording ============
      case 'startHar':
        await this.browser.startHarRecording(command.path);
        return { started: true, path: command.path };

      case 'stopHar':
        const harPath = await this.browser.stopHarRecording();
        return { stopped: true, path: harPath };

      case 'startTrace':
        await this.browser.getPage().context().tracing.start({
          screenshots: command.screenshots,
          snapshots: command.snapshots,
          sources: command.sources,
        });
        return { started: true };

      case 'stopTrace':
        await this.browser.getPage().context().tracing.stop({
          path: command.path,
        });
        return { stopped: true, path: command.path };

      // ============ Tier 2: Clipboard Operations ============
      case 'clipboardCopy':
        if (command.selector) {
          await this.browser.getLocator(command.selector).focus();
        }
        // Use Meta key on macOS, Control on others
        await this.browser.getPage().keyboard.press(
          process.platform === 'darwin' ? 'Meta+c' : 'Control+c'
        );
        return { copied: true };

      case 'clipboardPaste':
        if (command.selector) {
          await this.browser.getLocator(command.selector).focus();
        }
        await this.browser.getPage().keyboard.press(
          process.platform === 'darwin' ? 'Meta+v' : 'Control+v'
        );
        return { pasted: true };

      case 'clipboardRead':
        const clipboardText = await this.browser.getPage().evaluate(
          () => navigator.clipboard.readText()
        );
        return { text: clipboardText };

      case 'selectAll':
        if (command.selector) {
          await this.browser.getLocator(command.selector).focus();
        }
        await this.browser.getPage().keyboard.press(
          process.platform === 'darwin' ? 'Meta+a' : 'Control+a'
        );
        return { selected: true };

      // ============ Tier 2: Emulation Options ============
      case 'setTimezone':
        await this.browser.getPage().context().grantPermissions(['geolocation']);
        // Note: Timezone is set at context creation, this is a best-effort
        return { timezone: command.timezoneId, note: 'Timezone should be set at browser launch' };

      case 'setLocale':
        // Note: Locale is set at context creation
        return { locale: command.locale, note: 'Locale should be set at browser launch' };

      case 'setPermissions':
        await this.browser.getPage().context().grantPermissions(
          command.permissions as Parameters<BrowserContext['grantPermissions']>[0],
          { origin: command.origin }
        );
        return { granted: command.permissions, origin: command.origin };

      case 'emulateMedia':
        await this.browser.getPage().emulateMedia({
          media: command.media === 'null' ? null : command.media,
          colorScheme: command.colorScheme === 'null' ? null : command.colorScheme,
          reducedMotion: command.reducedMotion === 'null' ? null : command.reducedMotion,
          forcedColors: command.forcedColors === 'null' ? null : command.forcedColors,
        });
        return { emulated: true };

      // ============ Tier 2: Vision/Screenshot Analysis ============
      case 'analyzeScreenshot':
        const analysisScreenshot = command.selector
          ? await this.browser.getLocator(command.selector).screenshot({ type: 'png' })
          : await this.browser.getPage().screenshot({
              type: 'png',
              fullPage: command.fullPage,
            });
        return {
          data: analysisScreenshot.toString('base64'),
          prompt: command.prompt ?? 'Describe what you see in this screenshot',
          // Note: Actual LLM analysis would be done by the calling service
        };

      // ============ Tier 2: Element Highlighting Demo Mode ============
      case 'highlightElements':
        if (command.selectors?.length) {
          for (const selector of command.selectors) {
            await this.browser.highlightElement(selector);
          }
          return { highlighted: command.selectors.length };
        } else {
          await this.browser.highlightInteractiveElements({
            showLabels: command.showLabels,
            duration: command.duration,
          });
          return { highlighted: 'interactive' };
        }

      case 'clearHighlights':
        await this.browser.clearHighlights();
        return { cleared: true };

      // ============ Tier 2: GIF Generation ============
      case 'startGifRecording':
        this.browser.startGifRecording(command.maxFrames, command.frameDelay);
        return { started: true, maxFrames: command.maxFrames };

      case 'stopGifRecording':
        const frames = this.browser.stopGifRecording();
        // Save frames as individual PNGs, external tool converts to GIF
        const fs = await import('fs');
        const path = await import('path');
        const dir = path.dirname(command.path);
        await fs.promises.mkdir(dir, { recursive: true });

        // Write frames manifest
        const manifestPath = command.path.replace(/\.gif$/, '.frames.json');
        await fs.promises.writeFile(manifestPath, JSON.stringify({
          frames: frames.map((f, i) => ({
            index: i,
            label: f.label,
            timestamp: f.timestamp,
          })),
          totalFrames: frames.length,
          width: command.width,
          height: command.height,
        }, null, 2));

        // Write frame images
        for (let i = 0; i < frames.length; i++) {
          const framePath = command.path.replace(/\.gif$/, `.frame${i.toString().padStart(4, '0')}.png`);
          await fs.promises.writeFile(framePath, Buffer.from(frames[i].data, 'base64'));
        }

        return {
          stopped: true,
          frameCount: frames.length,
          manifest: manifestPath,
          note: 'Use ffmpeg or similar to convert frames to GIF: ffmpeg -framerate 10 -i frame%04d.png output.gif',
        };

      case 'captureGifFrame':
        await this.browser.captureGifFrame(command.label);
        return { captured: true, label: command.label };

      // ============ Tier 2: Sensitive Data Handling ============
      case 'setSensitiveData':
        this.browser.setSensitiveData(command.data);
        return { set: true, domains: Object.keys(command.data) };

      // ============ Tier 3: Scroll Into View ============
      case 'scrollIntoView':
        await this.browser.getLocator(command.selector).scrollIntoViewIfNeeded();
        // For more control, use evaluate
        if (command.block || command.inline) {
          await this.browser.getLocator(command.selector).evaluate((el, opts) => {
            el.scrollIntoView({
              block: opts.block,
              inline: opts.inline,
              behavior: 'smooth',
            });
          }, { block: command.block, inline: command.inline });
        }
        return { scrolled: command.selector };

      // ============ Tier 3: Network Request Viewing ============
      case 'getRequests':
        return {
          requests: this.browser.getNetworkRequests({
            urlPattern: command.urlPattern,
            clear: command.clear,
          }),
        };

      // ============ Tier 3: New Window Management ============
      case 'newWindow':
        // Create a new context for a separate window
        const newContext = await this.browser.getPage().context().browser()!.newContext();
        const newWinPage = await newContext.newPage();
        if (command.url) {
          await newWinPage.goto(command.url);
        }
        return { created: true, url: command.url };

      case 'bringToFront':
        await this.browser.getPage().bringToFront();
        return { focused: true };

      default:
        throw new Error(`Unknown action: ${(command as any).action}`);
    }
  }
}

export default ActionExecutor;
