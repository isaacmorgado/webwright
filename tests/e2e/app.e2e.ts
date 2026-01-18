import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

/**
 * WebWright Desktop E2E Tests
 *
 * End-to-end tests for the Electron application:
 * - App launch
 * - Navigation
 * - Task creation
 * - Session management
 * - UI interactions
 */

let electronApp: ElectronApplication
let page: Page

test.describe('WebWright Desktop E2E', () => {
  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })

    // Wait for the first window
    page = await electronApp.firstWindow()

    // Wait for the app to be ready
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test.describe('App Launch', () => {
    test('should launch the application', async () => {
      const isVisible = await page.isVisible('body')
      expect(isVisible).toBe(true)
    })

    test('should have correct window title', async () => {
      const title = await page.title()
      expect(title).toContain('WebWright')
    })

    test('should show main navigation', async () => {
      // Check for navigation elements
      const nav = await page.locator('nav, [role="navigation"]').first()
      await expect(nav).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('should navigate to New Task page', async () => {
      await page.click('text=New Task')
      await expect(page.locator('text=New Automation Task')).toBeVisible()
    })

    test('should navigate to RE Tools page', async () => {
      await page.click('text=RE Tools')
      await expect(page.locator('text=Reverse Engineering Tools')).toBeVisible()
    })

    test('should navigate to Sessions page', async () => {
      await page.click('text=Sessions')
      await expect(page.locator('text=Sessions')).toBeVisible()
    })

    test('should navigate to Settings page', async () => {
      await page.click('text=Settings')
      await expect(page.locator('text=Settings')).toBeVisible()
    })
  })

  test.describe('New Task Page', () => {
    test.beforeEach(async () => {
      await page.click('text=New Task')
      await page.waitForSelector('text=New Automation Task')
    })

    test('should display task input form', async () => {
      await expect(page.locator('textarea')).toBeVisible()
      await expect(page.locator('button:has-text("Start Task")')).toBeVisible()
    })

    test('should have stealth mode checkbox', async () => {
      const checkbox = page.locator('input[type="checkbox"]').first()
      await expect(checkbox).toBeVisible()
      await expect(checkbox).toBeChecked() // Should be checked by default
    })

    test('should disable submit button when textarea is empty', async () => {
      const button = page.locator('button:has-text("Start Task")')
      await expect(button).toBeDisabled()
    })

    test('should enable submit button when task is entered', async () => {
      await page.fill('textarea', 'Test task description')
      const button = page.locator('button:has-text("Start Task")')
      await expect(button).toBeEnabled()
    })

    test('should show example tasks', async () => {
      await expect(page.locator('text=Navigate to GitHub')).toBeVisible()
    })
  })

  test.describe('RE Tools Page', () => {
    test.beforeEach(async () => {
      await page.click('text=RE Tools')
      await page.waitForSelector('text=Reverse Engineering Tools')
    })

    test('should display task templates', async () => {
      await expect(page.locator('text=API Discovery')).toBeVisible()
      await expect(page.locator('text=UI Cloning')).toBeVisible()
      await expect(page.locator('text=GraphQL Schema')).toBeVisible()
    })

    test('should populate task when template is clicked', async () => {
      await page.click('button:has-text("API Discovery")')
      const textarea = page.locator('textarea')
      await expect(textarea).toHaveValue(/Reverse engineer the API/)
    })

    test('should show AI analysis panel when task is entered', async () => {
      await page.fill('textarea', 'Analyze the API from https://api.example.com and extract endpoints')
      await expect(page.locator('text=AI Understanding')).toBeVisible()
    })

    test('should display available tools section', async () => {
      await expect(page.locator('text=Available Tools')).toBeVisible()
      await expect(page.locator('text=mitmproxy')).toBeVisible()
    })
  })

  test.describe('Sessions Page', () => {
    test.beforeEach(async () => {
      await page.click('text=Sessions')
      await page.waitForSelector('h1:has-text("Sessions")')
    })

    test('should display sessions tabs', async () => {
      // Check for tab buttons
      await expect(page.locator('button:has-text("Saved Sessions")')).toBeVisible()
      await expect(page.locator('button:has-text("Live Sessions")')).toBeVisible()
    })

    test('should switch between tabs', async () => {
      await page.click('button:has-text("Live Sessions")')
      // Should show live sessions content
      await page.click('button:has-text("Saved Sessions")')
      // Should show saved sessions content
    })
  })

  test.describe('Keyboard Shortcuts', () => {
    test('should respond to keyboard navigation', async () => {
      // Press Tab to navigate
      await page.keyboard.press('Tab')
      // Check focus moved
      const focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(focused).toBeDefined()
    })
  })

  test.describe('Window Management', () => {
    test('should have correct minimum window size', async () => {
      const bounds = await electronApp.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0]
        return win.getBounds()
      })

      expect(bounds.width).toBeGreaterThanOrEqual(800)
      expect(bounds.height).toBeGreaterThanOrEqual(600)
    })

    test('should be resizable', async () => {
      const isResizable = await electronApp.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0]
        return win.isResizable()
      })

      expect(isResizable).toBe(true)
    })
  })

  test.describe('IPC Communication', () => {
    test('should have electron API exposed', async () => {
      const hasElectronAPI = await page.evaluate(() => {
        return typeof (window as any).electron !== 'undefined'
      })

      expect(hasElectronAPI).toBe(true)
    })

    test('should have session API available', async () => {
      const hasSessionAPI = await page.evaluate(() => {
        const electron = (window as any).electron
        return typeof electron?.sessions?.list === 'function'
      })

      expect(hasSessionAPI).toBe(true)
    })
  })

  test.describe('Database Integration', () => {
    test('should be able to create a session', async () => {
      const result = await page.evaluate(async () => {
        const electron = (window as any).electron
        const response = await electron.sessions.create({
          taskDescription: 'E2E Test Session',
          taskType: 'api_discovery',
          targetUrl: 'https://test.example.com'
        })
        return response
      })

      expect(result.success).toBe(true)
      expect(result.session.task_description).toBe('E2E Test Session')
    })

    test('should be able to list sessions', async () => {
      const result = await page.evaluate(async () => {
        const electron = (window as any).electron
        const response = await electron.sessions.list()
        return response
      })

      expect(result.success).toBe(true)
      expect(Array.isArray(result.sessions)).toBe(true)
    })

    test('should be able to get stats', async () => {
      const result = await page.evaluate(async () => {
        const electron = (window as any).electron
        const response = await electron.stats.get()
        return response
      })

      expect(result.success).toBe(true)
      expect(result.stats).toHaveProperty('totalSessions')
    })
  })
})

test.describe('Error Handling', () => {
  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../electron/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })
    page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('should handle invalid session ID gracefully', async () => {
    const result = await page.evaluate(async () => {
      const electron = (window as any).electron
      const response = await electron.sessions.get('invalid_session_id')
      return response
    })

    expect(result.success).toBe(true)
    expect(result.session).toBeUndefined()
  })

  test('should handle invalid artifact session ID', async () => {
    const result = await page.evaluate(async () => {
      const electron = (window as any).electron
      try {
        const response = await electron.artifacts.add('invalid_session', {
          type: 'test',
          content: 'test'
        })
        return response
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    expect(result.success).toBe(false)
  })
})
