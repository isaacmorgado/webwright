# Feature Comparison: WebWright vs Source Repos

This document compares WebWright features against agent-browser and browser-use to identify gaps.

## Legend
- ✅ Implemented in WebWright
- ❌ Missing from WebWright
- 🔶 Partially implemented
- ➖ Not applicable (Python-specific, etc.)

---

## Core Navigation

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Navigate to URL | ✅ | ✅ | ✅ |
| Go back | ✅ | ✅ | ✅ |
| Go forward | ✅ | ✅ | ✅ |
| Reload | ✅ | ✅ | ✅ |
| Search (Google/Bing/DDG) | ✅ | ❌ | ✅ |

---

## Interaction Commands

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Click | ✅ | ✅ | ✅ |
| Double-click | ✅ | ✅ | ❌ |
| Type (append) | ✅ | ✅ | ✅ |
| Fill (clear+type) | ✅ | ✅ | ✅ |
| Clear | ✅ | ✅ | ❌ |
| Press key | ✅ | ✅ | ✅ |
| Keydown (hold) | ❌ | ✅ | ❌ |
| Keyup (release) | ❌ | ✅ | ❌ |
| Hover | ✅ | ✅ | ❌ |
| Focus | ✅ | ✅ | ❌ |
| Check checkbox | ✅ | ✅ | ❌ |
| Uncheck checkbox | ✅ | ✅ | ❌ |
| Select dropdown | ✅ | ✅ | ✅ |
| Multi-select | ✅ | ✅ | ❌ |
| Tap (mobile) | ❌ | ✅ | ❌ |
| Drag and drop | ✅ | ✅ | ❌ |
| Upload file | ✅ | ✅ | ✅ |
| Download file | ❌ | ✅ | ❌ |

---

## Scroll Commands

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Scroll page | ✅ | ✅ | ✅ |
| Scroll element | ✅ | ✅ | ✅ |
| Scroll into view | ✅ | ✅ | ❌ |
| Find text (scroll to) | ✅ | ❌ | ✅ |

---

## Mouse Control

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Mouse move | 🔶 CDP only | ✅ | ❌ |
| Mouse down | 🔶 CDP only | ✅ | ❌ |
| Mouse up | 🔶 CDP only | ✅ | ❌ |
| Mouse wheel | ❌ | ✅ | ❌ |

---

## Information Retrieval

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Get text | ✅ | ✅ | ❌ |
| Get HTML | ✅ | ✅ | ❌ |
| Get value | ✅ | ✅ | ❌ |
| Get attribute | ✅ | ✅ | ❌ |
| Get title | ✅ | ✅ | ❌ |
| Get URL | ✅ | ✅ | ❌ |
| Get count | ✅ | ✅ | ❌ |
| Get bounding box | ✅ | ✅ | ✅ |
| Get page content | ✅ | ✅ | ✅ |
| Extract data (AI) | ✅ | ❌ | ✅ |
| Detect pagination | ✅ | ❌ | ✅ |
| Get dropdown options | ✅ | ❌ | ✅ |
| Detect input variables | ✅ | ❌ | ✅ |

---

## State Checks

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Is visible | ✅ | ✅ | ❌ |
| Is enabled | ✅ | ✅ | ❌ |
| Is checked | ✅ | ✅ | ❌ |
| Is editable | ✅ | ❌ | ❌ |
| Is hidden | ✅ | ❌ | ❌ |

---

## Wait Commands

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Wait (timeout) | ✅ | ✅ | ✅ |
| Wait for selector | ✅ | ✅ | ❌ |
| Wait for text | ✅ | ✅ | ❌ |
| Wait for URL | ✅ | ✅ | ❌ |
| Wait for load state | ✅ | ✅ | ❌ |
| Wait for function | ✅ | ✅ | ❌ |
| Wait for download | ❌ | ✅ | ❌ |
| Wait for navigation | ✅ | ❌ | ❌ |

---

## Snapshot & DOM

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Accessibility tree | ✅ | ✅ | ✅ |
| Ref-based targeting | ✅ | ✅ | ✅ (index) |
| Interactive-only filter | ✅ | ✅ | ❌ |
| Compact mode | ✅ | ✅ | ❌ |
| Depth limiting | ✅ | ✅ | ❌ |
| Selector scoping | ✅ | ✅ | ❌ |
| Markdown extraction | ✅ | ❌ | ✅ |
| LLM data extraction | ✅ | ❌ | ✅ |

---

## Screenshots & Recording

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Screenshot | ✅ | ✅ | ✅ |
| Full page screenshot | ✅ | ✅ | ❌ |
| Element screenshot | ✅ | ✅ | ❌ |
| PDF export | ✅ | ✅ | ❌ |
| Video recording | ✅ | ✅ | ✅ |
| GIF generation | ✅ | ❌ | ✅ |

---

## Semantic Locators (FIND)

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Find by role | ✅ | ✅ | ❌ |
| Find by text | ✅ | ✅ | ❌ |
| Find by label | ✅ | ✅ | ❌ |
| Find by placeholder | ✅ | ✅ | ❌ |
| Find by alt | ✅ | ✅ | ❌ |
| Find by title | ✅ | ✅ | ❌ |
| Find by testid | ✅ | ✅ | ❌ |
| Find first/last/nth | ❌ | ✅ | ❌ |

---

## Frames & Tabs

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Switch to frame | ✅ | ✅ | ❌ |
| Switch to main frame | ✅ | ✅ | ❌ |
| List frames | ✅ | ❌ | ❌ |
| New tab | ✅ | ✅ | ✅ |
| Switch tab | ✅ | ✅ | ✅ |
| Close tab | ✅ | ✅ | ✅ |
| List tabs | ✅ | ✅ | ✅ |
| New window | ✅ | ✅ | ❌ |
| Bring to front | ✅ | ✅ | ❌ |

---

## Dialogs

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Handle dialog | ✅ | ✅ | ✅ (watchdog) |
| Accept dialog | ✅ | ✅ | ✅ |
| Dismiss dialog | ✅ | ✅ | ✅ |

---

## Cookies & Storage

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Get cookies | ✅ | ✅ | ❌ |
| Set cookies | ✅ | ✅ | ❌ |
| Clear cookies | ✅ | ✅ | ❌ |
| Get localStorage | ✅ | ✅ | ❌ |
| Set localStorage | ✅ | ✅ | ❌ |
| Clear localStorage | ✅ | ✅ | ❌ |
| Get sessionStorage | ✅ | ✅ | ❌ |
| Set sessionStorage | ✅ | ✅ | ❌ |
| Clear sessionStorage | ✅ | ✅ | ❌ |

---

## Network

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Set headers | ✅ | ✅ | ❌ |
| Set offline | ✅ | ✅ | ❌ |
| Route/intercept | ✅ | ✅ | ❌ |
| Mock response | ✅ | ✅ | ❌ |
| Abort request | ✅ | ✅ | ❌ |
| View requests | ✅ | ✅ | ❌ |
| HAR recording | ✅ | ✅ | ❌ |
| Response body | ❌ | ✅ | ❌ |

---

## Console & Debugging

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| View console | ✅ | ✅ | ❌ |
| Clear console | ✅ | ✅ | ❌ |
| View errors | ✅ | ✅ | ❌ |
| Trace recording | ✅ | ✅ | ❌ |
| Highlight element | ✅ | ✅ | ✅ |
| Pause execution | ✅ | ✅ | ❌ |
| Debug output | ✅ | ✅ | ✅ |

---

## State Management

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Save auth state | ✅ | ✅ | ✅ |
| Load auth state | ✅ | ✅ | ✅ |
| Session isolation | ✅ | ✅ | ✅ |
| Named sessions | ✅ | ✅ | ❌ |

---

## Emulation

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Set viewport | ✅ | ✅ | ✅ |
| Emulate device | ✅ | ✅ | ❌ |
| Set geolocation | ✅ | ✅ | ❌ |
| Set timezone | ✅ | ✅ | ❌ |
| Set locale | ✅ | ✅ | ❌ |
| Set permissions | ✅ | ✅ | ❌ |
| Emulate media | ✅ | ✅ | ❌ |
| Color scheme | ✅ | ✅ | ❌ |

---

## JavaScript

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Evaluate JS | ✅ | ✅ | ✅ |
| Evaluate handle | ✅ | ✅ | ❌ |
| Expose function | ❌ | ✅ | ❌ |
| Add script | ❌ | ✅ | ❌ |
| Add style | ❌ | ✅ | ❌ |
| Init script | ❌ | ✅ | ❌ |

---

## Clipboard

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Copy | ✅ | ✅ | ❌ |
| Paste | ✅ | ✅ | ❌ |
| Read | ✅ | ✅ | ❌ |
| Select all | ✅ | ✅ | ❌ |

---

## Streaming (Pair Browsing)

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| WebSocket stream | ✅ | ✅ | ❌ |
| Screencast | ✅ | ✅ | ❌ |
| Input injection | ✅ | ✅ | ❌ |
| Mouse events | ✅ | ✅ | ❌ |
| Keyboard events | ✅ | ✅ | ❌ |
| Touch events | ✅ | ✅ | ❌ |

---

## AI/Agent Features

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Agent run | ✅ | ❌ | ✅ |
| Agent step | ✅ | ❌ | ✅ |
| Multi-LLM support | ❌ | ❌ | ✅ |
| Vision support | ✅ | ❌ | ✅ |
| Memory system | ❌ | ❌ | ✅ |
| Evaluation/judge | ❌ | ❌ | ✅ |
| Thinking mode | ❌ | ❌ | ✅ |
| Token tracking | ❌ | ❌ | ✅ |
| Skills system | ❌ | ❌ | ✅ |
| Sensitive data handling | ✅ | ❌ | ✅ |
| Custom tools | ❌ | ❌ | ✅ |

---

## Human-Like Interactions

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Human-like click (jitter) | ✅ | ❌ | ✅ |
| Human timing delays | ✅ | ❌ | ✅ |
| Multi-strategy clear | ✅ | ❌ | ✅ |
| Stealth mode | ✅ | ❌ | ✅ |
| Anti-detection patches | ✅ | ❌ | ✅ |

---

## Health & Monitoring

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Health check/watchdog | ✅ | ❌ | ✅ |
| Network state monitoring | ✅ | ❌ | ✅ |
| Console error detection | ✅ | ❌ | ✅ |
| Page responsiveness check | ✅ | ❌ | ✅ |

---

## File Operations

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| Write file | ❌ | ❌ | ✅ |
| Read file | ❌ | ❌ | ✅ |
| Replace in file | ❌ | ❌ | ✅ |
| Append to file | ❌ | ❌ | ✅ |

---

## MCP Integration

| Feature | WebWright | agent-browser | browser-use |
|---------|-----------|---------------|-------------|
| MCP server | ✅ | ❌ | ✅ |
| MCP tools | ✅ (22) | ❌ | ✅ |
| MCP resources | ✅ (4) | ❌ | ❌ |
| MCP prompts | ✅ (3) | ❌ | ❌ |
| MCP client | ❌ | ❌ | ✅ |

---

## Summary: Implementation Status

### Implemented from agent-browser (CLI-focused):
1. ✅ **pause** - Pause execution for debugging
2. ✅ **Semantic locators** - find role/text/label/placeholder/testid
3. ✅ **Snapshot options** - compact (-c), depth (-d), selector (-s)
4. ✅ **Console/error viewing** - console, errors commands
5. ✅ **State save/load** - Authentication persistence
6. ✅ **Trace recording** - trace start/stop
7. ✅ **HAR recording** - har_start/stop (basic)
8. ✅ **Highlight element** - Visual debugging
9. ✅ **sessionStorage** - Full storage support
10. ✅ **Emulation options** - media, colorScheme, reducedMotion, permissions
11. ✅ **Clipboard** - copy/paste/read/selectAll
12. 🔶 **Mouse wheel** - Via CDP (existing)
13. ✅ **New window** - Separate window management
14. ✅ **Wait for URL/text/function** - Advanced wait conditions

### Implemented from browser-use (AI-focused):
1. ✅ **Vision support** - Screenshot analysis (returns base64 + prompt)
2. ✅ **LLM data extraction** - `extract` action for AI-driven content extraction
3. ✅ **Sensitive data handling** - Placeholder replacement system
4. ❌ **Memory system** - Not implemented (handled by Claude)
5. ❌ **Evaluation/judge** - Not implemented (handled by Claude)
6. ❌ **Token tracking** - Not implemented (handled by Claude)
7. ✅ **GIF generation** - Frame capture and export
8. ✅ **Element highlighting** - Demo mode with labels
9. ❌ **Skills system** - Not implemented (use MCP)
10. ❌ **Custom tools** - Not implemented (use MCP)
11. ✅ **Search action** - Navigate to search engines with query (DuckDuckGo, Google, Bing)
12. ✅ **Pagination detection** - Auto-detect next/prev buttons and page numbers
13. ✅ **Dropdown options** - Get options from select elements and ARIA listboxes
14. ✅ **Find text on page** - Search for text with context and XPath
15. ✅ **PDF download** - Download PDFs or generate from current page
16. ✅ **Human-like click** - Jitter, timing delays, scroll-into-view behavior
17. ✅ **Detect variables** - Auto-detect input field types (email, phone, etc.)
18. ✅ **Health check** - Monitor network, console errors, page responsiveness
19. ✅ **Multi-clear** - 4 fallback strategies with framework event triggering
20. ✅ **Stealth mode** - Anti-detection patches for navigator/webdriver

---

## Implementation Status

### Tier 1 (High Priority - CLI Parity): ✅ COMPLETE
1. ✅ `pause` command
2. ✅ Semantic locators (find role/text/label)
3. ✅ Snapshot options (-c, -d, -s)
4. ✅ `state save/load` for auth
5. ✅ `console` and `errors` viewing
6. ✅ `highlight` for debugging
7. ✅ sessionStorage support
8. ✅ Wait for URL/text/function

### Tier 2 (Medium Priority - AI Features): ✅ COMPLETE
1. ✅ Vision support integration
2. ✅ Sensitive data handling
3. 🔶 LLM-based data extraction (via evaluate)
4. ✅ Element highlighting/demo mode
5. ✅ GIF generation
6. ❌ Token tracking (handled by Claude)

### Tier 3 (Nice to Have): ✅ MOSTLY COMPLETE
1. ✅ HAR/Trace recording
2. ✅ Clipboard operations
3. ✅ Timezone/locale/permissions
4. ❌ Skills system (use MCP)
5. ❌ Custom tools registry (use MCP)
6. ❌ Memory system (handled by Claude)
