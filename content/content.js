// AiEngine bridged into the MAIN world context via DOM injection
class AiEngine {
  constructor() {
    this.isReady = false;
    this.bridgeInjected = false;
    this._initPromise = null;
    this.pendingRequests = new Map();
    this.messageId = 0;
  }

  async initialize() {
    // Already working — return immediately
    if (this.isReady) return true;

    // Init already in flight — wait on the same promise
    if (this._initPromise) return this._initPromise;

    this._initPromise = new Promise((resolve) => {
      // Add message listener only once (first injection)
      if (!this.bridgeInjected) {
        window.addEventListener('message', (event) => {
          if (!event.data || event.data.source !== 'neuralfill-ai-bridge') return;

          if (event.data.type === 'INIT_COMPLETE') {
            this.isReady = event.data.success;
            this._initPromise = null; // allow retry on next call if failed
            if (!this.isReady) console.warn('[NeuralFill] AI Bridge init failed:', event.data.error);
            resolve(this.isReady);
          } else if (event.data.type === 'PROMPT_RESULT' ||
                     event.data.type === 'CLASSIFY_RESULT' ||
                     event.data.type === 'GENERATE_RESULT') {
            const id = event.data.id;
            if (this.pendingRequests.has(id)) {
              this.pendingRequests.get(id)(event.data.result);
              this.pendingRequests.delete(id);
            }
          }
        });

        // Inject bridge into Main World to access window.LanguageModel
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('content/bridge.js');
        (document.head || document.documentElement).appendChild(script);
        this.bridgeInjected = true;
      } else {
        // Bridge already injected but previously failed — ask it to re-check
        window.postMessage({ source: 'neuralfill-content', type: 'RETRY_INIT' }, '*');
      }

      // Safety timeout — clear initPromise so next call can retry
      setTimeout(() => {
        if (!this.isReady) {
          this._initPromise = null;
          resolve(false);
        }
      }, 10000);
    });

    return this._initPromise;
  }

  // inputContext is a STRING (from getInputContext), NOT a DOM element
  async evaluateInput(inputContext) {
    if (!this.isReady) {
       let ok = await this.initialize();
       if (!ok) return null;
    }

    const promptText = `${inputContext}\nMatch to exactly one key. Respond ONLY with JSON, no markdown.\nExample: {"key":"email","confidence":0.95}\nAllowed keys: fullName, email, phone, dob, street, city, state, zip, country, jobTitle, company, linkedIn, github, twitter, website, null`;
    const id = ++this.messageId;
    
    const rawResponse = await new Promise((resolve) => {
       this.pendingRequests.set(id, resolve);
       // Send the actual prompt text (inputContext is already a descriptive string)
       window.postMessage({ source: 'neuralfill-content', type: 'RUN_PROMPT', id: id, prompt: promptText }, '*');
       
       // Timeout — Gemini Nano can take a few seconds per field
       setTimeout(() => {
          if (this.pendingRequests.has(id)) {
             this.pendingRequests.delete(id);
             resolve(null);
          }
       }, 10000);
    });
    
    if (!rawResponse) {
       console.log(`[NeuralFill AI] Timeout for: "${inputContext}"`);
       return null;
    }
    
    console.log(`[NeuralFill AI] Raw response for "${inputContext}":`, rawResponse);
    
    let parsed = null;
    
    try {
       parsed = JSON.parse(rawResponse.trim());
    } catch (e1) {
       const jsonMatch = rawResponse.match(/\{[\s\S]*?\}/);
       if (jsonMatch) {
          try { 
            parsed = JSON.parse(jsonMatch[0].trim()); 
          } catch (e2) { /* ignore parse failures */ }
       }
    }

    if (parsed) {
       let matchedKey = parsed.key;
       if (matchedKey) {
          const keyMap = {
             'fullname': 'fullName', 'full_name': 'fullName', 'name': 'fullName', 'full name': 'fullName',
             'email': 'email', 'email_address': 'email', 'e-mail': 'email',
             'phone': 'phone', 'phone_number': 'phone', 'mobile': 'phone', 'telephone': 'phone',
             'dob': 'dob', 'date of birth': 'dob', 'date_of_birth': 'dob', 'birthday': 'dob', 'birthdate': 'dob',
             'street': 'street', 'address': 'street', 'street_address': 'street', 'addr': 'street', 'address1': 'street',
             'city': 'city', 'town': 'city',
             'state': 'state', 'province': 'state', 'region': 'state',
             'zip': 'zip', 'zipcode': 'zip', 'zip_code': 'zip', 'postal': 'zip', 'postal_code': 'zip', 'pincode': 'zip',
             'country': 'country', 'nation': 'country',
             'jobtitle': 'jobTitle', 'job_title': 'jobTitle', 'position': 'jobTitle', 'role': 'jobTitle', 'designation': 'jobTitle',
             'company': 'company', 'employer': 'company', 'organization': 'company', 'organisation': 'company',
             'linkedin': 'linkedIn', 'linked_in': 'linkedIn', 'linkedin_url': 'linkedIn',
             'github': 'github', 'github_url': 'github',
             'twitter': 'twitter', 'twitter_handle': 'twitter',
             'website': 'website', 'portfolio': 'website', 'personal_site': 'website', 'url': 'website',
          };
          matchedKey = keyMap[matchedKey.toLowerCase()] || matchedKey;
       }
       const validKeys = ['fullName', 'email', 'phone', 'dob', 'street', 'city', 'state', 'zip', 'country', 'jobTitle', 'company', 'linkedIn', 'github', 'twitter', 'website'];
       if (matchedKey && validKeys.includes(matchedKey)) {
         console.log(`[NeuralFill AI] Matched "${inputContext}" → ${matchedKey}`);
         return matchedKey;
       }
    }
    return null;
  }

  // Classify a field into a human-readable camelCase label (for Scan & Learn)
  async classifyField(inputContext) {
    if (!this.isReady) {
       let ok = await this.initialize();
       if (!ok) return null;
    }

    const id = ++this.messageId;
    
    const rawResponse = await new Promise((resolve) => {
       this.pendingRequests.set(id, resolve);
       window.postMessage({ source: 'neuralfill-content', type: 'RUN_CLASSIFY', id: id, context: inputContext }, '*');
       setTimeout(() => {
          if (this.pendingRequests.has(id)) {
             this.pendingRequests.delete(id);
             resolve(null);
          }
       }, 10000);
    });
    
    if (!rawResponse) return null;
    
    let parsed = null;
    try {
       parsed = JSON.parse(rawResponse.trim());
    } catch (e1) {
       const jsonMatch = rawResponse.match(/\{[\s\S]*?\}/);
       if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0].trim()); } catch (e2) {}
       }
    }
    
    if (parsed && parsed.label && typeof parsed.label === 'string') {
       // Ensure camelCase and remove spaces
       let label = parsed.label.trim().replace(/\s+/g, '');
       // Make first char lowercase for camelCase
       label = label.charAt(0).toLowerCase() + label.slice(1);
       return label;
    }
    return null;
  }
}

// Inlined RegexEngine
class RegexEngine {
  constructor() {
    this.patterns = {
      fullName:  /(?:full[_\s-]*name|first[_\s]*name|last[_\s]*name|your[_\s]*name)/i,
      email:     /(?:e[-\s]?mail|mail[_\s]*address)/i,
      phone:     /(?:phone|mobile|cell|telephone|contact[_\s]*no)/i,
      dob:       /(?:dob|date[_\s]*of[_\s]*birth|birth[_\s]*date|birthday)/i,
      street:    /(?:street|address|addr|address[_\s]*line|street[_\s]*address)/i,
      city:      /(?:city|town|municipality)/i,
      state:     /(?:state|province|region)/i,
      zip:       /(?:zip|postal|pin[_\s]*code|zip[_\s]*code|postal[_\s]*code)/i,
      country:   /(?:country|nation)/i,
      jobTitle:  /(?:job[_\s]*title|position|role|designation|title|current[_\s]*role)/i,
      company:   /(?:company|employer|organisation|organization|workplace|firm|current[_\s]*company)/i,
      linkedIn:  /(?:linkedin|linked[_\s]*in)/i,
      github:    /(?:github|git[_\s]*hub)/i,
      twitter:   /(?:twitter|x[_\s]*handle|@handle)/i,
      website:   /(?:website|portfolio|personal[_\s]*site|homepage|url|web[_\s]*address)/i,
    };
    
    this.passwordPattern = /(?:password|pass|pwd|secret|pin(?!code))/i;
    this.sensitivePattern = /(?:cvv|cvc|cvc2|cvv2|security[_\s-]*code|card[_\s-]*(?:number|num|no)|credit[_\s-]*card|expir|exp[_\s-]*(?:date|month|year|mm|yy)|card[_\s-]*expir)/i;
  }

  isPasswordField(inputElement) {
    if (inputElement.type === 'password') return true;
    const combinedStr = `${inputElement.id} ${inputElement.name} ${inputElement.className} ${inputElement.placeholder}`.toLowerCase();
    return this.passwordPattern.test(combinedStr);
  }

  isSensitiveField(inputElement) {
    const combinedStr = `${inputElement.id || ''} ${inputElement.name || ''} ${inputElement.className || ''} ${inputElement.placeholder || ''}`.toLowerCase();
    let labelText = '';
    if (inputElement.labels?.length > 0) labelText = inputElement.labels[0].innerText.toLowerCase();
    else if (inputElement.id) { const l = document.querySelector(`label[for="${inputElement.id}"]`); if (l) labelText = l.innerText.toLowerCase(); }
    return this.sensitivePattern.test(`${combinedStr} ${labelText}`);
  }

  evaluateInput(inputElement) {
    const tag = inputElement.tagName?.toLowerCase();
    // Strip URL-formatted placeholders (e.g. "https://linkedin.com/in/yourname") — they contain
    // example data that can falsely match other field types (e.g. "yourname" → fullName).
    let placeholder = inputElement.placeholder || '';
    if (/^https?:\/\//i.test(placeholder.trim()) || placeholder.includes('://')) placeholder = '';
    const combinedStr = `${inputElement.id || ''} ${inputElement.name || ''} ${inputElement.className || ''} ${placeholder}`.toLowerCase();
    
    // For select elements, also check the label
    let labelText = '';
    if (inputElement.labels && inputElement.labels.length > 0) {
      labelText = inputElement.labels[0].innerText.toLowerCase();
    } else if (inputElement.id) {
      const lbl = document.querySelector(`label[for="${inputElement.id}"]`);
      if (lbl) labelText = lbl.innerText.toLowerCase();
    }
    const fullStr = `${combinedStr} ${labelText}`;
    
    for (const [key, regex] of Object.entries(this.patterns)) {
      if (regex.test(fullStr)) {
        return key;
      }
    }
    return null;
  }
}

const regexEngine = new RegexEngine();
const aiEngine = new AiEngine();
console.log("[NeuralFill] Engines loaded inline.");

// UI Elements for Capture
let captureMenu = null;
let currentTargetInput = null;

function createCaptureMenu() {
  captureMenu = document.createElement('div');
  captureMenu.id = 'neuralfill-capture-menu';
  captureMenu.style.cssText = `
    position: absolute;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 8px;
    z-index: 2147483647;
    display: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    color: #fff;
    font-family: sans-serif;
    font-size: 13px;
    width: 200px;
  `;

  const title = document.createElement('div');
  title.innerText = 'Save to NeuralFill Profile';
  title.style.cssText = 'font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;';
  captureMenu.appendChild(title);

  const fields = [
    { label: 'Full Name', key: 'fullName' },
    { label: 'Email Address', key: 'email' },
    { label: 'Phone Number', key: 'phone' },
    { label: 'Date of Birth', key: 'dob' }
  ];

  fields.forEach(f => {
    const btn = document.createElement('div');
    btn.innerText = `Save as ${f.label}`;
    btn.style.cssText = 'padding: 6px; cursor: pointer; border-radius: 4px; margin-bottom: 2px;';
    btn.onmouseover = () => btn.style.backgroundColor = '#6b4cff';
    btn.onmouseout = () => btn.style.backgroundColor = 'transparent';
    btn.onclick = () => saveFieldToProfile(f.key);
    captureMenu.appendChild(btn);
  });

  document.body.appendChild(captureMenu);

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (captureMenu.style.display === 'block' && e.target !== captureMenu && !captureMenu.contains(e.target)) {
      captureMenu.style.display = 'none';
      if (currentTargetInput) {
        currentTargetInput.style.outline = '';
        currentTargetInput = null;
      }
    }
  });
}

// Right click context menu simulation
document.addEventListener('contextmenu', (e) => {
  if (!regexEngine) return;
  if (e.target.tagName === 'INPUT' && !regexEngine.isPasswordField(e.target) && e.target.type !== 'submit' && e.target.type !== 'button') {
    if (e.ctrlKey || e.shiftKey) { // Require modifier key to not break normal right click
      e.preventDefault();
      
      if (!captureMenu) createCaptureMenu();
      
      if (currentTargetInput) currentTargetInput.style.outline = '';
      
      currentTargetInput = e.target;
      currentTargetInput.style.outline = '2px solid #6b4cff';
      
      captureMenu.style.display = 'block';
      captureMenu.style.left = `${e.pageX}px`;
      captureMenu.style.top = `${e.pageY}px`;
    }
  }
});

function saveFieldToProfile(dataKey) {
  if (!currentTargetInput) return;
  const valueToSave = currentTargetInput.value.trim();
  
  if (!valueToSave) {
    alert("NeuralFill: Input field is empty. Type a value first to save it.");
    captureMenu.style.display = 'none';
    currentTargetInput.style.outline = '';
    return;
  }

  chrome.runtime.sendMessage({
    action: 'save_field_to_active_profile',
    key: dataKey,
    value: valueToSave
  }, (response) => {
    if (response && response.success) {
      currentTargetInput.style.outline = '2px solid #4cd964';
      setTimeout(() => {
        if (currentTargetInput) currentTargetInput.style.outline = '';
        currentTargetInput = null;
      }, 1000);
    } else {
      alert("NeuralFill: " + (response?.error || 'Failed to save to profile. Ensure you have an active profile created.'));
      currentTargetInput.style.outline = '';
    }
    captureMenu.style.display = 'none';
  });
}

/**
 * Helper to gather context text around an input for the AI to analyze.
 */
function getInputContext(input) {
  const parts = [];
  if (input.id) parts.push(`id: ${input.id}`);
  if (input.name) parts.push(`name: ${input.name}`);
  if (input.placeholder) parts.push(`placeholder: ${input.placeholder}`);
  if (input.className) parts.push(`class: ${input.className}`);
  if (input.title) parts.push(`title: ${input.title}`);
  
  // Try to find a label
  if (input.labels && input.labels.length > 0) {
    parts.push(`label: ${input.labels[0].innerText.trim()}`);
  } else if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) parts.push(`label: ${label.innerText.trim()}`);
  }
  
  return parts.join(', ');
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'alive' });
    return true;
  }

  if (request.action === 'check_ai_status') {
    (async () => {
      // Also surface the raw availability string so the popup can show specific status
      let rawStatus = 'unknown';
      try {
        const api = window.LanguageModel || window.ai?.languageModel;
        if (api && typeof api.availability === 'function') {
          rawStatus = await api.availability();
        } else if (api && typeof api.capabilities === 'function') {
          const caps = await api.capabilities();
          rawStatus = caps?.available || 'unknown';
        } else if (!api) {
          rawStatus = 'no-api';
        }
      } catch (_) {}
      const isSupported = await aiEngine.initialize();
      sendResponse({ ready: isSupported, status: rawStatus });
    })();
    return true;
  }

  if (request.action === 'scan_and_learn') {
    (async () => {
      const aiReady = await aiEngine.initialize();
      if (!aiReady) {
        sendResponse({ success: false, error: 'AI engine not available' });
        return;
      }

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"])'));
      const discovered = [];

      // Broad filter: any label containing these words maps to a standard field
      const standardPatterns = /^(full\s?name|first\s?name|last\s?name|name|email|e-?mail|recipient\s?email|contact\s?email|mail|phone|mobile|cell|telephone|contact\s?number|dob|date\s?of\s?birth|birth\s?date|birthday)$/i;

      for (const input of inputs) {
        if (regexEngine.isPasswordField(input)) continue;
        // Skip fields that regex already knows
        if (regexEngine.evaluateInput(input)) continue;
        // Skip empty fields
        const value = input.value.trim();
        if (!value) continue;

        const context = getInputContext(input);
        if (!context) continue;

        // First, check if the standard AI matcher recognizes this as a known field
        const standardMatch = await aiEngine.evaluateInput(context);
        if (standardMatch) {
           console.log(`[Scan & Learn] Skipping "${context}" — standard AI matched: ${standardMatch}`);
           continue;
        }

        // Highlight field being scanned
        input.style.backgroundColor = 'rgba(0, 200, 255, 0.15)';
        input.style.border = '1px solid #00c8ff';

        const label = await aiEngine.classifyField(context);
        if (label && !standardPatterns.test(label.replace(/([A-Z])/g, ' $1').trim())) {
          const displayLabel = label.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
          discovered.push({ key: label, displayLabel, value });
          console.log(`[Scan & Learn] Discovered: ${displayLabel} = "${value}"`);
          input.style.backgroundColor = 'rgba(0, 200, 100, 0.15)';
          input.style.border = '1px solid #00c864';
        } else {
          console.log(`[Scan & Learn] Filtered out standard-like label: "${label}" for "${context}"`);
          input.style.backgroundColor = '';
          input.style.border = '';
        }
      }

      sendResponse({ success: true, discovered });
    })();
    return true;
  }

  if (request.action === 'generate_all_longform') {
    (async () => {
      const lockRes = await new Promise(r => chrome.runtime.sendMessage({ action: 'check_lock' }, r));
      if (!lockRes?.isUnlocked) { sendResponse({ success: false, error: 'locked' }); return; }

      const profileRes = await new Promise(r => chrome.runtime.sendMessage({ action: 'get_active_profile' }, r));
      if (!profileRes?.success) { sendResponse({ success: false, error: 'no_profile' }); return; }

      const { answerLength } = await new Promise(r => chrome.storage.local.get('answerLength', r));

      // Acknowledge immediately so popup knows generation has started
      sendResponse({ started: true });

      // Show floating progress toast on the page
      const toast = showGeneratingToast();

      const result = await generateAllLongFormFields(
        profileRes.profile.id,
        answerLength || 'medium',
        (done, total) => {
          toast.onProgress(done, total);
          chrome.runtime.sendMessage({ action: 'generate_all_progress', current: done, total });
        }
      );

      toast.onComplete(result.filled || 0, result.error);
      // Notify popup of completion
      chrome.runtime.sendMessage({ action: 'generate_all_complete', filled: result.filled || 0, total: result.total || 0 });
    })();
    return true;
  }

  if (request.action === 'preview_fill') {
    (async () => {
      const lockRes = await new Promise(r => chrome.runtime.sendMessage({ action: 'check_lock' }, r));
      if (!lockRes?.isUnlocked) { sendResponse({ fieldCount: 0, error: 'locked' }); return; }
    })();
    const profileData  = request.profileData;
    const customFields = request.customFields || {};
    const allData = { ...profileData, ...customFields };

    const inputs = Array.from(document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
    ));

    const matches = [];
    for (const input of inputs) {
      if (regexEngine.isPasswordField(input)) continue;
      const key = regexEngine.evaluateInput(input);
      if (key && allData[key] && !input.value) {
        matches.push({ el: input, key, value: allData[key] });
      }
    }

    if (matches.length === 0) {
      sendResponse({ fieldCount: 0 });
      return true;
    }

    showPreviewOverlay(matches, profileData, customFields);
    sendResponse({ fieldCount: matches.length });
    return true;
  }

  if (request.action === 'fill_form') {
    const useAi = request.useAi;
    const profileData = request.profileData;
    const customFields = request.customFields || {};
    console.log(`[NeuralFill] Attempting to fill form. AI Enabled: ${useAi}`);
    
    if (!profileData) {
      sendResponse({ success: false, error: 'No profile data' });
      return;
    }

    // Merge standard and custom fields into one lookup
    const allData = { ...profileData, ...customFields };
    const allKeys = Object.keys(allData).filter(k => k !== 'customFields' && allData[k]);

    (async () => {
      if (useAi) {
        const aiReady = await aiEngine.initialize();
        if (!aiReady) {
           console.warn('[NeuralFill] AI not available, falling back to Regex only.');
        }
      }

      let fieldsFilled = 0;
      let totalIdentified = 0;
      // Snapshot: element → { value, bg, border } so undo can restore exactly
      const fillSnapshot = new Map();

      // Collect both input and select elements
      const inputs = Array.from(document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
      ));

      for (const input of inputs) {
        const isSelect = input.tagName.toLowerCase() === 'select';
        const isTextarea = input.tagName.toLowerCase() === 'textarea';
        
        if (!isSelect && !isTextarea && regexEngine.isPasswordField(input)) continue;
        if (!isSelect && !isTextarea && regexEngine.isSensitiveField(input)) continue;
        
        let matchedField = regexEngine.evaluateInput(input);
        let usedEngine = 'regex';
        
        // If Regex fails and AI is enabled, try Engine B
        if (!matchedField && useAi) {
          const context = getInputContext(input);
          if (context) {
            const customKeys = Object.keys(customFields);
            const allAllowedKeys = ['fullName', 'email', 'phone', 'dob', 'street', 'city', 'state', 'zip', 'country', 'jobTitle', 'company', 'linkedIn', 'github', 'twitter', 'website', ...customKeys];
            const dynamicPrompt = `${context}\nMatch to exactly one key. Respond ONLY with JSON, no markdown.\nExample: {"key":"email","confidence":0.95}\nAllowed keys: ${allAllowedKeys.join(', ')}, null`;
            
            const id = ++aiEngine.messageId;
            const rawResponse = await new Promise((resolve) => {
               aiEngine.pendingRequests.set(id, resolve);
               window.postMessage({ source: 'neuralfill-content', type: 'RUN_PROMPT', id: id, prompt: dynamicPrompt }, '*');
               setTimeout(() => {
                  if (aiEngine.pendingRequests.has(id)) {
                     aiEngine.pendingRequests.delete(id);
                     resolve(null);
                  }
               }, 10000);
            });
            
            if (rawResponse) {
               let parsed = null;
               try { parsed = JSON.parse(rawResponse.trim()); } catch(e1) {
                  const m = rawResponse.match(/\{[\s\S]*?\}/);
                  if (m) try { parsed = JSON.parse(m[0].trim()); } catch(e2) {}
               }
               if (parsed && parsed.key) {
                  const keyMap = {
                     'fullname': 'fullName', 'full_name': 'fullName', 'name': 'fullName', 'full name': 'fullName',
                     'email': 'email', 'email_address': 'email', 'e-mail': 'email',
                     'phone': 'phone', 'phone_number': 'phone', 'mobile': 'phone', 'telephone': 'phone',
                     'dob': 'dob', 'date of birth': 'dob', 'date_of_birth': 'dob', 'birthday': 'dob', 'birthdate': 'dob',
                     'street': 'street', 'address': 'street', 'city': 'city', 'state': 'state',
                     'zip': 'zip', 'postal': 'zip', 'country': 'country',
                     'jobtitle': 'jobTitle', 'job_title': 'jobTitle', 'designation': 'jobTitle', 'position': 'jobTitle',
                     'company': 'company', 'employer': 'company', 'organization': 'company', 'organisation': 'company',
                     'linkedin': 'linkedIn', 'linkedin_url': 'linkedIn', 'linked_in': 'linkedIn', 'linkedin url': 'linkedIn', 'linkedin profile': 'linkedIn',
                     'github': 'github', 'github_url': 'github', 'git_hub': 'github', 'github profile': 'github',
                     'twitter': 'twitter', 'twitter_url': 'twitter', 'x_handle': 'twitter', 'twitter handle': 'twitter',
                     'website': 'website', 'portfolio': 'website', 'web_address': 'website', 'personal site': 'website',
                  };
                  let mk = keyMap[parsed.key.toLowerCase()] || parsed.key;
                  if (allData[mk]) {
                     matchedField = mk;
                     usedEngine = 'ai';
                  }
               }
            }
          }
        }

        let fillValue = allData[matchedField];
        if (!matchedField || !fillValue) {
          continue;
        }
        
        totalIdentified++;
        
        // --- Date Format Intelligence ---
        if (matchedField === 'dob' && !isSelect && input.type !== 'date') {
          fillValue = convertDateFormat(fillValue, input);
        }
        
        // --- Select Dropdown Filling ---
        if (isSelect) {
          const prevVal = input.value;
          const filled = fillSelectElement(input, fillValue);
          if (filled) {
            fillSnapshot.set(input, { value: prevVal, bg: input.style.backgroundColor, border: input.style.border });
            input.style.backgroundColor = usedEngine === 'ai' ? 'rgba(255, 102, 0, 0.1)' : 'rgba(10, 132, 255, 0.08)';
            input.dispatchEvent(new Event('change', { bubbles: true }));
            fieldsFilled++;
          }
          continue;
        }

        // --- Standard Input Filling ---
        if (!input.value) {
          fillSnapshot.set(input, { value: '', bg: input.style.backgroundColor, border: input.style.border });
          if (input.type === 'date') {
            input.value = fillValue;
          } else {
            input.value = fillValue;
          }

          if (usedEngine === 'ai') {
            input.style.backgroundColor = 'rgba(255, 102, 0, 0.1)';
            input.style.border = '1px solid #ff6600';
          } else {
            input.style.backgroundColor = 'rgba(10, 132, 255, 0.08)';
            input.style.border = '1px solid #0a84ff';
          }

          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          fieldsFilled++;
        }
      }

      // Log the fill event
      chrome.runtime.sendMessage({
        action: 'log_fill',
        url: window.location.hostname,
        profileName: profileData.fullName || 'Profile',
        fieldsFilled
      });

      // Notify the badge (if visible) that filling is complete
      window.dispatchEvent(new CustomEvent('neuralfill-fill-complete', {
        detail: { fieldsFilled, totalIdentified }
      }));

      // Show undo toast — skip when badge triggered (badge shows its own completion state)
      if (fieldsFilled > 0 && request.source !== 'badge') showUndoToast(fillSnapshot, fieldsFilled);

      sendResponse({ success: true, fieldsFilled, totalIdentified });
    })();
  }
  return true;
});

// ═══════════════════════════════════════
// Date Format Intelligence
// ═══════════════════════════════════════
function convertDateFormat(storedDate, inputElement) {
  // storedDate is expected as YYYY-MM-DD
  const match = storedDate.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return storedDate;
  
  const [, y, m, d] = match;
  
  // Check placeholder for format hints
  const ph = (inputElement.placeholder || '').toUpperCase();
  
  if (ph.includes('DD/MM/YYYY') || ph.includes('DD-MM-YYYY')) {
    return `${d}/${m}/${y}`;
  }
  if (ph.includes('MM/DD/YYYY') || ph.includes('MM-DD-YYYY')) {
    return `${m}/${d}/${y}`;
  }
  if (ph.includes('YYYY/MM/DD') || ph.includes('YYYY-MM-DD')) {
    return `${y}-${m}-${d}`;
  }
  if (ph.includes('DD.MM.YYYY')) {
    return `${d}.${m}.${y}`;
  }
  
  // Check pattern attribute
  const pat = inputElement.pattern || '';
  if (pat) {
    // Count groups to infer format
    if (pat.includes('d') && pat.indexOf('d') < pat.indexOf('m')) {
      return `${d}/${m}/${y}`;
    }
  }
  
  // Default: MM/DD/YYYY (US format, most common)
  return `${m}/${d}/${y}`;
}

// ═══════════════════════════════════════
// Select/Dropdown Filling
// ═══════════════════════════════════════
function fillSelectElement(selectEl, value) {
  if (!value) return false;
  const val = value.toLowerCase().trim();
  const options = Array.from(selectEl.options);
  
  // 1. Exact match on value
  let match = options.find(o => o.value.toLowerCase() === val);
  if (match) { selectEl.value = match.value; return true; }
  
  // 2. Exact match on text
  match = options.find(o => o.textContent.trim().toLowerCase() === val);
  if (match) { selectEl.value = match.value; return true; }
  
  // 3. Partial / includes match
  match = options.find(o => {
    const t = o.textContent.trim().toLowerCase();
    return t.includes(val) || val.includes(t);
  });
  if (match) { selectEl.value = match.value; return true; }
  
  // 4. Country code fallback (e.g. "IN" → "India")
  if (val.length <= 3) {
    match = options.find(o => o.value.toLowerCase() === val || o.dataset?.code?.toLowerCase() === val);
    if (match) { selectEl.value = match.value; return true; }
  }
  
  return false;
}

// ═══════════════════════════════════════
// Auto-Fill Floating Badge (on page load)
// ═══════════════════════════════════════
function createAutoFillBadge() {
  // Don't show on extension pages or empty pages
  if (window.location.protocol === 'chrome-extension:' || window.location.protocol === 'chrome:') return;
  
  const inputs = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]), select, textarea'
  );
  
  const fillable = Array.from(inputs).filter(el => !regexEngine.isPasswordField(el));
  if (fillable.length === 0) return;

  // Respect the floating badge toggle setting
  chrome.storage.local.get('floatingBadgeEnabled', (pref) => {
    if (pref.floatingBadgeEnabled === false) return;
    showFillBadge(fillable);
  });
}

function showFillBadge(fillable) {
  Promise.all([
    new Promise(r => chrome.runtime.sendMessage({ action: 'check_lock' }, r)),
    new Promise(r => chrome.runtime.sendMessage({ action: 'get_active_profile' }, r))
  ]).then(([lockRes, profileRes]) => {
    if (!profileRes?.success) return;

    const longFormFields = getAllLongFormFields();
    const hasLongForm = longFormFields.length > 0;
    const subLabel = hasLongForm
      ? `${fillable.length} field${fillable.length !== 1 ? 's' : ''} · ${longFormFields.length} text field${longFormFields.length !== 1 ? 's' : ''}`
      : `${fillable.length} fillable field${fillable.length !== 1 ? 's' : ''} detected`;

    const badge = document.createElement('div');
    badge.id = 'neuralfill-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(28, 28, 30, 0.96);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 18px;
      padding: 13px 16px;
      z-index: 2147483647;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
      animation: nf-slide-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
      min-width: 240px;
    `;

    if (!document.getElementById('nf-badge-styles')) {
      const style = document.createElement('style');
      style.id = 'nf-badge-styles';
      style.textContent = `
        @keyframes nf-slide-in { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes nf-slide-out { from { opacity:1; transform:translateY(0); } to { opacity:0; transform:translateY(20px); } }
        @keyframes nf-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes nf-unlock-pulse { 0% { transform:scale(1); } 50% { transform:scale(1.15); } 100% { transform:scale(1); } }
        #nf-badge-fill:hover { background: #409cff !important; }
      `;
      document.head.appendChild(style);
    }
    document.body.appendChild(badge);

    // Any click anywhere on badge resets the auto-hide timer
    let autoHideTimer = setTimeout(() => { if (document.getElementById('neuralfill-badge')) dismissBadge(badge); }, 12000);
    function resetAutoHide() {
      clearTimeout(autoHideTimer);
      autoHideTimer = setTimeout(() => { if (document.getElementById('neuralfill-badge')) dismissBadge(badge); }, 12000);
    }
    badge.addEventListener('click', () => resetAutoHide(), true);

    // Track mutable lock state so renderPinEntry can update it
    let currentLocked = !(lockRes?.isUnlocked !== false);
    const hasPinSetup_ref = { value: lockRes?.hasPinSetup ?? false };

    // SVG helpers
    function lockSVG() {
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="7.5" width="12" height="8" rx="2.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" stroke-width="1.2"/>
        <path d="M5 7.5V5.5C5 3.8 6.1 2.5 8 2.5C9.9 2.5 11 3.8 11 5.5V7.5" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-linecap="round"/>
      </svg>`;
    }
    function unlockSVG() {
      return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="7.5" width="12" height="8" rx="2.5" fill="rgba(48,209,88,0.08)" stroke="rgba(48,209,88,0.5)" stroke-width="1.2"/>
        <path d="M5 7.5V5C5 3.3 6.1 2 8 2C9.9 2 11 3.3 11 5" stroke="rgba(48,209,88,0.5)" stroke-width="1.2" stroke-linecap="round"/>
      </svg>`;
    }

    // ── renderMain: always-visible Fill + Text + lock icon ────
    function renderMain(isLocked) {
      currentLocked = isLocked;
      const icon = isLocked ? lockSVG() : unlockSVG();
      badge.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="nf-lock-icon-btn" title="${isLocked ? 'Unlock NeuralFill' : 'Lock NeuralFill'}" style="background:none;border:none;cursor:pointer;padding:3px;line-height:0;flex-shrink:0;border-radius:6px;transition:background 0.15s;">${icon}</button>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:13px;color:#fff;">NeuralFill</div>
            <div id="nf-badge-sub" style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${subLabel}</div>
          </div>
          <button id="nf-badge-fill" style="background:#0a84ff;color:#fff;border:none;border-radius:980px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.15s;flex-shrink:0;">Fill</button>
          ${hasLongForm ? `<button id="nf-badge-generate" style="background:rgba(90,200,250,0.15);color:#5ac8fa;border:1px solid rgba(90,200,250,0.3);border-radius:980px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:background 0.15s;white-space:nowrap;flex-shrink:0;">✦ Text</button>` : ''}
          <button id="nf-badge-close" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:16px;cursor:pointer;padding:2px 4px;line-height:1;flex-shrink:0;">✕</button>
        </div>
      `;

      // Lock icon: unlock ↔ relock ↔ setup
      document.getElementById('nf-lock-icon-btn').addEventListener('click', () => {
        if (!hasPinSetup_ref.value) renderPinEntry('setup');
        else if (isLocked)          renderPinEntry('unlock');
        else                        renderPinEntry('relock');
      });

      // Fill button
      document.getElementById('nf-badge-fill').addEventListener('click', () => {
        if (isLocked) { showLockedHint(); return; }
        proceedWithBadgeFill();
      });

      // Text button
      const genBtn = document.getElementById('nf-badge-generate');
      if (genBtn) genBtn.addEventListener('click', () => {
        if (isLocked) { showLockedHint(); return; }
        proceedWithGenerateAll();
      });

      document.getElementById('nf-badge-close').addEventListener('click', () => dismissBadge(badge));
    }

    function showLockedHint() {
      const sub = document.getElementById('nf-badge-sub');
      if (!sub) return;
      const prev = sub.textContent;
      const prevColor = sub.style.color;
      sub.textContent = '🔒 Click the lock icon to unlock';
      sub.style.color = '#ff9f0a';
      setTimeout(() => { sub.textContent = prev; sub.style.color = prevColor; }, 2500);
    }

    // ── renderPinEntry: inline PIN form ───────────────────────
    function renderPinEntry(mode) {
      const isUnlockMode  = mode === 'unlock';
      const isRelockMode  = mode === 'relock';
      const isSetupMode   = mode === 'setup';

      const headerIcon  = isUnlockMode ? lockSVG() : unlockSVG();
      const headerTitle = isUnlockMode ? 'NeuralFill is locked'
                        : isRelockMode ? 'Lock NeuralFill'
                        : 'Set a PIN';
      const placeholder = isSetupMode  ? 'Enter PIN (min. 4 digits)' : 'Enter PIN to ' + (isUnlockMode ? 'unlock' : 'lock');
      const btnLabel    = isUnlockMode ? 'Unlock' : isRelockMode ? 'Lock' : 'Save PIN';
      const btnColor    = isRelockMode ? '#ff453a' : '#0a84ff';

      badge.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:10px;min-width:240px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="line-height:0;flex-shrink:0;">${headerIcon}</span>
            <div style="flex:1;font-weight:600;font-size:13px;color:#fff;">${headerTitle}</div>
            <button id="nf-pin-cancel" style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:16px;cursor:pointer;padding:2px 4px;line-height:1;">✕</button>
          </div>
          ${isSetupMode ? `
          <input id="nf-pin-field" type="password" inputmode="numeric" placeholder="${placeholder}" maxlength="12"
            style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:8px 11px;font-size:13px;color:#fff;font-family:inherit;outline:none;width:100%;box-sizing:border-box;"/>
          <input id="nf-pin-confirm" type="password" inputmode="numeric" placeholder="Confirm PIN" maxlength="12"
            style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:8px 11px;font-size:13px;color:#fff;font-family:inherit;outline:none;width:100%;box-sizing:border-box;"/>
          ` : `
          <input id="nf-pin-field" type="password" inputmode="numeric" placeholder="${placeholder}" maxlength="12"
            style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.18);border-radius:10px;padding:8px 11px;font-size:13px;color:#fff;font-family:inherit;outline:none;width:100%;box-sizing:border-box;"/>
          `}
          <div id="nf-pin-error" style="font-size:11px;color:#ff453a;display:none;margin-top:-4px;"></div>
          <button id="nf-pin-submit" style="background:${btnColor};color:#fff;border:none;border-radius:980px;padding:8px 0;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;width:100%;">${btnLabel}</button>
        </div>
      `;

      const pinField   = document.getElementById('nf-pin-field');
      const pinConfirm = document.getElementById('nf-pin-confirm');
      const pinError   = document.getElementById('nf-pin-error');
      pinField.focus();

      function showError(msg) {
        pinError.textContent = msg;
        pinError.style.display = 'block';
        pinField.style.borderColor = 'rgba(255,69,58,0.6)';
      }
      function clearError() {
        pinError.style.display = 'none';
        pinField.style.borderColor = 'rgba(255,255,255,0.18)';
      }

      function submit() {
        const pin = pinField.value.trim();
        clearError();

        if (isSetupMode) {
          const confirm = pinConfirm?.value.trim();
          if (pin.length < 4) { showError('PIN must be at least 4 characters.'); return; }
          if (pin !== confirm) { showError('PINs do not match.'); pinConfirm.style.borderColor = 'rgba(255,69,58,0.6)'; return; }
          chrome.runtime.sendMessage({ action: 'save_pin', pin }, (res) => {
            if (res?.success) { hasPinSetup_ref.value = true; renderMain(false); }
            else showError('Failed to save PIN. Try again.');
          });

        } else if (isUnlockMode) {
          if (!pin) return;
          chrome.runtime.sendMessage({ action: 'unlock', pin }, (res) => {
            if (res?.success) renderUnlockSuccess();
            else { showError('Incorrect PIN'); pinField.value = ''; pinField.focus(); }
          });

        } else if (isRelockMode) {
          if (!pin) return;
          // Verify PIN first, then lock
          chrome.runtime.sendMessage({ action: 'unlock', pin }, (res) => {
            if (res?.success) {
              chrome.runtime.sendMessage({ action: 'lock' }, () => renderMain(true));
            } else {
              showError('Incorrect PIN');
              pinField.value = '';
              pinField.focus();
            }
          });
        }
      }

      document.getElementById('nf-pin-submit').addEventListener('click', submit);
      pinField.addEventListener('keydown', e => { if (e.key === 'Enter') { if (isSetupMode && pinConfirm) pinConfirm.focus(); else submit(); } });
      if (pinConfirm) pinConfirm.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
      document.getElementById('nf-pin-cancel').addEventListener('click', () => renderMain(isUnlockMode ? true : false));
    }

    // ── renderUnlockSuccess: 900ms then normal ─────────────────
    function renderUnlockSuccess() {
      badge.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:20px;animation:nf-unlock-pulse 0.6s ease;">🔓</div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13px;color:#30d158;">Unlocked</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">Loading…</div>
          </div>
        </div>
      `;
      setTimeout(() => renderMain(false), 900);
    }

    // ── Badge fill logic ───────────────────────────────────────
    function proceedWithBadgeFill() {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
      badge.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:18px;height:18px;border:2px solid rgba(255,255,255,0.15);border-top-color:#0a84ff;border-radius:50%;animation:nf-spin 0.8s linear infinite;"></div>
          <div>
            <div style="font-weight:600;font-size:13px;color:#fff;">Filling fields…</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">AI engine may take a moment</div>
          </div>
        </div>
      `;
      window.addEventListener('neuralfill-fill-complete', (e) => {
        const { fieldsFilled, totalIdentified } = e.detail;
        badge.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:18px;">✓</div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:13px;color:#30d158;">${fieldsFilled} field${fieldsFilled !== 1 ? 's' : ''} filled</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:2px;">🔒 0 bytes sent externally${totalIdentified > fieldsFilled ? ` · ${totalIdentified - fieldsFilled} already filled` : ''}</div>
            </div>
            <button id="nf-badge-done" style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:16px;cursor:pointer;padding:2px 6px;line-height:1;">✕</button>
          </div>
        `;
        document.getElementById('nf-badge-done')?.addEventListener('click', () => dismissBadge(badge));
        setTimeout(() => { if (document.getElementById('neuralfill-badge')) dismissBadge(badge); }, 5000);
      }, { once: true });

      chrome.runtime.sendMessage({ action: 'get_active_profile' }, (res) => {
        if (!res?.success) return;
        const profile = res.profile;
        chrome.runtime.sendMessage({
          action: 'badge_fill',
          profileData: profile.data,
          useAi: res.useAi,
          customFields: profile.data.customFields || {}
        });
      });
    }

    // ── Generate Text logic ────────────────────────────────────
    function proceedWithGenerateAll() {
      clearTimeout(autoHideTimer);
      autoHideTimer = null;
      badge.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:18px;height:18px;border:2px solid rgba(90,200,250,0.15);border-top-color:#5ac8fa;border-radius:50%;animation:nf-spin 0.8s linear infinite;flex-shrink:0;"></div>
          <div>
            <div style="font-weight:600;font-size:13px;color:#5ac8fa;" id="nf-gen-status">Generating text fields…</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">This may take a moment</div>
          </div>
        </div>
      `;
      window.addEventListener('nf-generate-progress', (e) => {
        const { done, total } = e.detail;
        const statusEl = document.getElementById('nf-gen-status');
        if (statusEl) statusEl.textContent = `Generating field ${done} of ${total}…`;
      });
      window.addEventListener('nf-generate-complete', (e) => {
        const { filled, error } = e.detail;
        if (error === 'noai') {
          badge.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:18px;">⚠</div>
              <div style="flex:1;">
                <div style="font-weight:600;font-size:13px;color:#ff9f0a;">Gemini Nano not set up</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">Enable AI in extension settings</div>
              </div>
              <button id="nf-badge-done-gen" style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:16px;cursor:pointer;padding:2px 6px;line-height:1;">✕</button>
            </div>
          `;
          document.getElementById('nf-badge-done-gen')?.addEventListener('click', () => dismissBadge(badge));
          setTimeout(() => { if (document.getElementById('neuralfill-badge')) dismissBadge(badge); }, 4000);
          return;
        }
        if (error === 'nofields') {
          badge.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="font-size:18px;color:rgba(255,255,255,0.35);">✦</div>
              <div style="flex:1;">
                <div style="font-weight:600;font-size:13px;color:rgba(255,255,255,0.55);">No text fields found on this page</div>
              </div>
              <button id="nf-badge-done-gen" style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:16px;cursor:pointer;padding:2px 6px;line-height:1;">✕</button>
            </div>
          `;
          document.getElementById('nf-badge-done-gen')?.addEventListener('click', () => dismissBadge(badge));
          setTimeout(() => { if (document.getElementById('neuralfill-badge')) dismissBadge(badge); }, 3000);
          return;
        }
        badge.innerHTML = `
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:18px;color:#5ac8fa;">✦</div>
            <div style="flex:1;">
              <div style="font-weight:600;font-size:13px;color:#5ac8fa;">${filled} text field${filled !== 1 ? 's' : ''} generated</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">Review and edit the highlighted fields</div>
            </div>
            <button id="nf-badge-done-gen" style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:16px;cursor:pointer;padding:2px 6px;line-height:1;">✕</button>
          </div>
        `;
        document.getElementById('nf-badge-done-gen')?.addEventListener('click', () => dismissBadge(badge));
        setTimeout(() => { if (document.getElementById('neuralfill-badge')) dismissBadge(badge); }, 6000);
      }, { once: true });

      chrome.runtime.sendMessage({ action: 'get_active_profile' }, async (res) => {
        if (!res?.success) return;
        const { answerLength } = await new Promise(r => chrome.storage.local.get('answerLength', r));
        const result = await generateAllLongFormFields(
          res.profile.id,
          answerLength || 'medium',
          (done, total) => window.dispatchEvent(new CustomEvent('nf-generate-progress', { detail: { done, total } }))
        );
        window.dispatchEvent(new CustomEvent('nf-generate-complete', { detail: result }));
      });
    }

    // ── Initial render ─────────────────────────────────────────
    const isUnlocked = lockRes?.isUnlocked !== false;
    const hasPinSetup = lockRes?.hasPinSetup ?? false;
    hasPinSetup_ref.value = hasPinSetup;
    currentLocked = hasPinSetup && !isUnlocked;
    renderMain(currentLocked);
  });
}


function dismissBadge(badge) {
  badge.style.animation = 'nf-slide-out 0.25s ease forwards';
  setTimeout(() => badge.remove(), 250);
}

// ── Preview Before Fill overlay ────────────────────────────────────────────
function showPreviewOverlay(matches, profileData, customFields) {
  // Remove any existing preview
  document.querySelectorAll('[data-nf-preview]').forEach(el => {
    el.style.outline = el.dataset.nfOldOutline || '';
    el.style.backgroundColor = el.dataset.nfOldBg || '';
    delete el.dataset.nfPreview;
  });
  document.getElementById('neuralfill-preview-bar')?.remove();
  document.querySelectorAll('[data-nf-tip]').forEach(el => el.remove());

  if (!document.getElementById('nf-toast-styles')) {
    const s = document.createElement('style');
    s.id = 'nf-toast-styles';
    s.textContent = `
      @keyframes nf-slide-in  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      @keyframes nf-slide-out { from { opacity:1; transform:translateY(0); }    to { opacity:0; transform:translateY(20px); } }
      @keyframes nf-spin      { from { transform:rotate(0deg); }                to { transform:rotate(360deg); } }
    `;
    document.head.appendChild(s);
  }

  // Highlight each matched field
  const tips = [];
  matches.forEach(({ el, value }) => {
    el.dataset.nfPreview = '1';
    el.dataset.nfOldOutline = el.style.outline;
    el.dataset.nfOldBg = el.style.backgroundColor;
    el.style.outline = '2px solid rgba(255,214,10,0.7)';
    el.style.backgroundColor = 'rgba(255,214,10,0.08)';

    // Value tooltip — position: absolute so it scrolls with the field
    const tip = document.createElement('div');
    tip.dataset.nfTip = '1';
    const rect = el.getBoundingClientRect();
    const displayVal = String(value).length > 40 ? String(value).slice(0, 40) + '…' : String(value);
    tip.style.cssText = `
      position: absolute;
      top: ${rect.top + window.scrollY - 28}px;
      left: ${rect.left + window.scrollX}px;
      background: rgba(28,28,30,0.92);
      border: 1px solid rgba(255,214,10,0.4);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 11px;
      color: rgba(255,214,10,0.9);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      z-index: 2147483646;
      pointer-events: none;
      white-space: nowrap;
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    tip.textContent = displayVal;
    document.body.appendChild(tip);
    tips.push(tip);
  });

  function clearPreview() {
    matches.forEach(({ el }) => {
      el.style.outline = el.dataset.nfOldOutline || '';
      el.style.backgroundColor = el.dataset.nfOldBg || '';
      delete el.dataset.nfPreview;
      delete el.dataset.nfOldOutline;
      delete el.dataset.nfOldBg;
    });
    tips.forEach(t => t.remove());
    bar.style.animation = 'nf-slide-out 0.25s ease forwards';
    setTimeout(() => bar.remove(), 250);
  }

  // Confirmation bar
  const bar = document.createElement('div');
  bar.id = 'neuralfill-preview-bar';
  bar.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(28,28,30,0.97);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,214,10,0.3);
    border-radius: 18px;
    padding: 12px 16px;
    z-index: 2147483647;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
    animation: nf-slide-in 0.35s cubic-bezier(0.34,1.56,0.64,1);
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 260px;
  `;

  bar.innerHTML = `
    <div style="flex:1;">
      <div style="font-weight:600;font-size:13px;color:rgba(255,214,10,0.9);">Preview — ${matches.length} field${matches.length !== 1 ? 's' : ''} ready</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">Highlighted in yellow above</div>
    </div>
    <button id="nf-preview-confirm" style="background:#0a84ff;color:#fff;border:none;border-radius:980px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Fill Now</button>
    <button id="nf-preview-cancel" style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:16px;cursor:pointer;padding:2px 4px;line-height:1;">✕</button>
  `;
  document.body.appendChild(bar);

  document.getElementById('nf-preview-confirm').addEventListener('click', () => {
    clearPreview();
    // Route through background badge_fill, which sends fill_form back to this tab
    chrome.runtime.sendMessage({ action: 'get_active_profile' }, (res) => {
      if (!res?.success) return;
      chrome.runtime.sendMessage({
        action: 'badge_fill',
        useAi: res.useAi,
        profileData: res.profile.data,
        customFields: res.profile.data.customFields || {}
      });
    });
  });

  document.getElementById('nf-preview-cancel').addEventListener('click', clearPreview);
}

// ── Undo Fill Toast ────────────────────────────────────────────────────────
function showUndoToast(snapshot, fieldsFilled) {
  const UNDO_ID = 'neuralfill-undo-toast';
  const existing = document.getElementById(UNDO_ID);
  if (existing) existing.remove();

  if (!document.getElementById('nf-toast-styles')) {
    const s = document.createElement('style');
    s.id = 'nf-toast-styles';
    s.textContent = `
      @keyframes nf-slide-in  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      @keyframes nf-slide-out { from { opacity:1; transform:translateY(0); }    to { opacity:0; transform:translateY(20px); } }
      @keyframes nf-spin      { from { transform:rotate(0deg); }                to { transform:rotate(360deg); } }
    `;
    document.head.appendChild(s);
  }

  const toast = document.createElement('div');
  toast.id = UNDO_ID;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(28,28,30,0.96);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 18px;
    padding: 11px 16px;
    z-index: 2147483647;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
    animation: nf-slide-in 0.35s cubic-bezier(0.34,1.56,0.64,1);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 220px;
  `;

  const label = document.createElement('span');
  label.style.cssText = 'font-size:13px;font-weight:500;color:rgba(255,255,255,0.75);flex:1;';
  label.textContent = `Filled ${fieldsFilled} field${fieldsFilled !== 1 ? 's' : ''}`;

  const undoBtn = document.createElement('button');
  undoBtn.textContent = 'Undo';
  undoBtn.style.cssText = `
    background: rgba(10,132,255,0.18);
    border: 1px solid rgba(10,132,255,0.4);
    border-radius: 980px;
    color: #409cff;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 12px;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.15s;
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.3);font-size:15px;cursor:pointer;padding:0 2px;line-height:1;';

  function dismiss() {
    toast.style.animation = 'nf-slide-out 0.25s ease forwards';
    setTimeout(() => toast.remove(), 250);
  }

  undoBtn.addEventListener('click', () => {
    snapshot.forEach(({ value, bg, border }, el) => {
      el.value = value;
      el.style.backgroundColor = bg;
      el.style.border = border;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    dismiss();
  });

  closeBtn.addEventListener('click', dismiss);

  // Progress bar that shrinks over 5s
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: absolute;
    bottom: 0; left: 0;
    height: 2px;
    border-radius: 0 0 18px 18px;
    background: #0a84ff;
    width: 100%;
    transition: width 5s linear;
  `;
  toast.style.position = 'fixed';
  toast.style.overflow = 'hidden';

  toast.appendChild(label);
  toast.appendChild(undoBtn);
  toast.appendChild(closeBtn);
  toast.appendChild(bar);
  document.body.appendChild(toast);

  // Kick off shrink animation
  requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = '0%'; }));

  const timer = setTimeout(dismiss, 5000);
  undoBtn.addEventListener('click', () => clearTimeout(timer));
  closeBtn.addEventListener('click', () => clearTimeout(timer));
}

// ── Floating generation progress toast (shown when triggered from popup) ──
function showGeneratingToast() {
  // Don't stack with an existing toast or the auto-fill badge
  const existing = document.getElementById('neuralfill-gen-toast');
  if (existing) existing.remove();
  const badge = document.getElementById('neuralfill-badge');
  if (badge) badge.remove();

  const TOAST_ID = 'neuralfill-gen-toast';

  // Inject keyframes if not already present
  if (!document.getElementById('nf-toast-styles')) {
    const s = document.createElement('style');
    s.id = 'nf-toast-styles';
    s.textContent = `
      @keyframes nf-slide-in  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      @keyframes nf-slide-out { from { opacity:1; transform:translateY(0); }    to { opacity:0; transform:translateY(20px); } }
      @keyframes nf-spin      { from { transform:rotate(0deg); }                to { transform:rotate(360deg); } }
    `;
    document.head.appendChild(s);
  }

  const toast = document.createElement('div');
  toast.id = TOAST_ID;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(28,28,30,0.96);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 18px;
    padding: 13px 16px;
    z-index: 2147483647;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
    animation: nf-slide-in 0.35s cubic-bezier(0.34,1.56,0.64,1);
    min-width: 240px;
    pointer-events: auto;
  `;

  function setContent(html) { toast.innerHTML = html; }

  setContent(`
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:18px;height:18px;border:2px solid rgba(90,200,250,0.15);border-top-color:#5ac8fa;border-radius:50%;animation:nf-spin 0.8s linear infinite;flex-shrink:0;"></div>
      <div>
        <div style="font-weight:600;font-size:13px;color:#5ac8fa;" id="nf-toast-status">Generating text fields…</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">This may take a moment</div>
      </div>
    </div>
  `);

  document.body.appendChild(toast);

  function dismiss() {
    toast.style.animation = 'nf-slide-out 0.25s ease forwards';
    setTimeout(() => toast.remove(), 250);
  }

  function onProgress(done, total) {
    const el = document.getElementById('nf-toast-status');
    if (el) el.textContent = `Generating field ${done} of ${total}…`;
  }

  function onComplete(filled, error) {
    if (error === 'noai') {
      setContent(`
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="font-size:17px;margin-top:1px;">⚠</div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13px;color:#ff9f0a;">Gemini Nano not available</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:3px;line-height:1.5;">Requires Chrome 138+, Apple Silicon, and ~22 GB free disk space.</div>
            <button id="nf-toast-setup-btn" style="margin-top:8px;background:rgba(255,159,10,0.15);border:1px solid rgba(255,159,10,0.35);border-radius:980px;color:#ff9f0a;font-size:11px;font-weight:600;padding:4px 12px;cursor:pointer;font-family:inherit;">View Setup Guide →</button>
          </div>
          <button onclick="this.closest('#${TOAST_ID}').remove()" style="background:none;border:none;color:rgba(255,255,255,0.3);font-size:16px;cursor:pointer;padding:2px 4px;line-height:1;flex-shrink:0;">✕</button>
        </div>
      `);
      // "View Setup Guide" opens the extension popup to the AI setup view
      document.getElementById('nf-toast-setup-btn')?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'open_ai_setup' });
        toast.remove();
      });
      setTimeout(dismiss, 4000);
      return;
    }
    if (error === 'nofields') {
      setContent(`
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:18px;color:rgba(255,255,255,0.35);">✦</div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13px;color:rgba(255,255,255,0.55);">No text fields found on this page</div>
          </div>
          <button onclick="this.closest('#${TOAST_ID}').remove()" style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:16px;cursor:pointer;padding:2px 6px;line-height:1;">✕</button>
        </div>
      `);
      setTimeout(dismiss, 3000);
      return;
    }
    setContent(`
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:18px;color:#5ac8fa;">✦</div>
        <div style="flex:1;">
          <div style="font-weight:600;font-size:13px;color:#5ac8fa;">${filled} text field${filled !== 1 ? 's' : ''} generated</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;">Review and edit the highlighted fields</div>
        </div>
        <button onclick="this.closest('#${TOAST_ID}').remove()" style="background:none;border:none;color:rgba(255,255,255,0.35);font-size:16px;cursor:pointer;padding:2px 6px;line-height:1;">✕</button>
      </div>
    `);
    setTimeout(dismiss, 6000);
  }

  return { onProgress, onComplete, dismiss };
}

// Launch badge after a short delay to let pages finish rendering
setTimeout(createAutoFillBadge, 1500);

// ═══════════════════════════════════════
// Smart Profile Capture — Save/Update on Submit
// ═══════════════════════════════════════
function initSmartCapture() {
  if (window.location.protocol === 'chrome-extension:' || window.location.protocol === 'chrome:') return;

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form || form.tagName?.toLowerCase() !== 'form') return;

    setTimeout(() => {
      const harvested = harvestFormValues(form);
      // Need at least 2 recognized fields (excluding customFields object itself)
      const fieldCount = Object.keys(harvested).filter(k => k !== 'customFields' && harvested[k]).length
        + Object.keys(harvested.customFields || {}).length;
      if (fieldCount < 2) return;

      chrome.runtime.sendMessage({ action: 'compare_profiles', harvested }, (response) => {
        if (chrome.runtime.lastError || !response) return;

        if (response.type === 'update') {
          showCaptureNotification({
            mode: 'update',
            profileId: response.profileId,
            profileName: response.profileName,
            updatedFields: response.updatedFields,
            newFields: response.newFields,
            updatedCustomFields: response.updatedCustomFields,
            newCustomFields: response.newCustomFields,
            totalUpdated: response.totalUpdated,
            totalNew: response.totalNew,
            harvested
          });
        } else if (response.type === 'new') {
          showCaptureNotification({ mode: 'new', harvested });
        }
      });
    }, 300);
  }, true);
}

function harvestFormValues(form) {
  const harvested = { customFields: {} };
  const elements = form.querySelectorAll('input, select, textarea');

  for (const el of elements) {
    if (el.type === 'password' || el.type === 'hidden' || el.type === 'submit' || el.type === 'button') continue;
    if (regexEngine.isPasswordField(el)) continue;
    
    const value = el.value?.trim();
    if (!value) continue;

    const matchedKey = regexEngine.evaluateInput(el);
    if (matchedKey) {
      if (el.tagName.toLowerCase() === 'select') {
        const selectedOption = el.options[el.selectedIndex];
        harvested[matchedKey] = selectedOption?.textContent?.trim() || value;
      } else {
        harvested[matchedKey] = value;
      }
    } else {
      let fieldKey = null;
      if (el.labels && el.labels.length > 0) {
        fieldKey = el.labels[0].innerText.trim();
      } else if (el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) fieldKey = lbl.innerText.trim();
      }
      if (!fieldKey) fieldKey = el.name || el.id || el.placeholder;
      if (!fieldKey) continue;

      fieldKey = fieldKey
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
      
      if (fieldKey) {
        harvested.customFields[fieldKey] = value;
      }
    }
  }

  return harvested;
}

function showCaptureNotification(opts) {
  // Respect the floating badge toggle setting
  chrome.storage.local.get('floatingBadgeEnabled', (pref) => {
    if (pref.floatingBadgeEnabled !== false) renderCaptureNotification(opts);
  });
}

function renderCaptureNotification(opts) {
  const { mode, profileId, profileName, updatedFields, newFields, updatedCustomFields, newCustomFields, totalUpdated, totalNew, harvested } = opts;

  const existing = document.getElementById('neuralfill-capture');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'neuralfill-capture';

  let bodyHTML = '';

  if (mode === 'update') {
    // Build summary line: "Update 3 fields · Add 2 new fields"
    const parts = [];
    if (totalUpdated > 0) parts.push(`<span style="color:#ff9f0a;">Update ${totalUpdated} field${totalUpdated !== 1 ? 's' : ''}</span>`);
    if (totalNew > 0) parts.push(`<span style="color:#30d158;">Add ${totalNew} new field${totalNew !== 1 ? 's' : ''}</span>`);
    const summaryLine = parts.join(' <span style="color:rgba(255,255,255,0.3);">·</span> ');

    // Build field detail pills
    const allChanges = [
      ...(updatedFields || []).map(f => ({ ...f, type: 'updated', isCustom: false })),
      ...(updatedCustomFields || []).map(f => ({ ...f, type: 'updated', isCustom: true })),
      ...(newFields || []).map(f => ({ ...f, type: 'new', isCustom: false })),
      ...(newCustomFields || []).map(f => ({ ...f, type: 'new', isCustom: true })),
    ];

    const pills = allChanges.slice(0, 6).map(f => {
      const label = f.key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
      const bg = f.type === 'updated' ? 'rgba(255,159,10,0.15)' : 'rgba(48,209,88,0.15)';
      const color = f.type === 'updated' ? '#ff9f0a' : '#30d158';
      const icon = f.type === 'updated' ? '↻' : '+';
      return `<span style="display:inline-block;background:${bg};color:${color};padding:2px 8px;border-radius:4px;font-size:11px;margin:2px;">${icon} ${label}</span>`;
    }).join('');
    const moreCount = allChanges.length - 6;
    const moreText = moreCount > 0 ? `<span style="color:rgba(255,255,255,0.35);font-size:11px;margin-left:4px;">+${moreCount} more</span>` : '';

    bodyHTML = `
      <div style="font-weight:600;font-size:14px;color:#fff;">Update "${profileName}"?</div>
      <div style="font-size:12px;margin:6px 0;">${summaryLine}</div>
      <div style="margin:4px 0 10px;line-height:1.8;">${pills}${moreText}</div>
      <div style="display:flex;gap:8px;">
        <button id="nf-cap-update" style="background:#0a84ff;color:#fff;border:none;border-radius:980px;padding:7px 18px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">Update</button>
        <button id="nf-cap-dismiss" style="background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.6);border:1px solid rgba(255,255,255,0.12);border-radius:980px;padding:7px 14px;font-size:12px;cursor:pointer;font-family:inherit;">Dismiss</button>
      </div>
    `;
  } else {
    // New profile mode
    const standardKeys = Object.keys(harvested).filter(k => k !== 'customFields' && harvested[k]);
    const customKeys = Object.keys(harvested.customFields || {});
    const totalFields = standardKeys.length + customKeys.length;

    bodyHTML = `
      <div style="font-weight:600;font-size:14px;color:#fff;">Save as new profile?</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.5);margin:4px 0 8px;">${totalFields} field${totalFields !== 1 ? 's' : ''} captured from this form</div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="nf-cap-name" type="text" placeholder="Profile name" value="${harvested.fullName || 'New Profile'}" style="flex:1;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:7px 10px;font-size:12px;outline:none;font-family:inherit;">
        <button id="nf-cap-save" style="background:#30d158;color:#000;border:none;border-radius:980px;padding:7px 16px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;">Save</button>
        <button id="nf-cap-dismiss" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:16px;cursor:pointer;padding:2px 4px;line-height:1;">✕</button>
      </div>
    `;
  }

  banner.innerHTML = bodyHTML;
  banner.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    background: rgba(28, 28, 30, 0.96);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 18px;
    padding: 14px 18px;
    z-index: 2147483647;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
    animation: nf-slide-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    max-width: 380px;
  `;

  document.body.appendChild(banner);

  // Wire up buttons
  if (mode === 'update') {
    document.getElementById('nf-cap-update').addEventListener('click', () => {
      // Only send the exact fields that changed — not everything
      const standardUpdates = [
        ...(updatedFields || []).map(f => ({ key: f.key, newValue: f.newValue })),
        ...(newFields || []).map(f => ({ key: f.key, newValue: f.newValue }))
      ];
      const customUpdates = {};
      for (const f of (updatedCustomFields || [])) customUpdates[f.key] = f.newValue;
      for (const f of (newCustomFields || [])) customUpdates[f.key] = f.newValue;

      chrome.runtime.sendMessage({
        action: 'update_profile_fields',
        profileId,
        updates: standardUpdates,
        customFields: customUpdates
      }, (res) => {
        if (res?.success) {
          const total = (totalUpdated || 0) + (totalNew || 0);
          showCaptureConfirmation(banner, `✓ "${profileName}" — ${total} field${total !== 1 ? 's' : ''} saved`);
        }
      });
    });
  } else {
    document.getElementById('nf-cap-save').addEventListener('click', () => {
      const name = document.getElementById('nf-cap-name')?.value?.trim() || 'Auto-saved';
      chrome.runtime.sendMessage({
        action: 'create_profile_from_data',
        name,
        harvested
      }, (res) => {
        if (res?.success) {
          showCaptureConfirmation(banner, `✓ Profile "${res.profileName}" created`);
        }
      });
    });
  }

  // Dismiss
  const dismissBtn = document.getElementById('nf-cap-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => dismissCaptureBanner(banner));
  }

  // Auto-dismiss after 12s
  setTimeout(() => {
    if (document.getElementById('neuralfill-capture')) {
      dismissCaptureBanner(banner);
    }
  }, 12000);
}

function showCaptureConfirmation(banner, message) {
  banner.innerHTML = `<div style="font-weight:600;font-size:13px;color:#30d158;">${message}</div>`;
  setTimeout(() => dismissCaptureBanner(banner), 2000);
}

function dismissCaptureBanner(banner) {
  banner.style.animation = 'nf-slide-out 0.25s ease forwards';
  setTimeout(() => banner.remove(), 250);
}

// Initialize Smart Capture
setTimeout(initSmartCapture, 500);

// ═══════════════════════════════════════════════════════════════
// Phase 3 — Long-Form Field Detection + "✦ Generate" Button
// ═══════════════════════════════════════════════════════════════

const LONGFORM_TRIGGERS = [
  'describe', 'description', 'explain', 'tell us', 'tell me', 'summarize',
  'summary', 'overview', 'background', 'experience', 'about you',
  'about yourself', 'bio', 'biography', 'introduction', 'elaborate',
  'professional', 'personal statement', 'cover letter', 'motivation',
  'goals', 'objective', 'achievements', 'accomplishments', 'qualifications',
  'additional', 'comments', 'notes', 'message', 'feedback', 'details',
  'history', 'why do you', 'what makes', 'how have', 'how did',
  'your skills', 'your experience', 'your background',
];

const NF_LONGFORM_ATTR = 'data-nf-longform';

function getLongFormLabel(el) {
  const parts = [];
  if (el.labels && el.labels.length > 0) {
    parts.push(el.labels[0].innerText.trim());
  } else if (el.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lbl) parts.push(lbl.innerText.trim());
  }
  if (el.getAttribute('aria-label')) parts.push(el.getAttribute('aria-label'));
  if (el.placeholder) parts.push(el.placeholder);
  if (el.name) parts.push(el.name.replace(/[_-]/g, ' '));
  return parts.join(' ');
}

function isLongFormField(el) {
  const tag = el.tagName.toLowerCase();
  // All textareas qualify
  if (tag === 'textarea') return true;
  // Only text-type inputs
  if (tag !== 'input') return false;
  const skipTypes = ['hidden','submit','button','password','checkbox','radio',
                     'file','date','time','month','week','number','range',
                     'color','email','tel','url'];
  if (skipTypes.includes(el.type)) return false;

  const text = getLongFormLabel(el).toLowerCase();
  return LONGFORM_TRIGGERS.some(t => text.includes(t));
}

function positionGenerateBtn(btn, el) {
  const rect = el.getBoundingClientRect();
  const btnH = btn.offsetHeight || 24;
  const btnW = btn.offsetWidth  || 96;
  btn.style.top  = `${rect.bottom - btnH - 7 + window.scrollY}px`;
  btn.style.left = `${rect.right  - btnW - 7 + window.scrollX}px`;
}

function injectGenerateBtn(el) {
  if (el.getAttribute(NF_LONGFORM_ATTR)) return;
  el.setAttribute(NF_LONGFORM_ATTR, '1');

  const btn = document.createElement('button');
  btn.setAttribute('data-nf-generate', '1');
  btn.title = 'Generate answer with NeuralFill AI';
  btn.innerHTML = `✦ <span style="letter-spacing:0.02em;">Generate</span>`;
  btn.style.cssText = `
    position: absolute;
    z-index: 2147483646;
    background: rgba(20,20,22,0.9);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 980px;
    color: rgba(255,255,255,0.65);
    padding: 4px 11px;
    font-size: 11px;
    font-weight: 600;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease, transform 0.18s ease, color 0.12s ease, border-color 0.12s ease;
    transform: translateY(5px);
    box-shadow: 0 2px 14px rgba(0,0,0,0.35);
    white-space: nowrap;
    line-height: 1.5;
  `;
  document.body.appendChild(btn);

  function showBtn() {
    positionGenerateBtn(btn, el);
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
    btn.style.transform = 'translateY(0)';
  }

  function hideBtn() {
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
    btn.style.transform = 'translateY(5px)';
  }

  el.addEventListener('focus',      showBtn);
  el.addEventListener('mouseenter', showBtn);
  el.addEventListener('blur',       () => { setTimeout(() => { if (!btn.matches(':hover')) hideBtn(); }, 180); });
  el.addEventListener('mouseleave', () => { if (!btn.matches(':hover') && document.activeElement !== el) hideBtn(); });

  btn.addEventListener('mouseenter', () => {
    btn.style.color = '#5ac8fa';
    btn.style.borderColor = 'rgba(90,200,250,0.4)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.color = 'rgba(255,255,255,0.65)';
    btn.style.borderColor = 'rgba(255,255,255,0.14)';
    if (document.activeElement !== el) hideBtn();
  });

  const reposition = () => { if (btn.style.opacity !== '0') positionGenerateBtn(btn, el); };
  window.addEventListener('scroll', reposition, { passive: true });
  window.addEventListener('resize', reposition, { passive: true });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    triggerGenerate(el, btn);
  });

  // Remove button if field leaves DOM
  const domWatch = new MutationObserver(() => {
    if (!document.body.contains(el)) { btn.remove(); domWatch.disconnect(); }
  });
  domWatch.observe(document.body, { childList: true, subtree: true });
}

// ═══════════════════════════════════════════════════════════════
// Bulk Generate — fill all long-form fields at once
// ═══════════════════════════════════════════════════════════════

function getAllLongFormFields() {
  const candidates = document.querySelectorAll(
    'textarea, input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"])'
  );
  return Array.from(candidates).filter(el => isLongFormField(el));
}

async function generateAllLongFormFields(profileId, answerLength, onProgress) {
  const fields = getAllLongFormFields();
  if (fields.length === 0) return { filled: 0, total: 0, error: 'nofields' };

  const aiReady = await aiEngine.initialize();
  if (!aiReady) return { filled: 0, total: fields.length, error: 'noai' };

  let filled = 0;
  for (let i = 0; i < fields.length; i++) {
    const el = fields[i];
    onProgress && onProgress(i + 1, fields.length);

    const fieldLabel = getLongFormLabel(el) || el.placeholder || 'this field';

    const chunkRes = await new Promise(r =>
      chrome.runtime.sendMessage({ action: 'get_chunks_for_field', profileId, query: fieldLabel, topN: 3 }, r)
    );
    const chunks = chunkRes?.chunks || [];
    const prompt = buildRAGPrompt(fieldLabel, chunks, answerLength || 'medium');
    const { result, error } = await runGeneration(prompt);

    if (result && !error) {
      el.value = result;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      // Teal highlight — signals AI-generated, fades after 5s
      el.style.border = '1.5px solid rgba(90,200,250,0.6)';
      el.style.backgroundColor = 'rgba(90,200,250,0.04)';
      setTimeout(() => { el.style.border = ''; el.style.backgroundColor = ''; }, 5000);
      filled++;
    }
  }

  return { filled, total: fields.length };
}

// ═══════════════════════════════════════════════════════════════
// Phase 4 — RAG Generation + Floating Review Panel
// ═══════════════════════════════════════════════════════════════

function setBtnState(btn, state) {
  const states = {
    idle:        { html: '✦ <span style="letter-spacing:0.02em;">Generate</span>', color: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.14)' },
    loading:     { html: '✦ <span>Generating…</span>',   color: '#5ac8fa',              border: 'rgba(90,200,250,0.35)' },
    locked:      { html: '🔒 <span>Unlock first</span>', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
    noai:        { html: '✦ <span>AI not set up</span>', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
  };
  const s = states[state] || states.idle;
  btn.innerHTML = s.html;
  btn.style.color = s.color;
  btn.style.borderColor = s.border;
}

function buildRAGPrompt(fieldLabel, chunks, answerLength) {
  const lengthInstructions = {
    short:  'Write 1–2 concise sentences.',
    medium: 'Write 3–4 focused sentences.',
    long:   'Write a full paragraph (5–6 sentences).',
  };
  const instruction = lengthInstructions[answerLength] || lengthInstructions.medium;

  const contextBlock = chunks.length > 0
    ? chunks.map((c, i) => `[Context ${i + 1}]\n${c.text}`).join('\n\n')
    : null;

  if (!contextBlock) {
    return `Write a professional answer for this form field: "${fieldLabel}"\n${instruction}\nFirst person. Be specific and concise. Output only the answer text.`;
  }

  return `Form field: "${fieldLabel}"

Relevant background from the user's documents:
${contextBlock}

${instruction} Based only on the provided context. First person. No labels, no markdown. Output only the answer text.`;
}

async function runGeneration(prompt) {
  const aiReady = await aiEngine.initialize();
  if (!aiReady) return { result: null, error: 'noai' };

  const id = ++aiEngine.messageId;
  return new Promise((resolve) => {
    aiEngine.pendingRequests.set(id, (result) => {
      // null means bridge explicitly failed; non-null string (even empty) is a response
      resolve({ result: result ?? null, error: result != null ? null : 'failed' });
    });
    window.postMessage({ source: 'neuralfill-content', type: 'RUN_GENERATE', id, prompt }, '*');
    setTimeout(() => {
      if (aiEngine.pendingRequests.has(id)) {
        aiEngine.pendingRequests.delete(id);
        resolve({ result: null, error: 'timeout' });
      }
    }, 45000);
  });
}

async function triggerGenerate(el, btn) {
  // 1. Lock check
  const lockRes = await new Promise(r => chrome.runtime.sendMessage({ action: 'check_lock' }, r));
  if (!lockRes?.isUnlocked) {
    setBtnState(btn, 'locked');
    setTimeout(() => setBtnState(btn, 'idle'), 2200);
    return;
  }

  // 2. Get active profile
  const profileRes = await new Promise(r => chrome.runtime.sendMessage({ action: 'get_active_profile' }, r));
  if (!profileRes?.success) {
    setBtnState(btn, 'idle');
    return;
  }

  setBtnState(btn, 'loading');

  const fieldLabel = getLongFormLabel(el) || el.placeholder || 'this field';
  const profileId  = profileRes.profile.id;

  // 3. Fetch relevant chunks via TF-IDF
  const chunkRes = await new Promise(r =>
    chrome.runtime.sendMessage({ action: 'get_chunks_for_field', profileId, query: fieldLabel, topN: 3 }, r)
  );
  const chunks = chunkRes?.chunks || [];

  // 4. Read answer length setting and build prompt
  const { answerLength } = await new Promise(r => chrome.storage.local.get('answerLength', r));
  const prompt = buildRAGPrompt(fieldLabel, chunks, answerLength || 'medium');
  const { result, error } = await runGeneration(prompt);
  console.log('[NeuralFill Generate] chunks:', chunks.length, '| error:', error, '| result length:', result?.length);

  setBtnState(btn, 'idle');

  if (error === 'noai') {
    showReviewPanel(el, btn, null, fieldLabel, chunks, 'noai');
    return;
  }
  if (!result || result.startsWith('ERROR:')) {
    showReviewPanel(el, btn, null, fieldLabel, chunks, 'failed');
    return;
  }

  showReviewPanel(el, btn, result, fieldLabel, chunks, 'ok');
}

// ── Floating Review Panel ─────────────────────────────────────────

let activeReviewPanel = null;

function showReviewPanel(el, btn, generatedText, fieldLabel, chunks, status) {
  // Remove any existing panel
  if (activeReviewPanel) { activeReviewPanel.remove(); activeReviewPanel = null; }

  const panel = document.createElement('div');
  panel.id = 'nf-review-panel';
  activeReviewPanel = panel;

  // ── Content ──
  let bodyHTML = '';

  if (status === 'noai') {
    bodyHTML = `
      <div class="nf-rp-header">
        <span class="nf-rp-title">✦ NeuralFill</span>
        <button class="nf-rp-close" id="nf-rp-close">✕</button>
      </div>
      <div class="nf-rp-error">
        <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:6px;">Gemini Nano not set up</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">Enable Gemini Nano in the NeuralFill extension settings to generate answers.</div>
      </div>`;
  } else if (status === 'failed' || !generatedText) {
    const noDocsMsg = chunks.length === 0
      ? 'Upload your resume or bio to the Knowledge Base so NeuralFill has context to draw from.'
      : 'Generation failed. Try again or check that Gemini Nano is enabled.';
    bodyHTML = `
      <div class="nf-rp-header">
        <span class="nf-rp-title">✦ NeuralFill</span>
        <button class="nf-rp-close" id="nf-rp-close">✕</button>
      </div>
      <div class="nf-rp-error">
        <div style="font-size:13px;font-weight:600;color:#fff;margin-bottom:6px;">${chunks.length === 0 ? 'No documents found' : 'Generation failed'}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.5;">${noDocsMsg}</div>
      </div>`;
  } else {
    bodyHTML = `
      <div class="nf-rp-header">
        <span class="nf-rp-title">✦ NeuralFill</span>
        <span class="nf-rp-meta">${chunks.length} source${chunks.length !== 1 ? 's' : ''} used</span>
        <button class="nf-rp-close" id="nf-rp-close">✕</button>
      </div>
      <textarea class="nf-rp-textarea" id="nf-rp-text" spellcheck="true"></textarea>
      <div class="nf-rp-actions">
        <button class="nf-rp-btn-secondary" id="nf-rp-regen">↺ Regenerate</button>
        <button class="nf-rp-btn-primary"   id="nf-rp-insert">Insert →</button>
      </div>`;
  }

  panel.innerHTML = bodyHTML;

  // Set textarea value safely (avoids innerHTML injection if text contains HTML)
  if (status === 'ok' && generatedText) {
    const ta = panel.querySelector('#nf-rp-text');
    if (ta) ta.value = generatedText;
  }

  panel.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    width: 380px;
    background: rgba(24,24,26,0.97);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(255,255,255,0.13);
    border-radius: 18px;
    box-shadow: 0 12px 48px rgba(0,0,0,0.55), 0 2px 10px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif;
    overflow: hidden;
    animation: nf-slide-in 0.28s cubic-bezier(0.34,1.56,0.64,1);
  `;

  // Inject panel-specific styles once
  if (!document.getElementById('nf-rp-styles')) {
    const style = document.createElement('style');
    style.id = 'nf-rp-styles';
    style.textContent = `
      #nf-review-panel .nf-rp-header {
        display: flex; align-items: center; gap: 8px;
        padding: 13px 16px 10px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
      }
      #nf-review-panel .nf-rp-title {
        font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.9);
        letter-spacing: 0.02em; flex: 1;
      }
      #nf-review-panel .nf-rp-meta {
        font-size: 11px; color: rgba(255,255,255,0.35);
      }
      #nf-review-panel .nf-rp-close {
        background: none; border: none; color: rgba(255,255,255,0.35);
        font-size: 15px; cursor: pointer; padding: 0 2px; line-height: 1;
        transition: color 0.15s;
      }
      #nf-review-panel .nf-rp-close:hover { color: rgba(255,255,255,0.7); }
      #nf-review-panel .nf-rp-textarea {
        display: block; width: 100%; box-sizing: border-box;
        min-height: 110px; max-height: 220px;
        background: rgba(255,255,255,0.04);
        color: rgba(255,255,255,0.88);
        border: none; border-bottom: 1px solid rgba(255,255,255,0.07);
        padding: 12px 16px; font-size: 13px; line-height: 1.6;
        font-family: inherit; resize: vertical; outline: none;
      }
      #nf-review-panel .nf-rp-actions {
        display: flex; align-items: center; justify-content: flex-end;
        gap: 8px; padding: 10px 14px;
      }
      #nf-review-panel .nf-rp-btn-secondary {
        background: rgba(255,255,255,0.07);
        color: rgba(255,255,255,0.55);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 980px; padding: 6px 14px;
        font-size: 12px; font-weight: 600; cursor: pointer;
        font-family: inherit; transition: background 0.15s, color 0.15s;
      }
      #nf-review-panel .nf-rp-btn-secondary:hover {
        background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.8);
      }
      #nf-review-panel .nf-rp-btn-primary {
        background: #0a84ff; color: #fff;
        border: none; border-radius: 980px; padding: 6px 18px;
        font-size: 12px; font-weight: 700; cursor: pointer;
        font-family: inherit; transition: background 0.15s;
      }
      #nf-review-panel .nf-rp-btn-primary:hover { background: #409cff; }
      #nf-review-panel .nf-rp-error {
        padding: 14px 16px 16px;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(panel);
  positionReviewPanel(panel, el);

  // Keep panel above field on scroll/resize
  const repos = () => positionReviewPanel(panel, el);
  window.addEventListener('scroll', repos, { passive: true });
  window.addEventListener('resize', repos, { passive: true });

  function dismiss() {
    window.removeEventListener('scroll', repos);
    window.removeEventListener('resize', repos);
    panel.style.animation = 'nf-slide-out 0.2s ease forwards';
    setTimeout(() => { panel.remove(); if (activeReviewPanel === panel) activeReviewPanel = null; }, 220);
  }

  // Close button
  document.getElementById('nf-rp-close').addEventListener('click', dismiss);

  // Insert button
  const insertBtn = document.getElementById('nf-rp-insert');
  if (insertBtn) {
    insertBtn.addEventListener('click', () => {
      const text = document.getElementById('nf-rp-text')?.value || generatedText;
      el.value = text;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.style.border = '1.5px solid rgba(90,200,250,0.5)';
      setTimeout(() => { el.style.border = ''; }, 1800);
      dismiss();
    });
  }

  // Regenerate button
  const regenBtn = document.getElementById('nf-rp-regen');
  if (regenBtn) {
    regenBtn.addEventListener('click', async () => {
      regenBtn.innerHTML = '↺ Regenerating…';
      regenBtn.disabled = true;
      const { answerLength: al } = await new Promise(r => chrome.storage.local.get('answerLength', r));
      const p = buildRAGPrompt(fieldLabel, chunks, al || 'medium');
      const { result: newResult, error: newError } = await runGeneration(p);
      dismiss();
      showReviewPanel(el, btn, newResult, fieldLabel, chunks, newError ? 'failed' : 'ok');
    });
  }

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function outsideClick(e) {
      if (!panel.contains(e.target) && e.target !== btn && e.target !== el) {
        dismiss();
        document.removeEventListener('click', outsideClick);
      }
    });
  }, 100);
}

function positionReviewPanel(panel, el) {
  const rect   = el.getBoundingClientRect();
  const ph     = panel.offsetHeight || 220;
  const pw     = panel.offsetWidth  || 380;
  const margin = 10;

  // position: fixed — coords are viewport-relative, do NOT add scrollY/scrollX
  let top;
  if (rect.top - ph - margin > 0) {
    top = rect.top - ph - margin;
  } else {
    top = rect.bottom + margin;
  }
  // Clamp vertically to viewport
  if (top < margin) top = margin;
  if (top + ph > window.innerHeight - margin) top = window.innerHeight - ph - margin;

  // Align right edge with field, clamp horizontally
  let left = rect.right - pw;
  if (left < margin) left = margin;
  if (left + pw > window.innerWidth - margin) left = window.innerWidth - pw - margin;

  panel.style.top  = `${top}px`;
  panel.style.left = `${left}px`;
}

let _lfScanPending = false;
function scanForLongFormFields() {
  if (_lfScanPending) return;
  _lfScanPending = true;
  setTimeout(() => {
    _lfScanPending = false;
    const candidates = document.querySelectorAll(
      `textarea:not([${NF_LONGFORM_ATTR}]),` +
      `input:not([${NF_LONGFORM_ATTR}]):not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"])`
    );
    for (const el of candidates) {
      if (isLongFormField(el)) injectGenerateBtn(el);
    }
  }, 150);
}

function initLongFormDetection() {
  if (window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'chrome:') return;

  scanForLongFormFields();

  // Re-scan when the DOM changes (single-page apps, dynamic forms)
  const observer = new MutationObserver(scanForLongFormFields);
  observer.observe(document.body, { childList: true, subtree: true });

  // Keyboard shortcut: Cmd+Shift+G (Mac) / Ctrl+Shift+G (Win/Linux)
  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    if (!modKey || !e.shiftKey || e.key.toLowerCase() !== 'g') return;

    const focused = document.activeElement;
    if (!focused) return;
    if (!isLongFormField(focused)) return;

    e.preventDefault();

    // Find the injected generate button for this field
    const btn = document.querySelector(`[data-nf-generate="1"]`);
    if (btn) {
      triggerGenerate(focused, btn);
    } else {
      // Field was detected but button not yet injected — inject now then trigger
      injectGenerateBtn(focused);
      setTimeout(() => {
        const b = document.querySelector(`[data-nf-generate="1"]`);
        if (b) triggerGenerate(focused, b);
      }, 50);
    }
  });
}

setTimeout(initLongFormDetection, 2000);

