# Reverse Engineering Tools Integration Architecture

Architecture design for integrating 27 professional RE tools into WebWright Desktop with automated task orchestration.

---

## Vision

**Goal:** Create a unified RE automation platform where users can describe tasks in natural language and have the system automatically select and orchestrate the appropriate tools.

**Example User Tasks:**
- "Reverse engineer the API from app.example.com"
- "Extract protobuf schemas from this APK file"
- "Discover all GraphQL endpoints and generate documentation"
- "Bypass bot detection and scrape this site"
- "Clone this UI design from screenshot"

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  WebWright Desktop (Electron)                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Natural Language Task Interface            │   │
│  │  "Reverse engineer API from app.example.com"        │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │        AI Task Analyzer & Tool Selector              │   │
│  │  - Parse intent                                      │   │
│  │  - Select tools                                      │   │
│  │  - Generate workflow                                 │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │           Tool Orchestration Engine                  │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┐      │   │
│  │  │WebWright │ Playwright│ Protobuf │ GraphQL  │      │   │
│  │  │ Tools    │  Stealth  │  Tools   │  Tools   │      │   │
│  │  └──────────┴──────────┴──────────┴──────────┘      │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐   │
│  │         Real-time Progress & Results UI              │   │
│  │  - Live logs                                         │   │
│  │  - Extracted data                                    │   │
│  │  - Generated artifacts                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. RE Task Interface Page

**Location:** `src/pages/RETaskPage.tsx`

**Features:**
- Text area for natural language task description
- File upload for APKs, binaries, screenshots
- URL input for target websites/APIs
- Task template buttons (API Discovery, GraphQL, Protobuf, UI Clone, etc.)
- Real-time task progress with live logs

**UI Design (Browser Use patterns):**
```typescript
interface RETaskPageProps {
  taskTemplates: {
    id: string
    name: string
    description: string
    icon: string
    exampleTask: string
  }[]
}

// Templates:
// - API Discovery (mitmproxy + Kiterunner)
// - GraphQL Schema Reconstruction (InQL + Clairvoyance)
// - Protobuf Extraction (pbtk + Blackbox)
// - UI Cloning (screenshot-to-code)
// - Stealth Scraping (Playwright-stealth)
```

---

### 2. AI Task Analyzer

**Location:** `src/lib/task-analyzer.ts`

**Responsibilities:**
1. Parse natural language task description
2. Extract:
   - Target URL/file
   - Task type (API discovery, protobuf extraction, etc.)
   - Output format preferences
3. Select appropriate tools based on intent
4. Generate execution workflow

**Implementation:**
```typescript
interface TaskAnalysis {
  taskType: 'api_discovery' | 'graphql' | 'protobuf' | 'ui_clone' | 'stealth_scrape'
  target: {
    type: 'url' | 'file' | 'apk'
    value: string
  }
  selectedTools: RETool[]
  workflow: WorkflowStep[]
  estimatedDuration: number
}

interface REToolspec {
  id: string
  name: string
  category: 'proxy' | 'protobuf' | 'graphql' | 'ai' | 'automation'
  requirements: string[]  // npm packages, binaries
  capabilities: string[]
}

class TaskAnalyzer {
  async analyze(description: string, files?: File[]): Promise<TaskAnalysis> {
    // Use Claude API or local LLM to parse intent
    // Match to tool capabilities
    // Generate workflow
  }
}
```

---

### 3. Tool Orchestration Engine

**Location:** `src/lib/re-orchestrator.ts`

**Responsibilities:**
1. Execute workflows step-by-step
2. Manage tool dependencies
3. Pass data between tools
4. Handle errors and retries
5. Stream progress updates to UI

**Architecture:**
```typescript
interface WorkflowStep {
  toolId: string
  action: string
  inputs: Record<string, any>
  outputs: string[]  // data keys to extract
  dependsOn?: string[]  // step IDs
}

class REOrchestrator {
  private tools: Map<string, REToolRunner>

  async executeWorkflow(workflow: WorkflowStep[]): Promise<WorkflowResult> {
    // Topological sort based on dependencies
    // Execute in order
    // Pass outputs between steps
    // Stream progress
  }
}
```

---

### 4. Tool Runners (Adapters)

Each tool gets an adapter that implements a common interface:

**Location:** `src/lib/tools/`

```typescript
interface REToolRunner {
  id: string
  name: string

  // Check if tool is available
  async isAvailable(): Promise<boolean>

  // Install/setup tool
  async install(): Promise<void>

  // Execute tool action
  async execute(action: string, inputs: Record<string, any>): Promise<ToolOutput>

  // Stream logs
  onLog(callback: (log: string) => void): void
}

interface ToolOutput {
  success: boolean
  data: Record<string, any>
  artifacts: Artifact[]  // files generated
  logs: string[]
}
```

**Tool Categories:**

1. **WebWright Tools** (already integrated)
   - Use existing HTTP bridge
   - `src/lib/tools/webwright-runner.ts`

2. **Node.js NPM Tools**
   - Playwright-stealth, AST Explorer libraries
   - `src/lib/tools/npm-runner.ts`

3. **Python Tools** (subprocess)
   - mitmproxy, pbtk, Clairvoyance, Schemathesis
   - `src/lib/tools/python-runner.ts`

4. **Binary Tools** (subprocess)
   - protoc, Kiterunner
   - `src/lib/tools/binary-runner.ts`

5. **External Services**
   - screenshot-to-code, v0.dev (API calls)
   - `src/lib/tools/external-runner.ts`

---

## Tool Integration Priority

### Phase 1: Core Automation (Week 1)
✅ **Already Complete:**
- WebWright (22 tools)
- Playwright + CDP
- HAR export
- Console logs
- Network monitoring

🔧 **Add:**
1. **Playwright-stealth integration**
   - Install: `npm install playwright-extra puppeteer-extra-plugin-stealth`
   - Modify WebWright bridge to use playwright-extra
   - Test stealth evasion techniques

2. **Basic task orchestration**
   - Task analyzer with pattern matching
   - Simple workflow executor
   - Progress UI

### Phase 2: Protobuf & GraphQL (Week 2)
3. **pbtk (Protobuf Toolkit)**
   - Python subprocess runner
   - Extract .proto from APK files
   - Decode protobuf blobs

4. **InQL + Clairvoyance**
   - GraphQL introspection
   - Schema reconstruction
   - Query generation

5. **Kreya GUI integration**
   - Electron subprocess to launch Kreya
   - Import extracted .proto files
   - Test gRPC endpoints

### Phase 3: Proxies & Fuzzing (Week 3)
6. **mitmproxy integration**
   - Python subprocess
   - HAR export workflow
   - Custom addon support

7. **Kiterunner API discovery**
   - Binary subprocess
   - Shadow API detection
   - Route bruteforcing

8. **Schemathesis testing**
   - Python subprocess
   - OpenAPI testing
   - Auto-generate test cases

### Phase 4: AI Tools (Week 4)
9. **screenshot-to-code**
   - API integration or local clone
   - UI screenshot → React code
   - Auto-generate components

10. **AST Explorer integration**
    - Embedded iframe or library
    - JavaScript deobfuscation
    - Code transformation

---

## Playwright-Stealth Integration

### Current State
WebWright uses Playwright directly without stealth features.

### Integration Plan

**1. Install Dependencies:**
```bash
cd ~/webwright
npm install playwright-extra puppeteer-extra-plugin-stealth
```

**2. Modify WebWright Daemon:**

**File:** `~/webwright/src/browser/manager.ts`

```typescript
// BEFORE:
import { chromium } from 'playwright'

// AFTER:
import { chromium as playwrightChromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

playwrightChromium.use(StealthPlugin())

// Then use playwrightChromium.launch() instead of chromium.launch()
```

**3. Configuration Option:**

Add stealth mode toggle to WebWright config:

```json
{
  "browser": {
    "stealth": true,  // Enable stealth plugin
    "headless": false
  }
}
```

**4. Test Stealth Features:**

```typescript
// Test bot detection bypass
const page = await browser.newPage()
await page.goto('https://bot.sannysoft.com/')
await page.screenshot({ path: 'stealth-test.png' })
// Should pass all bot detection tests
```

---

## Task Templates

### Template 1: API Discovery

**User Input:** "Reverse engineer API from https://app.example.com"

**Workflow:**
```yaml
steps:
  1:
    tool: webwright
    action: navigate
    inputs:
      url: https://app.example.com

  2:
    tool: webwright
    action: start_har_recording
    inputs:
      path: ./output/traffic.har

  3:
    tool: webwright
    action: browser_interact
    inputs:
      task: "Click through all major features"

  4:
    tool: webwright
    action: stop_har_recording

  5:
    tool: kiterunner
    action: scan
    inputs:
      url: https://app.example.com
      wordlist: routes-large.kite

  6:
    tool: mitmproxy2swagger
    action: convert
    inputs:
      har_file: ./output/traffic.har
      openapi_out: ./output/api.yml
```

**Output:**
- `traffic.har` - Network traffic
- `api.yml` - OpenAPI specification
- `endpoints.json` - Discovered endpoints from Kiterunner

---

### Template 2: GraphQL Schema Discovery

**User Input:** "Extract GraphQL schema from https://api.example.com/graphql"

**Workflow:**
```yaml
steps:
  1:
    tool: inql
    action: introspect
    inputs:
      url: https://api.example.com/graphql

  2:  # If introspection fails
    tool: clairvoyance
    action: reconstruct
    inputs:
      url: https://api.example.com/graphql
      wordlist: graphql-wordlist.txt

  3:
    tool: webwright
    action: browser_execute
    inputs:
      script: "Generate Apollo client queries"
```

**Output:**
- `schema.json` - GraphQL schema
- `queries/` - Generated query examples
- `mutations/` - Generated mutation examples

---

### Template 3: Protobuf Extraction

**User Input:** "Extract protobuf schemas from app.apk"

**Workflow:**
```yaml
steps:
  1:
    tool: pbtk
    action: extract
    inputs:
      apk_file: ./app.apk
      output_dir: ./protos/

  2:
    tool: protoc
    action: compile
    inputs:
      proto_dir: ./protos/

  3:
    tool: kreya
    action: import_protos
    inputs:
      proto_files: ./protos/*.proto
```

**Output:**
- `protos/*.proto` - Extracted protobuf definitions
- `kreya-project/` - Kreya project for testing

---

### Template 4: UI Cloning

**User Input:** "Clone this UI design" + screenshot upload

**Workflow:**
```yaml
steps:
  1:
    tool: screenshot-to-code
    action: generate
    inputs:
      image: ./screenshot.png
      framework: react

  2:
    tool: webwright
    action: create_component
    inputs:
      code: <from step 1>
      path: ./src/components/ClonedUI.tsx
```

**Output:**
- `ClonedUI.tsx` - Generated React component
- `ClonedUI.css` - Tailwind styles

---

### Template 5: Stealth Scraping

**User Input:** "Scrape https://protected-site.com bypassing bot detection"

**Workflow:**
```yaml
steps:
  1:
    tool: webwright_stealth
    action: navigate
    inputs:
      url: https://protected-site.com
      stealth: true

  2:
    tool: webwright_stealth
    action: extract_data
    inputs:
      selectors:
        - .product-title
        - .price
        - .description
```

**Output:**
- `scraped-data.json` - Extracted data
- `screenshots/` - Evidence of successful access

---

## Data Flow Example

**User Task:** "Reverse engineer Tinder API"

```
┌─────────────────┐
│  User Input     │
│  "RE Tinder"    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Task Analyzer  │
│  → API Discovery│
│  → Protobuf     │
└────────┬────────┘
         │
         ▼
┌────────────────────────────────┐
│  Workflow Generator            │
│  1. HAR recording              │
│  2. Extract protobuf           │
│  3. Decode messages            │
│  4. Generate OpenAPI           │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  Tool Orchestrator             │
│  → WebWright (HAR)             │
│  → pbtk (extract .proto)       │
│  → protoc (decode)             │
│  → mitmproxy2swagger (OpenAPI) │
└────────┬───────────────────────┘
         │
         ▼
┌────────────────────────────────┐
│  Results                       │
│  - traffic.har                 │
│  - tinder.proto                │
│  - decoded-messages.json       │
│  - tinder-api.yml              │
└────────────────────────────────┘
```

---

## UI Design (Browser Use Style)

### RE Task Page Layout

```
┌───────────────────────────────────────────────────────────┐
│  🔧 Reverse Engineering Tasks                             │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  📝 Describe your task                              │  │
│  │  ┌───────────────────────────────────────────────┐  │  │
│  │  │ "Reverse engineer API from app.example.com"   │  │  │
│  │  └───────────────────────────────────────────────┘  │  │
│  │                                                     │  │
│  │  📎 Upload files (optional)                         │  │
│  │  [Drop APK, binary, screenshot here]                │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  Quick Templates:                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ API    │ │GraphQL │ │Protobuf│ │UI Clone│           │
│  │Discovery│ │Schema  │ │Extract │ │        │           │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
│                                                           │
│  [Start Task]                                             │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  📊 Task Progress                                          │
│                                                           │
│  ┌─ WebWright (HAR Recording) ─────────────────────────┐  │
│  │  ✅ Started                                          │  │
│  │  ✅ Navigated to app.example.com                     │  │
│  │  🔄 Recording traffic... (152 requests)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌─ Kiterunner (API Discovery) ─────────────────────────┐  │
│  │  ⏳ Queued                                            │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  📁 Generated Artifacts                                    │
│                                                           │
│  traffic.har (2.4 MB)        [Download] [View in HAR]    │
│  api.yml (127 KB)            [Download] [Import Postman] │
│  endpoints.json (43 KB)       [Download] [View]          │
└───────────────────────────────────────────────────────────┘
```

---

## File Structure

```
webwright-desktop/
├── src/
│   ├── pages/
│   │   ├── RETaskPage.tsx              # NEW
│   │   ├── REResultsPage.tsx           # NEW
│   │   └── ...
│   ├── components/
│   │   ├── RETaskTemplates.tsx         # NEW
│   │   ├── REProgressMonitor.tsx       # NEW
│   │   └── ...
│   ├── lib/
│   │   ├── task-analyzer.ts            # NEW
│   │   ├── re-orchestrator.ts          # NEW
│   │   ├── tools/
│   │   │   ├── webwright-runner.ts     # NEW
│   │   │   ├── python-runner.ts        # NEW
│   │   │   ├── npm-runner.ts           # NEW
│   │   │   ├── binary-runner.ts        # NEW
│   │   │   └── external-runner.ts      # NEW
│   │   └── webwright-client.ts
│   └── ...
├── tools/                               # NEW
│   ├── pbtk/                           # Python tools
│   ├── mitmproxy/
│   ├── clairvoyance/
│   └── binaries/                       # Compiled tools
│       └── kiterunner
├── REVERSE-ENGINEERING-TOOLS.md        # Documentation
├── RE-INTEGRATION-ARCHITECTURE.md      # This file
└── ...
```

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Create RETaskPage.tsx
- [ ] Implement task analyzer (pattern matching)
- [ ] Create orchestrator skeleton
- [ ] Add playwright-stealth to WebWright
- [ ] Test stealth features

### Week 2: Tool Runners
- [ ] Implement python-runner.ts
- [ ] Implement npm-runner.ts
- [ ] Implement binary-runner.ts
- [ ] Add pbtk integration
- [ ] Add InQL/Clairvoyance integration

### Week 3: Workflows
- [ ] Create 5 task templates
- [ ] Implement workflow executor
- [ ] Add progress monitoring UI
- [ ] Test end-to-end workflows
- [ ] Error handling and retries

### Week 4: Polish & Advanced
- [ ] Add screenshot-to-code integration
- [ ] Add mitmproxy integration
- [ ] Add Kiterunner integration
- [ ] Create results export features
- [ ] Documentation and examples

---

## Technical Challenges & Solutions

### Challenge 1: Running Python Tools from Electron
**Solution:** Use `child_process.spawn()` with bundled Python environment

```typescript
import { spawn } from 'child_process'

class PythonRunner implements REToolRunner {
  async execute(action: string, inputs: Record<string, any>) {
    const python = spawn('python3', [
      '-m', 'pbtk',
      '--extract', inputs.apk_file
    ])

    return new Promise((resolve) => {
      python.stdout.on('data', (data) => {
        this.emitLog(data.toString())
      })

      python.on('close', (code) => {
        resolve({ success: code === 0 })
      })
    })
  }
}
```

### Challenge 2: Stealth Integration with WebWright
**Solution:** Fork WebWright or use proxy wrapper

```typescript
// Option A: Modify WebWright daemon directly
// Option B: Create stealth wrapper that uses playwright-extra
import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

chromium.use(StealthPlugin())

class StealthBrowserManager {
  async launch() {
    this.browser = await chromium.launch({
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    })
  }
}
```

### Challenge 3: Tool Dependencies
**Solution:** Automatic dependency checking and installation

```typescript
class ToolManager {
  async ensureToolAvailable(toolId: string) {
    const tool = this.tools.get(toolId)

    if (!await tool.isAvailable()) {
      // Show installation UI
      await tool.install()
    }
  }
}
```

---

## Success Metrics

1. **Tool Coverage:** 15+ tools integrated and working
2. **Automation:** 5+ task templates fully automated
3. **Usability:** Natural language tasks work 80%+ of the time
4. **Performance:** Most tasks complete in < 5 minutes
5. **Reliability:** < 5% failure rate on supported tasks

---

## Future Enhancements

1. **AI-Powered Workflows:** Use LLM to generate custom workflows
2. **Community Templates:** Share task templates
3. **Cloud Execution:** Run heavy tasks on remote servers
4. **Collaboration:** Multi-user RE sessions
5. **Plugin System:** Community-contributed tool integrations

---

**Last Updated:** 2026-01-18
**Status:** Architecture Design Complete
**Next:** Begin Phase 1 Implementation
