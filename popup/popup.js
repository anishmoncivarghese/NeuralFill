import { ProfileManager } from '../utils/profileManager.js';
import { DocumentManager } from '../utils/documentManager.js';

document.addEventListener('DOMContentLoaded', async () => {

  // ── Views ──────────────────────────────────────────────────────────
  const lockView        = document.getElementById('lockView');
  const pinSetupView    = document.getElementById('pinSetupView');
  const mainView        = document.getElementById('mainView');
  const editProfileView = document.getElementById('editProfileView');
  const scanResultsView   = document.getElementById('scanResultsView');
  const aiSetupView       = document.getElementById('aiSetupView');
  const knowledgeBaseView = document.getElementById('knowledgeBaseView');
  const historyView       = document.getElementById('historyView');
  const statusText        = document.getElementById('statusText');

  // ── Lock View Elements ─────────────────────────────────────────────
  const lockPinInput  = document.getElementById('lockPinInput');
  const lockPinDots   = document.getElementById('lockPinDots');
  const lockPinError  = document.getElementById('lockPinError');
  const unlockBtn     = document.getElementById('unlockBtn');
  const lockNowBtn    = document.getElementById('lockNowBtn');

  // ── PIN Setup View Elements ────────────────────────────────────────
  const setupPinInput   = document.getElementById('setupPinInput');
  const setupPinDots    = document.getElementById('setupPinDots');
  const pinSetupNextBtn = document.getElementById('pinSetupNextBtn');
  const pinSetupError   = document.getElementById('pinSetupError');
  const pinSetupTitle   = document.getElementById('pinSetupTitle');
  const pinSetupSubtitle= document.getElementById('pinSetupSubtitle');

  // ── Knowledge Base View Elements ───────────────────────────────────
  const kbBtn            = document.getElementById('kbBtn');
  const backFromKbBtn    = document.getElementById('backFromKbBtn');
  const kbProfileLabel   = document.getElementById('kbProfileLabel');
  const kbUploadZone     = document.getElementById('kbUploadZone');
  const kbFileInput      = document.getElementById('kbFileInput');
  const kbProcessing     = document.getElementById('kbProcessing');
  const kbProcessingLabel= document.getElementById('kbProcessingLabel');
  const kbUploadError    = document.getElementById('kbUploadError');
  const kbDocCount       = document.getElementById('kbDocCount');
  const kbStorageUsed    = document.getElementById('kbStorageUsed');
  const kbDocList        = document.getElementById('kbDocList');
  const kbEmptyState     = document.getElementById('kbEmptyState');

  // ── Main View Elements ─────────────────────────────────────────────
  const fillNowBtn        = document.getElementById('fillNowBtn');
  const previewFillBtn    = document.getElementById('previewFillBtn');
  const generateTextBtn   = document.getElementById('generateTextBtn');
  const scanLearnBtn      = document.getElementById('scanLearnBtn');
  const historyBtn          = document.getElementById('historyBtn');
  const backFromHistoryBtn  = document.getElementById('backFromHistoryBtn');
  const siteBindingRow      = document.getElementById('siteBindingRow');
  const siteBindingDomain   = document.getElementById('siteBindingDomain');
  const siteBindingSelect   = document.getElementById('siteBindingSelect');
  const siteBindingSaveBtn  = document.getElementById('siteBindingSaveBtn');
  const siteBindingClearBtn = document.getElementById('siteBindingClearBtn');
  const historyList       = document.getElementById('historyList');
  const historyEmpty      = document.getElementById('historyEmpty');
  const clearHistoryBtn   = document.getElementById('clearHistoryBtn');
  const aiToggle          = document.getElementById('aiToggle');
  const badgeToggle       = document.getElementById('badgeToggle');
  const answerLengthSelect= document.getElementById('answerLengthSelect');
  const profileSelect   = document.getElementById('profileSelect');
  const editProfilesBtn = document.getElementById('editProfilesBtn');
  const aiToggleGroup   = document.getElementById('aiToggleGroup');
  const aiSetupPrompt   = document.getElementById('aiSetupPrompt');
  const showAiSetupBtn  = document.getElementById('showAiSetupBtn');

  // ── AI Setup View Elements ─────────────────────────────────────────
  const backFromAiSetupBtn = document.getElementById('backFromAiSetupBtn');
  const checkAiStatusBtn   = document.getElementById('checkAiStatusBtn');

  // ── Edit Profile View Elements ─────────────────────────────────────
  const backToMainBtn      = document.getElementById('backToMainBtn');
  const profileList        = document.getElementById('profileList');
  const newProfileName     = document.getElementById('newProfileName');
  const addProfileBtn      = document.getElementById('addProfileBtn');
  const profileEditor      = document.getElementById('profileEditor');
  const editProfileName    = document.getElementById('editProfileName');
  const saveProfileDataBtn  = document.getElementById('saveProfileDataBtn');
  const deleteProfileBtn    = document.getElementById('deleteProfileBtn');
  const exportProfileBtn    = document.getElementById('exportProfileBtn');
  const importProfileInput  = document.getElementById('importProfileInput');

  // ── Profile Form Inputs ────────────────────────────────────────────
  const editFullName  = document.getElementById('editFullName');
  const editEmail     = document.getElementById('editEmail');
  const editPhone     = document.getElementById('editPhone');
  const editDob       = document.getElementById('editDob');
  const editStreet    = document.getElementById('editStreet');
  const editCity      = document.getElementById('editCity');
  const editState     = document.getElementById('editState');
  const editZip       = document.getElementById('editZip');
  const editCountry   = document.getElementById('editCountry');
  const editJobTitle  = document.getElementById('editJobTitle');
  const editCompany   = document.getElementById('editCompany');
  const editLinkedIn  = document.getElementById('editLinkedIn');
  const editGithub    = document.getElementById('editGithub');
  const editTwitter   = document.getElementById('editTwitter');
  const editWebsite   = document.getElementById('editWebsite');
  const customFieldsList    = document.getElementById('miscFieldsList');
  const customFieldsSection = document.getElementById('miscSection');
  const miscKeyInput        = document.getElementById('miscKeyInput');
  const miscValueInput      = document.getElementById('miscValueInput');
  const miscAddBtn          = document.getElementById('miscAddBtn');

  // ── Scan Results Elements ──────────────────────────────────────────
  const backFromScanBtn = document.getElementById('backFromScanBtn');
  const scanResultsList = document.getElementById('scanResultsList');
  const confirmScanBtn  = document.getElementById('confirmScanBtn');
  const discardScanBtn  = document.getElementById('discardScanBtn');

  // ── State ──────────────────────────────────────────────────────────
  let profiles = [];
  let currentEditingProfileId = null;
  let pendingScanResults = [];
  let pinSetupFirstEntry = null; // stores first PIN during two-step setup

  // ══════════════════════════════════════════════════════════════════
  // View Router
  // ══════════════════════════════════════════════════════════════════

  const allViews = [lockView, pinSetupView, mainView,
                    editProfileView, scanResultsView, aiSetupView, knowledgeBaseView, historyView];

  function showView(view) {
    allViews.forEach(v => v.classList.add('hidden'));
    view.classList.remove('hidden');
  }

  // ══════════════════════════════════════════════════════════════════
  // Initialization
  // ══════════════════════════════════════════════════════════════════

  chrome.storage.local.get(['encryptionKey', 'pinHash'], async (result) => {
    // First run — key not yet generated (edge case: popup opened before onInstalled finished)
    if (!result.encryptionKey) {
      await chrome.runtime.sendMessage({ action: 'auto_setup' });
    }

    if (!result.pinHash) {
      // No PIN set yet — first-time setup
      showView(pinSetupView);
      statusText.innerText = 'Set a PIN';
      setTimeout(() => setupPinInput.focus(), 100);
      return;
    }

    // PIN exists — check session lock
    chrome.runtime.sendMessage({ action: 'check_lock' }, async (response) => {
      if (response?.isUnlocked) {
        await enterMainView();
      } else {
        showView(lockView);
        statusText.innerText = 'Locked';
        lockNowBtn.classList.add('hidden');
        setTimeout(() => lockPinInput.focus(), 100);
      }
    });
  });

  async function enterMainView() {
    showView(mainView);
    lockNowBtn.classList.remove('hidden');
    await loadProfiles();
    await checkAiAvailability();
    await loadBadgeSetting();
    await loadSiteBinding();
    statusText.innerText = 'Ready';
  }

  async function loadBadgeSetting() {
    const result = await chrome.storage.local.get(['floatingBadgeEnabled', 'answerLength']);
    badgeToggle.checked = result.floatingBadgeEnabled !== false;
    answerLengthSelect.value = result.answerLength || 'medium';
  }

  badgeToggle.addEventListener('change', () => {
    chrome.storage.local.set({ floatingBadgeEnabled: badgeToggle.checked });
  });

  answerLengthSelect.addEventListener('change', () => {
    chrome.storage.local.set({ answerLength: answerLengthSelect.value });
  });

  // ══════════════════════════════════════════════════════════════════
  // Per-Site Profile Binding
  // ══════════════════════════════════════════════════════════════════

  let currentTabDomain = null;

  async function loadSiteBinding() {
    const tabs = await new Promise(r => chrome.tabs.query({ active: true, currentWindow: true }, r));
    const tab = tabs?.[0];
    if (!tab?.url) { siteBindingRow.classList.add('hidden'); return; }

    let domain = '';
    try { domain = new URL(tab.url).hostname.replace(/^www\./, ''); } catch { }
    if (!domain || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      siteBindingRow.classList.add('hidden');
      return;
    }

    currentTabDomain = domain;
    siteBindingDomain.textContent = `Always use on ${domain}`;
    siteBindingRow.classList.remove('hidden');

    // Populate binding profile select
    siteBindingSelect.innerHTML = profiles.map(p =>
      `<option value="${p.id}">${p.name}</option>`
    ).join('');

    // Load existing binding
    const { siteBindings } = await chrome.storage.local.get('siteBindings');
    const bound = siteBindings?.[domain];
    if (bound) {
      siteBindingSelect.value = bound;
      siteBindingClearBtn.style.display = '';
      siteBindingSaveBtn.textContent = 'Update';
    } else {
      siteBindingSelect.value = profileSelect.value;
      siteBindingClearBtn.style.display = 'none';
      siteBindingSaveBtn.textContent = 'Bind';
    }
  }

  siteBindingSaveBtn.addEventListener('click', async () => {
    if (!currentTabDomain) return;
    const { siteBindings } = await chrome.storage.local.get('siteBindings');
    const bindings = siteBindings || {};
    bindings[currentTabDomain] = siteBindingSelect.value;
    await chrome.storage.local.set({ siteBindings: bindings });
    siteBindingClearBtn.style.display = '';
    siteBindingSaveBtn.textContent = 'Update';
    // Also switch active profile in the main select
    profileSelect.value = siteBindingSelect.value;
    await chrome.storage.local.set({ settings: { ...(await chrome.storage.local.get('settings')).settings, activeProfileId: siteBindingSelect.value } });
    statusText.innerText = `Bound to ${currentTabDomain}`;
  });

  siteBindingClearBtn.addEventListener('click', async () => {
    if (!currentTabDomain) return;
    const { siteBindings } = await chrome.storage.local.get('siteBindings');
    const bindings = siteBindings || {};
    delete bindings[currentTabDomain];
    await chrome.storage.local.set({ siteBindings: bindings });
    siteBindingClearBtn.style.display = 'none';
    siteBindingSaveBtn.textContent = 'Bind';
    statusText.innerText = `Binding removed for ${currentTabDomain}`;
  });

  // ══════════════════════════════════════════════════════════════════
  // PIN Dot Helpers
  // ══════════════════════════════════════════════════════════════════

  function updateDots(container, count, isError = false) {
    const dots = container.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < count && !isError);
      dot.classList.toggle('error', i < count && isError);
    });
  }

  function shakeDots(container) {
    container.style.animation = 'nf-shake 0.4s var(--ease)';
    setTimeout(() => { container.style.animation = ''; }, 420);
  }

  // ══════════════════════════════════════════════════════════════════
  // Lock Screen Logic
  // ══════════════════════════════════════════════════════════════════

  lockPinDots.addEventListener('click', () => lockPinInput.focus());

  lockPinInput.addEventListener('input', () => {
    const val = lockPinInput.value.replace(/\D/g, '');
    lockPinInput.value = val;
    updateDots(lockPinDots, val.length);
    lockPinError.classList.add('hidden');
    unlockBtn.disabled = val.length < 4;
    if (val.length === 6) attemptUnlock();
  });

  lockPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !unlockBtn.disabled) attemptUnlock();
  });

  unlockBtn.addEventListener('click', attemptUnlock);

  async function attemptUnlock() {
    const pin = lockPinInput.value.trim();
    if (pin.length < 4) return;

    unlockBtn.disabled = true;
    unlockBtn.textContent = 'Verifying…';

    chrome.runtime.sendMessage({ action: 'unlock', pin }, async (response) => {
      if (response?.success) {
        lockPinInput.value = '';
        updateDots(lockPinDots, 0);
        await enterMainView();
      } else {
        updateDots(lockPinDots, lockPinInput.value.length, true);
        shakeDots(lockPinDots);
        lockPinError.classList.remove('hidden');
        lockPinInput.value = '';
        updateDots(lockPinDots, 0);
        unlockBtn.disabled = true;
        unlockBtn.textContent = 'Unlock';
        setTimeout(() => lockPinInput.focus(), 100);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // PIN Setup Logic (two-step: enter → confirm)
  // ══════════════════════════════════════════════════════════════════

  setupPinDots.addEventListener('click', () => setupPinInput.focus());

  setupPinInput.addEventListener('input', () => {
    const val = setupPinInput.value.replace(/\D/g, '');
    setupPinInput.value = val;
    updateDots(setupPinDots, val.length);
    pinSetupError.classList.add('hidden');
    pinSetupNextBtn.disabled = val.length < 4;
    if (val.length === 6 && pinSetupFirstEntry === null) advancePinSetup();
    else if (val.length === 6 && pinSetupFirstEntry !== null) confirmPin();
  });

  setupPinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !pinSetupNextBtn.disabled) {
      if (pinSetupFirstEntry === null) advancePinSetup();
      else confirmPin();
    }
  });

  pinSetupNextBtn.addEventListener('click', () => {
    if (pinSetupFirstEntry === null) advancePinSetup();
    else confirmPin();
  });

  function advancePinSetup() {
    pinSetupFirstEntry = setupPinInput.value.trim();
    // Step 2 — confirm
    pinSetupTitle.textContent = 'Confirm your PIN';
    pinSetupSubtitle.textContent = 'Enter the same PIN again to confirm.';
    pinSetupNextBtn.textContent = 'Set PIN';
    setupPinInput.value = '';
    updateDots(setupPinDots, 0);
    pinSetupNextBtn.disabled = true;
    setTimeout(() => setupPinInput.focus(), 100);
  }

  async function confirmPin() {
    const confirmedPin = setupPinInput.value.trim();
    if (confirmedPin !== pinSetupFirstEntry) {
      updateDots(setupPinDots, confirmedPin.length, true);
      shakeDots(setupPinDots);
      pinSetupError.classList.remove('hidden');
      setupPinInput.value = '';
      updateDots(setupPinDots, 0);
      pinSetupNextBtn.disabled = true;
      // Reset to step 1
      pinSetupFirstEntry = null;
      pinSetupTitle.textContent = 'Set a PIN';
      pinSetupSubtitle.textContent = 'Protects your profiles and data. Required before every form fill.';
      pinSetupNextBtn.textContent = 'Continue';
      setTimeout(() => setupPinInput.focus(), 100);
      return;
    }

    pinSetupNextBtn.disabled = true;
    pinSetupNextBtn.textContent = 'Saving…';

    chrome.runtime.sendMessage({ action: 'save_pin', pin: confirmedPin }, async (response) => {
      if (response?.success) {
        await enterMainView();
      } else {
        pinSetupNextBtn.textContent = 'Set PIN';
        pinSetupNextBtn.disabled = false;
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Lock Now Button
  // ══════════════════════════════════════════════════════════════════

  lockNowBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'lock' }, () => {
      lockPinInput.value = '';
      updateDots(lockPinDots, 0);
      lockPinError.classList.add('hidden');
      unlockBtn.disabled = true;
      unlockBtn.textContent = 'Unlock';
      lockNowBtn.classList.add('hidden');
      showView(lockView);
      statusText.innerText = 'Locked';
      setTimeout(() => lockPinInput.focus(), 100);
    });
  });

  // Add shake keyframe to page if not already added
  if (!document.getElementById('nf-pin-styles')) {
    const style = document.createElement('style');
    style.id = 'nf-pin-styles';
    style.textContent = `
      @keyframes nf-shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-6px); }
        40% { transform: translateX(6px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
      }
    `;
    document.head.appendChild(style);
  }

  // ══════════════════════════════════════════════════════════════════
  // AI Availability Check
  // ══════════════════════════════════════════════════════════════════

  async function checkAiAvailability() {
    // ── Populate requirements checker ──────────────────────────────
    function setReq(rowId, valId, pass, valueText) {
      const row = document.getElementById(rowId);
      const val = document.getElementById(valId);
      if (!row || !val) return;
      row.classList.remove('ai-req-pass', 'ai-req-fail');
      row.classList.add(pass ? 'ai-req-pass' : 'ai-req-fail');
      row.querySelector('.ai-req-icon').textContent = pass ? '✓' : '✗';
      val.textContent = valueText;
    }

    // Chrome version
    const chromeMatch = navigator.userAgent.match(/Chrome\/(\d+)/);
    const chromeVersion = chromeMatch ? parseInt(chromeMatch[1]) : 0;
    setReq('reqChrome', 'reqChromeVal',
      chromeVersion >= 138,
      chromeVersion > 0 ? `Chrome ${chromeVersion} ${chromeVersion >= 138 ? '✓' : '— update required'}` : 'Unknown'
    );

    // Platform
    const isArm = navigator.userAgent.includes('arm64') ||
                  navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 ||
                  /Mac/.test(navigator.platform);
    setReq('reqPlatform', 'reqPlatformVal',
      isArm,
      isArm ? 'Mac detected ✓' : 'Platform may not be supported'
    );

    // Model availability — ask content script
    let supported = false;
    let modelStatus = 'Not detected';
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      try {
        const response = await new Promise(resolve => {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'check_ai_status' }, (res) => {
            if (chrome.runtime.lastError) resolve(null);
            else resolve(res);
          });
        });
        supported = response?.ready === true;
        if (supported) {
          modelStatus = 'Ready ✓';
        } else if (response?.status === 'downloadable') {
          modelStatus = 'Needs download — wait 15–30 min after relaunch';
        } else if (response?.status === 'downloading') {
          modelStatus = 'Downloading now — wait a few minutes…';
        } else {
          modelStatus = 'Unavailable — check flags & disk space';
        }
      } catch (e) {
        modelStatus = 'Could not check — open a webpage first';
      }
    } else {
      modelStatus = 'Open a webpage then check again';
    }
    setReq('reqModel', 'reqModelVal', supported, modelStatus);

    // Update toggle state
    if (!supported) {
      aiToggle.checked = false;
      aiToggleGroup.style.opacity = '0.5';
      aiSetupPrompt.classList.remove('hidden');
    } else {
      aiToggle.checked = true;
      aiToggle.disabled = false;
      aiToggleGroup.style.opacity = '1';
      aiSetupPrompt.classList.add('hidden');
    }

    return supported;
  }

  // ══════════════════════════════════════════════════════════════════
  // Profile Helpers
  // ══════════════════════════════════════════════════════════════════

  async function loadProfiles() {
    profiles = await ProfileManager.getProfiles();
    renderProfileSelect();
    renderProfileList();
  }

  function renderProfileSelect() {
    profileSelect.innerHTML = '';
    if (profiles.length === 0) {
      profileSelect.innerHTML = '<option value="">No profiles found</option>';
      return;
    }
    profiles.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      profileSelect.appendChild(opt);
    });
  }

  function renderProfileList() {
    profileList.innerHTML = '';
    if (profiles.length === 0) {
      profileList.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-tertiary);font-size:13px;">No profiles yet. Add one below.</div>';
      return;
    }
    profiles.forEach(p => {
      const div = document.createElement('div');
      div.className = `profile-item ${p.id === currentEditingProfileId ? 'active' : ''}`;
      div.textContent = p.name;
      div.addEventListener('click', () => openEditor(p.id));
      profileList.appendChild(div);
    });
  }

  function openEditor(profileId) {
    currentEditingProfileId = profileId;
    renderProfileList();
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;

    editProfileName.value = profile.name;
    editFullName.value  = profile.data.fullName  || '';
    editEmail.value     = profile.data.email     || '';
    editPhone.value     = profile.data.phone     || '';
    editDob.value       = profile.data.dob       || '';
    editStreet.value    = profile.data.street    || '';
    editCity.value      = profile.data.city      || '';
    editState.value     = profile.data.state     || '';
    editZip.value       = profile.data.zip       || '';
    editCountry.value   = profile.data.country   || '';
    editJobTitle.value  = profile.data.jobTitle  || '';
    editCompany.value   = profile.data.company   || '';
    editLinkedIn.value  = profile.data.linkedIn  || '';
    editGithub.value    = profile.data.github    || '';
    editTwitter.value   = profile.data.twitter   || '';
    editWebsite.value   = profile.data.website   || '';

    renderCustomFields(profile);
    profileEditor.classList.remove('hidden');
  }

  function keyToLabel(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
  }

  function addMiscFieldRow(key, val) {
    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-top:6px;';

    const label = document.createElement('label');
    label.textContent = keyToLabel(key);
    label.style.cssText = 'flex:1;margin:0;font-size:13px;';

    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.title = 'Remove this field';
    delBtn.className = 'delete-field-btn';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = val || '';
    input.className = 'profile-input custom-field-input';
    input.dataset.customKey = key;

    delBtn.addEventListener('click', () => { labelRow.remove(); input.remove(); });

    labelRow.appendChild(label);
    labelRow.appendChild(delBtn);
    customFieldsList.appendChild(labelRow);
    customFieldsList.appendChild(input);
  }

  function renderCustomFields(profile) {
    const customFields = profile.data.customFields || {};
    customFieldsList.innerHTML = '';
    Object.entries(customFields).forEach(([key, val]) => addMiscFieldRow(key, val));
  }

  function renderScanResults(discovered) {
    scanResultsList.innerHTML = '';
    discovered.forEach((item, idx) => {
      const labelRow = document.createElement('div');
      labelRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;';

      const label = document.createElement('label');
      label.textContent = item.displayLabel || keyToLabel(item.key);
      label.style.cssText = 'flex:1;margin:0;color:var(--teal);';

      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.className = 'delete-field-btn';
      delBtn.addEventListener('click', () => {
        discovered.splice(idx, 1);
        if (discovered.length === 0) { backFromScanBtn.click(); return; }
        renderScanResults(discovered);
      });

      labelRow.appendChild(label);
      labelRow.appendChild(delBtn);

      const input = document.createElement('input');
      input.type = 'text';
      input.value = item.value;
      input.className = 'profile-input';
      input.dataset.scanIdx = idx;

      scanResultsList.appendChild(labelRow);
      scanResultsList.appendChild(input);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // View Navigation
  // ══════════════════════════════════════════════════════════════════

  editProfilesBtn.addEventListener('click', () => {
    showView(editProfileView);
    currentEditingProfileId = null;
    profileEditor.classList.add('hidden');
    renderProfileList();
  });

  backToMainBtn.addEventListener('click', () => {
    showView(mainView);
    renderProfileSelect();
  });

  showAiSetupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    showView(aiSetupView);
  });

  backFromAiSetupBtn.addEventListener('click', () => showView(mainView));

  backFromScanBtn.addEventListener('click', () => {
    showView(mainView);
    pendingScanResults = [];
  });

  checkAiStatusBtn.addEventListener('click', async () => {
    checkAiStatusBtn.innerText = 'Checking…';
    await checkAiAvailability();
    if (!aiToggle.disabled) {
      checkAiStatusBtn.innerText = 'Success!';
      setTimeout(() => backFromAiSetupBtn.click(), 1000);
    } else {
      checkAiStatusBtn.innerText = 'Not found — check components & restart';
      setTimeout(() => { checkAiStatusBtn.innerText = 'Check AI Status Again'; }, 2500);
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // Profile CRUD
  // ══════════════════════════════════════════════════════════════════

  addProfileBtn.addEventListener('click', async () => {
    const name = newProfileName.value.trim();
    if (!name) return;
    const newProfile = ProfileManager.createEmptyProfile(name);
    profiles.push(newProfile);
    await ProfileManager.saveProfiles(profiles);
    newProfileName.value = '';
    renderProfileList();
    openEditor(newProfile.id);
  });

  saveProfileDataBtn.addEventListener('click', async () => {
    if (!currentEditingProfileId) return;
    const index = profiles.findIndex(p => p.id === currentEditingProfileId);
    if (index === -1) return;

    const updatedName = editProfileName.value.trim();
    if (updatedName) profiles[index].name = updatedName;

    const customFields = {};
    document.querySelectorAll('.custom-field-input').forEach(input => {
      const key = input.dataset.customKey;
      const val = input.value.trim();
      if (key && val) customFields[key] = val;
    });

    profiles[index].data = {
      fullName: editFullName.value.trim(),
      email:    editEmail.value.trim(),
      phone:    editPhone.value.trim(),
      dob:      editDob.value.trim(),
      street:   editStreet.value.trim(),
      city:     editCity.value.trim(),
      state:    editState.value.trim(),
      zip:      editZip.value.trim(),
      country:  editCountry.value.trim(),
      jobTitle: editJobTitle.value.trim(),
      company:  editCompany.value.trim(),
      linkedIn: editLinkedIn.value.trim(),
      github:   editGithub.value.trim(),
      twitter:  editTwitter.value.trim(),
      website:  editWebsite.value.trim(),
      customFields
    };

    const success = await ProfileManager.saveProfiles(profiles);
    if (success) {
      renderProfileList();
      renderProfileSelect();
      const originalText = saveProfileDataBtn.innerText;
      saveProfileDataBtn.innerText = 'Saved!';
      setTimeout(() => { saveProfileDataBtn.innerText = originalText; }, 1500);
    }
  });

  miscAddBtn.addEventListener('click', () => {
    const key = miscKeyInput.value.trim();
    const val = miscValueInput.value.trim();
    if (!key) {
      miscKeyInput.focus();
      miscKeyInput.style.borderColor = 'rgba(255,69,58,0.6)';
      setTimeout(() => { miscKeyInput.style.borderColor = ''; }, 1200);
      return;
    }
    // If key already exists, focus its input instead of duplicating
    const existing = customFieldsList.querySelector(`[data-custom-key="${key}"]`);
    if (existing) {
      existing.focus();
      existing.style.borderColor = 'var(--accent)';
      setTimeout(() => { existing.style.borderColor = ''; }, 1200);
      miscKeyInput.value = '';
      miscValueInput.value = '';
      return;
    }
    addMiscFieldRow(key, val);
    miscKeyInput.value = '';
    miscValueInput.value = '';
    miscKeyInput.focus();
  });

  miscValueInput.addEventListener('keydown', e => { if (e.key === 'Enter') miscAddBtn.click(); });

  deleteProfileBtn.addEventListener('click', async () => {
    if (!currentEditingProfileId) return;
    if (!confirm('Delete this profile? This cannot be undone.')) return;
    profiles = profiles.filter(p => p.id !== currentEditingProfileId);
    await ProfileManager.saveProfiles(profiles);
    currentEditingProfileId = null;
    profileEditor.classList.add('hidden');
    renderProfileList();
  });

  // ── Export profile as JSON ─────────────────────────────────────
  exportProfileBtn.addEventListener('click', () => {
    if (!currentEditingProfileId) return;
    const profile = profiles.find(p => p.id === currentEditingProfileId);
    if (!profile) return;

    const exportData = { name: profile.name, data: profile.data };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${profile.name.replace(/\s+/g, '_')}_NeuralFill.json`;
    a.click();
    URL.revokeObjectURL(url);

    const orig = exportProfileBtn.textContent;
    exportProfileBtn.textContent = 'Exported!';
    setTimeout(() => { exportProfileBtn.textContent = orig; }, 1500);
  });

  // ── Import profile from JSON ───────────────────────────────────
  importProfileInput.addEventListener('change', async () => {
    const file = importProfileInput.files[0];
    if (!file) return;
    importProfileInput.value = '';

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.name || !parsed.data) {
        alert('Invalid profile file. Expected { name, data }.');
        return;
      }

      const newProfile = {
        id:   crypto.randomUUID(),
        name: parsed.name,
        data: {
          fullName:     parsed.data.fullName     || '',
          email:        parsed.data.email        || '',
          phone:        parsed.data.phone        || '',
          dob:          parsed.data.dob          || '',
          street:       parsed.data.street       || '',
          city:         parsed.data.city         || '',
          state:        parsed.data.state        || '',
          zip:          parsed.data.zip          || '',
          country:      parsed.data.country      || '',
          jobTitle:     parsed.data.jobTitle     || '',
          company:      parsed.data.company      || '',
          linkedIn:     parsed.data.linkedIn     || '',
          github:       parsed.data.github       || '',
          twitter:      parsed.data.twitter      || '',
          website:      parsed.data.website      || '',
          customFields: parsed.data.customFields || {},
        }
      };

      profiles.push(newProfile);
      await ProfileManager.saveProfiles(profiles);
      renderProfileList();
      openEditor(newProfile.id);
    } catch (e) {
      alert('Could not read file: ' + e.message);
    }
  });


  // ══════════════════════════════════════════════════════════════════
  // Fill Form — lock-gated
  // ══════════════════════════════════════════════════════════════════

  fillNowBtn.addEventListener('click', () => {
    // Confirm session is still live before filling
    chrome.runtime.sendMessage({ action: 'check_lock' }, (lockRes) => {
      if (!lockRes?.isUnlocked) {
        // Session expired — go to lock screen
        showView(lockView);
        statusText.innerText = 'Locked';
        lockNowBtn.classList.add('hidden');
        setTimeout(() => lockPinInput.focus(), 100);
        return;
      }
      triggerFill();
    });
  });

  function triggerFill() {
    const isAiEnabled = aiToggle.checked;
    const activeProfileId = profileSelect.value;

    if (!activeProfileId || profiles.length === 0) {
      statusText.innerText = 'Please create a profile first';
      return;
    }

    const profile = profiles.find(p => p.id === activeProfileId);
    if (!profile) return;

    const ogText = fillNowBtn.innerText;
    fillNowBtn.innerText = 'Analyzing…';
    fillNowBtn.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        fillNowBtn.innerText = ogText;
        fillNowBtn.disabled = false;
        statusText.innerText = 'No active tab found';
        return;
      }

      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (pingResponse) => {
        if (chrome.runtime.lastError) {
          fillNowBtn.innerText = ogText;
          fillNowBtn.disabled = false;
          const url = tabs[0].url || '';
          if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
            statusText.innerText = 'Cannot fill on Chrome settings pages.';
          } else {
            statusText.innerText = 'Content script not found. Refresh the page.';
          }
          return;
        }

        chrome.tabs.sendMessage(tabId, {
          action: 'fill_form',
          useAi: isAiEnabled,
          profileData: profile.data,
          customFields: profile.data.customFields || {}
        }, (response) => {
          fillNowBtn.innerText = ogText;
          fillNowBtn.disabled = false;
          if (chrome.runtime.lastError) {
            statusText.innerText = 'Error communicating with page.';
            return;
          }
          if (response?.success) {
            statusText.innerText = `Filled ${response.fieldsFilled} of ${response.totalIdentified} fields`;
          } else {
            statusText.innerText = 'Form filling failed or timed out';
          }
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Preview Before Fill — lock-gated
  // ══════════════════════════════════════════════════════════════════

  previewFillBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'check_lock' }, (lockRes) => {
      if (!lockRes?.isUnlocked) {
        showView(lockView);
        statusText.innerText = 'Locked';
        lockNowBtn.classList.add('hidden');
        setTimeout(() => lockPinInput.focus(), 100);
        return;
      }
      triggerPreview();
    });
  });

  function triggerPreview() {
    const activeProfileId = profileSelect.value;
    if (!activeProfileId || profiles.length === 0) {
      statusText.innerText = 'Please create a profile first';
      return;
    }
    const profile = profiles.find(p => p.id === activeProfileId);
    if (!profile) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'preview_fill',
        profileData: profile.data,
        customFields: profile.data.customFields || {}
      }, (res) => {
        if (chrome.runtime.lastError) {
          statusText.innerText = 'Content script not found. Refresh the page.';
          return;
        }
        if (res?.fieldCount > 0) {
          statusText.innerText = `Preview: ${res.fieldCount} field${res.fieldCount !== 1 ? 's' : ''} ready — confirm on page`;
          window.close(); // close popup so user can see the page
        } else {
          statusText.innerText = 'No fillable fields found on this page';
        }
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Generate All Text Fields — lock-gated
  // ══════════════════════════════════════════════════════════════════

  generateTextBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'check_lock' }, (lockRes) => {
      if (!lockRes?.isUnlocked) {
        showView(lockView);
        statusText.innerText = 'Locked';
        lockNowBtn.classList.add('hidden');
        setTimeout(() => lockPinInput.focus(), 100);
        return;
      }
      triggerGenerateAll();
    });
  });

  function triggerGenerateAll() {
    const activeProfileId = profileSelect.value;
    if (!activeProfileId || profiles.length === 0) {
      statusText.innerText = 'Please create a profile first';
      return;
    }

    const ogText = generateTextBtn.textContent;
    generateTextBtn.disabled = true;
    generateTextBtn.textContent = 'Generating…';
    statusText.innerText = 'Generating text fields…';

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        generateTextBtn.disabled = false;
        generateTextBtn.textContent = ogText;
        statusText.innerText = 'No active tab found';
        return;
      }

      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (pingRes) => {
        if (chrome.runtime.lastError) {
          generateTextBtn.disabled = false;
          generateTextBtn.textContent = ogText;
          const url = tabs[0].url || '';
          if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
            statusText.innerText = 'Cannot run on Chrome settings pages.';
          } else {
            statusText.innerText = 'Content script not found. Refresh the page.';
          }
          return;
        }

        // Listen for progress events from content script
        const progressHandler = (msg) => {
          if (msg.action === 'generate_all_progress') {
            statusText.innerText = `Generating ${msg.current} of ${msg.total}…`;
          } else if (msg.action === 'generate_all_complete') {
            chrome.runtime.onMessage.removeListener(progressHandler);
            generateTextBtn.disabled = false;
            generateTextBtn.textContent = ogText;
            statusText.innerText = msg.filled > 0
              ? `Generated ${msg.filled} text field${msg.filled !== 1 ? 's' : ''}`
              : 'No long-form fields detected';
          }
        };
        chrome.runtime.onMessage.addListener(progressHandler);

        chrome.tabs.sendMessage(tabId, {
          action: 'generate_all_longform',
          profileId: activeProfileId
        }, (res) => {
          if (chrome.runtime.lastError || !res?.started) {
            chrome.runtime.onMessage.removeListener(progressHandler);
            generateTextBtn.disabled = false;
            generateTextBtn.textContent = ogText;
            statusText.innerText = res?.error || 'Could not start generation.';
          }
        });
      });
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Scan & Learn
  // ══════════════════════════════════════════════════════════════════

  scanLearnBtn.addEventListener('click', () => {
    const activeProfileId = profileSelect.value;
    if (!activeProfileId || profiles.length === 0) {
      statusText.innerText = 'Please create a profile first';
      return;
    }

    const ogText = scanLearnBtn.innerText;
    scanLearnBtn.innerText = 'Scanning…';
    scanLearnBtn.disabled = true;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        scanLearnBtn.innerText = ogText;
        scanLearnBtn.disabled = false;
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: 'scan_and_learn' }, (response) => {
        scanLearnBtn.innerText = ogText;
        scanLearnBtn.disabled = false;

        if (chrome.runtime.lastError) {
          statusText.innerText = 'Content script not found. Refresh the page.';
          return;
        }

        if (response?.success && response.discovered.length > 0) {
          pendingScanResults = response.discovered;
          showView(scanResultsView);
          renderScanResults(pendingScanResults);
        } else if (response?.success) {
          statusText.innerText = 'No new fields found. Fill in values first.';
        } else {
          statusText.innerText = response?.error || 'Scan failed.';
        }
      });
    });
  });

  // ── Confirm Scan Results ───────────────────────────────────────────
  confirmScanBtn.addEventListener('click', async () => {
    const activeProfileId = profileSelect.value;
    const profile = profiles.find(p => p.id === activeProfileId);
    if (!profile) return;

    if (!profile.data.customFields) profile.data.customFields = {};

    const inputs = scanResultsList.querySelectorAll('input.profile-input');
    inputs.forEach((input, i) => {
      if (pendingScanResults[i]) pendingScanResults[i].value = input.value.trim();
    });

    let newCount = 0;
    pendingScanResults.forEach(({ key, value }) => {
      if (key && value && !profile.data.customFields[key]) {
        profile.data.customFields[key] = value;
        newCount++;
      }
    });

    await ProfileManager.saveProfiles(profiles);
    showView(mainView);
    pendingScanResults = [];
    statusText.innerText = `Saved ${newCount} new field${newCount !== 1 ? 's' : ''} to profile`;
  });

  discardScanBtn.addEventListener('click', () => {
    showView(mainView);
    pendingScanResults = [];
    statusText.innerText = 'Scan results discarded.';
  });

  // ══════════════════════════════════════════════════════════════════
  // Knowledge Base
  // ══════════════════════════════════════════════════════════════════

  kbBtn.addEventListener('click', () => {
    showView(knowledgeBaseView);
    loadKbView();
  });

  backFromKbBtn.addEventListener('click', () => showView(mainView));

  async function loadKbView() {
    const activeProfileId = profileSelect.value;
    const profile = profiles.find(p => p.id === activeProfileId);
    kbProfileLabel.textContent = profile ? `Profile: ${profile.name}` : '';
    kbUploadError.classList.add('hidden');
    await renderKbDocList(activeProfileId);
    await updateKbStorage(activeProfileId);
  }

  async function renderKbDocList(profileId) {
    if (!profileId) return;
    const docs = await DocumentManager.getDocuments(profileId);

    // Remove all doc cards (keep empty state)
    Array.from(kbDocList.children).forEach(el => {
      if (el !== kbEmptyState) el.remove();
    });

    if (docs.length === 0) {
      kbEmptyState.classList.remove('hidden');
      kbDocCount.textContent = 'Documents';
      return;
    }

    kbEmptyState.classList.add('hidden');
    kbDocCount.textContent = `${docs.length} Document${docs.length !== 1 ? 's' : ''}`;

    // Sort newest first
    docs.sort((a, b) => b.uploadedAt - a.uploadedAt);

    docs.forEach(doc => {
      const card = buildDocCard(doc, profileId);
      kbDocList.appendChild(card);
    });
  }

  function buildDocCard(doc, profileId) {
    const card = document.createElement('div');
    card.className = 'kb-doc-card';
    card.dataset.docId = doc.id;
    card.style.cssText = 'flex-wrap: wrap; align-items: center;';

    const iconDiv = document.createElement('div');
    iconDiv.className = `kb-doc-icon ${doc.fileType || 'txt'}`;
    iconDiv.textContent = (doc.fileType || 'txt').toUpperCase();

    const infoDiv = document.createElement('div');
    infoDiv.className = 'kb-doc-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'kb-doc-name';
    nameEl.textContent = doc.name;

    const metaEl = document.createElement('div');
    metaEl.className = 'kb-doc-meta';
    const uploadDate = new Date(doc.uploadedAt).toLocaleDateString();
    metaEl.textContent = `${doc.chunkCount} chunks · ${DocumentManager.formatSize(doc.charCount)} · ${uploadDate}`;

    infoDiv.appendChild(nameEl);
    infoDiv.appendChild(metaEl);

    // Preview toggle button
    const previewBtn = document.createElement('button');
    previewBtn.className = 'kb-doc-preview-btn';
    previewBtn.title = 'Preview extracted text';
    previewBtn.textContent = '▾';

    // Preview panel (lazy-loaded)
    const previewPanel = document.createElement('div');
    previewPanel.className = 'kb-doc-preview';
    previewPanel.style.display = 'none';
    previewPanel.style.width = '100%';
    previewPanel.textContent = 'Loading…';

    let previewLoaded = false;
    previewBtn.addEventListener('click', async () => {
      const open = previewPanel.style.display !== 'none';
      if (open) {
        previewPanel.style.display = 'none';
        previewBtn.textContent = '▾';
      } else {
        previewPanel.style.display = 'block';
        previewBtn.textContent = '▴';
        if (!previewLoaded) {
          const chunks = await DocumentManager.getAllChunks(profileId);
          const docChunks = chunks.filter(c => c.docId === doc.id)
                                  .sort((a, b) => a.chunkIndex - b.chunkIndex);
          if (docChunks.length > 0) {
            const preview = docChunks[0].text.slice(0, 400);
            previewPanel.textContent = preview + (docChunks[0].text.length > 400 ? '…' : '');
          } else {
            previewPanel.textContent = 'No text extracted.';
          }
          previewLoaded = true;
        }
      }
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'kb-doc-delete';
    delBtn.title = 'Delete document';
    delBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 3.5H12M5 3.5V2.5C5 2 5.5 1.5 6 1.5H8C8.5 1.5 9 2 9 2.5V3.5M5.5 6V10.5M8.5 6V10.5M3 3.5L3.5 11.5C3.5 12 4 12.5 4.5 12.5H9.5C10 12.5 10.5 12 10.5 11.5L11 3.5" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    delBtn.addEventListener('click', async () => {
      delBtn.disabled = true;
      await DocumentManager.deleteDocument(doc.id);
      card.remove();
      await updateKbStorage(profileId);
      const remaining = kbDocList.querySelectorAll('.kb-doc-card').length;
      if (remaining === 0) {
        kbEmptyState.classList.remove('hidden');
        kbDocCount.textContent = 'Documents';
      } else {
        kbDocCount.textContent = `${remaining} Document${remaining !== 1 ? 's' : ''}`;
      }
    });

    card.appendChild(iconDiv);
    card.appendChild(infoDiv);
    card.appendChild(previewBtn);
    card.appendChild(delBtn);
    card.appendChild(previewPanel);
    return card;
  }

  async function updateKbStorage(profileId) {
    if (!profileId) return;
    const totalBytes = await DocumentManager.getTotalSize(profileId);
    const SOFT_LIMIT = 5 * 1024 * 1024; // 5 MB
    if (totalBytes === 0) {
      kbStorageUsed.textContent = '';
    } else {
      const pct = Math.min(100, Math.round((totalBytes / SOFT_LIMIT) * 100));
      kbStorageUsed.textContent = `${DocumentManager.formatSize(totalBytes)} used`;
      if (pct >= 80) kbStorageUsed.style.color = 'var(--orange)';
      else kbStorageUsed.style.color = '';
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Fill History
  // ══════════════════════════════════════════════════════════════════

  historyBtn.addEventListener('click', () => {
    showView(historyView);
    loadHistoryView();
  });

  backFromHistoryBtn.addEventListener('click', () => showView(mainView));

  clearHistoryBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove('fillHistory');
    loadHistoryView();
    statusText.innerText = 'History cleared';
  });

  async function loadHistoryView() {
    const { fillHistory } = await chrome.storage.local.get('fillHistory');
    const entries = fillHistory || [];
    historyList.innerHTML = '';

    if (entries.length === 0) {
      historyEmpty.classList.remove('hidden');
      clearHistoryBtn.style.display = 'none';
      return;
    }

    historyEmpty.classList.add('hidden');
    clearHistoryBtn.style.display = '';

    entries.forEach(entry => {
      const item = document.createElement('div');
      item.style.cssText = `
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
      `;

      const icon = document.createElement('div');
      icon.style.cssText = 'width:28px;height:28px;border-radius:6px;background:rgba(10,132,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;';
      icon.textContent = '✓';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';

      const domain = document.createElement('div');
      domain.style.cssText = 'font-size:13px;font-weight:500;color:rgba(255,255,255,0.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      domain.textContent = entry.url || 'Unknown site';

      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:11px;color:var(--text-tertiary);margin-top:2px;';
      meta.textContent = `${entry.fieldsFilled} field${entry.fieldsFilled !== 1 ? 's' : ''} · ${entry.profileName || 'Profile'} · ${relativeTime(entry.timestamp)}`;

      info.appendChild(domain);
      info.appendChild(meta);
      item.appendChild(icon);
      item.appendChild(info);
      historyList.appendChild(item);
    });
  }

  function relativeTime(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  // ── File Upload ────────────────────────────────────────────────────

  kbFileInput.addEventListener('change', () => {
    if (kbFileInput.files.length > 0) processKbFiles(Array.from(kbFileInput.files));
    kbFileInput.value = '';
  });

  kbUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    kbUploadZone.classList.add('drag-over');
  });

  kbUploadZone.addEventListener('dragleave', () => {
    kbUploadZone.classList.remove('drag-over');
  });

  kbUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    kbUploadZone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files).filter(f =>
      /\.(pdf|docx|txt)$/i.test(f.name)
    );
    if (files.length > 0) processKbFiles(files);
  });

  async function processKbFiles(files) {
    const activeProfileId = profileSelect.value;
    if (!activeProfileId) return;

    kbUploadError.classList.add('hidden');
    kbProcessing.classList.remove('hidden');

    let successCount = 0;
    let lastError = null;

    for (const file of files) {
      kbProcessingLabel.textContent = `Processing ${file.name}…`;
      try {
        await DocumentManager.saveDocument(activeProfileId, file);
        successCount++;
      } catch (err) {
        lastError = err.message || 'Failed to process file.';
        console.error('KB upload error:', err);
      }
    }

    kbProcessing.classList.add('hidden');

    if (lastError) {
      kbUploadError.textContent = lastError;
      kbUploadError.classList.remove('hidden');
    }

    if (successCount > 0) {
      await renderKbDocList(activeProfileId);
      await updateKbStorage(activeProfileId);
    }
  }
});
