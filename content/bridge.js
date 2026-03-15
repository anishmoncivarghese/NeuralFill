// NeuralFill AI Bridge
// This script is injected into the Main World DOM by the Content Script.
// It bypasses the Manifest V3 Isolated World so it can legally access window.LanguageModel.

(async function() {
  const sendMsg = (msg) => window.postMessage({ source: 'neuralfill-ai-bridge', ...msg }, '*');

  // ── Shared API handle ───────────────────────────────────────────
  let api = null;
  if ('LanguageModel' in window) api = window.LanguageModel;
  else if ('ai' in window && window.ai?.languageModel) api = window.ai.languageModel;

  // ── Classification session (JSON-only, eager) ───────────────────
  let session = null;

  // Generation uses a fresh create→prompt→destroy per request for reliability.
  // A persistent gen session can silently fail if the model already has the
  // classification session open; create-on-demand avoids that entirely.

  async function tryInit() {
    if (!api) throw new Error('No LanguageModel API on window. Enable chrome://flags/#prompt-api-for-gemini-nano');

    // Check availability — handle both Chrome 138+ and older Prompt API
    if (typeof api.availability === 'function') {
      const status = await api.availability();
      console.log('[NeuralFill Bridge] availability():', status);
      if (status === 'unavailable') throw new Error('Gemini Nano unavailable on this device (status: unavailable)');
      // 'available' | 'downloadable' | 'downloading' — all can proceed with create()
    } else if (typeof api.capabilities === 'function') {
      const caps = await api.capabilities();
      const av = caps?.available;
      console.log('[NeuralFill Bridge] capabilities().available:', av);
      if (av === 'no') throw new Error('Gemini Nano unavailable (capabilities: no)');
    }

    session = await api.create({
      systemPrompt: `You are a JSON-only API. You receive a description of an HTML form field. You must reply with ONLY a single JSON object, nothing else. No explanation, no markdown, no text before or after.

Your task: match the field to exactly one of these keys:
fullName, email, phone, dob, street, city, state, zip, country, jobTitle, company, linkedIn, github, twitter, website

Examples:
Input: id: contact_name, label: Your Name
Output: {"key":"fullName","confidence":0.95}

Input: id: field7, label: Where should we email your receipt?
Output: {"key":"email","confidence":0.9}

Input: id: bday, placeholder: MM/DD/YYYY, label: When were you born?
Output: {"key":"dob","confidence":0.95}

Input: id: cell, label: Best number to reach you
Output: {"key":"phone","confidence":0.9}

Input: id: linkedin_url, label: LinkedIn Profile
Output: {"key":"linkedIn","confidence":0.98}

Input: id: github_url, label: GitHub Profile
Output: {"key":"github","confidence":0.98}

Input: id: twitter_handle, label: Twitter / X handle
Output: {"key":"twitter","confidence":0.97}

Input: id: job_title, label: Current Role
Output: {"key":"jobTitle","confidence":0.95}

Input: id: employer, label: Company Name
Output: {"key":"company","confidence":0.95}

Input: id: favorite_color, label: What is your favorite color?
Output: {"key":null,"confidence":0}

Remember: output ONLY the JSON object. No other text.`
    });

    console.log('[NeuralFill Bridge] Classification session ready.');
  }

  // ── Initial setup ───────────────────────────────────────────────
  try {
    await tryInit();
    sendMsg({ type: 'INIT_COMPLETE', success: true });
  } catch (e) {
    console.error('[NeuralFill Bridge Initialization Error]:', e.message);
    sendMsg({ type: 'INIT_COMPLETE', success: false, error: e.message });
  }

  // ── Message Router ──────────────────────────────────────────────
  window.addEventListener('message', async (e) => {
    if (!e.data || e.data.source !== 'neuralfill-content') return;

    // Retry init (called when bridge is already injected but previously failed)
    if (e.data.type === 'RETRY_INIT') {
      session = null; // reset so tryInit creates a fresh session
      try {
        await tryInit();
        sendMsg({ type: 'INIT_COMPLETE', success: true });
      } catch (err) {
        sendMsg({ type: 'INIT_COMPLETE', success: false, error: err.message });
      }
      return;
    }

    // Helper: prompt with one automatic retry on "generic failure"
    // Chrome's Gemini Nano sometimes throws "Other generic failures occurred"
    // on the first inference call — a fresh session resolves it.
    async function promptWithRetry(systemPrompt, userPrompt) {
      for (let attempt = 0; attempt < 2; attempt++) {
        let s = null;
        try {
          s = await api.create({ systemPrompt });
          const res = await s.prompt(userPrompt);
          try { s.destroy(); } catch (_) {}
          return String(res);
        } catch (err) {
          try { s?.destroy(); } catch (_) {}
          console.warn(`[NeuralFill Bridge] prompt attempt ${attempt + 1} failed:`, err.message);
          if (attempt === 0) {
            // Brief pause before retry — gives the model engine a moment to recover
            await new Promise(r => setTimeout(r, 800));
          } else {
            throw err;
          }
        }
      }
    }

    // Classification prompt (JSON key-match)
    if (e.data.type === 'RUN_PROMPT') {
      if (!session) {
        sendMsg({ type: 'PROMPT_RESULT', id: e.data.id, result: null });
        return;
      }
      try {
        // Try the existing session first; on failure, retry via promptWithRetry
        let res;
        try {
          res = await session.prompt(e.data.prompt);
        } catch (err) {
          console.warn('[NeuralFill Bridge] Classification session failed, retrying:', err.message);
          res = await promptWithRetry(session.systemPrompt ||
            'You are a JSON-only API for field classification.', e.data.prompt);
        }
        sendMsg({ type: 'PROMPT_RESULT', id: e.data.id, result: res ? String(res) : null });
      } catch (err) {
        console.error('[NeuralFill Bridge Inference Error]:', err.message);
        sendMsg({ type: 'PROMPT_RESULT', id: e.data.id, result: null });
      }
    }

    // Classify field label (scan & learn)
    if (e.data.type === 'RUN_CLASSIFY') {
      if (!session) {
        sendMsg({ type: 'CLASSIFY_RESULT', id: e.data.id, result: null });
        return;
      }
      try {
        const classifyPrompt = `${e.data.context}\nWhat kind of data does this field collect? Reply ONLY with JSON, no markdown.\nExample: {"label":"streetAddress"}\nUse camelCase. Be specific (e.g. "zipCode" not "text", "companyName" not "input").`;
        const res = await session.prompt(classifyPrompt);
        sendMsg({ type: 'CLASSIFY_RESULT', id: e.data.id, result: String(res) });
      } catch (err) {
        console.error('[NeuralFill Bridge Classify Error]:', err.message);
        sendMsg({ type: 'CLASSIFY_RESULT', id: e.data.id, result: null });
      }
    }

    // Long-form generation — fresh session per request with retry
    if (e.data.type === 'RUN_GENERATE') {
      if (!api) {
        sendMsg({ type: 'GENERATE_RESULT', id: e.data.id, result: null });
        return;
      }
      try {
        const text = await promptWithRetry(
          `You are a professional writing assistant helping a user fill out a form. Write a clear, specific, first-person response that answers the field question. Be concise and professional. Output only the answer text — no labels, no headings, no markdown.`,
          e.data.prompt
        );
        sendMsg({ type: 'GENERATE_RESULT', id: e.data.id, result: text.trim() || null });
      } catch (err) {
        console.error('[NeuralFill Bridge Generation Error]:', err.message);
        sendMsg({ type: 'GENERATE_RESULT', id: e.data.id, result: null });
      }
    }
  });
})();
