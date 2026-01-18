# Playwright-Stealth Integration Guide

Step-by-step guide to integrate playwright-stealth into WebWright Desktop.

---

## Overview

**Problem:** WebWright uses standard Playwright, which can be detected as a bot by many websites.

**Solution:** Integrate `playwright-extra` with `puppeteer-extra-plugin-stealth` to bypass bot detection.

**Note:** The user linked to Python's `playwright-stealth` (https://pypi.org/project/playwright-stealth/), but WebWright uses JavaScript/TypeScript. The JavaScript equivalent is `playwright-extra`.

---

## JavaScript vs Python Playwright-Stealth

### Python Version (Not Applicable)
```python
# This is for Python - NOT what we need
from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    stealth_sync(page)  # Apply stealth
```

### JavaScript Version (What We Need)
```javascript
// This is for JavaScript/TypeScript - What we WILL use
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

chromium.use(StealthPlugin())

const browser = await chromium.launch()
const page = await browser.newPage()
// Stealth already applied automatically
```

---

## Implementation Steps

### Step 1: Install Dependencies

**Location:** WebWright daemon (not Electron app)

```bash
# Navigate to WebWright installation
cd ~/webwright

# Install playwright-extra and stealth plugin
npm install playwright-extra puppeteer-extra-plugin-stealth

# Verify installation
npm list | grep -E "playwright-extra|stealth"
```

**Expected Output:**
```
├── playwright-extra@4.3.6
└── puppeteer-extra-plugin-stealth@2.11.2
```

---

### Step 2: Modify WebWright Browser Manager

**File:** `~/webwright/src/browser/manager.ts`

**Find this code:**
```typescript
import { chromium, firefox, webkit, Browser } from 'playwright'

export class BrowserManager {
  private browser: Browser | null = null

  async launch(browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium') {
    if (browserType === 'chromium') {
      this.browser = await chromium.launch({
        headless: false
      })
    }
    // ...
  }
}
```

**Replace with:**
```typescript
// Import playwright-extra instead of playwright
import { chromium as playwrightChromium, firefox, webkit, Browser } from 'playwright'
import { chromium as chromiumExtra } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

// Apply stealth plugin to chromium
chromiumExtra.use(StealthPlugin())

export class BrowserManager {
  private browser: Browser | null = null
  private useStealth: boolean = true  // Add config option

  async launch(
    browserType: 'chromium' | 'firefox' | 'webkit' = 'chromium',
    options: { stealth?: boolean } = {}
  ) {
    const useStealth = options.stealth ?? this.useStealth

    if (browserType === 'chromium') {
      // Use stealth chromium or regular chromium
      const chromiumLauncher = useStealth ? chromiumExtra : playwrightChromium

      this.browser = await chromiumLauncher.launch({
        headless: false,
        args: useStealth ? [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process'
        ] : []
      })
    } else {
      // Firefox and WebKit don't support stealth plugin (Chromium-only)
      if (browserType === 'firefox') {
        this.browser = await firefox.launch({ headless: false })
      } else {
        this.browser = await webkit.launch({ headless: false })
      }
    }

    return this.browser
  }
}
```

---

### Step 3: Add Stealth Configuration

**File:** `~/webwright/src/config/config.ts` (or wherever config is)

```typescript
export interface WebWrightConfig {
  browser: {
    type: 'chromium' | 'firefox' | 'webkit'
    headless: boolean
    stealth: boolean  // NEW
  }
}

export const defaultConfig: WebWrightConfig = {
  browser: {
    type: 'chromium',
    headless: false,
    stealth: true  // Enable stealth by default
  }
}
```

---

### Step 4: Update MCP Tool Interface

**File:** `~/webwright/src/mcp/server.ts`

**Add stealth parameter to browser tools:**

```typescript
tools: {
  browser_navigate: {
    description: 'Navigate to URL',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        stealth: { type: 'boolean', description: 'Use stealth mode (default: true)' }
      },
      required: ['url']
    }
  }
}
```

**Handler:**
```typescript
async browser_navigate(params: { url: string, stealth?: boolean }) {
  if (!this.browser) {
    await this.browserManager.launch('chromium', {
      stealth: params.stealth ?? true
    })
  }

  const page = await this.browser.newPage()
  await page.goto(params.url)

  return { success: true }
}
```

---

### Step 5: Test Stealth Features

**Create test script:** `test-stealth.ts`

```typescript
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

chromium.use(StealthPlugin())

async function testStealth() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  console.log('Testing stealth on bot detection sites...')

  // Test 1: Sannysoft Bot Detector
  await page.goto('https://bot.sannysoft.com/')
  await page.waitForTimeout(5000)
  await page.screenshot({ path: 'test-sannysoft.png' })
  console.log('✓ Sannysoft test complete')

  // Test 2: Are You Headless
  await page.goto('https://arh.antoinevastel.com/bots/areyouheadless')
  await page.waitForTimeout(3000)
  await page.screenshot({ path: 'test-headless.png' })
  console.log('✓ Headless test complete')

  // Test 3: WebDriver detection
  const webdriverResult = await page.evaluate(() => {
    return {
      webdriver: navigator.webdriver,
      chrome: window.chrome,
      permissions: navigator.permissions,
      plugins: navigator.plugins.length
    }
  })
  console.log('WebDriver detection:', webdriverResult)

  await browser.close()
}

testStealth()
```

**Run test:**
```bash
npx tsx test-stealth.ts
```

**Expected Results:**
- ✅ `navigator.webdriver` should be `undefined` (not `true`)
- ✅ `window.chrome` should exist
- ✅ `navigator.plugins` should have entries
- ✅ Bot detection sites should show "You are NOT a bot"

---

### Step 6: Update WebWright Desktop Client

**File:** `webwright-desktop/src/lib/webwright-client.ts`

**Add stealth parameter:**

```typescript
export class WebWrightClient {
  // ...

  async navigate(url: string, options?: { stealth?: boolean }): Promise<void> {
    return this.sendCommand('browser_navigate', {
      url,
      stealth: options?.stealth ?? true  // Stealth by default
    })
  }

  async createStealthSession(): Promise<string> {
    // Create new session with stealth enabled
    return this.sendCommand('session_create', {
      browser_type: 'chromium',
      stealth: true
    })
  }
}
```

---

### Step 7: Update Desktop UI

**File:** `webwright-desktop/src/pages/NewTaskPage.tsx`

**Add stealth toggle:**

```typescript
export default function NewTaskPage() {
  const [taskDescription, setTaskDescription] = useState('')
  const [useStealth, setUseStealth] = useState(true)  // NEW

  const handleSubmit = async () => {
    const client = new WebWrightClient()

    // Create session with stealth option
    await client.createTask(taskDescription, {
      stealth: useStealth
    })
  }

  return (
    <div>
      {/* ... */}

      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useStealth}
            onChange={(e) => setUseStealth(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">
            🥷 Use Stealth Mode (bypass bot detection)
          </span>
        </label>
      </div>

      {/* ... */}
    </div>
  )
}
```

---

## Stealth Features Breakdown

### What Gets Fixed

1. **navigator.webdriver**
   - Before: `true` (detected as bot)
   - After: `undefined` (looks like real browser)

2. **Chrome Object**
   - Before: Missing `window.chrome`
   - After: Full Chrome API emulation

3. **Plugins & MIME Types**
   - Before: `navigator.plugins.length === 0`
   - After: Realistic plugin list

4. **Permissions API**
   - Before: Broken permission queries
   - After: Proper permission handling

5. **WebGL Fingerprint**
   - Before: Detectable automation fingerprint
   - After: Randomized, realistic fingerprint

6. **Canvas Fingerprint**
   - Before: Consistent automation signature
   - After: Randomized canvas rendering

7. **User-Agent Client Hints**
   - Before: Missing or incorrect
   - After: Proper Chrome-like hints

8. **Event.isTrusted**
   - Before: `false` for automated events
   - After: `true` (critical for React/Vue detection)

### Advanced Evasions (18 total)

See full list: https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth/evasions

---

## Testing Bot Detection Bypass

### Test Sites

1. **Sannysoft Bot Detector**
   - URL: https://bot.sannysoft.com/
   - Tests: 15+ detection methods
   - Goal: All green checkmarks

2. **Are You Headless**
   - URL: https://arh.antoinevastel.com/bots/areyouheadless
   - Tests: Headless detection
   - Goal: "You are not Chrome headless"

3. **Pixelscan Bot Detector**
   - URL: https://pixelscan.net/
   - Tests: 50+ fingerprint checks
   - Goal: High "Human Score"

4. **Cloudflare Turnstile**
   - URL: Various Cloudflare-protected sites
   - Tests: Bot challenges
   - Goal: Pass without CAPTCHA

5. **reCAPTCHA v3**
   - URL: Sites with reCAPTCHA
   - Tests: Behavioral analysis
   - Goal: High score (> 0.7)

### Verification Script

```typescript
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

chromium.use(StealthPlugin())

async function verifyBypass() {
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()

  const tests = [
    'https://bot.sannysoft.com/',
    'https://arh.antoinevastel.com/bots/areyouheadless',
    'https://pixelscan.net/'
  ]

  for (const url of tests) {
    console.log(`Testing: ${url}`)
    await page.goto(url)
    await page.waitForTimeout(5000)
    await page.screenshot({ path: `verify-${url.split('/')[2]}.png` })
  }

  await browser.close()
  console.log('✓ All tests complete - check screenshots')
}

verifyBypass()
```

---

## Troubleshooting

### Issue 1: Still Detected as Bot

**Symptoms:** Websites still block or challenge
**Solution:**
```typescript
// Add more anti-detection args
const browser = await chromiumExtra.launch({
  headless: false,
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-site-isolation-trials',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
})
```

### Issue 2: Playwright-Extra Not Working

**Symptoms:** Import errors or stealth not applied
**Solution:**
```bash
# Make sure versions are compatible
npm list playwright playwright-extra

# Should be similar versions (both 1.x)
# If not, update:
npm install playwright@latest playwright-extra@latest
```

### Issue 3: WebDriver Still Visible

**Symptoms:** `navigator.webdriver === true`
**Solution:**
```typescript
// Override in page context
await page.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined
  })
})
```

---

## Performance Impact

**Stealth Plugin Overhead:**
- Launch time: +200-500ms (minimal)
- Memory: +10-20MB per page
- CPU: Negligible
- Navigation: No impact

**Recommendation:** Enable stealth by default, allow users to disable for performance-critical tasks.

---

## Configuration Recommendations

### Development
```json
{
  "browser": {
    "stealth": true,
    "headless": false
  }
}
```

### Production
```json
{
  "browser": {
    "stealth": true,
    "headless": true,
    "args": [
      "--disable-blink-features=AutomationControlled"
    ]
  }
}
```

### Performance Testing
```json
{
  "browser": {
    "stealth": false,  // Disable for benchmarks
    "headless": true
  }
}
```

---

## Next Steps

After integrating playwright-stealth:

1. **Test on real targets:**
   - LinkedIn scraping
   - Cloudflare-protected sites
   - reCAPTCHA sites

2. **Add UI controls:**
   - Stealth mode toggle in settings
   - Per-task stealth configuration

3. **Document limitations:**
   - Works only with Chromium (not Firefox/WebKit)
   - Some sites still detect (Akamai, PerimeterX)
   - CAPTCHA solving may still be needed

4. **Integrate with RE workflows:**
   - Use stealth for API discovery
   - Use stealth for scraping tasks
   - Combine with mitmproxy for analysis

---

## Resources

- **playwright-extra:** https://github.com/berstend/puppeteer-extra/tree/master/packages/playwright-extra
- **Stealth Plugin:** https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth
- **Evasions List:** https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth/evasions
- **Bot Detection Tests:** https://bot.sannysoft.com/

---

**Status:** Ready for Implementation
**Estimated Time:** 2-3 hours
**Difficulty:** Medium
**Priority:** High

---

**Last Updated:** 2026-01-18
