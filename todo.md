# NeuralFill — Master Todo

> Legend: `[ ]` pending · `[x]` completed · `[~]` in progress · `[!]` blocked

---

## Design Overhaul
- [x] Increase popup width 340px → 360px
- [x] Remove gradient from h1 title — clean white bold
- [x] Primary button → full pill shape (border-radius: 980px)
- [x] Secondary button → rounder (border-radius: 12px)
- [x] Cards — add inset highlight shadow for depth
- [x] Footer — centered, single status line only
- [x] Remove emojis from popup UI (🔒 🔍 📍 🧠)
- [x] Active profile — remove border-left, use blue tint fill only
- [x] Profile inputs → rounder (border-radius: 12px)
- [x] Floating badge — border-radius 14px → 18px, layered shadow
- [x] Capture banner — border-radius 14px → 18px, layered shadow, border opacity bump
- [x] All floating buttons → pill shape

---

## Phase 0 — PIN Security Lock
- [x] Create `utils/authManager.js` — PBKDF2-SHA256 PIN hashing and verification
- [x] Add `unlimitedStorage` permission to `manifest.json`
- [x] Add `utils/authManager.js` to `web_accessible_resources`
- [x] Background: `save_pin` handler — hash and store PIN on setup
- [x] Background: `check_lock` handler — verify session state + timeout
- [x] Background: `unlock` handler — verify PIN, set session
- [x] Background: `lock` handler — clear session
- [x] Popup: `lockView` — PIN entry screen with dot indicators
- [x] Popup: `pinSetupView` — two-step PIN setup (enter + confirm)
- [x] Popup: init router — key setup → PIN setup → lock check → main
- [x] Popup: lock-gate on "Fill Form Now" — re-checks session before filling
- [x] Popup: "Lock" icon button in footer — manually lock session
- [x] CSS: PIN dot indicators with fill/error/shake animations
- [x] CSS: lock screen layout, lock icon, error message
- [x] Badge: lock check before fill — shows "NeuralFill is locked" state if session expired
- [x] Auto-lock: session expires after 15 minutes of inactivity (checked on every `check_lock` call)

## Phase 0 — Floating Badge Toggle
- [x] Add "Floating Badge" toggle to main view in popup
- [x] Toggle persists to `chrome.storage.local` (`floatingBadgeEnabled`)
- [x] Default: enabled (true)
- [x] No PIN required to change — session unlock is sufficient
- [x] Badge suppressed when toggle is off
- [x] Capture notification suppressed when toggle is off

## Core Bug Fixes
- [x] Auto-dismiss timer reduced from 20s → 12s (badge + capture banner)
- [x] Profile name editable in the Edit Profile view

---

## Phase 1 — Knowledge Base UI + Document Storage
- [x] Create `lib/` folder and bundle pdf.js (minified)
- [x] Create `lib/` folder and bundle mammoth.js (minified)
- [x] Create `utils/documentManager.js` — IndexedDB wrapper, chunking logic
- [x] Add `unlimitedStorage` permission to `manifest.json`
- [x] Add new lib files to `web_accessible_resources` in `manifest.json`
- [x] Add `knowledgeBaseView` to `popup/popup.html`
- [x] Style Knowledge Base view in `popup/popup.css` — upload zone, doc list
- [x] Wire up KB view in `popup/popup.js` — file upload, doc list render, delete
- [x] Add background.js message handlers: `get_chunks_for_profile` (Phase 3 access)
- [x] Per-profile document scoping (docs attached to active profile)
- [x] Upload limit soft warning at 5 MB used
- [ ] Test: upload PDF → chunks stored in IndexedDB → metadata visible in popup

---

## Phase 2 — TF-IDF Retrieval Engine
- [x] Create `utils/ragEngine.js` — TF-IDF scorer, stopword list, chunk retrieval
- [x] Implement `scoreChunks(query, chunks)` — returns top N chunks ranked by relevance
- [x] Add background.js handler: `get_chunks_for_field`
- [ ] Test: query "leadership experience" → returns relevant chunks from uploaded resume

---

## Phase 3 — Long-Form Field Detection
- [x] Detect `<textarea>` elements in `content/content.js`
- [x] Detect long-form `<input>` fields by trigger words in label: "describe", "explain", "tell us", "summarize", "overview", "background", "experience", "about you", "bio"
- [x] Inject subtle "✦ Generate" micro-button at corner of detected fields
- [x] Micro-button: invisible at rest, visible on field focus/hover
- [x] Micro-button styling — Apple-style, non-intrusive, matches extension design language
- [x] MutationObserver re-scan for dynamic/SPA forms
- [x] Lock check on click — shows "Unlock first" if session expired
- [ ] Test: "✦ Generate" appears on textarea fields on test-form.html

---

## Phase 4 — RAG Generation + Review Panel
- [x] Wire "✦ Generate" click → fetch active profile chunks from background
- [x] Run TF-IDF retrieval → select top 3 relevant chunks
- [x] Build Gemini Nano prompt: field label + top 3 chunks + generation instruction
- [x] Send prompt via bridge.js RUN_GENERATE → separate generation session
- [x] Build floating review panel in `content/content.js`:
  - [x] Editable textarea showing generated response
  - [x] "Insert" button — fills field and dismisses
  - [x] "Regenerate" button — reruns with same chunks
  - [x] "✕" dismiss — closes without filling
  - [x] Apple-style glass design (matches badge/banner)
  - [x] Anchored above the target textarea (falls back to below)
- [x] Handle Gemini Nano unavailable state — show setup message in panel
- [x] Handle empty Knowledge Base — show "upload documents" message
- [x] Regenerate uses same chunks, re-runs generation
- [x] Outside-click dismisses panel
- [ ] Test: full end-to-end on test-form.html long-form fields

---

## Test Form
- [x] Rewrite test-form.html — Apple design, 7 test sections
- [x] Add Gemini Nano API diagnostics panel
- [x] Add submit toast to trigger capture notification test
- [x] Add long-form textarea fields to test-form.html for Phase 3/4 testing

---

## Future / Backlog
- [x] Export / import profile as JSON
- [x] Document preview — show first text snippet per KB doc (▾ toggle on each card)
- [x] Multiple document types: `.txt` plain text support (already implemented)
- [x] "Answer length" setting: short / medium / long (popup select + stored in chrome.storage.local)
- [x] Keyboard shortcut (Cmd/Ctrl+Shift+G) to trigger Generate on focused textarea
- [ ] Drag-and-drop document reordering (low priority — skipped)

---

## Phase 5 — Premium UX

### 5A — Social / Professional Profile Fields
- [x] Add fields to profile editor: jobTitle, company, linkedIn, github, twitter, website
- [x] Save/load new fields in popup.js (saveProfileDataBtn, openEditor)
- [x] Add regex patterns to RegexEngine in content.js for new keys
- [x] Extend AI evaluateInput allowed keys list
- [x] Add to AI keyMap normalisation
- [x] Add to validKeys list

### 5B — Undo Fill
- [x] Before fill_form executes, snapshot all input/textarea current values
- [x] After fill completes, show floating undo toast: "Filled N fields · Undo" (5s timer + blue shrink bar)
- [x] Undo click: restore all snapshotted values + styles, dismiss toast
- [x] Auto-dismiss undo toast after 5s if not clicked

### 5C — Fill History UI
- [x] Add `historyView` to popup.html
- [x] Add "Fill History" nav button in main view
- [x] popup.js: load fillHistory from chrome.storage.local, render list
- [x] Each entry: domain, profile name, field count, relative time
- [x] "Clear History" button
- [x] Back nav to main view

### 5D — Preview Before Fill
- [x] Add "Preview" button to main view (alongside Fill Form Now)
- [x] content.js: preview_fill message — identify all fillable fields, highlight yellow, show value tooltip
- [x] Floating confirmation bar: "Ready to fill N fields — Fill Now / Cancel"
- [x] Confirm routes through badge_fill → fill_form; Cancel removes highlights

### 5E — Per-Site Profile Binding
- [x] Add site binding UI to main view: "Always use [profile select] on [current domain]"
- [x] Save bindings to chrome.storage.local: `{ siteBindings: { 'linkedin.com': profileId } }`
- [x] background.js: resolveActiveProfile() helper checks siteBindings first
- [x] Applied to keyboard shortcut, context menu, and get_active_profile handlers
- [x] "Clear" option removes binding for current domain
