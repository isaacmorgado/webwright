# 🗂️ Project Structure: .

**Generated**: 2026-01-18 13:54:39
**Purpose**: Quick navigation reference for Claude (token-efficient)

---

## 📁 Directory Tree

```
/Users/imorgado/Projects/webwright-desktop
├── 📁 .claude/
├── 📄 checkpoint-state.json
├── 📄 file-changes.json
├── 📄 health.json
└── 📄 project-index.md
├── 📄 .gitignore
├── 📄 ADVANCED-FEATURES.md
├── 📄 BROWSER-USE-RE-TEST.md
├── 📄 capture-browser-use-api.ts
├── 📁 electron/
├── 📄 database.js
├── 📄 main.js
└── 📄 preload.js
├── 📄 IMPLEMENTATION-SUMMARY.md
├── 📄 index.html
├── 📄 INTEGRATION-COMPLETE.md
├── 📄 KITERUNNER-INSTALL.md
├── 📄 package-lock.json
├── 📄 package.json
├── 📄 PLAYWRIGHT-STEALTH-INTEGRATION.md
├── 📄 postcss.config.js
├── 📄 QUICKSTART.md
├── 📄 RE-IMPLEMENTATION-SUMMARY.md
├── 📄 RE-INTEGRATION-ARCHITECTURE.md
├── 📄 RE-INTEGRATION-STATUS.md
├── 📄 RE-TEST-RESULTS.md
├── 📄 RE-TOOLS-TEST-PLAN.md
├── 📄 README.md
├── 📄 REVERSE-ENGINEERING-TOOLS.md
├── 📁 src/
├── 📄 App.tsx
├── 📁 components/
│   ├── 📄 DaemonStatus.tsx
│   └── 📄 Layout.tsx
├── 📄 index.css
├── 📁 lib/
│   ├── 📄 re-orchestrator.ts
│   ├── 📁 re-tools/
│   │   ├── 📄 mitmproxy-runner.ts
│   │   └── 📄 network-capture.ts
│   ├── 📄 task-analyzer.ts
│   └── 📄 webwright-client.ts
├── 📄 main.tsx
├── 📁 pages/
│   ├── 📄 DevToolsPage.tsx
│   ├── 📄 NewTaskPage.tsx
│   ├── 📄 RETaskPage.tsx
│   ├── 📄 SessionsPage.tsx
│   └── 📄 SettingsPage.tsx
└── 📁 types/
│   └── 📄 electron.d.ts
├── 📄 start.sh
├── 📄 STEALTH-INTEGRATION-COMPLETE.md
├── 📄 tailwind.config.js
├── 📄 test-database-standalone.js
├── 📄 test-database.js
├── 📄 test-login-persistence.ts
├── 📄 test-natural-language-re.ts
├── 📄 test-stealth-browser-use.ts
├── 📁 tests/
├── 📁 components/
│   ├── 📄 NewTaskPage.test.tsx
│   └── 📄 RETaskPage.test.tsx
├── 📁 e2e/
│   ├── 📄 app.e2e.ts
│   └── 📄 playwright.config.ts
├── 📁 electron/
│   └── 📄 ipc-handlers.test.ts
├── 📁 integration/
├── 📄 setup.ts
└── 📁 unit/
│   ├── 📄 database.test.ts
│   ├── 📄 task-analyzer.test.ts
│   └── 📄 webwright-client.test.ts
├── 📄 tsconfig.json
├── 📄 tsconfig.node.json
├── 📄 vite.config.ts
├── 📄 vitest.config.ts
└── 📄 webwright-http-bridge.js
```

---

## 📋 Important Files

### Configuration
• ./tsconfig.node.json
• ./node_modules/.package-lock.json
• ./.claude/file-changes.json
• ./.claude/checkpoint-state.json
• ./.claude/health.json
• ./package-lock.json
• ./package.json
• ./tsconfig.json
• ./tailwind.config.js
• ./postcss.config.js

### Documentation
• ./README.md
• ./RE-INTEGRATION-ARCHITECTURE.md
• ./RE-INTEGRATION-STATUS.md
• ./RE-IMPLEMENTATION-SUMMARY.md
• ./IMPLEMENTATION-SUMMARY.md
• ./RE-TOOLS-TEST-PLAN.md
• ./RE-TEST-RESULTS.md
• ./QUICKSTART.md
• ./.claude/project-index.md
• ./STEALTH-INTEGRATION-COMPLETE.md
• ./ADVANCED-FEATURES.md
• ./README.md
• ./KITERUNNER-INSTALL.md
• ./INTEGRATION-COMPLETE.md
• ./BROWSER-USE-RE-TEST.md
• ./PLAYWRIGHT-STEALTH-INTEGRATION.md
• ./REVERSE-ENGINEERING-TOOLS.md

### Entry Points
• ./electron/main.js
• ./src/main.tsx
• ./index.html
• ./dist/index.html
• ./node_modules/queue-microtask/index.js
• ./node_modules/queue-microtask/index.d.ts
• ./node_modules/plist/index.js
• ./node_modules/pend/index.js
• ./node_modules/fd-slicer/index.js
• ./node_modules/define-data-property/index.js
• ./node_modules/define-data-property/index.d.ts
• ./node_modules/fs-constants/index.js
• ./node_modules/pirates/index.d.ts
• ./node_modules/hosted-git-info/index.js
• ./node_modules/tldts/index.ts
• ./node_modules/lodash/index.js
• ./node_modules/lodash.flatten/index.js
• ./node_modules/quick-lru/index.js
• ./node_modules/quick-lru/index.d.ts
• ./node_modules/browserslist/index.js
• ./node_modules/browserslist/index.d.ts
• ./node_modules/process-nextick-args/index.js
• ./node_modules/shebang-regex/index.js
• ./node_modules/shebang-regex/index.d.ts
• ./node_modules/redent/index.js
• ./node_modules/redent/index.d.ts
• ./node_modules/thenify/index.js
• ./node_modules/path-is-absolute/index.js
• ./node_modules/http-cache-semantics/index.js
• ./node_modules/has-property-descriptors/index.js
• ./node_modules/csstype/index.js.flow
• ./node_modules/csstype/index.d.ts
• ./node_modules/mimic-fn/index.js
• ./node_modules/mimic-fn/index.d.ts
• ./node_modules/strip-ansi/index.js
• ./node_modules/strip-ansi/index.d.ts
• ./node_modules/prebuild-install/index.js
• ./node_modules/react-is/index.js
• ./node_modules/tmp-promise/index.js
• ./node_modules/tmp-promise/index.test-d.ts
• ./node_modules/tmp-promise/index.d.ts
• ./node_modules/dotenv-expand/index.d.ts
• ./node_modules/loose-envify/index.js
• ./node_modules/es-errors/index.js
• ./node_modules/es-errors/index.d.ts
• ./node_modules/is-obj/index.js
• ./node_modules/is-obj/index.d.ts
• ./node_modules/lodash.union/index.js
• ./node_modules/p-cancelable/index.js
• ./node_modules/p-cancelable/index.d.ts
• ./node_modules/node-addon-api/index.js
• ./node_modules/ms/index.js
• ./node_modules/playwright-core/index.js
• ./node_modules/playwright-core/index.mjs
• ./node_modules/playwright-core/index.d.ts
• ./node_modules/min-indent/index.js
• ./node_modules/escape-string-regexp/index.js
• ./node_modules/escape-string-regexp/index.d.ts
• ./node_modules/indent-string/index.js
• ./node_modules/indent-string/index.d.ts
• ./node_modules/has-tostringtag/index.js
• ./node_modules/has-tostringtag/index.d.ts
• ./node_modules/mz/index.js
• ./node_modules/strip-json-comments/index.js
• ./node_modules/lru-cache/index.js
• ./node_modules/type-fest/index.d.ts
• ./node_modules/commander/index.js
• ./node_modules/require-directory/index.js
• ./node_modules/ci-info/index.js
• ./node_modules/ci-info/index.d.ts
• ./node_modules/escalade/index.d.mts
• ./node_modules/escalade/index.d.ts
• ./node_modules/7zip-bin/index.js
• ./node_modules/7zip-bin/index.d.ts
• ./node_modules/chai/index.js
• ./node_modules/fast-json-stable-stringify/index.js
• ./node_modules/fast-json-stable-stringify/index.d.ts
• ./node_modules/deep-extend/index.js
• ./node_modules/detect-libc/index.d.ts
• ./node_modules/balanced-match/index.js
• ./node_modules/path-exists/index.js
• ./node_modules/progress/index.js
• ./node_modules/resolve/index.js
• ./node_modules/retry/index.js
• ./node_modules/call-bind-apply-helpers/index.js
• ./node_modules/call-bind-apply-helpers/index.d.ts
• ./node_modules/object-hash/index.js
• ./node_modules/concurrently/index.js
• ./node_modules/concurrently/index.mjs
• ./node_modules/base64-js/index.js
• ./node_modules/base64-js/index.d.ts
• ./node_modules/tldts-core/index.ts
• ./node_modules/nanoid/index.d.cts
• ./node_modules/nanoid/index.browser.js
• ./node_modules/nanoid/index.js
• ./node_modules/nanoid/index.browser.cjs
• ./node_modules/nanoid/index.cjs
• ./node_modules/nanoid/index.d.ts
• ./node_modules/buffer-crc32/index.js
• ./node_modules/is-potential-custom-element-name/index.js
• ./node_modules/cli-truncate/index.js
• ./node_modules/cli-truncate/index.d.ts
• ./node_modules/extract-zip/index.js
• ./node_modules/extract-zip/index.d.ts
• ./node_modules/postcss-js/index.js
• ./node_modules/postcss-js/index.mjs
• ./node_modules/wrap-ansi/index.js
• ./node_modules/y18n/index.mjs
• ./node_modules/gensync/index.js
• ./node_modules/gensync/index.js.flow
• ./node_modules/proxy-from-env/index.js
• ./node_modules/file-uri-to-path/index.js
• ./node_modules/file-uri-to-path/index.d.ts
• ./node_modules/normalize-url/index.js
• ./node_modules/normalize-url/index.d.ts
• ./node_modules/debounce-fn/index.js
• ./node_modules/debounce-fn/index.d.ts
• ./node_modules/resolve-alpn/index.js
• ./node_modules/vitest/index.d.cts
• ./node_modules/vitest/index.cjs
• ./node_modules/assertion-error/index.js
• ./node_modules/assertion-error/index.d.ts
• ./node_modules/picomatch/index.js
• ./node_modules/safe-buffer/index.js
• ./node_modules/safe-buffer/index.d.ts
• ./node_modules/lowercase-keys/index.js
• ./node_modules/lowercase-keys/index.d.ts
• ./node_modules/function-bind/index.js
• ./node_modules/is-glob/index.js
• ./node_modules/is-fullwidth-code-point/index.js
• ./node_modules/is-fullwidth-code-point/index.d.ts
• ./node_modules/env-paths/index.js
• ./node_modules/env-paths/index.d.ts
• ./node_modules/truncate-utf8-bytes/index.js
• ./node_modules/jsonfile/index.js
• ./node_modules/is-ci/index.js
• ./node_modules/date-fns/index.js
• ./node_modules/date-fns/index.js.flow
• ./node_modules/anymatch/index.js
• ./node_modules/anymatch/index.d.ts
• ./node_modules/color-name/index.js
• ./node_modules/es-define-property/index.js
• ./node_modules/es-define-property/index.d.ts
• ./node_modules/crc/index.js
• ./node_modules/async/index.js
• ./node_modules/chokidar/index.js
• ./node_modules/p-locate/index.js
• ./node_modules/get-intrinsic/index.js
• ./node_modules/arg/index.js
• ./node_modules/arg/index.d.ts
• ./node_modules/decompress-response/index.js
• ./node_modules/decompress-response/index.d.ts
• ./node_modules/simple-get/index.js
• ./node_modules/js-yaml/index.js
• ./node_modules/whatwg-url/index.js
• ./node_modules/scheduler/index.js
• ./node_modules/strip-ansi-cjs/index.js
• ./node_modules/strip-ansi-cjs/index.d.ts
• ./node_modules/pify/index.js
• ./node_modules/archiver/index.js
• ./node_modules/strip-indent/index.js
• ./node_modules/strip-indent/index.d.ts
• ./node_modules/err-code/index.js
• ./node_modules/err-code/index.umd.js
• ./node_modules/is-binary-path/index.js
• ./node_modules/is-binary-path/index.d.ts
• ./node_modules/hasown/index.js
• ./node_modules/hasown/index.d.ts
• ./node_modules/tar-stream/index.js
• ./node_modules/run-parallel/index.js
• ./node_modules/p-limit/index.js
• ./node_modules/p-limit/index.d.ts
• ./node_modules/mime-types/index.js
• ./node_modules/undici-types/index.d.ts
• ./node_modules/github-from-package/index.js
• ./node_modules/json-schema-traverse/index.js
• ./node_modules/end-of-stream/index.js
• ./node_modules/minimist/index.js
• ./node_modules/pkg-up/index.js
• ./node_modules/pkg-up/index.d.ts
• ./node_modules/playwright/index.js
• ./node_modules/playwright/index.mjs
• ./node_modules/playwright/index.d.ts
• ./node_modules/universalify/index.js
• ./node_modules/onetime/index.js
• ./node_modules/onetime/index.d.ts
• ./node_modules/find-up/index.js
• ./node_modules/chalk/index.d.ts
• ./node_modules/ansi-regex/index.js
• ./node_modules/ansi-regex/index.d.ts
• ./node_modules/mimic-response/index.js
• ./node_modules/matcher/index.js
• ./node_modules/matcher/index.d.ts
• ./node_modules/siginfo/index.js
• ./node_modules/has-flag/index.js
• ./node_modules/has-flag/index.d.ts
• ./node_modules/supports-color/index.js
• ./node_modules/wrap-ansi-cjs/index.js
• ./node_modules/fs-minipass/index.js
• ./node_modules/supports-preserve-symlinks-flag/index.js
• ./node_modules/color-convert/index.js
• ./node_modules/path-key/index.js
• ./node_modules/path-key/index.d.ts
• ./node_modules/readdirp/index.js
• ./node_modules/readdirp/index.d.ts
• ./node_modules/utf8-byte-length/index.js
• ./node_modules/brace-expansion/index.js
• ./node_modules/fill-range/index.js
• ./node_modules/lodash.difference/index.js
• ./node_modules/binary-extensions/index.js
• ./node_modules/binary-extensions/index.d.ts
• ./node_modules/get-caller-file/index.js
• ./node_modules/get-caller-file/index.js.map
• ./node_modules/get-caller-file/index.d.ts
• ./node_modules/astral-regex/index.js
• ./node_modules/astral-regex/index.d.ts
• ./node_modules/react-dom/index.js
• ./node_modules/path-parse/index.js
• ./node_modules/has-symbols/index.js
• ./node_modules/has-symbols/index.d.ts
• ./node_modules/cacheable-lookup/index.d.ts
• ./node_modules/ieee754/index.js
• ./node_modules/ieee754/index.d.ts
• ./node_modules/json-buffer/index.js
• ./node_modules/minizlib/index.js
• ./node_modules/at-least-node/index.js
• ./node_modules/define-properties/index.js
• ./node_modules/vite/index.d.cts
• ./node_modules/vite/index.cjs
• ./node_modules/node-abi/index.js
• ./node_modules/ajv-keywords/index.js
• ./node_modules/ansi-styles/index.js
• ./node_modules/ansi-styles/index.d.ts
• ./node_modules/is-core-module/index.js
• ./node_modules/fast-uri/index.js
• ./node_modules/sumchecker/index.js
• ./node_modules/sumchecker/index.test-d.ts
• ./node_modules/sumchecker/index.d.ts
• ./node_modules/js-tokens/index.js
• ./node_modules/dlv/index.js
• ./node_modules/tr46/index.js
• ./node_modules/is-number/index.js
• ./node_modules/fs.realpath/index.js
• ./node_modules/compare-version/index.js
• ./node_modules/postcss-import/index.js
• ./node_modules/shell-quote/index.js
• ./node_modules/serialize-error/index.js
• ./node_modules/serialize-error/index.d.ts
• ./node_modules/postcss-nested/index.js
• ./node_modules/postcss-nested/index.d.ts
• ./node_modules/mdn-data/index.js
• ./node_modules/concat-map/index.js
• ./node_modules/pump/index.js
• ./node_modules/app-builder-bin/index.js
• ./node_modules/app-builder-bin/index.d.ts
• ./node_modules/get-stream/index.js
• ./node_modules/get-stream/index.d.ts
• ./node_modules/update-browserslist-db/index.js
• ./node_modules/update-browserslist-db/index.d.ts
• ./node_modules/thenify-all/index.js
• ./node_modules/simple-concat/index.js
• ./node_modules/lodash.isplainobject/index.js
• ./node_modules/convert-source-map/index.js
• ./node_modules/any-promise/index.js
• ./node_modules/any-promise/index.d.ts
• ./node_modules/async-exit-hook/index.js
• ./node_modules/camelcase-css/index.js
• ./node_modules/cliui/index.mjs
• ./node_modules/zip-stream/index.js
• ./node_modules/object-assign/index.js
• ./node_modules/electron-store/index.js
• ./node_modules/electron-store/index.d.ts
• ./node_modules/filelist/index.js
• ./node_modules/filelist/index.d.ts
• ./node_modules/get-proto/index.js
• ./node_modules/get-proto/index.d.ts
• ./node_modules/form-data/index.d.ts
• ./node_modules/slice-ansi/index.js
• ./node_modules/cross-spawn/index.js
• ./node_modules/mime/index.js
• ./node_modules/yargs/index.cjs
• ./node_modules/yargs/index.mjs
• ./node_modules/bluebird-lst/index.js
• ./node_modules/bluebird-lst/index.d.ts
• ./node_modules/asynckit/index.js
• ./node_modules/tar-fs/index.js
• ./node_modules/to-regex-range/index.js
• ./node_modules/object-keys/index.js
• ./node_modules/gopd/index.js
• ./node_modules/gopd/index.d.ts
• ./node_modules/why-is-node-running/index.js
• ./node_modules/promise-retry/index.js
• ./node_modules/string-width/index.js
• ./node_modules/string-width/index.d.ts
• ./node_modules/minipass/index.js
• ./node_modules/minipass/index.mjs
• ./node_modules/minipass/index.d.ts
• ./node_modules/stackback/index.js
• ./node_modules/yauzl/index.js
• ./node_modules/follow-redirects/index.js
• ./node_modules/p-try/index.js
• ./node_modules/p-try/index.d.ts
• ./node_modules/isarray/index.js
• ./node_modules/micromatch/index.js
• ./node_modules/electron/index.js
• ./node_modules/semver-compare/index.js
• ./node_modules/archiver-utils/index.js
• ./node_modules/is-extglob/index.js
• ./node_modules/fastq/index.d.ts
• ./node_modules/rc/index.js
• ./node_modules/tar/index.js
• ./node_modules/read-cache/index.js
• ./node_modules/merge2/index.js
• ./node_modules/lodash.defaults/index.js
• ./node_modules/es-set-tostringtag/index.js
• ./node_modules/es-set-tostringtag/index.d.ts
• ./node_modules/globalthis/index.js
• ./node_modules/dequal/index.d.ts
• ./node_modules/react/index.js
• ./node_modules/axios/index.d.cts
• ./node_modules/axios/index.js
• ./node_modules/axios/index.d.ts
• ./node_modules/buffer-from/index.js
• ./node_modules/sanitize-filename/index.js
• ./node_modules/sanitize-filename/index.d.ts
• ./node_modules/braces/index.js
• ./node_modules/readdir-glob/index.js
• ./node_modules/string-width-cjs/index.js
• ./node_modules/string-width-cjs/index.d.ts
• ./node_modules/emoji-regex/index.js
• ./node_modules/emoji-regex/index.d.ts
• ./node_modules/tunnel-agent/index.js
• ./node_modules/detect-node/index.js
• ./node_modules/detect-node/index.esm.js
• ./node_modules/locate-path/index.js
• ./node_modules/mkdirp-classic/index.js
• ./node_modules/mkdirp/index.js
• ./node_modules/expand-template/index.js
• ./node_modules/normalize-path/index.js
• ./node_modules/ws/index.js
• ./node_modules/fast-deep-equal/index.js
• ./node_modules/fast-deep-equal/index.d.ts
• ./node_modules/shebang-command/index.js
• ./node_modules/napi-build-utils/index.js
• ./node_modules/napi-build-utils/index.md
• ./node_modules/electron-to-chromium/index.js
• ./node_modules/require-from-string/index.js
• ./node_modules/buffer-equal/index.js
• ./node_modules/dot-prop/index.js
• ./node_modules/dot-prop/index.d.ts
• ./node_modules/glob-parent/index.js
• ./node_modules/buffer/index.js
• ./node_modules/buffer/index.d.ts
• ./node_modules/mime-db/index.js
• ./node_modules/isexe/index.js
• ./node_modules/es-object-atoms/index.js
• ./node_modules/es-object-atoms/index.d.ts
• ./node_modules/tree-kill/index.js
• ./node_modules/tree-kill/index.d.ts
• ./src/index.css
• ./tests/e2e/app.e2e.ts
• ./node_modules/react-dom/server.js
• ./node_modules/react-dom/server.browser.js
• ./node_modules/react-dom/server.node.js
• ./node_modules/react-router-dom/server.d.ts
• ./node_modules/react-router-dom/server.js
• ./node_modules/react-router-dom/server.mjs


---

## 📊 Project Statistics

**Languages:**
• JavaScript/TypeScript: 15255 files
• Python: 13 files

**Estimated LOC:** 705439


---

## 🧭 Navigation Guide

### Quick File Location
- Use \`grep -r "pattern" src/\` to search source
- Use \`find . -name "*.ext"\` to locate by extension
- Check CLAUDE.md for project-specific context

### Common Directories
• **dist/**
• **electron/**
• **node_modules/**
• **src/**: Source code
• **tests/**: Test files

---

## 💡 Usage Tips

**For Claude:**
1. Read this file first before exploring (saves tokens)
2. Use Grep/Glob tools for targeted searches
3. Reference specific paths from tree above
4. Check Important Files for config/docs

**Regenerate:**
```bash
~/.claude/hooks/project-navigator.sh generate
```

**Auto-update:** Index refreshes on major file changes (>10 files edited)
