# Kiterunner Installation Guide

Kiterunner is a fast API endpoint discovery tool that finds shadow/undocumented endpoints.

---

## Installation Methods

### Method 1: Download Pre-built Binary (Recommended)

**For macOS ARM64 (M1/M2/M3):**

```bash
# Download latest release
cd ~/Downloads
curl -LO https://github.com/assetnote/kiterunner/releases/download/v1.0.2/kiterunner_1.0.2_darwin_arm64.tar.gz

# Extract
tar -xzf kiterunner_1.0.2_darwin_arm64.tar.gz

# Move to path
sudo mv kr /usr/local/bin/kr

# Verify installation
kr --help
```

**For macOS x86_64 (Intel):**

```bash
# Download latest release
cd ~/Downloads
curl -LO https://github.com/assetnote/kiterunner/releases/download/v1.0.2/kiterunner_1.0.2_darwin_amd64.tar.gz

# Extract
tar -xzf kiterunner_1.0.2_darwin_amd64.tar.gz

# Move to path
sudo mv kr /usr/local/bin/kr

# Verify installation
kr --help
```

---

### Method 2: Build from Source

**Requirements:**
- Go 1.16 or higher
- Git

**Steps:**

```bash
# Clone repository
git clone https://github.com/assetnote/kiterunner.git
cd kiterunner

# Build
go build -o kr ./cmd/kiterunner

# Move to path
sudo mv kr /usr/local/bin/kr

# Verify installation
kr --help
```

---

## Downloading Wordlists

Kiterunner requires wordlists for endpoint discovery:

```bash
# Download routes wordlist
mkdir -p ~/.kiterunner
cd ~/.kiterunner

# Download Assetnote wordlists (recommended)
wget https://github.com/assetnote/kiterunner/releases/download/v1.0.2/routes-large.kite.tar.gz
tar -xzf routes-large.kite.tar.gz

# Or smaller wordlist for faster scans
wget https://github.com/assetnote/kiterunner/releases/download/v1.0.2/routes-small.kite.tar.gz
tar -xzf routes-small.kite.tar.gz
```

---

## Basic Usage

### Scan for API Endpoints

```bash
# Scan with large wordlist
kr scan https://cloud.browser-use.com -w ~/.kiterunner/routes-large.kite -o results.json

# Scan with smaller wordlist (faster)
kr scan https://cloud.browser-use.com -w ~/.kiterunner/routes-small.kite

# Scan specific API base
kr scan https://api.example.com/v1 -w ~/.kiterunner/routes-large.kite
```

### Brute Force Mode

```bash
# Brute force with custom wordlist
kr brute https://cloud.browser-use.com -w /path/to/wordlist.txt

# With authentication
kr brute https://api.example.com -H "Authorization: Bearer TOKEN" -w wordlist.txt
```

### Advanced Options

```bash
# Set concurrency
kr scan https://example.com -w routes.kite -x 10

# Filter by status codes
kr scan https://example.com -w routes.kite --filter-code 200,201,403

# Quiet mode (suppress progress)
kr scan https://example.com -w routes.kite -q

# Output formats
kr scan https://example.com -w routes.kite -o results.json    # JSON
kr scan https://example.com -w routes.kite -o results.txt     # Text
```

---

## Integration with WebWright Desktop

Once installed, Kiterunner will be automatically detected by the RE Task Page.

**Usage:**
1. Go to "Reverse Engineering" page
2. Select "API Discovery" template
3. Enter target URL: `https://cloud.browser-use.com`
4. Click "Start Reverse Engineering"

**What happens:**
- WebWright checks if Kiterunner is installed
- If installed, runs endpoint discovery scan
- Results are parsed and displayed in logs
- Discovered endpoints are exported to JSON

---

## Verification

Check if Kiterunner is installed and working:

```bash
# Check if installed
which kr

# Check version
kr --version

# Test with example
kr wordlist sample

# Should output some sample endpoints
```

---

## Troubleshooting

### "kr: command not found"

**Solution:**
```bash
# Check if binary exists
ls -la /usr/local/bin/kr

# If not, move it manually
sudo mv ~/Downloads/kr /usr/local/bin/kr
sudo chmod +x /usr/local/bin/kr
```

### "permission denied"

**Solution:**
```bash
# Make executable
sudo chmod +x /usr/local/bin/kr
```

### "wordlist not found"

**Solution:**
```bash
# Download wordlists
mkdir -p ~/.kiterunner
cd ~/.kiterunner
wget https://github.com/assetnote/kiterunner/releases/download/v1.0.2/routes-large.kite.tar.gz
tar -xzf routes-large.kite.tar.gz
```

---

## Recommended Workflow for Browser-Use.com

**Step 1: Install Kiterunner**
```bash
# Download and install (see above)
```

**Step 2: Download wordlist**
```bash
mkdir -p ~/.kiterunner
cd ~/.kiterunner
wget https://github.com/assetnote/kiterunner/releases/download/v1.0.2/routes-large.kite.tar.gz
tar -xzf routes-large.kite.tar.gz
```

**Step 3: Run scan**
```bash
kr scan https://cloud.browser-use.com -w ~/.kiterunner/routes-large.kite -o ~/Desktop/browser-use-endpoints.json
```

**Step 4: Analyze results**
```bash
# View JSON results
cat ~/Desktop/browser-use-endpoints.json | jq '.results[] | {path: .path, status: .status}'

# Count endpoints by status code
cat ~/Desktop/browser-use-endpoints.json | jq '.results | group_by(.status) | map({status: .[0].status, count: length})'
```

---

## Expected Results for Browser-Use.com

**Likely to discover:**
- `/api/tasks` - Task management endpoints
- `/api/sessions` - Session management
- `/api/auth/*` - Authentication endpoints
- `/api/browser/*` - Browser control endpoints
- Hidden admin endpoints (if any)
- Deprecated v1 endpoints
- Debug/diagnostic endpoints

---

**Status:** Manual installation required (go install failed due to package structure)
**Priority:** High (needed for comprehensive API discovery)
**ETA:** 5-10 minutes to download, extract, and test
