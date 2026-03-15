# NeuralFill — Automated Test Suite

> These tests are run by Claude automatically after changes.
> Status: `[ ]` pending · `[x]` passed · `[!]` failed · `[~]` skipped (dependency unavailable)

---

## T1 — File Structure Integrity

| # | Check | Status |
|---|-------|--------|
| T1.01 | `manifest.json` exists | [x] |
| T1.02 | `background/background.js` exists | [x] |
| T1.03 | `background/storageManager.js` exists | [x] |
| T1.04 | `content/content.js` exists | [x] |
| T1.05 | `content/bridge.js` exists | [x] |
| T1.06 | `popup/popup.html` exists | [x] |
| T1.07 | `popup/popup.js` exists | [x] |
| T1.08 | `popup/popup.css` exists | [x] |
| T1.09 | `popup/profiles.css` exists | [x] |
| T1.10 | `utils/crypto.js` exists | [x] |
| T1.11 | `utils/profileManager.js` exists | [x] |
| T1.12 | `utils/authManager.js` exists | [x] |
| T1.13 | `utils/documentManager.js` exists | [x] |
| T1.14 | `utils/ragEngine.js` exists | [x] |
| T1.15 | `lib/pdf.min.js` exists | [x] |
| T1.16 | `lib/mammoth.browser.min.js` exists | [x] |
| T1.17 | `test-form.html` exists | [x] |
| T1.18 | `icons/icon16.png` exists | [x] |
| T1.19 | `icons/icon48.png` exists | [x] |
| T1.20 | `icons/icon128.png` exists | [x] |

---

## T2 — Manifest Validity

| # | Check | Status |
|---|-------|--------|
| T2.01 | `manifest_version` is `3` | [x] |
| T2.02 | `permissions` includes `storage`, `activeTab`, `scripting`, `contextMenus`, `unlimitedStorage` | [x] |
| T2.03 | `host_permissions` includes `<all_urls>` | [x] |
| T2.04 | `content_security_policy.extension_pages` contains `connect-src 'none'` | [x] |
| T2.05 | `content_security_policy.extension_pages` contains `wasm-unsafe-eval` | [x] |
| T2.06 | `web_accessible_resources` includes `content/bridge.js` | [x] |
| T2.07 | `web_accessible_resources` includes `utils/ragEngine.js` | [x] |
| T2.08 | `web_accessible_resources` includes `utils/authManager.js` | [x] |
| T2.09 | Background service worker is declared | [x] |
| T2.10 | Content script matches `<all_urls>` | [x] |
| T2.11 | Keyboard command `fill_form` is declared | [x] |
| T2.12 | All icon files referenced in manifest exist (`icon16.png`, `icon48.png`, `icon128.png`) | [x] |

---

## T3 — popup.html Structure

| # | Check | Status |
|---|-------|--------|
| T3.01 | `#setupView` does NOT exist (removed — key generation is automatic) | [x] |
| T3.02 | `#generateKeyBtn` does NOT exist (removed) | [x] |
| T3.03 | `#lockView` element exists | [x] |
| T3.04 | `#pinSetupView` element exists | [x] |
| T3.05 | `#mainView` element exists | [x] |
| T3.06 | `#editProfileView` element exists | [x] |
| T3.07 | `#scanResultsView` element exists | [x] |
| T3.08 | `#aiSetupView` element exists | [x] |
| T3.09 | `#knowledgeBaseView` element exists | [x] |
| T3.10 | `#historyView` element exists | [x] |
| T3.11 | `#fillNowBtn` button exists | [x] |
| T3.12 | `#previewFillBtn` button exists | [x] |
| T3.13 | `#generateTextBtn` button exists | [x] |
| T3.14 | `#scanLearnBtn` button exists | [x] |
| T3.15 | `#kbBtn` button exists | [x] |
| T3.16 | `#historyBtn` button exists | [x] |
| T3.17 | `#profileSelect` select element exists | [x] |
| T3.18 | `#editProfileName` input exists | [x] |
| T3.19 | `#answerLengthSelect` select exists | [x] |
| T3.20 | `#siteBindingRow` element exists | [x] |
| T3.21 | `#exportProfileBtn` button exists | [x] |
| T3.22 | `#importProfileInput` file input exists | [x] |
| T3.23 | Professional fields exist: `#editJobTitle`, `#editCompany`, `#editLinkedIn`, `#editGithub`, `#editTwitter`, `#editWebsite` | [x] |
| T3.24 | `popup.css` is linked in `<head>` | [x] |
| T3.25 | `popup.js` loaded as `type="module"` | [x] |

---

## T4 — CSS Design Tokens

| # | Check | Status |
|---|-------|--------|
| T4.01 | `body` width is `360px` | [x] |
| T4.02 | `.primary-btn` has `border-radius: var(--radius-pill)` | [x] |
| T4.03 | `--radius-pill` is defined as `980px` | [x] |
| T4.04 | `.secondary-btn` has `border-radius: var(--radius-md)` | [x] |
| T4.05 | `h1` does NOT contain `background-clip: text` (gradient removed) | [x] |
| T4.06 | `h1` does NOT contain `-webkit-text-fill-color` (gradient removed) | [x] |
| T4.07 | `footer` contains `justify-content: center` | [x] |
| T4.08 | `.profile-item.active` does NOT contain `border-left` (note: `.alert.warning` legitimately uses `border-left`) | [x] |
| T4.09 | `.profile-input` has `border-radius: var(--radius-md)` | [x] |

---

## T5 — content.js Timer Values

| # | Check | Status |
|---|-------|--------|
| T5.01 | Badge auto-hide timer is `12000` ms | [x] |
| T5.02 | Post-fill badge auto-hide is `5000` ms | [x] |
| T5.03 | Undo toast auto-dismiss is `5000` ms | [x] |
| T5.04 | Generating toast (no-fields) auto-dismiss is `3000` ms | [x] |
| T5.05 | Generating toast (success) auto-dismiss is `6000` ms | [x] |

---

## T6 — content.js Badge & Overlay Styling

| # | Check | Status |
|---|-------|--------|
| T6.01 | Badge `border-radius` is `18px` | [x] |
| T6.02 | Badge has layered `box-shadow` (two shadow values) | [x] |
| T6.03 | Fill button in badge has `border-radius: 980px` | [x] |
| T6.04 | Preview bar has `border-radius: 18px` | [x] |
| T6.05 | Generating toast has `border-radius: 18px` | [x] |
| T6.06 | Undo toast has `border-radius: 18px` | [x] |
| T6.07 | Review panel has `border-radius: 18px` | [x] |
| T6.08 | Review panel has `backdrop-filter: blur` | [x] |

---

## T7 — Lock & PIN Security

| # | Check | Status |
|---|-------|--------|
| T7.01 | `background.js` contains `isSessionUnlocked()` function | [x] |
| T7.02 | `background.js` handles `save_pin` action | [x] |
| T7.03 | `background.js` handles `check_lock` action | [x] |
| T7.04 | `background.js` handles `unlock` action | [x] |
| T7.05 | `background.js` handles `lock` action | [x] |
| T7.06 | `background.js` handles `auto_setup` action (replaces save_key) | [x] |
| T7.07 | `background.js` does NOT contain `save_key` handler (removed) | [x] |
| T7.08 | `background.js` `onInstalled` auto-generates encryption key (calls `CryptoManager.generateKey`) | [x] |
| T7.09 | `commands.onCommand` handler has lock gate (`isSessionUnlocked`) | [x] |
| T7.10 | `contextMenus.onClicked` handler has lock gate | [x] |
| T7.11 | `badge_fill` handler has lock gate | [x] |
| T7.12 | `popup.js` init checks `encryptionKey` not `needsSetup` | [x] |
| T7.13 | `popup.js` does NOT import `CryptoManager` (removed) | [x] |

---

## T8 — Profile Management

| # | Check | Status |
|---|-------|--------|
| T8.01 | `popup.js` `openEditor()` loads `jobTitle`, `company`, `linkedIn`, `github`, `twitter`, `website` | [x] |
| T8.02 | `popup.js` save handler writes `jobTitle`, `company`, `linkedIn`, `github`, `twitter`, `website` | [x] |
| T8.03 | Import profile handler includes all 6 new professional fields | [x] |
| T8.04 | `background.js` `create_profile_from_data` includes all 6 new fields | [x] |
| T8.05 | `popup.js` handles `exportProfileBtn` click | [x] |
| T8.06 | `popup.js` handles `importProfileInput` change | [x] |

---

## T9 — content.js Field Matching

| # | Check | Status |
|---|-------|--------|
| T9.01 | `RegexEngine` patterns include `jobTitle` | [x] |
| T9.02 | `RegexEngine` patterns include `company` | [x] |
| T9.03 | `RegexEngine` patterns include `linkedIn` | [x] |
| T9.04 | `RegexEngine` patterns include `github` | [x] |
| T9.05 | `RegexEngine` patterns include `twitter` | [x] |
| T9.06 | `RegexEngine` patterns include `website` | [x] |
| T9.07 | AI `evaluateInput` allowed keys include `jobTitle`, `company`, `linkedIn`, `github`, `twitter`, `website` | [x] |
| T9.08 | `validKeys` array includes all 6 new professional fields | [x] |
| T9.09 | AI `keyMap` includes normalisation entries for new fields | [x] |
| T9.10 | fill_form AI dynamic prompt includes new professional keys | [x] |

---

## T10 — Undo Fill

| # | Check | Status |
|---|-------|--------|
| T10.01 | `content.js` contains `fillSnapshot` Map | [x] |
| T10.02 | `content.js` contains `showUndoToast()` function | [x] |
| T10.03 | `showUndoToast` is called after fill if `fieldsFilled > 0` | [x] |
| T10.04 | Undo toast is skipped when `request.source === 'badge'` | [x] |
| T10.05 | `background.js` `badge_fill` sets `source: 'badge'` on the forwarded message | [x] |
| T10.06 | Undo toast has a shrinking progress bar (`bar.style.width = '0%'` set via rAF) | [x] |
| T10.07 | Undo restores `el.value`, `el.style.backgroundColor`, `el.style.border` | [x] |
| T10.08 | Undo fires `input` and `change` events on each restored element | [x] |

---

## T11 — Fill History UI

| # | Check | Status |
|---|-------|--------|
| T11.01 | `popup.html` contains `#historyView` element | [x] |
| T11.02 | `popup.html` contains `#historyList` element | [x] |
| T11.03 | `popup.html` contains `#clearHistoryBtn` button | [x] |
| T11.04 | `popup.js` contains `loadHistoryView()` function | [x] |
| T11.05 | `popup.js` contains `relativeTime()` helper | [x] |
| T11.06 | `popup.js` `historyView` is in `allViews` array | [x] |
| T11.07 | `background.js` handles `log_fill` action | [x] |
| T11.08 | `background.js` `log_fill` caps history at 50 entries | [x] |

---

## T12 — Preview Before Fill

| # | Check | Status |
|---|-------|--------|
| T12.01 | `popup.html` contains `#previewFillBtn` | [x] |
| T12.02 | `popup.js` contains `triggerPreview()` function | [x] |
| T12.03 | `popup.js` preview has lock gate (`check_lock`) | [x] |
| T12.04 | `content.js` handles `preview_fill` message | [x] |
| T12.05 | `content.js` contains `showPreviewOverlay()` function | [x] |
| T12.06 | Preview highlights fields with yellow outline | [x] |
| T12.07 | Preview shows value tooltip for each field | [x] |
| T12.08 | Preview confirmation bar has "Fill Now" and cancel (✕) buttons | [x] |
| T12.09 | Confirm routes through `badge_fill` to trigger actual fill | [x] |
| T12.10 | Cancel clears all highlights and tooltips | [x] |

---

## T13 — Generate All Text Fields

| # | Check | Status |
|---|-------|--------|
| T13.01 | `popup.html` contains `#generateTextBtn` | [x] |
| T13.02 | `popup.js` contains `triggerGenerateAll()` function | [x] |
| T13.03 | `popup.js` generate-all has lock gate | [x] |
| T13.04 | `content.js` handles `generate_all_longform` message | [x] |
| T13.05 | `generate_all_longform` handler sends `{ started: true }` immediately | [x] |
| T13.06 | `generate_all_longform` calls `showGeneratingToast()` | [x] |
| T13.07 | `generate_all_longform` sends `generate_all_progress` runtime messages | [x] |
| T13.08 | `generate_all_longform` sends `generate_all_complete` runtime message | [x] |
| T13.09 | Badge "✦ Text" button triggers `proceedWithGenerateAll()` | [x] |
| T13.10 | `proceedWithGenerateAll` transforms badge to spinner state immediately | [x] |
| T13.11 | `content.js` contains `showGeneratingToast()` function | [x] |
| T13.12 | `content.js` contains `getAllLongFormFields()` function | [x] |

---

## T14 — Per-Site Profile Binding

| # | Check | Status |
|---|-------|--------|
| T14.01 | `popup.html` contains `#siteBindingRow` | [x] |
| T14.02 | `popup.html` contains `#siteBindingSelect` | [x] |
| T14.03 | `popup.html` contains `#siteBindingSaveBtn` | [x] |
| T14.04 | `popup.html` contains `#siteBindingClearBtn` | [x] |
| T14.05 | `popup.js` contains `loadSiteBinding()` function | [x] |
| T14.06 | `popup.js` save handler writes to `chrome.storage.local` `siteBindings` key | [x] |
| T14.07 | `background.js` contains `resolveActiveProfile()` function | [x] |
| T14.08 | `resolveActiveProfile` checks `siteBindings` before `activeProfileId` | [x] |
| T14.09 | `resolveActiveProfile` is used in keyboard shortcut handler | [x] |
| T14.10 | `resolveActiveProfile` is used in context menu handler | [x] |
| T14.11 | `resolveActiveProfile` is used in `get_active_profile` handler | [x] |

---

## T15 — Knowledge Base

| # | Check | Status |
|---|-------|--------|
| T15.01 | `utils/documentManager.js` exports `DocumentManager` | [x] |
| T15.02 | `DocumentManager` contains `saveDocument()` | [x] |
| T15.03 | `DocumentManager` contains `getDocuments()` | [x] |
| T15.04 | `DocumentManager` contains `deleteDocument()` | [x] |
| T15.05 | `DocumentManager` contains `getAllChunks()` | [x] |
| T15.06 | `DocumentManager` contains `getTotalSize()` | [x] |
| T15.07 | `DocumentManager` contains `formatSize()` | [x] |
| T15.08 | `lib/mammoth.browser.min.js` exists (not mammoth.min.js) | [x] |
| T15.09 | KB ops run directly via `DocumentManager` in popup (no bg message needed) | [x] |
| T15.10 | `popup.js` calls `DocumentManager.getDocuments()` for profile-scoped docs | [x] |

---

## T16 — RAG & Long-Form Generation

| # | Check | Status |
|---|-------|--------|
| T16.01 | `utils/ragEngine.js` exports `RAGEngine` | [x] |
| T16.02 | `RAGEngine` has `retrieve()` method | [x] |
| T16.03 | `RAGEngine` has `buildPrompt()` method | [x] |
| T16.04 | `content.js` contains `triggerGenerate()` function | [x] |
| T16.05 | `content.js` contains `showReviewPanel()` function | [x] |
| T16.06 | `content.js` contains `positionReviewPanel()` function | [x] |
| T16.07 | Review panel `positionReviewPanel` does NOT add `scrollY` or `scrollX` (fixed-position bug) | [x] |
| T16.08 | Review panel contains Insert, Regenerate, and dismiss buttons | [x] |
| T16.09 | `content.js` contains `LONGFORM_TRIGGERS` array | [x] |
| T16.10 | `content.js` contains `isLongFormField()` function | [x] |
| T16.11 | `content.js` keyboard shortcut Cmd+Shift+G / Ctrl+Shift+G triggers generate | [x] |

---

## T17 — test-form.html Structure

| # | Check | Status |
|---|-------|--------|
| T17.01 | Contains a `<form>` element | [x] |
| T17.02 | Contains fields for `full_name` and `email` | [x] |
| T17.03 | Contains `<select>` for country with multiple options | [x] |
| T17.04 | Contains `<input type="password">` (security exclusion test) | [x] |
| T17.05 | Contains `<textarea>` long-form fields | [x] |
| T17.06 | Contains Gemini Nano diagnostics panel | [x] |
| T17.07 | Contains fields for `linkedin`, `github`, or `website` (Phase 5A test) | [x] |
| T17.08 | Contains field for `job_title` or `company` (Phase 5A test) | [x] |

---

## How to Run

Claude runs these checks by reading each file and verifying the conditions above.

Results will be reported with pass/fail counts per section.
