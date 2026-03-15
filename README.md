# NeuralFill

**Privacy-first Chrome extension that auto-fills web forms in one click.**

No cloud. No tracking. Your data stays on your device, encrypted with AES-256.

---

## How it works

NeuralFill uses two engines in sequence:

1. **Pattern Engine** — instantly matches standard fields (name, email, phone, address, LinkedIn, etc.) using label and field ID recognition
2. **AI Engine** — falls back to on-device Gemini Nano for unusual or custom fields that patterns can't identify

Both engines run entirely on your device. Zero network calls are possible — the extension's CSP blocks all outbound connections.

---

## Features

- **One-click fill** — fills all detected fields on any page instantly
- **Floating badge** — auto-appears on forms, shows field count, Fill and ✦ Text buttons
- **Generate Text** — uses Gemini Nano + your Knowledge Base documents to write long-form answers (cover letters, experience descriptions, etc.)
- **Scan & Learn** — AI scans a page and saves mappings for unusual fields to your profile
- **Multiple profiles** — Work, Personal, Freelance — switch instantly
- **Miscellaneous fields** — add any custom key-value data (employee ID, IBAN, etc.)
- **Site binding** — pin a specific profile to a specific site
- **PIN lock** — protect your data with a PIN; 15-minute session timeout
- **Import / Export** — back up or transfer profiles as JSON
- **Keyboard shortcut** — `⌘ Shift F` (Mac) / `Ctrl Shift F` (Windows)

---

## Privacy & Security

| Property | Detail |
|---|---|
| Encryption | AES-GCM 256-bit (Web Crypto API) |
| Network calls | None — `connect-src 'none'` in CSP |
| AI model | Gemini Nano — runs on-device in Chrome |
| Passwords / CVV | Permanently excluded from filling |
| Data location | `chrome.storage.local` on your device only |

---

## Requirements

- Chrome 138 or later
- For AI features: Apple Silicon or compatible GPU, ~22 GB free disk space
- Gemini Nano setup: see the [User Guide](https://anishmoncivarghese.com/neuralfill/)

---

## Installation

1. Download or clone this repository
2. Open `chrome://extensions` in Chrome
3. Enable **Developer Mode** (top right)
4. Click **Load unpacked** → select the `NeuralFill` folder
5. Pin the extension to your toolbar

---

## User Guide

Full documentation, Gemini Nano setup steps, and FAQ:
**[anishmoncivarghese.com/neuralfill](https://anishmoncivarghese.com/neuralfill/)**

---

## License

MIT
