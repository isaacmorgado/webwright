# Reverse Engineering Tools - GitHub Repositories

Complete list of professional reverse engineering tools with official GitHub links.

---

## Browser DevTools & Analysis

### Chrome DevTools
**Description:** Built-in browser suite for inspection, debugging, and network analysis
**Link:** Built into Chrome browser
**Docs:** https://developer.chrome.com/docs/devtools/

### Local Overrides (DevTools)
**Description:** Replace live website JavaScript with local copies
**Link:** Built into Chrome DevTools
**Docs:** https://developer.chrome.com/docs/devtools/overrides/

### AST Explorer
**Description:** Visualize Abstract Syntax Trees from obfuscated JavaScript
**GitHub:** [fkling/astexplorer](https://github.com/fkling/astexplorer)
**Live Site:** https://astexplorer.net/
**Alternative:** [sxzz/ast-explorer](https://github.com/sxzz/ast-explorer)

### Source Map De-obfuscators
**Description:** Reconstruct original source from minified code
**Tools:** Various (browser built-in, online tools)

---

## AI-Powered UI Tools

### screenshot-to-code
**Description:** AI tool to convert UI screenshots to React/Tailwind code
**GitHub:** [abi/screenshot-to-code](https://github.com/abi/screenshot-to-code)
**Stars:** 71.4k
**Features:** Supports HTML+Tailwind, React, Vue, Claude Sonnet 3.7, GPT-4o

### v0.dev
**Description:** Generative UI tool by Vercel for building React components
**Website:** https://v0.app/
**SDK GitHub:** [vercel/v0-sdk](https://github.com/vercel/v0-sdk)
**Features:** Natural language to production-ready web apps

### Vision Agent (LandingAI)
**Description:** Visual AI pilot for image-based code generation
**GitHub:** [landing-ai/vision-agent](https://github.com/landing-ai/vision-agent)
**Tools:** [landing-ai/vision-agent-tools](https://github.com/landing-ai/vision-agent-tools)
**Use Case:** Analyze pixel-based UIs (Canvas elements without DOM)

---

## Browser Automation & Stealth

### Puppeteer-extra-plugin-stealth
**Description:** Hide browser automation flags to appear as real user
**GitHub:** [berstend/puppeteer-extra](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth)
**NPM:** `puppeteer-extra-plugin-stealth`
**Features:** Passes all public bot tests, 18+ evasion techniques

### Playwright-extra (JavaScript/TypeScript)
**Description:** Playwright wrapper with stealth plugin support
**GitHub:** [berstend/puppeteer-extra/packages/playwright-extra](https://github.com/berstend/puppeteer-extra/tree/master/packages/playwright-extra)
**NPM:** `playwright-extra` + `puppeteer-extra-plugin-stealth`
**Note:** This is the JavaScript equivalent of Python's playwright-stealth

---

## Protobuf & Binary Protocol Tools

### pbtk (Protobuf Toolkit)
**Description:** Reverse engineer .proto definitions from binary data/APKs
**GitHub:** [marin-m/pbtk](https://github.com/marin-m/pbtk)
**Stars:** 1.5k
**Features:** GUI, extracts from web/Android/Java, converts to readable .protos

### Blackbox Protobuf
**Description:** Burp Suite extension for decoding Protobuf without schemas
**GitHub:** [nccgroup/blackboxprotobuf](https://github.com/nccgroup/blackboxprotobuf)
**Features:** Auto-decode messages, import/export .proto files, gRPC support

### protoc (--decode_raw)
**Description:** Official Protobuf compiler for raw blob decoding
**GitHub:** [protocolbuffers/protobuf](https://github.com/protocolbuffers/protobuf)
**Command:** `cat data.bin | protoc --decode_raw`

### BloomRPC
**Description:** GUI client for gRPC services (no longer maintained)
**GitHub:** [bloomrpc/bloomrpc](https://github.com/bloomrpc/bloomrpc) (archived)
**Stars:** 9k
**Status:** Archived Jan 4, 2023 - use Kreya instead

### Kreya
**Description:** Modern GUI client for gRPC, REST, WebSocket APIs
**GitHub:** [riok/Kreya](https://github.com/riok/Kreya)
**Website:** https://kreya.app/
**Features:** Replaces BloomRPC, git-friendly JSON storage, unary/streaming support

### mitmproxy-grpc
**Description:** gRPC addon for mitmproxy with descriptor support
**GitHub:** [aarnaut/mitmproxy-grpc](https://github.com/aarnaut/mitmproxy-grpc)
**Features:** Serialize/deserialize protobuf, edit via :grpc commands

---

## GraphQL Tools

### InQL
**Description:** Burp Suite extension for GraphQL security testing
**GitHub:** [doyensec/inql](https://github.com/doyensec/inql)
**Features:** Introspection scanning, vulnerability detection, Burp integration
**BApp Store:** https://portswigger.net/bappstore/296e9a0730384be4b2fffef7b4e19b1f

### Clairvoyance
**Description:** Reconstruct GraphQL schema when introspection is disabled
**GitHub:** [nikitastupin/clairvoyance](https://github.com/nikitastupin/clairvoyance)
**Fork:** [y0k4i-1337/clairvoyancex](https://github.com/y0k4i-1337/clairvoyancex) (with HTTP proxy)
**Method:** Field suggestion fuzzing

### Apollo Studio (DevTools)
**Description:** Browser extension for GraphQL client injection
**Link:** Chrome Web Store
**Features:** Full GUI to query backends via injected client

---

## Proxy & Traffic Interception

### mitmproxy
**Description:** Interactive TLS-capable HTTP proxy for pentesting
**GitHub:** [mitmproxy/mitmproxy](https://github.com/mitmproxy/mitmproxy)
**Stars:** 41.8k
**Features:** HTTP/1, HTTP/2, WebSockets, Python scripting, Rust components

### Burp Suite Professional
**Description:** Industry-standard GUI proxy for web security
**Website:** https://portswigger.net/burp
**Features:** Repeater, Intruder, Scanner, Extensions
**Note:** Commercial product (not open source)

### Turbo Intruder
**Description:** Burp Suite extension for high-volume HTTP fuzzing
**GitHub:** [PortSwigger/turbo-intruder](https://github.com/PortSwigger/turbo-intruder)
**Features:** Fast, scalable, flexible Python-based attacks, race conditions

### Charles Proxy
**Description:** Web debugging proxy for mobile traffic
**Website:** https://www.charlesproxy.com/
**Features:** User-friendly SSL certificate handling for iOS/Android
**Note:** Commercial product

### Caido
**Description:** Lightweight Rust-based alternative to Burp Suite
**GitHub:** [caido/caido](https://github.com/caido/caido)
**Website:** https://caido.io/
**Features:** Modern intercept, replay, automation, visual workflows

### Wireshark
**Description:** Network protocol analyzer for deep packet inspection
**Website:** https://www.wireshark.org/
**GitHub:** https://gitlab.com/wireshark/wireshark
**Features:** TCP/UDP analysis below HTTP layer

---

## Fingerprinting & Detection Evasion

### JA3 Transport Inspector
**Description:** TLS fingerprint identification and impersonation
**GitHub:** [CUCyber/ja3transport](https://github.com/CUCyber/ja3transport) (Go)
**Official:** [salesforce/ja3](https://github.com/salesforce/ja3) (no longer maintained)
**Features:** Mock JA3 signatures, avoid bot detection via TLS handshake

---

## API Discovery & Fuzzing

### Kiterunner
**Description:** API fuzzer for discovering "Shadow APIs"
**GitHub:** [assetnote/kiterunner](https://github.com/assetnote/kiterunner)
**Features:** Contextual content discovery, structured API routes
**Note:** Not updated since 2021

### RESTler
**Description:** Stateful REST API fuzzer by Microsoft
**GitHub:** [microsoft/restler-fuzzer](https://github.com/microsoft/restler-fuzzer)
**Features:** OpenAPI-based, learns from responses, finds security bugs

### Schemathesis
**Description:** Property-based API testing for OpenAPI/GraphQL
**GitHub:** [schemathesis/schemathesis](https://github.com/schemathesis/schemathesis)
**Stars:** 2.9k
**Features:** Auto-generate test cases, find 500 errors, schema violations
**Used by:** Spotify, WordPress, JetBrains, Red Hat

---

## Summary

**Total Tools:** 27 professional reverse engineering tools

**Categories:**
- Browser DevTools: 4 tools
- AI-Powered UI: 3 tools
- Browser Automation: 2 tools
- Protobuf/Binary: 6 tools
- GraphQL: 3 tools
- Proxies: 6 tools
- Fingerprinting: 1 tool
- API Fuzzing: 3 tools

**Integration Status:**
- ✅ Ready for WebWright Desktop integration
- 📦 NPM packages available for most tools
- 🐍 Some Python-only (can use subprocess/child_process)
- 💰 Some commercial (Burp Suite Professional, Charles Proxy)

---

**Last Updated:** 2026-01-18
