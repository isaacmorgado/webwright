# Reverse Engineer Browser-Use.com - Test Guide

Complete guide for reverse engineering https://cloud.browser-use.com using WebWright Desktop's new RE tools.

**Date:** 2026-01-18
**Estimated Time:** 2-3 hours
**Status:** Ready to Execute

---

## Objective

Fully reverse engineer Browser-Use Cloud to understand:
1. **API Structure** - All endpoints, request/response formats
2. **Frontend Architecture** - React components, state management
3. **Authentication Flow** - How login/sessions work
4. **Browser Automation** - How tasks are created and executed
5. **WebSocket/SSE** - Real-time updates mechanism

---

## Prerequisites

### Required Tools (Already Installed ✅)
- ✅ mitmproxy (`/Library/Frameworks/Python.framework/Versions/3.14/bin/mitmproxy`)
- ✅ WebWright + playwright-stealth (integrated in Desktop app)
- ✅ Chrome DevTools (built-in)

### Optional Tools (Not Critical)
- ❌ Kiterunner (for discovering shadow endpoints)
  - See KITERUNNER-INSTALL.md for installation
  - Can be added later for comprehensive discovery

### WebWright Desktop Setup
1. Ensure WebWright daemon is running:
   ```bash
   cd ~/webwright
   npm run dev
   # Should start on port 3456
   ```

2. Ensure WebWright Desktop is built:
   ```bash
   cd ~/Projects/webwright-desktop
   npm run dev
   # Should start Electron app
   ```

---

## Test Execution Plan

### Phase 1: Traffic Capture with mitmproxy (30 min)

**Goal:** Capture all HTTP/HTTPS traffic to understand API structure

#### Step 1.1: Start mitmproxy

```bash
# Option 1: Web UI (Recommended for beginners)
mitmweb -p 8080

# Opens browser at http://localhost:8081
# Shows all traffic in real-time

# Option 2: Terminal UI (Advanced)
mitmproxy -p 8080

# Option 3: Headless capture
mitmdump -p 8080 -w /tmp/browser-use-capture.mitm
```

#### Step 1.2: Configure Browser Proxy

**Chrome (Manual):**
1. Open Chrome Settings
2. Search for "proxy"
3. Set HTTP proxy: `localhost:8080`
4. Set HTTPS proxy: `localhost:8080`

**OR use environment variable (Firefox/Chrome):**
```bash
# macOS
export http_proxy=http://localhost:8080
export https_proxy=http://localhost:8080

# Launch Chrome with proxy
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --proxy-server="localhost:8080"
```

#### Step 1.3: Browse Browser-Use.com

Navigate through all features:
1. Go to https://cloud.browser-use.com
2. Create account / Login
3. Create new task
4. Run automation
5. View sessions
6. Check settings
7. Trigger any error states

#### Step 1.4: Export HAR File

**From mitmweb:**
- Click "File" → "Export" → "HAR"
- Save as: `/tmp/browser-use-traffic.har`

**From command line:**
```bash
# If using mitmdump
mitmdump -r /tmp/browser-use-capture.mitm --set hardump=/tmp/browser-use-traffic.har
```

**Expected Findings:**
```json
{
  "baseUrl": "https://cloud.browser-use.com/api",
  "endpoints": {
    "/auth/login": "POST - User authentication",
    "/tasks": "GET/POST - Task management",
    "/sessions": "GET - Session history",
    "/browser/navigate": "POST - Browser control",
    "/browser/screenshot": "GET - Capture screenshot"
  },
  "authentication": "JWT token in Authorization header",
  "websocket": "wss://cloud.browser-use.com/ws for real-time updates"
}
```

---

### Phase 2: Automated Discovery with WebWright (30 min)

**Goal:** Use WebWright to automate browsing and trigger all functionality

#### Step 2.1: Use RE Task Page

1. Open WebWright Desktop
2. Navigate to "Reverse Engineering" tab (🔍)
3. Select template: "API Discovery"
4. Enter URL: `https://cloud.browser-use.com`
5. Enable "Stealth Mode" (bypass bot detection)
6. Click "Start Reverse Engineering"

#### Step 2.2: Alternative - Manual WebWright Task

If RE page doesn't work yet, use "New Task" page:

**Task Description:**
```
Navigate to https://cloud.browser-use.com and perform these actions:
1. Click through all navigation items
2. Interact with all buttons and forms
3. Create a test automation task
4. Take screenshots of each page
5. Export network traffic to HAR
```

#### Step 2.3: Monitor Execution

- Watch real-time logs in Sessions tab
- Wait for task completion (5-10 minutes)
- Check for any errors or blocked actions

**Expected Results:**
- Screenshots saved in WebWright output folder
- HAR file exported (via CDP)
- Full interaction flow documented

---

### Phase 3: Endpoint Discovery with Kiterunner (Optional, 20 min)

**Goal:** Discover hidden/shadow API endpoints not visible in traffic

**Only if Kiterunner is installed** (see KITERUNNER-INSTALL.md)

#### Step 3.1: Download Wordlist

```bash
mkdir -p ~/.kiterunner
cd ~/.kiterunner
wget https://github.com/assetnote/kiterunner/releases/download/v1.0.2/routes-large.kite.tar.gz
tar -xzf routes-large.kite.tar.gz
```

#### Step 3.2: Run Scan

```bash
kr scan https://cloud.browser-use.com \
  -w ~/.kiterunner/routes-large.kite \
  -o ~/Desktop/browser-use-endpoints.json \
  -x 10 \
  --filter-code 200,201,301,302,401,403,404
```

**Scan takes:** 5-15 minutes depending on concurrency

#### Step 3.3: Analyze Results

```bash
# View all discovered endpoints
cat ~/Desktop/browser-use-endpoints.json | jq '.results[] | {path: .path, status: .status}'

# Count by status code
cat ~/Desktop/browser-use-endpoints.json | jq '.results | group_by(.status) | map({status: .[0].status, count: length})'

# Find interesting endpoints (200, 403, 401)
cat ~/Desktop/browser-use-endpoints.json | jq '.results[] | select(.status == 200 or .status == 403 or .status == 401)'
```

**Expected Discoveries:**
- Admin endpoints (`/admin/*`)
- Debug endpoints (`/debug/*`, `/health`, `/metrics`)
- Deprecated API versions (`/api/v1/*`)
- Hidden features

---

### Phase 4: Frontend Analysis (45 min)

**Goal:** Understand React component structure and state management

#### Step 4.1: Chrome DevTools Inspection

**Network Tab:**
1. Open Chrome DevTools (F12)
2. Navigate to https://cloud.browser-use.com
3. Network tab → Filter XHR/Fetch
4. Document all API calls:
   - Endpoint URL
   - Method (GET/POST/PUT/DELETE)
   - Request payload
   - Response structure
   - Headers (especially Authorization)

**Elements Tab:**
1. Inspect React component tree
2. Identify component naming patterns
3. Check for React DevTools (if available)

**Sources Tab:**
1. View bundled JavaScript files
2. Check if source maps are available
3. Identify key modules:
   - API client (`api.js`, `client.js`)
   - State management (`store.js`, `context.js`)
   - Routing (`router.js`, `routes.js`)

#### Step 4.2: JavaScript Analysis

**Extract bundle files:**
```bash
# Use wget or curl to download JS bundles
wget https://cloud.browser-use.com/static/js/main.{hash}.js -O /tmp/main.js

# Beautify with js-beautify
npx js-beautify /tmp/main.js > /tmp/main.beautified.js

# Open in editor
code /tmp/main.beautified.js
```

**Search for patterns:**
```javascript
// API base URL
grep -n "api.browser-use.com" /tmp/main.beautified.js

// WebSocket connection
grep -n "WebSocket" /tmp/main.beautified.js

// State management
grep -n "useState\|useContext\|Redux" /tmp/main.beautified.js

// Authentication
grep -n "token\|auth\|login" /tmp/main.beautified.js
```

#### Step 4.3: UI Structure Documentation

Create document: `~/Desktop/browser-use-frontend-structure.md`

**Document:**
- Component hierarchy
- Routing structure
- State management approach
- API integration patterns
- CSS/styling approach (Tailwind, CSS-in-JS, etc.)

---

### Phase 5: Documentation & Recreation Plan (30 min)

**Goal:** Create comprehensive documentation and plan recreation

#### Step 5.1: API Documentation

Create: `~/Desktop/browser-use-api-docs.md`

**Template:**
```markdown
# Browser-Use API Documentation

## Base URL
https://cloud.browser-use.com/api

## Authentication
Bearer token in Authorization header

## Endpoints

### POST /auth/login
**Request:**
{
  "email": "user@example.com",
  "password": "password123"
}

**Response:**
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com"
  }
}

### GET /tasks
**Headers:**
Authorization: Bearer {token}

**Response:**
{
  "tasks": [
    {
      "id": "task_123",
      "description": "Navigate to example.com",
      "status": "completed",
      "createdAt": "2026-01-18T10:00:00Z"
    }
  ]
}

[... continue for all endpoints]
```

#### Step 5.2: Architecture Diagram

Create visual diagram:
- Frontend (React + Tailwind)
- API Layer (REST/WebSocket)
- Backend (Node.js/Python?)
- Database (PostgreSQL/MongoDB?)
- Browser Automation (Playwright/Puppeteer?)

**Tools:**
- Excalidraw: https://excalidraw.com/
- Mermaid: https://mermaid.live/
- draw.io: https://app.diagrams.net/

#### Step 5.3: Recreation Plan

Create: `~/Desktop/browser-use-recreation-plan.md`

**Sections:**
1. **Backend:**
   - Framework: Express.js or FastAPI
   - Database: PostgreSQL
   - Authentication: JWT
   - Browser automation: WebWright (we already have this!)

2. **Frontend:**
   - Framework: React + TypeScript (same as WebWright Desktop)
   - Styling: Tailwind CSS (same as WebWright Desktop)
   - State: React Query + Context
   - Routing: React Router

3. **Shared Code:**
   - WebWright client (we already have this!)
   - Type definitions
   - API client

4. **Implementation Order:**
   - Week 1: Backend API + Auth
   - Week 2: Frontend components
   - Week 3: Browser automation integration
   - Week 4: Real-time updates + polish

---

## Success Criteria

### Phase 1: Traffic Capture ✅
- [ ] mitmproxy captured all traffic
- [ ] HAR file exported successfully
- [ ] At least 10 unique API endpoints discovered
- [ ] Authentication mechanism identified

### Phase 2: Automated Discovery ✅
- [ ] WebWright automation completed without errors
- [ ] Screenshots captured for each page
- [ ] Interaction flow documented
- [ ] No bot detection triggered

### Phase 3: Endpoint Discovery ✅ (Optional)
- [ ] Kiterunner scan completed
- [ ] Shadow/hidden endpoints discovered
- [ ] Results exported to JSON
- [ ] At least 5 undocumented endpoints found

### Phase 4: Frontend Analysis ✅
- [ ] Component structure documented
- [ ] State management identified
- [ ] API integration patterns understood
- [ ] JavaScript bundles analyzed

### Phase 5: Documentation ✅
- [ ] Complete API documentation created
- [ ] Architecture diagram drawn
- [ ] Recreation plan written
- [ ] Ready to start implementation

---

## Expected Deliverables

1. **browser-use-traffic.har** - Captured network traffic
2. **browser-use-endpoints.json** - Kiterunner scan results (optional)
3. **browser-use-api-docs.md** - Complete API documentation
4. **browser-use-frontend-structure.md** - Frontend architecture
5. **browser-use-recreation-plan.md** - Implementation roadmap
6. **browser-use-architecture-diagram.png** - Visual system diagram

---

## Next Steps After Testing

1. **Implement Backend API:**
   - Set up Express.js/FastAPI project
   - Implement authentication
   - Create database models
   - Build API endpoints matching documented structure

2. **Build Frontend:**
   - Copy WebWright Desktop as starting point
   - Adapt components for Browser-Use UI
   - Integrate with backend API
   - Add browser automation features

3. **Integration:**
   - Use WebWright for browser automation (already have!)
   - Add real-time updates (WebSocket/SSE)
   - Implement session management
   - Add error handling

4. **Testing:**
   - Test API endpoints
   - Test browser automation
   - Test authentication flows
   - Test real-time updates

5. **Deployment:**
   - Deploy backend (Railway, Render, Fly.io)
   - Deploy frontend (Vercel, Netlify)
   - Set up database (Supabase, Railway)
   - Configure domain

---

**Estimated Total Time:** 2-3 hours for complete reverse engineering
**Estimated Implementation Time:** 2-4 weeks for full recreation
**Advantage:** We already have WebWright for browser automation - the hardest part!

---

**Ready to begin?** Start with Phase 1: mitmproxy traffic capture
