/**
 * Feature Validation Tests
 * Tests all newly added browser-use features
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { BrowserManager } from '../src/browser/manager.js';
import { ActionExecutor } from '../src/actions/executor.js';
import { parseCommand } from '../src/core/protocol.js';

describe('Browser-Use Feature Validation', () => {
  let browser: BrowserManager;
  let executor: ActionExecutor;

  beforeAll(async () => {
    browser = new BrowserManager();
    executor = new ActionExecutor(browser);

    // Launch browser
    await executor.execute({
      id: 'launch-1',
      action: 'launch',
      headless: true,
    });

    // Navigate to a test page
    await executor.execute({
      id: 'nav-1',
      action: 'navigate',
      url: 'https://example.com',
    });
  }, 30000);

  afterAll(async () => {
    await browser.close();
  });

  describe('Schema Validation', () => {
    test('humanClick schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-1',
        action: 'humanClick',
        selector: 'button',
        jitter: 5,
        preDelay: [20, 50],
        postDelay: [30, 100],
      }));
      expect(result.success).toBe(true);
    });

    test('detectVariables schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-2',
        action: 'detectVariables',
        selector: 'form',
      }));
      expect(result.success).toBe(true);
    });

    test('healthCheck schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-3',
        action: 'healthCheck',
        checkNetwork: true,
        checkConsole: true,
        checkResponsive: true,
        timeout: 3000,
      }));
      expect(result.success).toBe(true);
    });

    test('multiClear schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-4',
        action: 'multiClear',
        selector: 'input',
        triggerFrameworkEvents: true,
      }));
      expect(result.success).toBe(true);
    });

    test('search schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-5',
        action: 'search',
        query: 'playwright browser automation',
        engine: 'duckduckgo',
      }));
      expect(result.success).toBe(true);
    });

    test('extract schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-6',
        action: 'extract',
        goal: 'Get all product names and prices',
        maxLength: 10000,
      }));
      expect(result.success).toBe(true);
    });

    test('getDropdownOptions schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-7',
        action: 'getDropdownOptions',
        selector: 'select#country',
      }));
      expect(result.success).toBe(true);
    });

    test('detectPagination schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-8',
        action: 'detectPagination',
      }));
      expect(result.success).toBe(true);
    });

    test('findTextOnPage schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-9',
        action: 'findTextOnPage',
        text: 'Example Domain',
        caseSensitive: false,
      }));
      expect(result.success).toBe(true);
    });

    test('downloadPdf schema parses correctly', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-10',
        action: 'downloadPdf',
        path: '/tmp/test.pdf',
      }));
      expect(result.success).toBe(true);
    });
  });

  describe('Action Execution', () => {
    test('healthCheck returns status', async () => {
      const result = await executor.execute({
        id: 'health-1',
        action: 'healthCheck',
        checkNetwork: true,
        checkConsole: true,
        checkResponsive: true,
        timeout: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('healthy');
      expect(result.result).toHaveProperty('issues');
    });

    test('detectPagination finds pagination elements', async () => {
      const result = await executor.execute({
        id: 'pagination-1',
        action: 'detectPagination',
      });

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('hasPagination');
      expect(result.result).toHaveProperty('next');
      expect(result.result).toHaveProperty('prev');
    });

    test('findTextOnPage finds text', async () => {
      const result = await executor.execute({
        id: 'find-text-1',
        action: 'findTextOnPage',
        text: 'Example',
        caseSensitive: false,
      });

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('found');
      expect(result.result).toHaveProperty('count');
      expect((result.result as any).found).toBe(true);
    });

    test('extract returns page content', async () => {
      const result = await executor.execute({
        id: 'extract-1',
        action: 'extract',
        goal: 'Get the main heading',
        maxLength: 5000,
      });

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('content');
      expect(result.result).toHaveProperty('length');
    });

    test('detectVariables works on page', async () => {
      const result = await executor.execute({
        id: 'detect-vars-1',
        action: 'detectVariables',
      });

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('variables');
      expect(result.result).toHaveProperty('count');
    });

    test('search navigates to search engine', async () => {
      const result = await executor.execute({
        id: 'search-1',
        action: 'search',
        query: 'test query',
        engine: 'duckduckgo',
      });

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('searched');
      expect(result.result).toHaveProperty('url');
      expect((result.result as any).searched).toBe('test query');
    });
  });

  describe('Defaults and Edge Cases', () => {
    test('humanClick uses default values', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-default-1',
        action: 'humanClick',
        selector: 'button',
      }));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.command).toHaveProperty('jitter');
        expect(result.command).toHaveProperty('preDelay');
        expect(result.command).toHaveProperty('postDelay');
      }
    });

    test('healthCheck uses default timeout', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-default-2',
        action: 'healthCheck',
      }));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.command).toHaveProperty('timeout');
      }
    });

    test('search defaults to duckduckgo', () => {
      const result = parseCommand(JSON.stringify({
        id: 'test-default-3',
        action: 'search',
        query: 'test',
      }));

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.command as any).engine).toBe('duckduckgo');
      }
    });
  });
});
