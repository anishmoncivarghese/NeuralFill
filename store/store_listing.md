# NeuralFill — Chrome Web Store Listing Copy

---

## Name
NeuralFill
(9 / 30 characters)

---

## Short Description
(paste into the 132-character "Summary" field)

```
Fill any form in one click — locally. No data leaves your device. AI-powered, PIN-locked, works offline.
```
103 characters ✓

---

## Detailed Description
(paste into the "Detailed description" field — plain text, no markdown)

NeuralFill is the privacy-first form filler built for professionals. Every field you save, every document you upload, and every AI-generated answer stays entirely on your device — encrypted, local, and never shared.

INTELLIGENT FORM FILLING
Fill name, email, address, job title, LinkedIn, GitHub, website, and custom fields in one click. NeuralFill uses regex matching plus on-device Gemini Nano AI to correctly identify fields that standard autofill misses — including non-standard labels, dynamic SPA forms, and job application portals.

AI-GENERATED LONG-FORM ANSWERS
Upload your resume, portfolio, or bio once. NeuralFill uses on-device RAG (Retrieval-Augmented Generation) to generate professional answers to long-form questions like "Describe your leadership experience" or "Why do you want to work here?" — using only your own documents, privately, with no internet connection.

PREVIEW BEFORE YOU FILL
New: Preview mode highlights every field that will be filled and shows the exact value — before a single character is typed. Confirm when you're ready, or cancel with no changes made.

UNDO ANY FILL
Changed your mind? An Undo button appears for 5 seconds after every fill, letting you instantly reverse every change NeuralFill made.

MULTIPLE PROFILES
Create separate profiles for Work, Personal, Freelance, or anything else. Bind a profile to a specific website so the right profile is always selected automatically.

PIN SECURITY LOCK
All profile data is encrypted with AES-GCM 256-bit encryption. A PIN lock protects the extension — the session auto-locks after 15 minutes of inactivity.

KNOWLEDGE BASE
Upload PDF, DOCX, or TXT files. NeuralFill chunks and indexes your documents locally using TF-IDF retrieval — no embeddings API, no cloud storage, no size limits beyond your own browser.

FILL HISTORY
A local log of every form you've filled: site, profile used, field count, and time. Clear it any time.

ZERO NETWORK POLICY
The extension's Content Security Policy enforces connect-src 'none' — it is architecturally impossible for NeuralFill to transmit data externally. Every operation — filling, AI generation, document processing — runs offline.

WORKS WITH
Job application forms (LinkedIn, Greenhouse, Lever, Workday), signup forms, checkout flows, government forms, survey tools, and any standard HTML form.

---

## Category
Productivity

---

## Language
English

---

## Keywords / Search terms
(add these as tags if the field appears)
form autofill, autofill, form filler, job application, AI form fill, privacy autofill, local AI, Gemini Nano, resume autofill, form automation

---

## Single-purpose justification
(for the reviewer notes field, if required)

NeuralFill has a single purpose: intelligent, privacy-preserving form filling. All features — the Knowledge Base, AI generation, PIN lock, profile management, and fill history — directly support the act of filling web forms. The AI generates form field answers. The PIN protects the profile data used for filling. The Knowledge Base provides source material for AI-generated answers. No feature exists outside this scope.

---

## Permissions justification
(paste into the "Permission justification" field during submission)

- storage: Required to save encrypted profile data, settings, fill history, and per-site bindings to chrome.storage.local and chrome.storage.session.
- activeTab: Required to send fill instructions to the current page and to detect the active tab's domain for per-site profile binding.
- scripting: Required to inject the content script on pages that were open before the extension was installed.
- contextMenus: Required to provide the right-click "Fill with NeuralFill" shortcut on editable fields.
- unlimitedStorage: Required for the Knowledge Base — IndexedDB stores document chunks which can exceed the default 5 MB chrome.storage quota.
- host_permissions (<all_urls>): Required because users fill forms on any website. NeuralFill never initiates network requests — this permission is used solely to inject the content script and send local fill instructions to tabs.
