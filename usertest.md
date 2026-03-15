# NeuralFill — User Test Checklist

> Fill in each bracket with: `completed` · `pending` · `failed`
> Add any notes after the bracket if something didn't work as expected.

---

## Setup & First Run

| # | Test | Status | Notes |
|---|------|--------|-------|
| U01 | Load the extension in Chrome via `chrome://extensions` → "Load unpacked" | [ ] | |
| U02 | Click the NeuralFill icon — Setup screen appears asking to generate a key | [ ] | |
| U03 | Click "Generate Security Key" — key appears in the textarea | [ ] | |
| U04 | Click "Copy Key" — button briefly says "Copied!" | [ ] | |
| U05 | Click "I Have Saved My Key" — transitions to the main view | [ ] | |

---

## Profile Management

| # | Test | Status | Notes |
|---|------|--------|-------|
| U06 | Click "Edit" → Edit Profiles view opens | [ ] | |
| U07 | Type a profile name (e.g. "Anish") and click "Add Profile" — profile appears in the list | [ ] | |
| U08 | Click the profile in the list — editor opens below with all fields | [ ] | |
| U09 | The "Profile Name" field at the top of the editor is editable and shows the current name | [ ] | |
| U10 | Change the profile name (e.g. "Anish Work") and click "Save Changes" — the name updates in the list and dropdown | [ ] | |
| U11 | Fill in Full Name, Email, Phone, DOB, and all address fields — click "Save Changes" — button briefly says "Saved!" | [ ] | |
| U12 | Click Back → main view — profile dropdown shows the correct profile name | [ ] | |
| U13 | Add a second profile (e.g. "Anish Personal") — both profiles appear in the dropdown | [ ] | |
| U14 | Switch between profiles in the dropdown | [ ] | |
| U15 | Delete a profile — it disappears from the list | [ ] | |

---

## Form Auto-Fill (Regex Engine)

> Open `test-form.html` in Chrome with the extension loaded.

| # | Test | Status | Notes |
|---|------|--------|-------|
| U16 | Floating badge appears at bottom-right showing "X fillable fields detected" | [ ] | |
| U17 | Badge auto-dismisses after 12 seconds | [ ] | |
| U18 | Click "Fill" on the badge — fields start filling | [ ] | |
| U19 | Full Name field fills correctly (blue highlight) | [ ] | |
| U20 | Email field fills correctly (blue highlight) | [ ] | |
| U21 | Phone field fills correctly (blue highlight) | [ ] | |
| U22 | Street, City, State, ZIP fields fill correctly | [ ] | |
| U23 | Country dropdown selects the correct country | [ ] | |
| U24 | State dropdown selects the correct state | [ ] | |
| U25 | Badge shows "X fields filled · 0 bytes sent externally" after filling | [ ] | |
| U26 | Badge auto-dismisses after 5 seconds post-fill | [ ] | |

---

## Form Auto-Fill (AI Engine)

> Requires Gemini Nano to be set up (see AI Setup section in popup).

| # | Test | Status | Notes |
|---|------|--------|-------|
| U27 | Ambiguous field "What do people call you?" fills with your name (orange highlight) | [ ] | |
| U28 | Ambiguous field "Where should we send your receipt?" fills with your email (orange highlight) | [ ] | |
| U29 | Ambiguous field "When were you born?" fills with your DOB (orange highlight) | [ ] | |

---

## Date Format Intelligence

| # | Test | Status | Notes |
|---|------|--------|-------|
| U30 | "Date of Birth (US Format)" — fills as MM/DD/YYYY | [ ] | |
| U31 | "Date of Birth (EU Format)" — fills as DD/MM/YYYY | [ ] | |
| U32 | "Date of Birth (ISO Format)" — fills as YYYY-MM-DD | [ ] | |

---

## Security Exclusions

| # | Test | Status | Notes |
|---|------|--------|-------|
| U33 | Password field is NOT filled | [ ] | |
| U34 | Confirm Password field is NOT filled | [ ] | |
| U35 | Security PIN field is NOT filled | [ ] | |
| U36 | CVV field is NOT filled | [ ] | |

---

## Keyboard Shortcut

| # | Test | Status | Notes |
|---|------|--------|-------|
| U37 | On `test-form.html`, press `Cmd+Shift+F` (Mac) or `Ctrl+Shift+F` (Win) — form fills | [ ] | |

---

## Smart Profile Capture

| # | Test | Status | Notes |
|---|------|--------|-------|
| U38 | Fill in some fields manually on `test-form.html` and click "Submit Test Form" | [ ] | |
| U39 | Capture notification appears top-right within 1–2 seconds | [ ] | |
| U40 | Capture banner shows the correct mode: "Save as new profile?" or "Update [name]?" | [ ] | |
| U41 | Capture banner auto-dismisses after 12 seconds | [ ] | |
| U42 | Clicking "Save" / "Update" persists the data to the profile | [ ] | |

---

## Scan & Learn

| # | Test | Status | Notes |
|---|------|--------|-------|
| U43 | Fill in Company and Job Title fields on `test-form.html` | [ ] | |
| U44 | Click "Scan & Learn New Fields" in popup — transitions to Scan Results view | [ ] | |
| U45 | Discovered fields appear in the review list with correct labels | [ ] | |
| U46 | Can delete individual fields from the scan results before confirming | [ ] | |
| U47 | Click "Save Learned Fields" — fields added to the active profile's Learned Fields | [ ] | |
| U48 | Re-open the profile editor — Learned Fields section shows the new fields | [ ] | |

---

## AI Engine Setup

| # | Test | Status | Notes |
|---|------|--------|-------|
| U49 | If Gemini Nano is not set up, toggle appears dimmed and "AI Engine Not Detected" banner shows | [ ] | |
| U50 | Click "View Setup Guide" — AI setup instructions view opens | [ ] | |
| U51 | After enabling Chrome flags and relaunching, "Check AI Status" button detects the engine | [ ] | |
| U52 | Run the API diagnostics test on `test-form.html` — reports "All systems operational" | [ ] | |

---

## Design / Polish

| # | Test | Status | Notes |
|---|------|--------|-------|
| U53 | Popup width feels comfortable (360px) — not too narrow or wide | [ ] | |
| U54 | Buttons are pill-shaped (primary) and rounded (secondary) | [ ] | |
| U55 | No emojis visible anywhere in the popup UI | [ ] | |
| U56 | Active profile in the list has blue tint fill (no left border) | [ ] | |
| U57 | Floating badge has a visible shadow — appears to float above the page | [ ] | |
| U58 | Capture banner has a visible shadow — appears to float above the page | [ ] | |

---

## Phase 1 — Knowledge Base (when built)

| # | Test | Status | Notes |
|---|------|--------|-------|
| U59 | Knowledge Base section visible in popup | [ ] | |
| U60 | Upload a PDF — file name and chunk count appears in the document list | [ ] | |
| U61 | Upload a DOCX — file name and chunk count appears in the document list | [ ] | |
| U62 | Documents are scoped to the active profile (switch profile → different doc list) | [ ] | |
| U63 | Delete a document — disappears from list | [ ] | |
| U64 | Storage usage indicator shows correct size | [ ] | |

---

## Phase 3–4 — Long-Form Generation (when built)

| # | Test | Status | Notes |
|---|------|--------|-------|
| U65 | "✦ Generate" button appears on textarea fields on `test-form.html` | [ ] | |
| U66 | "✦ Generate" button is subtle — not visible until field is focused/hovered | [ ] | |
| U67 | Click "✦ Generate" — review panel appears above the textarea | [ ] | |
| U68 | Generated response is relevant to the field label | [ ] | |
| U69 | Can edit the response in the panel before inserting | [ ] | |
| U70 | Click "Insert" — response fills the textarea and panel dismisses | [ ] | |
| U71 | Click "Regenerate" — a new response is generated | [ ] | |
| U72 | Click "Dismiss" — panel closes, nothing is inserted | [ ] | |
| U73 | If no documents uploaded, panel shows a helpful message | [ ] | |
| U74 | If Gemini Nano not available, panel shows setup message | [ ] | |
