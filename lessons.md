# NeuralFill — Lessons Learned

> Running log of discoveries, mistakes, and decisions made during development.
> Add to this file whenever something surprising or important is encountered.

---

## API & Browser

### Two Gemini Nano sessions needed — classification vs generation
- The classification session uses a strict "JSON-only" system prompt — sending a long-form prompt to it produces JSON output, not natural text
- Long-form generation needs a completely separate session with a professional writing system prompt
- **Fix:** bridge.js now maintains two sessions: `session` (classification, eager) and `genSession` (generation, lazy — created on first `RUN_GENERATE` message)
- **Lesson:** System prompts are baked into the session. If you need different output formats, use different sessions, not different prompts.

### Gemini Nano API renamed (Chrome 137+)
- **Old API:** `window.ai.languageModel.create()` / `window.ai.languageModel.capabilities()`
- **New API:** `LanguageModel.create()` / `LanguageModel.availability()` (no `window.ai` wrapper)
- **Fix:** Always check `LanguageModel` → `window.LanguageModel` → `window.ai.languageModel` in that order
- **Where applied:** `utils/aiEngine.js`, `content/bridge.js`
- **Lesson:** Never hardcode a single API path for an experimental browser feature. Use a fallback chain.

### Gemini Nano still requires flags (as of March 2025)
- Chrome 137+ is rolling out unflagged support but it is not universal yet
- Flags still needed on most installs: `#prompt-api-for-gemini-nano` + `#optimization-guide-on-device-model`
- Full unflagged rollout expected by end of 2025
- **Lesson:** Don't assume a "coming soon" announcement means it's already shipped for all users. Always add a detection check + setup guide.

### Lock gate must be applied to ALL fill entry points — not just the popup
- The popup's "Fill Form Now" button correctly checked session lock
- But the context menu, keyboard shortcut, and badge_fill message handlers in background.js did NOT — they fired regardless of lock state
- Any feature that triggers a fill must call `isSessionUnlocked()` before proceeding
- **Entry points to gate:** popup fill button, context menu, keyboard shortcut (`fill_form` command), badge_fill message
- **Lesson:** When adding a new fill trigger, always add the lock check first. Treat it like a precondition, not an afterthought.

### WebAuthn blocked in Chrome extensions
- `navigator.credentials.create()` requires an `https://` origin
- Chrome extensions run on `chrome-extension://` — WebAuthn throws `NotSupportedError` immediately
- **Fix:** Use PBKDF2-SHA256 PIN hashing + `chrome.storage.session` for session lock (same pattern as 1Password/Bitwarden)
- **Lesson:** Never assume Web APIs that work on websites will work in extensions. Check the origin requirements first.

### MV3 service workers sleep — no `setInterval`
- Manifest V3 service workers are not persistent; they suspend between events
- `setInterval` for auto-lock timeout silently stops firing after the worker sleeps
- **Fix:** Store `lastActivityAt` timestamp in `chrome.storage.session`, compute elapsed time on every `check_lock` call
- **Lesson:** Any timing logic in a MV3 background must be timestamp-based, not interval-based.

---

## Architecture

### Transformers.js rejected — too heavy
- Transformers.js (WASM embeddings) would add ~40–60 MB to the extension bundle
- For a 5–20 document personal knowledge base, semantic search is overkill
- **Decision:** Use TF-IDF keyword scoring — zero dependencies, instant, sufficient for this use case

### Dexie.js rejected — unnecessary wrapper
- Dexie.js is just syntactic sugar over IndexedDB
- Raw IndexedDB API is clean enough for 2 object stores with simple queries
- **Decision:** Use raw IndexedDB directly in `utils/documentManager.js`

### pdf.js worker must point to bundled file
- pdf.js requires a separate worker script; it cannot auto-locate it in an extension
- **Fix:** `pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js')`
- **Lesson:** Always read the library's worker/WASM setup docs before bundling in an extension context.

### Non-module libraries in ES module context
- pdf.js and mammoth.js are global (non-module) scripts
- They cannot be `import`ed as ES modules; they attach to `window`
- **Fix:** Load them as regular `<script>` tags before the `<script type="module">` tag in popup.html
- Access them as `window.pdfjsLib` and `window.mammoth` inside the ES module
- **Lesson:** When mixing legacy global libraries with ES modules, load globals first and access via `window`.

---

## UX Decisions

### Never auto-insert AI-generated long-form answers
- Auto-inserting a 3-sentence AI response without user review is a reliability and trust risk
- **Decision:** Always show a floating review panel — user reads, optionally edits, then clicks Insert
- Applies to Phase 4 RAG generation

### Floating badge auto-dismiss: 12s not 20s
- 20 seconds felt too long during user testing — the badge lingered after the user had already decided
- **Decision:** Reduced to 12s for both the fill badge and the capture notification banner

### One PIN unlock is sufficient — no second PIN for badge toggle
- Initially considered requiring PIN to toggle the floating badge on/off
- Since the user is already in an unlocked session to reach the toggle, a second PIN is redundant
- **Decision:** Badge toggle saves immediately with no extra auth — session unlock is sufficient

---

## Storage

| Data | Store | Encrypted |
|---|---|---|
| Profile data (name, email, address…) | `chrome.storage.local` | Yes (AES-GCM) |
| PIN hash + salt | `chrome.storage.local` | N/A (already hashed) |
| Session lock state | `chrome.storage.session` | N/A (clears on browser close) |
| Document chunk text | IndexedDB (`neuralfill-kb`) | No (user's own content) |
| Document metadata | IndexedDB (`neuralfill-kb`) | No |
| Settings (badge toggle, AI toggle) | `chrome.storage.local` | No |

---

## Phase Completion Log

| Phase | Status | Completed |
|---|---|---|
| Design Overhaul | ✅ Done | Session 1 |
| Phase 0 — PIN Lock | ✅ Done | Session 1 |
| Phase 0 — Badge Toggle | ✅ Done | Session 1 |
| Phase 1 — Knowledge Base UI | ✅ Done | Session 2 |
| Phase 2 — TF-IDF Retrieval | ✅ Done | Session 2 |
| Phase 3 — Long-form Detection | ✅ Done | Session 2 |
| Phase 4 — RAG + Review Panel | ✅ Done | Session 2 |
| Backlog — Backlog Features | ✅ Done | Session 2 |
