# NeuralFill — Chrome Extension

## What This Is
A **privacy-first Chrome extension** that auto-fills web forms using a dual-engine approach:
- **Engine A (Fast):** Regex pattern matching for common fields
- **Engine B (Smart):** On-device Gemini Nano AI for ambiguous/custom fields

Zero external API calls. All data stays local, encrypted with AES-GCM 256-bit.

---

## File Structure

```
NeuralFill/
├── manifest.json              # Manifest V3 Chrome extension config
├── background/
│   ├── background.js          # Service worker — message routing, profile management
│   └── storageManager.js      # Encrypted storage abstraction
├── content/
│   ├── content.js             # Main content script — form detection & filling logic
│   └── bridge.js              # DOM-injected script for Gemini Nano access (Main World)
├── popup/
│   ├── popup.html             # Extension popup UI
│   ├── popup.js               # Popup logic & profile management UI
│   ├── popup.css              # Apple-inspired dark mode design
│   └── profiles.css           # Profile editor styles
├── utils/
│   ├── crypto.js              # AES-GCM encryption/decryption (Web Crypto API)
│   ├── aiEngine.js            # Legacy/unused — AI logic is inlined in content.js
│   ├── regexEngine.js         # Pattern matching for standard form fields
│   ├── profileManager.js      # Profile CRUD operations
│   └── chromeUtils.js         # Chrome storage helpers
├── icons/                     # icon16, icon48, icon128
├── test-form.html             # Local test form for development
├── learner.md                 # Dev notes
└── Gemini.md                  # AI integration documentation
```

---

## Architecture

### Message Passing Flow
```
Popup UI  ←→  Background Service Worker  ←→  Content Script
                        ↓
                  StorageManager
                        ↓
              AES-GCM (Web Crypto API)
                        ↓
              chrome.storage.local
```

### Gemini Nano Bridge Pattern
Content scripts run in an **isolated world** and cannot access `window.ai`. The bridge pattern solves this:
```
Content Script (Isolated World)
    → postMessage("RUN_PROMPT") →
Bridge.js (injected into Main World)
    → window.ai.languageModel →
Gemini Nano (on-device)
    → postMessage("PROMPT_RESULT") →
Content Script
```

---

## Core Features

### 1. Form Auto-Fill (Dual Engine)
- **Regex Engine:** Fast field matching via `id`, `name`, `placeholder`, `className`, `label`
- **AI Engine:** Gemini Nano fallback with confidence threshold > 0.8
- Standard fields: fullName, email, phone, dob, street, city, state, zip, country
- Select dropdowns: 4-level matching strategy (exact value → exact text → partial → country code)
- Date formats: inspects `placeholder`/`pattern` for format hints, converts YYYY-MM-DD accordingly
- Password fields: **explicitly excluded**

### 2. Profile Management
- Multiple named profiles (Work, Personal, etc.)
- Standard + custom fields (AI-discovered from forms)
- Active profile switching
- All data AES-GCM encrypted

### 3. Smart Profile Capture
Listens for form submissions and harvests data:
- Email match = +3 pts, Full Name = +2 pts, Phone = +2 pts
- Score ≥ 2 → updates existing profile; otherwise → creates new
- Shows field-level diffs for update mode

### 4. Scan & Learn
- AI scans page for non-standard fields regex can't identify
- Classifies them in camelCase, user reviews and confirms
- Saves to `customFields` in active profile

### 5. Activation Methods
- **Keyboard:** `Cmd+Shift+F` (Mac) / `Ctrl+Shift+F` (Win)
- **Context Menu:** Right-click input → save to profile
- **Floating Badge:** Auto-appears on form pages, shows field count
- **Popup "Fill Now":** Manual trigger

### 6. Visual Feedback
- Regex match: Blue highlight `rgba(10, 132, 255, 0.08)`
- AI match: Orange highlight `rgba(255, 102, 0, 0.1)`
- Saved/captured: Green outline `2px solid #4cd964`
- Scan in progress: Cyan highlight

---

## Encryption & Security
- First-run key generation: AES-GCM 256-bit, exported as base64 JWK
- User must manually copy and save the key (no cloud recovery)
- CSP enforces `connect-src 'none'` — zero network calls possible

---

## Gemini Nano Setup (Required for AI Engine)
Users must enable two Chrome flags:
1. `chrome://flags/#prompt-api-for-gemini-nano` → Enabled
2. `chrome://flags/#optimization-guide-on-device-model` → Enabled BypassPerfRequirement

---

## Key Technical Constraints
- **Manifest V3** — service worker (not persistent background page)
- **No external network calls** — CSP blocks all `connect-src`
- **Isolated world** — content scripts can't directly access `window.ai`, requires bridge.js
- `aiEngine.js` is a legacy file — actual AI logic lives in `content.js`

---

## Development Notes
- Test with `test-form.html` locally
- See `learner.md` for dev progress notes
- See `Gemini.md` for AI prompt engineering details
- Previously built with Gemini (Antigravity), now switching to Claude for development
