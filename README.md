# WebWright Desktop

A beautiful Electron desktop application for [WebWright](https://github.com/webwright/webwright) browser automation. Control your local WebWright daemon through an intuitive GUI.

## Features

✅ **Local Automation** - All browser automation runs on YOUR machine (100% free)
✅ **Beautiful UI** - Clean, modern interface based on Browser Use design patterns
✅ **Real-time Session Monitoring** - Live updates every 2 seconds
✅ **Task Management** - Create, monitor, and control automation tasks
✅ **Daemon Status** - Visual indicator of WebWright daemon connection
✅ **WebWright Integration** - Connects to WebWright daemon via HTTP bridge

### Advanced Features (v2.0+)

✅ **DevTools Page** - Console logs, network traffic, and HAR export
✅ **Auto-Start Script** - One command to launch all 3 processes
✅ **Enhanced API Client** - CDP support, network monitoring, trace recording
✅ **Professional UI** - Browser Use design patterns throughout
✅ **Reverse Engineering** - HAR export → OpenAPI workflow

See [ADVANCED-FEATURES.md](./ADVANCED-FEATURES.md) for complete documentation.

## Tech Stack

- **Electron 28** - Cross-platform desktop app
- **React 18** - Modern UI with TypeScript
- **React Query** - State management and real-time updates
- **Tailwind CSS** - Beautiful, responsive styling
- **WebWright Daemon** - Local Playwright-based browser automation

## Quick Start

**Single command to launch everything:**

```bash
./start.sh
```

This auto-start script will:
1. Start WebWright daemon
2. Start HTTP bridge
3. Launch Electron app
4. Monitor all processes
5. Gracefully shutdown on Ctrl+C

All processes log to `daemon.log`, `bridge.log`, and `electron.log`.

## Prerequisites

1. **Node.js 18+** (recommended: use nvm)
2. **WebWright** installed globally or locally
   ```bash
   npm install -g webwright
   # or use npx: npx webwright daemon
   ```

## Installation

### 1. Install Dependencies

```bash
cd webwright-desktop
npm install
```

### 2. Start WebWright Daemon

In a separate terminal, start the WebWright daemon:

```bash
webwright daemon
```

Or if installed locally:

```bash
npx webwright daemon
```

### 3. Start HTTP Bridge

The HTTP bridge connects the Electron app to the WebWright daemon:

```bash
node webwright-http-bridge.js
```

You should see:

```
╔════════════════════════════════════════════════════╗
║  WebWright HTTP Bridge                             ║
╠════════════════════════════════════════════════════╣
║  HTTP API: http://localhost:3456                   ║
║  Session:  default                                 ║
║  Daemon:   ✓ Running                               ║
╚════════════════════════════════════════════════════╝
```

### 4. Run the Desktop App

In another terminal:

```bash
npm run electron:dev
```

The Electron app will launch with:
- Vite dev server on port 5173
- Electron window with the WebWright UI
- Hot module replacement enabled

## Usage

### Creating a Task

1. Open the **New Task** page (default home page)
2. Enter your task description:
   - "Go to Hacker News and get the top 5 post titles"
   - "Navigate to GitHub and search for 'playwright'"
   - "Open Amazon and find the price of 'wireless mouse'"
3. Click **Start Task**
4. The task will appear in the **Sessions** page

### Monitoring Sessions

1. Go to **Sessions** page
2. See all active and completed sessions
3. Real-time status updates every 2 seconds
4. Actions available:
   - **Stop** - Stop running sessions
   - **Delete** - Remove sessions from list

### DevTools

1. Go to **DevTools** page
2. Three tabs available:
   - **Console** - Real-time console logs with filtering (All, Log, Warn, Error, Info)
   - **Network** - Network request monitoring with status codes and payloads
   - **HAR Export** - Record all network traffic to HAR format

**Use Cases:**
- Debug JavaScript errors in automation
- Monitor API calls and responses
- Export traffic for analysis in Chrome DevTools or Postman
- Generate API documentation with mitmproxy2swagger

### Settings

1. Go to **Settings** page
2. View daemon status and connection info
3. See WebWright features and version

## Architecture

```
┌─────────────────────────────────────────┐
│   Electron Desktop App (React + TS)     │
│   http://localhost:5173                 │
└─────────────────┬───────────────────────┘
                  │
                  │ HTTP (port 3456)
                  ▼
┌─────────────────────────────────────────┐
│   WebWright HTTP Bridge (Node.js)       │
│   Translates HTTP → Unix Socket/TCP     │
└─────────────────┬───────────────────────┘
                  │
                  │ Unix Socket / TCP
                  ▼
┌─────────────────────────────────────────┐
│   WebWright Daemon                       │
│   - 22 MCP tools                        │
│   - Playwright automation               │
│   - Ref-based targeting                 │
└─────────────────┬───────────────────────┘
                  │
                  │ CDP / Playwright
                  ▼
┌─────────────────────────────────────────┐
│   Local Browser (Chromium/Firefox)      │
└─────────────────────────────────────────┘
```

## Development

### Available Scripts

```bash
# Start Vite dev server only
npm run dev

# Run Electron only (requires dev server running)
npm run electron

# Run both dev server + Electron
npm run electron:dev

# Build React app
npm run build

# Build Electron app for distribution
npm run electron:build

# Type check
npm run type-check
```

### Build for Production

Build the Electron app for your platform:

```bash
npm run electron:build
```

Builds are output to `dist/` directory:
- **macOS:** `.dmg` and `.app`
- **Windows:** `.exe` installer
- **Linux:** `.AppImage`

## Project Structure

```
webwright-desktop/
├── electron/              # Electron main process
│   ├── main.js           # Window management
│   └── preload.js        # Security bridge
├── src/
│   ├── components/       # React components
│   │   ├── Layout.tsx
│   │   └── DaemonStatus.tsx
│   ├── pages/            # Page components
│   │   ├── NewTaskPage.tsx
│   │   ├── SessionsPage.tsx
│   │   ├── DevToolsPage.tsx   # NEW: Console, Network, HAR
│   │   └── SettingsPage.tsx
│   ├── lib/
│   │   └── webwright-client.ts  # HTTP client for daemon (enhanced with CDP)
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── webwright-http-bridge.js  # HTTP → Unix socket bridge
├── start.sh              # NEW: Auto-start script
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── ADVANCED-FEATURES.md  # NEW: Advanced features documentation
```

## WebWright Features

WebWright provides 22 MCP tools for browser automation:

**Navigation:**
- `browser_navigate` - Go to URL
- `browser_back` / `browser_forward` / `browser_reload`

**Interaction:**
- `browser_click` - Click elements by ref
- `browser_type` / `browser_fill` - Text input
- `browser_scroll` - Scroll page
- `browser_select` - Dropdown selection
- `browser_check` / `browser_uncheck` - Checkboxes
- `browser_hover` / `browser_press` - Mouse & keyboard

**Information:**
- `browser_snapshot` - Get accessibility tree with refs
- `browser_screenshot` - Take page screenshots
- `browser_state` - Get URL/title/viewport

**Advanced:**
- `browser_wait` - Wait for selectors
- `browser_execute` - Run JavaScript
- `browser_cookies` - Cookie management

**DevTools & Debugging:**
- `browser_console` - Get console messages (log, warn, error, info)
- `browser_errors` - Get page errors
- `browser_get_requests` - Get network requests
- `browser_network` - Setup network interception (abort/continue/fulfill)
- `browser_start_har` / `browser_stop_har` - HAR recording
- `browser_start_trace` / `browser_stop_trace` - Trace recording with screenshots

**Agent:**
- `agent_run` - Autonomous agent execution
- `agent_step` - Single step execution

## Comparison with Browser Use

| Feature | WebWright Desktop | Browser Use Cloud |
|---------|------------------|-------------------|
| **Execution** | Local (your machine) | Cloud (remote servers) |
| **Cost** | 100% Free | Pay per use ($1/10k credits) |
| **Privacy** | Everything local | Data sent to cloud |
| **Browser** | Playwright (Chromium/Firefox/WebKit) | Cloud CDP sessions |
| **Speed** | Fast (local) | Network latency |
| **Console Logs** | ✅ Real-time | ❌ Not available |
| **Network Monitor** | ✅ Real-time | ❌ Not available |
| **HAR Export** | ✅ One-click | ❌ Not available |
| **API Mocking** | ✅ Via network intercept | ❌ Not available |
| **Trace Recording** | ✅ With screenshots | ❌ Not available |
| **Auto-Start** | ✅ Single command | ✅ Web login |
| **MCP Integration** | ✅ 22 tools | ❌ None |
| **Scaling** | Limited by local resources | 100+ concurrent sessions |
| **API Key Required** | ❌ No | ✅ Yes |

**When to use WebWright Desktop:**
- Development and testing
- Privacy-sensitive tasks
- No budget for cloud automation
- Need MCP integration with Claude Code
- Want full control over browser

**When to use Browser Use Cloud:**
- Need to scale to 100+ concurrent sessions
- Don't want to manage local infrastructure
- Okay with cloud execution

## Advanced Features & Workflows

WebWright Desktop v2.0+ includes professional reverse engineering and browser automation capabilities. See [ADVANCED-FEATURES.md](./ADVANCED-FEATURES.md) for complete documentation.

### API Reverse Engineering Workflow

1. Start HAR recording in DevTools
2. Use WebWright to interact with target site
3. Stop HAR recording
4. Export HAR file
5. Convert to OpenAPI spec:
   ```bash
   mitmproxy2swagger -i traffic.har -o api.yml -p https://api.target.com -f har
   ```
6. Import to Postman for testing

### JavaScript Debugging Workflow

1. Go to DevTools → Console tab
2. Filter by "error" to see only errors
3. Review stack traces and source locations
4. Use timestamps to correlate with automation steps
5. Clear console and re-run to verify fixes

### Network Performance Analysis

1. Go to DevTools → Network tab
2. Run automation task
3. Review request timing and sizes
4. Identify slow requests
5. Export HAR for detailed analysis in Chrome DevTools

### Request/Response Mocking

```typescript
import { WebWrightClient } from './lib/webwright-client'

const client = new WebWrightClient()

// Mock API endpoint
await client.setupNetworkIntercept(
  'https://api.example.com/user',
  'fulfill',
  {
    status: 200,
    body: JSON.stringify({ name: 'Test User' }),
    headers: { 'content-type': 'application/json' }
  }
)

// Run automation - mocked response is used
```

## Troubleshooting

### "Daemon is offline" Error

**Problem:** HTTP bridge can't connect to WebWright daemon

**Solution:**
1. Make sure WebWright daemon is running:
   ```bash
   webwright daemon
   ```
2. Check the daemon is listening (you should see output)
3. Restart the HTTP bridge:
   ```bash
   node webwright-http-bridge.js
   ```

### Port 3456 Already in Use

**Problem:** HTTP bridge port is occupied

**Solution:**
1. Find process using port 3456:
   ```bash
   lsof -i :3456
   ```
2. Kill the process or edit `webwright-http-bridge.js` to use a different port
3. If you change the port, also update `src/lib/webwright-client.ts`

### Electron Won't Start

**Problem:** `npm run electron:dev` fails

**Solution:**
1. Make sure port 5173 is not in use
2. Try running `npm run dev` first to test Vite server
3. Check console for errors
4. Clear cache: `rm -rf node_modules dist && npm install`

### Sessions Not Updating

**Problem:** Session list doesn't refresh

**Solution:**
1. Check HTTP bridge is running
2. Check WebWright daemon is running
3. Refresh the app (Cmd+R / Ctrl+R)
4. Check browser console for errors (DevTools: Cmd+Option+I / F12)

## Development Notes

### HTTP Bridge vs Direct Socket Connection

This app uses an HTTP bridge (`webwright-http-bridge.js`) to connect to the WebWright daemon instead of direct Unix socket/TCP connection because:

1. **Browser Compatibility** - Electron renderer can't directly access Unix sockets
2. **Separation of Concerns** - Keeps Electron code clean and focused on UI
3. **Future Extensibility** - HTTP API can be used by other clients (mobile, web, etc.)
4. **WebSocket Ready** - Can easily add WebSocket support for real-time streaming

### Why Not Modify WebWright Daemon?

The HTTP bridge approach is better than modifying the WebWright daemon because:

1. **No Core Changes** - WebWright daemon stays focused on its purpose
2. **Easy Updates** - Can update WebWright without breaking the desktop app
3. **Optional Layer** - HTTP bridge only runs when needed
4. **Multiple Clients** - Can have multiple UIs (desktop, web, mobile) using same bridge

## Credits

- **WebWright:** [webwright/webwright](https://github.com/webwright/webwright) - Browser automation framework
- **UI Design:** Inspired by [Browser Use Cloud](https://cloud.browser-use.com)
- **Electron:** Cross-platform desktop framework
- **React Query:** State management and polling
- **Tailwind CSS:** Modern CSS framework

## License

MIT

---

**Built with ❤️ for the WebWright community**
