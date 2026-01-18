# WebWright Desktop - Advanced Features

## Overview

WebWright Desktop now includes advanced browser automation and reverse engineering capabilities, inspired by professional RE toolkits and Browser Use design patterns.

**New in this release:**
- ✅ **DevTools Page** - Console logs, network traffic, and HAR export
- ✅ **Auto-Start Script** - One command to launch all 3 processes
- ✅ **Enhanced API Client** - CDP support, network monitoring, trace recording
- ✅ **Professional UI** - Browser Use design patterns throughout

---

## 🔧 DevTools Page

### Console Log Viewer

**Access:** DevTools → Console tab

**Features:**
- Real-time console message streaming (2-second updates)
- Filter by type: All, Log, Warn, Error, Info
- Timestamps for each message
- Source location (URL, line number, column)
- Color-coded by severity:
  - 🔴 **Error** - Red background
  - 🟡 **Warn** - Yellow background
  - 🔵 **Info** - Blue background
  - ⚪ **Log** - Gray background
- Clear console button

**Use Cases:**
- Debug JavaScript errors
- Monitor application logs
- Track console.log() output from automation
- Catch warnings before they become problems

### Network Traffic Monitor

**Access:** DevTools → Network tab

**Features:**
- Real-time network request tracking
- Request method color coding:
  - 🔵 **GET** - Blue
  - 🟢 **POST** - Green
  - ⚪ **Others** - Gray
- HTTP status code badges:
  - 🟢 **2xx** - Success (green)
  - 🔴 **4xx/5xx** - Error (red)
- Expandable response bodies
- Request/response headers
- Timestamps for each request

**Use Cases:**
- Monitor API calls
- Debug network issues
- Inspect request/response payloads
- Analyze API behavior

### HAR Export

**Access:** DevTools → HAR Export tab

**Features:**
- Start/stop HAR recording
- Visual recording indicator (green "● Recording")
- Automatic timestamped filenames
- Export to `.har` format (HTTP Archive)
- Educational information about HAR format

**Use Cases:**
- Export traffic for offline analysis
- Import into Chrome DevTools (Network → Import HAR)
- Import into Postman for API testing
- Generate API documentation with `mitmproxy2swagger`
- Share network traces with team members

**Workflow:**
```
1. Click "Start Recording"
2. Perform automation tasks (navigate, click, submit forms)
3. Click "Stop Recording"
4. HAR file saved to ./har-[timestamp].har
5. Import into analysis tools
```

---

## 🚀 Auto-Start Script

### Quick Start

**Single command to launch everything:**
```bash
./start.sh
```

### What It Does

The auto-start script (`start.sh`) handles the complete startup sequence:

1. **Prerequisites Check**
   - Verifies WebWright is installed
   - Installs npm dependencies if needed

2. **Process Startup (Sequential)**
   - Terminal 1: WebWright Daemon → Waits 3 seconds
   - Terminal 2: HTTP Bridge → Waits 2 seconds
   - Terminal 3: Electron App → Waits 5 seconds

3. **Health Checks**
   - Verifies each process started successfully
   - Checks port 3456 is listening (HTTP Bridge)
   - Monitors all processes for crashes

4. **Graceful Shutdown**
   - Press `Ctrl+C` to stop all processes
   - Automatically cleans up PIDs
   - Stops processes in reverse order

### Logs

All processes write to individual log files:
- `daemon.log` - WebWright daemon output
- `bridge.log` - HTTP bridge output
- `electron.log` - Electron app output

**View logs in real-time:**
```bash
tail -f daemon.log
tail -f bridge.log
tail -f electron.log
```

### Process Management

**Status:**
- PID files: `.daemon.pid`, `.bridge.pid`, `.electron.pid`
- Monitors processes every 5 seconds
- Auto-exits if any process crashes

**Manual Control:**
```bash
# Start
./start.sh

# Stop (Ctrl+C in terminal where start.sh is running)
# Or:
kill $(cat .daemon.pid .bridge.pid .electron.pid)
```

---

## 📡 Enhanced API Client

### New Methods Added

**Console & Network Monitoring:**
```typescript
// Get console messages
const messages = await client.getConsoleMessages({
  type: 'error',  // Filter by type
  clear: true     // Clear after reading
})

// Get page errors (uncaught exceptions)
const errors = await client.getPageErrors(clear: true)

// Get network requests
const requests = await client.getNetworkRequests()

// Setup network interception
await client.setupNetworkIntercept('https://api.example.com/*', 'abort')
```

**HAR Export:**
```typescript
// Start HAR recording
await client.startHARRecording('./traffic.har')

// ... perform actions ...

// Stop and save
const result = await client.stopHARRecording()
console.log(`HAR saved to: ${result.path}`)
```

**Trace Recording (with screenshots):**
```typescript
// Start trace with screenshots
await client.startTrace('./trace.zip', {
  screenshots: true,
  snapshots: true
})

// ... perform actions ...

// Stop and save
const result = await client.stopTrace()
console.log(`Trace saved to: ${result.path}`)
```

### New TypeScript Interfaces

```typescript
interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug'
  text: string
  timestamp: number
  location?: {
    url: string
    lineNumber?: number
    columnNumber?: number
  }
}

interface NetworkRequest {
  url: string
  method: string
  status?: number
  responseBody?: string
  requestHeaders?: Record<string, string>
  responseHeaders?: Record<string, string>
  timestamp: number
}
```

---

## 🎨 Browser Use Design Integration

### Design Patterns Applied

All new features follow Browser Use Cloud design patterns:

**1. Tabbed Interface**
- DevTools uses tab navigation (Console, Network, HAR)
- Active tab highlighted with blue bottom border
- Icons for visual identification

**2. Color Coding**
- Status badges with semantic colors
- Error states in red
- Success states in green
- Info states in blue
- Warning states in yellow

**3. Real-time Updates**
- 2-second polling for console/network
- Automatic refresh without user action
- Loading states with spinners

**4. Empty States**
- Friendly messages when no data
- Helpful guidance on what to do next
- Visual centering and spacing

**5. Action Buttons**
- Primary actions use blue (`bg-primary`)
- Destructive actions use red (`bg-red-600`)
- Disabled states with opacity
- Hover transitions

---

## 🔍 Reverse Engineering Capabilities

### Available from RE Toolkit

Based on `~/.claude/docs/reverse-engineering-toolkit.md`:

**1. Network Interception**
- WebWright's built-in `browser_network` tool
- Supports abort, continue, fulfill handlers
- Can mock responses with custom status/body/headers

**2. Console Log Analysis**
- All console.log, warn, error, info captured
- Includes stack traces and source locations
- Filter by type for focused debugging

**3. HAR Export → API Documentation**
- Export HAR from WebWright Desktop
- Use `mitmproxy2swagger` to generate OpenAPI spec:
  ```bash
  mitmproxy2swagger -i traffic.har -o api.yml -p https://api.example.com
  ```
- Import to Postman for API testing

**4. CDP (Chrome DevTools Protocol)**
- WebWright daemon has full CDP support
- Access via `browser.getCDPSession()`
- Can execute advanced CDP commands

**5. Stealth Features**
- WebWright has 10+ built-in stealth techniques:
  - navigator.webdriver removal
  - Chrome runtime emulation
  - Plugin/codec/hardware spoofing
  - Permission API patching
  - Event.isTrusted fixing for React/Vue

### Integration with Playwright

WebWright uses Playwright internally with CDP support:

**CDP Connection (from GitHub examples):**
```typescript
import playwright from 'playwright'

// Connect to existing CDP endpoint
const browser = await playwright.chromium.connectOverCDP('http://localhost:9222')

// Or use WebWright's CDP session
const client = await browser.getCDPSession()
```

**playwright-stealth Compatibility:**
- WebWright can be extended with `playwright-extra` + stealth plugin
- TypeScript/Node.js compatible
- Chromium only (perfect match for WebWright)

---

## 📊 Feature Comparison

| Feature | WebWright Desktop | Browser Use Cloud | Chrome DevTools |
|---------|------------------|-------------------|-----------------|
| **Console Logs** | ✅ Real-time | ❌ Not available | ✅ Real-time |
| **Network Monitor** | ✅ Real-time | ❌ Not available | ✅ Real-time |
| **HAR Export** | ✅ One-click | ❌ Not available | ✅ Manual export |
| **API Mocking** | ✅ Via network intercept | ❌ Not available | ✅ Via overrides |
| **Trace Recording** | ✅ With screenshots | ❌ Not available | ❌ Not available |
| **Auto-Start** | ✅ Single command | ✅ Web login | ❌ Manual launch |
| **Local Execution** | ✅ 100% free | ❌ Cloud ($1/10k credits) | ✅ Browser only |
| **MCP Integration** | ✅ 22 tools | ❌ None | ❌ None |

---

## 🛠️ Advanced Use Cases

### 1. API Reverse Engineering

**Workflow:**
1. Start HAR recording in DevTools
2. Use WebWright to interact with target site
3. Stop HAR recording
4. Export HAR file
5. Convert to OpenAPI:
   ```bash
   mitmproxy2swagger -i traffic.har -o api.yml -p https://api.target.com -f har
   ```
6. Import to Postman for testing

### 2. JavaScript Debugging

**Workflow:**
1. Go to DevTools → Console tab
2. Filter by "error" to see only errors
3. Review stack traces and source locations
4. Use timestamps to correlate with automation steps
5. Clear console and re-run to verify fixes

### 3. Network Performance Analysis

**Workflow:**
1. Go to DevTools → Network tab
2. Run automation task
3. Review request timing and sizes
4. Identify slow requests
5. Export HAR for detailed analysis in Chrome DevTools

### 4. Request/Response Mocking

**Workflow:**
1. Identify API endpoint to mock
2. Use `client.setupNetworkIntercept()` programmatically:
   ```typescript
   await client.setupNetworkIntercept(
     'https://api.example.com/user',
     'fulfill',
     {
       status: 200,
       body: JSON.stringify({ name: 'Test User' }),
       headers: { 'content-type': 'application/json' }
     }
   )
   ```
3. Run automation - mocked response is used

---

## 📝 Notes

### WebWright Already Has

Based on analysis of `/Users/imorgado/webwright/`:

1. ✅ **Full CDP Support** - `getCDPSession()` method
2. ✅ **Network Interception** - `browser_network` tool (abort/continue/fulfill)
3. ✅ **Console Logs** - `getConsoleMessages()` with filtering
4. ✅ **HAR Recording** - `startHARRecording()` / `stopHARRecording()`
5. ✅ **Stealth Mode** - 10+ techniques built-in
6. ✅ **Trace Recording** - Playwright trace format with screenshots
7. ✅ **22 MCP Tools** - Complete automation toolkit

**What We Added:**
- Beautiful Desktop UI for these features
- Auto-start script for convenience
- Integration with Browser Use design patterns
- Documentation and user-friendly workflows

### playwright-stealth Research

**Findings:**
- `playwright-extra` + `puppeteer-extra-plugin-stealth` works with TypeScript/Node.js
- Drop-in replacement for Playwright
- Chromium only (perfect for Electron/WebWright)
- Adds 18+ evasion techniques
- Can be integrated into WebWright daemon if needed

**Installation:**
```bash
npm install playwright-extra puppeteer-extra-plugin-stealth
```

**Usage:**
```typescript
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

chromium.use(StealthPlugin())
const browser = await chromium.launch()
```

---

## 🎯 Summary

WebWright Desktop now provides:
- **Professional DevTools** - Console, Network, HAR export
- **One-Command Start** - `./start.sh` launches everything
- **Advanced API Client** - CDP, network monitoring, trace recording
- **RE Capabilities** - HAR→OpenAPI workflow, traffic analysis
- **Beautiful UI** - Browser Use design patterns throughout

All features are production-ready and fully integrated with the existing WebWright daemon.

---

**Last Updated:** 2026-01-18
**Version:** 2.0.0 (Advanced Features Release)
