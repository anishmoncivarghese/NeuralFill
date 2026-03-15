# Screenshot Guide — Chrome Web Store

Required size: 1280×800 pixels (or 640×400).
Format: PNG or JPEG. Minimum 1, ideally 5.
Take them on a clean browser with the extension loaded.

---

## Screenshot 1 — The Popup (core feature)
**What to show:** The main popup with a profile filled in — name, email, job title visible.
The AI toggle ON, answer length set to Medium, Knowledge Base button visible.

Steps:
1. Open any webpage (test-form.html works)
2. Click the NeuralFill icon in the toolbar
3. Make sure a profile with data is selected
4. Take a screenshot of the popup open

Suggested caption: "Fill any form in one click — your data, your device"

---

## Screenshot 2 — The Floating Badge on a form
**What to show:** The floating badge at bottom-right of a real-looking form page,
showing "Fill" and "✦ Text" buttons. The form should have visible fields.

Steps:
1. Open test-form.html in Chrome
2. Wait for the badge to appear (bottom-right)
3. Do NOT click anything — capture the badge + the form fields together
4. Use Cmd+Shift+4 (Mac) to select the region

Suggested caption: "Smart badge detects forms automatically"

---

## Screenshot 3 — The Generate Review Panel
**What to show:** The floating review panel above a textarea with generated AI text visible.
The Insert / Regenerate / ✕ buttons should be visible.

Steps:
1. Open test-form.html
2. Upload a document to the Knowledge Base first (any PDF)
3. Click into one of the long-form text areas (Section 7)
4. Click the "✦ Generate" button that appears at the corner
5. Wait for the panel to appear with generated text
6. Screenshot the panel + the textarea behind it

Suggested caption: "AI writes long-form answers from your own documents — privately"

---

## Screenshot 4 — Preview Before Fill
**What to show:** A form page with fields highlighted in yellow, value tooltips visible,
and the "Preview — N fields ready · Fill Now" confirmation bar at bottom-right.

Steps:
1. Open test-form.html
2. Open the NeuralFill popup
3. Click "Preview" (next to Fill Form Now)
4. The popup closes and fields highlight yellow with tooltips
5. Screenshot the page with the yellow highlights and the confirmation bar

Suggested caption: "Preview exactly what will be filled before committing"

---

## Screenshot 5 — Knowledge Base
**What to show:** The Knowledge Base view with 1–2 uploaded documents visible,
showing filename, chunk count, and the preview toggle.

Steps:
1. Open the NeuralFill popup
2. Click "Knowledge Base"
3. Make sure you have at least one document uploaded
4. Optionally expand the preview toggle (▾) to show extracted text
5. Screenshot the KB view

Suggested caption: "Upload your resume once — used for every application"

---

## Tips for clean screenshots
- Use a simple, clean webpage as background (not a busy site)
- Zoom browser to 100% (Cmd+0)
- Hide the bookmarks bar for a cleaner look (Cmd+Shift+B toggle)
- Use a light-background page — the dark extension UI contrasts well
- On Mac: Cmd+Shift+4 for region select, or use CleanMyMac / Shottr for no-shadow captures

---

## After taking screenshots
Resize to exactly 1280×800 using:
  sips -z 800 1280 screenshot.png

Or use Preview.app → Tools → Adjust Size.
