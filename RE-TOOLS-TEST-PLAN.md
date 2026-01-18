# Reverse Engineering Tools - Test Plan
## Scenario: Reverse Engineer Browser-Use.com

**Objective:** Reverse engineer https://cloud.browser-use.com to understand the architecture and recreate it

**Date:** 2026-01-18
**Status:** In Progress

---

## Tools Selection for Browser-Use.com

### Scenario Analysis

Browser-Use Cloud is a web application with:
- **Frontend:** React/TypeScript web interface
- **Backend:** API for task management
- **Features:** Natural language task automation, session management, browser control

### Required Tools

#### 1. **mitmproxy** ✅ INSTALLED
- **Purpose:** Intercept HTTP/HTTPS traffic to discover API endpoints
- **Status:** `/Library/Frameworks/Python.framework/Versions/3.14/bin/mitmproxy`
- **Usage:**
  ```bash
  # Start proxy on port 8080
  mitmweb -p 8080

  # Configure browser to use proxy
  # Browse browser-use.com to capture traffic

  # Export HAR file
  mitmdump -r flow.mitm -w output.har
  ```

#### 2. **WebWright with Playwright-Stealth** ✅ INTEGRATED
- **Purpose:** Automate browser interactions and trigger all functionality
- **Status:** Integrated in ~/webwright + Desktop app
- **Usage:**
  ```typescript
  // Via WebWright Desktop UI
  Task: "Navigate to cloud.browser-use.com and interact with all features"
  Stealth: Enabled (bypass bot detection)

  // Captures:
  - Screenshots of all pages
  - HAR exports of network traffic
  - Console logs
  - DOM snapshots
  ```

#### 3. **Chrome DevTools** ✅ BUILT-IN
- **Purpose:** Manual inspection and analysis
- **Status:** Built into Chrome browser
- **Usage:**
  - Network tab: Analyze API calls
  - Elements tab: Inspect DOM structure
  - Sources tab: View JavaScript files
  - Application tab: Check localStorage, cookies

#### 4. **AST Explorer** ✅ WEB-BASED
- **Purpose:** De-obfuscate and analyze JavaScript
- **Status:** https://astexplorer.net/
- **Usage:**
  - Copy minified JS from browser-use.com
  - Paste into AST Explorer
  - Analyze abstract syntax tree
  - Identify key functions and logic

#### 5. **screenshot-to-code** ❌ NOT INSTALLED
- **Purpose:** Convert UI screenshots to React code
- **Status:** Need to install or use API
- **Options:**
  - Install locally: `git clone https://github.com/abi/screenshot-to-code`
  - Use API: Requires OpenAI/Anthropic API key
  - Alternative: Manual coding from screenshots

#### 6. **Kiterunner** ❌ NOT INSTALLED
- **Purpose:** Discover undocumented/shadow API endpoints
- **Status:** Not installed
- **Installation:**
  ```bash
  # Install via Go
  go install github.com/assetnote/kiterunner/cmd/kr@latest

  # Or download binary from GitHub releases
  # https://github.com/assetnote/kiterunner/releases
  ```
- **Usage:**
  ```bash
  # Scan for API endpoints
  kr scan https://cloud.browser-use.com -w routes-large.kite

  # Brute force common paths
  kr brute https://cloud.browser-use.com -w api-wordlist.txt
  ```

---

## Tools NOT Needed for This Scenario

### GraphQL Tools (Conditional)
- **InQL, Clairvoyance:** Only needed if GraphQL API detected
- **Status:** Will check during traffic analysis
- **Installation:** `pip install clairvoyance` (if needed)

### Protobuf Tools (Not Needed)
- **pbtk, Blackbox Protobuf:** Only for binary protocols
- **Status:** Browser-Use likely uses JSON/REST, not Protobuf

### API Fuzzing Tools (Optional)
- **Schemathesis, RESTler:** For testing API security
- **Status:** Not needed for basic reverse engineering
- **Use Case:** Advanced security testing

---

## Configuration Requirements

### 1. CLIs to Install

| Tool | Status | Installation Command |
|------|--------|---------------------|
| **mitmproxy** | ✅ Installed | `pip install mitmproxy` |
| **Kiterunner** | ❌ Not installed | `go install github.com/assetnote/kiterunner/cmd/kr@latest` |
| **screenshot-to-code** | ❌ Not installed | `git clone https://github.com/abi/screenshot-to-code` |

### 2. APIs Needed

| Service | Purpose | Required? |
|---------|---------|-----------|
| **OpenAI API** | For screenshot-to-code (GPT-4 Vision) | Optional (can use Claude instead) |
| **Anthropic API** | For screenshot-to-code (Claude Sonnet) | Optional |
| **Browser-Use API** | Target API we're reverse engineering | N/A (analyzing, not using) |

### 3. MCP Servers

| Server | Purpose | Installation |
|--------|---------|--------------|
| **None required** | Browser-Use scenario uses built-in tools | N/A |

**Note:** MCP servers would be useful for:
- Custom tool integration
- Multi-model delegation (if using alternative LLMs)
- Advanced workflow automation

---

## Test Execution Plan

### Phase 1: Traffic Capture (30 min)

**Goal:** Understand API structure and endpoints

**Steps:**
1. Start mitmweb proxy: `mitmweb -p 8080`
2. Configure browser to use proxy (localhost:8080)
3. Navigate to https://cloud.browser-use.com
4. Perform all actions:
   - Create account / login
   - Create new task
   - Run automation
   - View session history
   - Check settings
5. Export HAR file from mitmproxy
6. Analyze captured traffic

**Expected Findings:**
- API base URL
- Authentication mechanism (JWT, session cookies, etc.)
- Endpoint structure (/api/tasks, /api/sessions, etc.)
- Request/response formats
- WebSocket connections (if any)

### Phase 2: Endpoint Discovery (20 min)

**Goal:** Find undocumented/hidden endpoints

**Steps:**
1. Install Kiterunner (if not already installed)
2. Run endpoint scan:
   ```bash
   kr scan https://cloud.browser-use.com -w routes-large.kite -o results.json
   ```
3. Review discovered endpoints
4. Compare with traffic capture from Phase 1
5. Identify any shadow APIs

**Expected Findings:**
- Admin endpoints (if exposed)
- Debug endpoints
- Deprecated endpoints
- Hidden features

### Phase 3: UI Analysis & Cloning (45 min)

**Goal:** Understand frontend architecture and clone UI

**Steps:**
1. Use WebWright to automate screenshots:
   - Navigate to each page
   - Capture full-page screenshots
   - Export DOM snapshots
2. Use Chrome DevTools:
   - Inspect React components
   - Analyze CSS/Tailwind usage
   - Check bundled JavaScript
3. (Optional) Use screenshot-to-code:
   - Convert screenshots to React components
   - Review generated code
   - Compare with actual implementation

**Expected Findings:**
- Component structure
- Styling approach (Tailwind, CSS-in-JS, etc.)
- State management (Redux, Context, Zustand, etc.)
- Routing structure

### Phase 4: JavaScript Analysis (30 min)

**Goal:** Understand frontend logic and API integration

**Steps:**
1. Extract JavaScript bundles from browser-use.com
2. Use Chrome DevTools Source Map:
   - View original source (if source maps available)
   - Identify key modules
3. Use AST Explorer (if obfuscated):
   - Paste minified code
   - Analyze control flow
   - Identify API call patterns
4. Document findings:
   - How tasks are created
   - How browser automation works
   - How sessions are managed

**Expected Findings:**
- Task creation flow
- WebSocket/SSE implementation
- Browser control mechanism
- Error handling patterns

### Phase 5: Documentation & Recreation (60 min)

**Goal:** Create comprehensive documentation and start recreation

**Steps:**
1. Document all findings:
   - API endpoints and schemas
   - Frontend component structure
   - Authentication flow
   - Browser automation architecture
2. Create architecture diagram
3. Plan recreation approach:
   - Backend: Node.js/Express or Python/FastAPI
   - Frontend: React + Tailwind (same as WebWright Desktop)
   - Browser automation: WebWright (already have this!)
4. Start implementation:
   - Set up project structure
   - Implement basic API
   - Create frontend components

**Deliverables:**
- Complete API documentation
- Component hierarchy diagram
- Architecture document
- Initial codebase for recreation

---

## Tools Integration into WebWright Desktop

### Immediate (Phase 1)

**Add RE Task Page:**
- Create `src/pages/RETaskPage.tsx`
- Task templates for common scenarios
- File upload for APKs/binaries
- Real-time progress logs

**Add Tool Runners:**
- `src/lib/re-tools/mitmproxy-runner.ts`
- `src/lib/re-tools/webwright-runner.ts` (enhanced)
- `src/lib/re-tools/ast-analyzer.ts`

### Short-term (Phase 2)

**Install Missing Tools:**
- Kiterunner CLI
- screenshot-to-code (optional)

**Add Advanced Runners:**
- `src/lib/re-tools/kiterunner-runner.ts`
- `src/lib/re-tools/screenshot-to-code-runner.ts`

**Add AI Task Analyzer:**
- `src/lib/task-analyzer.ts`
- Natural language to workflow conversion
- Tool selection logic

### Long-term (Phase 3)

**Add Conditional Tools:**
- GraphQL tools (InQL, Clairvoyance)
- Protobuf tools (pbtk integration)
- API fuzzing tools (Schemathesis)

**Add Tool Orchestration:**
- `src/lib/re-orchestrator.ts`
- Multi-step workflow execution
- Data passing between tools
- Error handling and retries

---

## Success Criteria

### Test Success
- [ ] Captured all API traffic from browser-use.com
- [ ] Discovered all public endpoints (via mitmproxy + Kiterunner)
- [ ] Analyzed frontend React components
- [ ] Extracted JavaScript logic patterns
- [ ] Created comprehensive documentation
- [ ] Started recreation implementation

### Integration Success
- [ ] RE Task Page created and functional
- [ ] mitmproxy integrated with WebWright Desktop
- [ ] Kiterunner integrated (if installed)
- [ ] WebWright automation enhanced for RE tasks
- [ ] Real-time progress UI working
- [ ] Screenshots and HAR export working

---

## Next Steps

1. **Install Kiterunner:**
   ```bash
   go install github.com/assetnote/kiterunner/cmd/kr@latest
   ```

2. **Start Phase 1 Testing:**
   - Launch mitmproxy
   - Capture browser-use.com traffic
   - Document API structure

3. **Begin Integration:**
   - Create RETaskPage.tsx
   - Add mitmproxy runner
   - Add task templates

4. **Continue with Phase 2:**
   - Implement AI Task Analyzer
   - Add Tool Orchestration Engine
   - Create workflow templates

---

**Status:** Ready to begin testing
**Estimated Time:** 3-4 hours total
**Blocking Issues:** None (all required tools available or can be installed quickly)
