import { CryptoManager } from '../utils/crypto.js';
import { StorageManager } from './storageManager.js';
import { AuthManager } from '../utils/authManager.js';
import { RAGEngine } from '../utils/ragEngine.js';

// ── Lock timeout in milliseconds (default 15 minutes) ──
const DEFAULT_LOCK_TIMEOUT_MS = 15 * 60 * 1000;

async function isSessionUnlocked() {
  const result = await chrome.storage.session.get(['isUnlocked', 'lastActivityAt', 'lockTimeoutMs']);
  if (!result.isUnlocked) return false;
  const timeout = result.lockTimeoutMs || DEFAULT_LOCK_TIMEOUT_MS;
  const elapsed = Date.now() - (result.lastActivityAt || 0);
  if (elapsed > timeout) {
    await chrome.storage.session.remove(['isUnlocked', 'lastActivityAt']);
    return false;
  }
  return true;
}

async function touchActivity() {
  await chrome.storage.session.set({ lastActivityAt: Date.now() });
}

// Resolve active profile, respecting per-site binding if a tab URL is provided
async function resolveActiveProfile(profiles, tabUrl) {
  const { settings, siteBindings } = await chrome.storage.local.get(['settings', 'siteBindings']);
  let activeId = settings?.activeProfileId || profiles[0]?.id;
  if (tabUrl && siteBindings) {
    try {
      const domain = new URL(tabUrl).hostname.replace(/^www\./, '');
      if (siteBindings[domain]) activeId = siteBindings[domain];
    } catch {}
  }
  return profiles.find(p => p.id === activeId) || profiles[0];
}

chrome.runtime.onInstalled.addListener(async () => {
  console.log('NeuralFill Extension Installed.');

  const result = await chrome.storage.local.get(['encryptedProfiles', 'settings', 'encryptionKey']);
  const defaultData = {};

  if (!result.settings) defaultData.settings = { useAi: true };

  // Auto-generate encryption key silently — no user interaction needed
  if (!result.encryptionKey) {
    const key    = await CryptoManager.generateKey();
    const jwk    = await CryptoManager.exportKey(key);
    const keyObj = await CryptoManager.importKey(jwk);
    const emptyEncrypted = await CryptoManager.encryptData(keyObj, []);
    defaultData.encryptionKey      = jwk;
    defaultData.encryptedProfiles  = emptyEncrypted;
    defaultData.needsSetup         = false;
  }

  if (Object.keys(defaultData).length > 0) {
    await chrome.storage.local.set(defaultData);
  }

  // Build context menus (Phase 2 will populate with profiles)
  chrome.contextMenus.create({
    id: 'neuralfill-fill',
    title: 'Fill with NeuralFill',
    contexts: ['editable']
  });
});

// --- Keyboard Shortcut Handler ---
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'fill_form') {
    if (!(await isSessionUnlocked())) return; // lock gate

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]) return;

    const profiles = await StorageManager.getProfiles();
    if (!profiles || profiles.length === 0) return;

    const { settings } = await chrome.storage.local.get('settings');
    const profile = await resolveActiveProfile(profiles, tabs[0].url);

    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'fill_form',
      useAi: settings?.useAi !== false,
      profileData: profile.data,
      customFields: profile.data.customFields || {}
    });
  }
});

// --- Context Menu Click Handler ---
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'neuralfill-fill') {
    if (!(await isSessionUnlocked())) return; // lock gate

    const profiles = await StorageManager.getProfiles();
    if (!profiles || profiles.length === 0) return;

    const { settings } = await chrome.storage.local.get('settings');
    const profile = await resolveActiveProfile(profiles, tab.url);

    chrome.tabs.sendMessage(tab.id, {
      action: 'fill_form',
      useAi: settings?.useAi !== false,
      profileData: profile.data,
      customFields: profile.data.customFields || {}
    });
  }
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Badge fill: route fill_form back to the sending tab
  if (request.action === 'badge_fill') {
    (async () => {
      if (!(await isSessionUnlocked())) return; // lock gate
      const tabId = sender.tab?.id;
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          action: 'fill_form',
          useAi: request.useAi,
          profileData: request.profileData,
          customFields: request.customFields || {},
          source: 'badge'
        });
      }
    })();
    return false;
  }

  // Fallback: auto-generate key if popup opens before onInstalled completed
  if (request.action === 'auto_setup') {
    (async () => {
      const { encryptionKey } = await chrome.storage.local.get('encryptionKey');
      if (!encryptionKey) {
        const key    = await CryptoManager.generateKey();
        const jwk    = await CryptoManager.exportKey(key);
        const keyObj = await CryptoManager.importKey(jwk);
        const emptyEncrypted = await CryptoManager.encryptData(keyObj, []);
        await chrome.storage.local.set({
          encryptionKey:     jwk,
          encryptedProfiles: emptyEncrypted,
          needsSetup:        false
        });
      }
      sendResponse({ success: true });
    })();
    return true;
  }
  
  if (request.action === 'get_profiles') {
    StorageManager.getProfiles().then(profiles => {
      sendResponse({ success: true, profiles });
    });
    return true;
  }
  
  if (request.action === 'save_profiles') {
    StorageManager.saveProfiles(request.profiles).then(success => {
      sendResponse({ success });
    });
    return true;
  }

  // Get active profile data (used by content script for auto-fill badge)
  if (request.action === 'get_active_profile') {
    (async () => {
      const profiles = await StorageManager.getProfiles();
      if (!profiles || profiles.length === 0) {
        sendResponse({ success: false, error: 'No profiles' });
        return;
      }
      const { settings } = await chrome.storage.local.get('settings');
      const tabUrl = request.tabUrl || null;
      const profile = await resolveActiveProfile(profiles, tabUrl);
      sendResponse({
        success: true,
        profile: profile,
        useAi: settings?.useAi !== false
      });
    })();
    return true;
  }

  // Log form fill event (for fill history)
  if (request.action === 'log_fill') {
    chrome.storage.local.get('fillHistory', (result) => {
      const history = result.fillHistory || [];
      history.unshift({
        url: request.url,
        profileName: request.profileName,
        fieldsFilled: request.fieldsFilled,
        timestamp: Date.now()
      });
      // Keep only last 50
      chrome.storage.local.set({ fillHistory: history.slice(0, 50) }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === 'save_field_to_active_profile') {
    (async () => {
      const { key, value } = request;
      const profiles = await StorageManager.getProfiles();
      
      if (!profiles || profiles.length === 0) {
        sendResponse({ success: false, error: 'No profiles exist.' });
        return;
      }
      
      profiles[0].data[key] = value;
      
      const success = await StorageManager.saveProfiles(profiles);
      sendResponse({ success });
    })();
    return true;
  }

  // Smart Profile Capture: compare harvested form data against all profiles
  if (request.action === 'compare_profiles') {
    (async () => {
      const harvested = request.harvested;
      const profiles = await StorageManager.getProfiles();
      
      if (!profiles || profiles.length === 0) {
        sendResponse({ type: 'new', harvested });
        return;
      }

      let bestMatch = null;
      let bestScore = 0;

      for (const profile of profiles) {
        let score = 0;
        const d = profile.data;

        // Score: email (3), name (2), phone (2)
        if (harvested.email && d.email && harvested.email.toLowerCase() === d.email.toLowerCase()) score += 3;
        if (harvested.fullName && d.fullName && harvested.fullName.toLowerCase() === d.fullName.toLowerCase()) score += 2;
        if (harvested.phone && d.phone) {
          const h = harvested.phone.replace(/\D/g, '');
          const p = d.phone.replace(/\D/g, '');
          if (h && p && (h === p || h.endsWith(p) || p.endsWith(h))) score += 2;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = profile;
        }
      }

      if (bestScore < 2) {
        sendResponse({ type: 'new', harvested });
        return;
      }

      // Found a matching profile — compute exact diffs
      const d = bestMatch.data;
      const updatedFields = []; // existing value → different value
      const newFields = [];     // no existing value → new value

      const standardKeys = ['fullName', 'email', 'phone', 'dob', 'street', 'city', 'state', 'zip', 'country'];
      for (const key of standardKeys) {
        const hv = (harvested[key] || '').trim();
        const pv = (d[key] || '').trim();
        if (!hv) continue; // harvested has no value for this key
        if (hv === pv) continue; // same value, no change
        
        if (pv) {
          updatedFields.push({ key, oldValue: pv, newValue: hv });
        } else {
          newFields.push({ key, newValue: hv });
        }
      }

      // Custom fields comparison
      const existingCustom = d.customFields || {};
      const harvestedCustom = harvested.customFields || {};
      const newCustomFields = [];
      const updatedCustomFields = [];

      for (const [key, val] of Object.entries(harvestedCustom)) {
        if (!val) continue;
        if (existingCustom[key]) {
          if (existingCustom[key] !== val) {
            updatedCustomFields.push({ key, oldValue: existingCustom[key], newValue: val });
          }
        } else {
          newCustomFields.push({ key, newValue: val });
        }
      }

      const totalUpdated = updatedFields.length + updatedCustomFields.length;
      const totalNew = newFields.length + newCustomFields.length;

      if (totalUpdated === 0 && totalNew === 0) {
        sendResponse({ type: 'no_change' });
        return;
      }

      sendResponse({
        type: 'update',
        profileId: bestMatch.id,
        profileName: bestMatch.name,
        updatedFields,
        newFields,
        updatedCustomFields,
        newCustomFields,
        totalUpdated,
        totalNew
      });
    })();
    return true;
  }

  // Update an existing profile with changed fields
  if (request.action === 'update_profile_fields') {
    (async () => {
      const { profileId, updates, customFields } = request;
      const profiles = await StorageManager.getProfiles();
      const profile = profiles?.find(p => p.id === profileId);
      
      if (!profile) {
        sendResponse({ success: false });
        return;
      }

      // Update standard fields
      for (const { key, newValue } of updates) {
        profile.data[key] = newValue;
      }

      // Merge custom fields if provided
      if (customFields && Object.keys(customFields).length > 0) {
        if (!profile.data.customFields) profile.data.customFields = {};
        Object.assign(profile.data.customFields, customFields);
      }

      const success = await StorageManager.saveProfiles(profiles);
      sendResponse({ success });
    })();
    return true;
  }

  // Create a new profile from harvested data
  if (request.action === 'create_profile_from_data') {
    (async () => {
      const { name, harvested } = request;
      const profiles = await StorageManager.getProfiles() || [];
      
      const newProfile = {
        id: crypto.randomUUID(),
        name: name || 'Auto-saved',
        data: {
          fullName: harvested.fullName || '',
          email:    harvested.email    || '',
          phone:    harvested.phone    || '',
          dob:      harvested.dob      || '',
          street:   harvested.street   || '',
          city:     harvested.city     || '',
          state:    harvested.state    || '',
          zip:      harvested.zip      || '',
          country:  harvested.country  || '',
          jobTitle: harvested.jobTitle || '',
          company:  harvested.company  || '',
          linkedIn: harvested.linkedIn || '',
          github:   harvested.github   || '',
          twitter:  harvested.twitter  || '',
          website:  harvested.website  || '',
          customFields: harvested.customFields || {}
        }
      };

      profiles.push(newProfile);
      const success = await StorageManager.saveProfiles(profiles);
      sendResponse({ success, profileName: newProfile.name });
    })();
    return true;
  }

  // ── Phase 0: PIN Security ──────────────────────────────────────────

  // Save hashed PIN on first setup
  if (request.action === 'save_pin') {
    (async () => {
      const { pin } = request;
      if (!pin || pin.length < 4) {
        sendResponse({ success: false, error: 'PIN must be at least 4 digits' });
        return;
      }
      const { hash, salt } = await AuthManager.hashPin(pin);
      await chrome.storage.local.set({ pinHash: hash, pinSalt: salt });
      // Auto-unlock on setup so user lands on main view immediately
      await chrome.storage.session.set({ isUnlocked: true, lastActivityAt: Date.now() });
      sendResponse({ success: true });
    })();
    return true;
  }

  // Check if the session is currently unlocked
  if (request.action === 'check_lock') {
    (async () => {
      const { pinHash } = await chrome.storage.local.get('pinHash');
      if (!pinHash) {
        // PIN not set up yet — treat as unlocked
        sendResponse({ isUnlocked: true, hasPinSetup: false });
        return;
      }
      const unlocked = await isSessionUnlocked();
      if (unlocked) await touchActivity();
      sendResponse({ isUnlocked: unlocked, hasPinSetup: true });
    })();
    return true;
  }

  // Verify PIN and unlock session
  if (request.action === 'unlock') {
    (async () => {
      const { pin } = request;
      const { pinHash, pinSalt } = await chrome.storage.local.get(['pinHash', 'pinSalt']);
      if (!pinHash || !pinSalt) {
        sendResponse({ success: false, error: 'No PIN configured' });
        return;
      }
      const valid = await AuthManager.verifyPin(pin, pinHash, pinSalt);
      if (valid) {
        await chrome.storage.session.set({ isUnlocked: true, lastActivityAt: Date.now() });
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Incorrect PIN' });
      }
    })();
    return true;
  }

  // Manually lock the session
  if (request.action === 'lock') {
    chrome.storage.session.remove(['isUnlocked', 'lastActivityAt'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  // ── Phase 1: Knowledge Base (content script access for Phase 3+) ──

  // Return all chunks for the active profile — used by RAG engine
  if (request.action === 'get_chunks_for_profile') {
    (async () => {
      const { profileId } = request;
      if (!profileId) { sendResponse({ success: false, chunks: [] }); return; }

      const db = await openKbDB();
      const tx = db.transaction('chunks', 'readonly');
      const index = tx.objectStore('chunks').index('profileId');
      const req = index.getAll(profileId);
      req.onsuccess = () => sendResponse({ success: true, chunks: req.result || [] });
      req.onerror   = () => sendResponse({ success: false, chunks: [] });
    })();
    return true;
  }

  // Return top N relevant chunks for a field query (TF-IDF scored)
  if (request.action === 'get_chunks_for_field') {
    (async () => {
      const { profileId, query, topN = 3 } = request;
      if (!profileId || !query) { sendResponse({ success: false, chunks: [] }); return; }

      const db = await openKbDB();
      const tx = db.transaction('chunks', 'readonly');
      const index = tx.objectStore('chunks').index('profileId');
      const req = index.getAll(profileId);

      req.onsuccess = () => {
        const allChunks = req.result || [];
        if (allChunks.length === 0) {
          sendResponse({ success: true, chunks: [] });
          return;
        }
        const topChunks = RAGEngine.retrieve(query, allChunks, topN);
        sendResponse({ success: true, chunks: topChunks });
      };
      req.onerror = () => sendResponse({ success: false, chunks: [] });
    })();
    return true;
  }

  // Open popup — used by content script "View Setup Guide" button
  if (request.action === 'open_ai_setup') {
    chrome.action.openPopup().catch(() => {});
    sendResponse({ success: true });
    return true;
  }
});

// ── IndexedDB helper for background service worker ────────────────
function openKbDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('neuralfill-kb', 1);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('documents')) {
        const ds = db.createObjectStore('documents', { keyPath: 'id' });
        ds.createIndex('profileId', 'profileId', { unique: false });
      }
      if (!db.objectStoreNames.contains('chunks')) {
        const cs = db.createObjectStore('chunks', { keyPath: 'id' });
        cs.createIndex('docId',     'docId',     { unique: false });
        cs.createIndex('profileId', 'profileId', { unique: false });
      }
    };
  });
}
