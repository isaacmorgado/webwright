# WebWright Integrations Guide

This guide explains how to integrate WebWright with Claude Code, VS Code, Cursor, and Roo Code.

## Quick Start

```bash
# Install globally
npm install -g webwright

# Or run from this directory
npm install
npm run build
```

## 1. Claude Code Integration

### Option A: Add via CLI (Recommended)

```bash
claude mcp add --transport stdio webwright -- npx -y webwright mcp
```

### Option B: Edit settings.json

Add to `~/.claude/settings.json` under `mcpServers`:

```json
{
  "mcpServers": {
    "webwright": {
      "command": "node",
      "args": ["/path/to/webwright/bin/agentbrowser-pro", "mcp"]
    }
  }
}
```

### Option C: Use npx (after publishing to npm)

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

### Verify Installation

After adding, restart Claude Code and try:

```
Use browser_navigate to go to https://example.com
Use browser_snapshot to see the page elements
```

## 2. VS Code Integration

### Claude Extension for VS Code

Add to `.vscode/settings.json`:

```json
{
  "claude.mcp.servers": {
    "webwright": {
      "command": "node",
      "args": ["${workspaceFolder}/bin/agentbrowser-pro", "mcp"],
      "transport": "stdio"
    }
  }
}
```

Or for global installation:

```json
{
  "claude.mcp.servers": {
    "webwright": {
      "command": "npx",
      "args": ["-y", "webwright", "mcp"],
      "transport": "stdio"
    }
  }
}
```

## 3. Cursor / Roo Code Integration

### Option A: Project-level config

Create `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "webwright": {
      "command": "node",
      "args": ["./bin/agentbrowser-pro", "mcp"],
      "cwd": "/path/to/webwright"
    }
  }
}
```

### Option B: Global config

Edit `~/.cursor/mcp.json`:

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

## 4. Windsurf Integration

Edit `~/.codeium/windsurf/mcp_config.json`:

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

## Available MCP Tools

Once integrated, you have access to these tools:

### Navigation
| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to URL |
| `browser_back` | Go back in history |
| `browser_forward` | Go forward in history |
| `browser_reload` | Reload page |

### Interaction
| Tool | Description |
|------|-------------|
| `browser_click` | Click element by ref/selector |
| `browser_type` | Type text (preserves existing) |
| `browser_fill` | Fill input (clears first) |
| `browser_scroll` | Scroll page/element |
| `browser_select` | Select dropdown option |
| `browser_check` | Check checkbox |
| `browser_uncheck` | Uncheck checkbox |
| `browser_hover` | Hover element |
| `browser_press` | Press keyboard key |

### Information
| Tool | Description |
|------|-------------|
| `browser_snapshot` | Get accessibility tree with refs |
| `browser_screenshot` | Take screenshot |
| `browser_state` | Get URL/title/viewport |

### Agent
| Tool | Description |
|------|-------------|
| `agent_run` | Run autonomous agent loop |
| `agent_step` | Execute single agent step |

## Usage Examples

### Basic Navigation

```
Navigate to https://github.com and take a snapshot
```

### Form Filling

```
1. Navigate to https://example.com/login
2. Use browser_snapshot to see the form elements
3. Use browser_fill with target @e1 and value "user@example.com"
4. Use browser_fill with target @e2 and value "password123"
5. Use browser_click with target @e3 to submit
```

### Web Scraping

```
1. Navigate to https://news.ycombinator.com
2. Use browser_snapshot to see all links
3. Click on the first article link @e1
4. Take a screenshot of the article
```

## Ref-Based Element Targeting

WebWright uses a ref system for reliable element targeting:

```
From snapshot output:
- button "Submit" [ref=e1]
- textbox "Email" [ref=e2]
- link "Learn more" [ref=e3]

Use refs in commands:
- browser_click with target @e1
- browser_fill with target @e2 and value "test@example.com"
```

## Daemon Mode

For persistent browser sessions:

```bash
# Start daemon
webwright daemon --headed

# Commands use the same session
webwright navigate https://example.com
webwright snapshot
webwright click @e1
```

## Environment Variables

```bash
WEBWRIGHT_SESSION=myapp          # Named session
WEBWRIGHT_HEADED=1               # Show browser window
WEBWRIGHT_EXECUTABLE_PATH=/path  # Custom browser path
WEBWRIGHT_EXTENSIONS=/path/ext   # Load extensions (comma-separated)
```

## Troubleshooting

### MCP Server Not Starting

1. Check Node.js is installed: `node --version`
2. Verify the path to webwright is correct
3. Try running manually: `node /path/to/bin/agentbrowser-pro mcp`

### Browser Not Launching

1. Install Playwright browsers: `npx playwright install chromium`
2. Check permissions on macOS: System Preferences > Security & Privacy
3. Try headed mode to see errors: `webwright daemon --headed`

### Element Not Found

1. Use `browser_snapshot` to see current elements
2. Check if the element is in an iframe (use `switchToFrame`)
3. Wait for page load with `browser_wait`

## Support

- GitHub: https://github.com/isaacmorgado/webwright
- Issues: https://github.com/isaacmorgado/webwright/issues
