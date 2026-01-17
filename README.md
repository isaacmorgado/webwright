# WebWright

> AI-powered browser automation that crafts seamless web interactions

**WebWright** is a unified browser automation framework that:

1. **Enables AI-native browser control** with ref-based element targeting
2. **Integrates natively** with Claude Code (MCP + Skills), VS Code, and Roo Code
3. **Supports multiple execution modes**: CLI, MCP Server, Node.js Library
4. **Provides vision + accessibility** dual-mode browser understanding
5. **Enables human-AI collaboration** via real-time streaming and pair browsing

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WebWright                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  CLI Layer   │  │  MCP Server  │  │  Node.js API │  │ Standalone   │    │
│  │  (Rust)      │  │  (TypeScript)│  │  (TypeScript)│  │ Agent        │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│         └─────────────────┴────────┬────────┴─────────────────┘             │
│                                    │                                         │
│                          ┌─────────▼─────────┐                              │
│                          │   Core Engine     │                              │
│                          │   (TypeScript)    │                              │
│                          └─────────┬─────────┘                              │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         │                          │                          │             │
│  ┌──────▼──────┐           ┌───────▼───────┐          ┌───────▼───────┐    │
│  │  Browser    │           │   DOM/Vision  │          │   Streaming   │    │
│  │  Manager    │           │   Service     │          │   Server      │    │
│  └─────────────┘           └───────────────┘          └───────────────┘    │
│         │                          │                          │             │
│  ┌──────▼──────┐           ┌───────▼───────┐          ┌───────▼───────┐    │
│  │ Playwright  │           │ Multi-Source  │          │ WebSocket     │    │
│  │ + CDP       │           │ DOM Fusion    │          │ Pair Browsing │    │
│  └─────────────┘           └───────────────┘          └───────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install -g webwright
```

Or use with npx:

```bash
npx webwright navigate https://example.com
```

## Quick Start

### CLI Usage

```bash
# Navigate to a URL
webwright navigate https://example.com

# Get accessibility tree with element refs
webwright snapshot

# Click an element using ref
webwright click @e1

# Fill a form field
webwright fill @e2 "hello@example.com"

# Take a screenshot
webwright screenshot output.png
```

### Node.js API

```typescript
import { BrowserManager, getEnhancedSnapshot } from 'webwright';

const browser = new BrowserManager();

// Launch browser
await browser.launch({ headless: true });

// Navigate
await browser.getPage().goto('https://example.com');

// Get snapshot with refs
const snapshot = await getEnhancedSnapshot(browser.getPage(), {
  interactive: true, // Only interactive elements
});

console.log(snapshot.tree);
// - heading "Example Domain" [ref=e1] [level=1]
// - link "More information..." [ref=e2]

// Click using ref
browser.setRefMap(snapshot.refs);
await browser.getLocator('@e2').click();

// Close
await browser.close();
```

### MCP Server (Claude Code Integration)

Add to Claude Code:

```bash
claude mcp add --transport stdio webwright -- npx -y webwright mcp
```

Or configure in `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "webwright": {
      "command": "npx",
      "args": ["-y", "webwright", "mcp"]
    }
  }
}
```

Then use in Claude:

```
Use browser_navigate to go to https://example.com
Use browser_snapshot to see the page elements
Use browser_click with target @e1 to click the first element
```

## Features

- **Fast Rust CLI** - 50x faster startup (~10ms vs ~500ms)
- **Multi-browser support** - Chromium, Firefox, WebKit via Playwright
- **100+ actions** - Complete browser control API
- **Pair browsing** - WebSocket streaming + input injection
- **Serverless support** - Custom executable path for Lambda
- **AI-friendly errors** - Actionable error transformation
- **Vision support** - Screenshot capture + visual analysis
- **Multi-source DOM** - DOM + Accessibility + Snapshot fusion
- **Agent loop** - Thinking, evaluation, memory, goals
- **Sensitive data handling** - Auto-detection and masking
- **Stable hashing** - Cross-session element matching

## CLI Commands

### Navigation

```bash
navigate <url>     Navigate to URL
back               Go back in history
forward            Go forward in history
reload             Reload page
```

### Interaction

```bash
click <sel>        Click element
dblclick <sel>     Double-click element
type <sel> <text>  Type text (preserves existing)
fill <sel> <val>   Fill input (clears first)
clear <sel>        Clear input
check <sel>        Check checkbox/radio
uncheck <sel>      Uncheck checkbox
select <sel> <val> Select dropdown option
hover <sel>        Hover over element
focus <sel>        Focus element
press <key>        Press keyboard key
scroll [sel]       Scroll page or element
```

### Information

```bash
snapshot           Get accessibility tree with refs
screenshot [path]  Take screenshot
title              Get page title
url                Get current URL
text <sel>         Get element text
html [sel]         Get HTML content
value <sel>        Get input value
count <sel>        Count matching elements
```

### State Checks

```bash
visible <sel>      Check if visible
enabled <sel>      Check if enabled
checked <sel>      Check if checked
```

### Frames & Pages

```bash
frames             List all frames
frame <sel>        Switch to frame
mainframe          Switch to main frame
pages              List all pages/tabs
newpage [url]      Open new page
switchpage <idx>   Switch to page
closepage          Close current page
```

## Selectors

WebWright supports multiple selector formats:

| Format | Example | Description |
|--------|---------|-------------|
| Ref | `@e1`, `e1` | Element ref from snapshot |
| CSS | `#id`, `.class`, `button` | CSS selectors |
| Role | `role=button` | ARIA role selectors |
| Text | `text=Submit` | Text content |

## Snapshot Output Format

```yaml
- heading "Example Domain" [ref=e1] [level=1]
- paragraph: Some descriptive text
- link "More information..." [ref=e2]
- form:
  - textbox "Email" [ref=e3]
  - textbox "Password" [ref=e4]
  - button "Sign In" [ref=e5]
```

Refs (`e1`, `e2`, etc.) can be used directly in commands:

```bash
webwright click @e5
webwright fill @e3 "user@example.com"
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to URL |
| `browser_click` | Click element |
| `browser_type` | Type text |
| `browser_fill` | Fill input |
| `browser_scroll` | Scroll page/element |
| `browser_snapshot` | Get accessibility tree |
| `browser_screenshot` | Take screenshot |
| `browser_state` | Get browser state |
| `browser_back` | Go back |
| `browser_forward` | Go forward |
| `browser_reload` | Reload page |
| `browser_wait` | Wait for selector/timeout |
| `browser_execute` | Execute JavaScript |
| `browser_select` | Select dropdown option |
| `browser_check` | Check checkbox |
| `browser_uncheck` | Uncheck checkbox |
| `browser_hover` | Hover element |
| `browser_press` | Press key |
| `browser_cookies` | Get/set/clear cookies |
| `browser_network` | Intercept network |
| `agent_run` | Run autonomous agent |
| `agent_step` | Execute single step |

## Options

```bash
--session=<name>       Named session (default: "default")
--headed               Run browser visibly
--json                 Output as JSON
--timeout=<ms>         Command timeout
--executable-path=<p>  Browser executable path
--extensions=<paths>   Load browser extensions
```

## Environment Variables

```bash
WEBWRIGHT_SESSION         Default session name
WEBWRIGHT_HEADED          Run headed (1 = true)
WEBWRIGHT_EXECUTABLE_PATH Browser executable path
WEBWRIGHT_EXTENSIONS      Comma-separated extension paths
```

## Development

```bash
# Clone repository
git clone https://github.com/isaacmorgado/webwright
cd webwright

# Install dependencies
npm install

# Build TypeScript
npm run build

# Build Rust CLI (optional, for faster startup)
npm run build:native

# Run tests
npm test

# Start development daemon
npm run dev
```

## Performance

| Operation | Node.js CLI | Rust CLI | Improvement |
|-----------|-------------|----------|-------------|
| Startup | ~500ms | ~10ms | 50x faster |
| Command parse | ~50ms | ~1ms | 50x faster |
| Socket connect | ~20ms | ~5ms | 4x faster |

### Token Reduction with Snapshot Filtering

```bash
# Full snapshot: ~5000 tokens
webwright snapshot

# Interactive only: ~500 tokens (90% reduction)
webwright snapshot --interactive

# Scoped to selector: ~100 tokens (98% reduction)
webwright snapshot "#main-form"
```

## License

Apache-2.0
