/**
 * Basic tests for AgentBrowser Pro
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../src/browser/manager.js';
import { getEnhancedSnapshot, parseRef } from '../src/dom/snapshot.js';
import { parseCommand } from '../src/core/protocol.js';

describe('Protocol', () => {
  it('should parse navigate command', () => {
    const result = parseCommand(JSON.stringify({
      id: '1',
      action: 'navigate',
      url: 'https://example.com'
    }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.command.action).toBe('navigate');
      expect((result.command as any).url).toBe('https://example.com');
    }
  });

  it('should parse click command', () => {
    const result = parseCommand(JSON.stringify({
      id: '2',
      action: 'click',
      selector: '@e1'
    }));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.command.action).toBe('click');
      expect((result.command as any).selector).toBe('@e1');
    }
  });

  it('should reject invalid JSON', () => {
    const result = parseCommand('not json');
    expect(result.success).toBe(false);
  });

  it('should reject unknown action', () => {
    const result = parseCommand(JSON.stringify({
      id: '1',
      action: 'unknownAction'
    }));
    expect(result.success).toBe(false);
  });
});

describe('Ref Parsing', () => {
  it('should parse @e1 format', () => {
    expect(parseRef('@e1')).toBe('e1');
  });

  it('should parse e1 format', () => {
    expect(parseRef('e1')).toBe('e1');
  });

  it('should parse ref=e1 format', () => {
    expect(parseRef('ref=e1')).toBe('e1');
  });

  it('should return null for CSS selectors', () => {
    expect(parseRef('#my-button')).toBeNull();
    expect(parseRef('.class-name')).toBeNull();
  });
});

describe('BrowserManager', () => {
  let browser: BrowserManager;

  beforeAll(async () => {
    browser = new BrowserManager();
  });

  afterAll(async () => {
    if (browser.isLaunched()) {
      await browser.close();
    }
  });

  it('should start as not launched', () => {
    expect(browser.isLaunched()).toBe(false);
  });

  it('should launch and close', async () => {
    await browser.launch({ headless: true });
    expect(browser.isLaunched()).toBe(true);

    await browser.close();
    expect(browser.isLaunched()).toBe(false);
  });

  it('should navigate and get snapshot', async () => {
    await browser.launch({ headless: true });

    await browser.getPage().goto('https://example.com');

    const snapshot = await getEnhancedSnapshot(browser.getPage(), {
      interactive: true
    });

    expect(snapshot.tree).toBeTruthy();
    expect(Object.keys(snapshot.refs).length).toBeGreaterThan(0);

    // Should find the "More information" link
    expect(snapshot.tree).toContain('link');

    await browser.close();
  }, 30000);
});
