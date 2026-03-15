/* ═══════════════════════════════════════════════════════════════
   NeuralFill — DocumentManager
   Local Knowledge Base: IndexedDB storage, text extraction,
   and chunking for PDF, DOCX, and TXT files.
   No network calls. All processing is local.
   ═══════════════════════════════════════════════════════════════ */

const DB_NAME    = 'neuralfill-kb';
const DB_VERSION = 1;
const DOCS_STORE   = 'documents';
const CHUNKS_STORE = 'chunks';

// ── IndexedDB Setup ───────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        const docStore = db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
        docStore.createIndex('profileId', 'profileId', { unique: false });
      }

      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: 'id' });
        chunkStore.createIndex('docId',     'docId',     { unique: false });
        chunkStore.createIndex('profileId', 'profileId', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function dbGet(store, index, value) {
  return new Promise((resolve, reject) => {
    openDB().then(db => {
      const tx  = db.transaction(store, 'readonly');
      const st  = tx.objectStore(store);
      const req = st.index(index).getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  });
}

function dbPut(storeName, objects) {
  return new Promise((resolve, reject) => {
    openDB().then(db => {
      const tx = db.transaction(storeName, 'readwrite');
      const st = tx.objectStore(storeName);
      objects.forEach(obj => st.put(obj));
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => reject(tx.error);
    });
  });
}

function dbDelete(storeName, ids) {
  return new Promise((resolve, reject) => {
    openDB().then(db => {
      const tx = db.transaction(storeName, 'readwrite');
      const st = tx.objectStore(storeName);
      ids.forEach(id => st.delete(id));
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => reject(tx.error);
    });
  });
}

function dbGetById(storeName, id) {
  return new Promise((resolve, reject) => {
    openDB().then(db => {
      const tx  = db.transaction(storeName, 'readonly');
      const st  = tx.objectStore(storeName);
      const req = st.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  });
}

// ── Text Chunking ─────────────────────────────────────────────────

function chunkText(text) {
  const TARGET_WORDS = 350;
  const MAX_WORDS    = 500;

  // Normalize line endings and collapse excess blank lines
  const normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  // Split into paragraphs
  const paragraphs = normalized
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 15);

  const chunks = [];
  let current   = '';
  let wordCount = 0;

  for (const para of paragraphs) {
    const paraWords = para.split(/\s+/).length;

    // If adding this paragraph would exceed max, flush current
    if (wordCount + paraWords > MAX_WORDS && current) {
      chunks.push(current.trim());
      current   = para;
      wordCount = paraWords;
    } else {
      current   += (current ? '\n\n' : '') + para;
      wordCount += paraWords;
    }

    // Flush once we hit the target
    if (wordCount >= TARGET_WORDS) {
      chunks.push(current.trim());
      current   = '';
      wordCount = 0;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

// ── PDF Text Extraction (pdf.js) ──────────────────────────────────

async function extractTextFromPDF(arrayBuffer) {
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) throw new Error('pdf.js not loaded');

  // Point worker to the bundled file
  pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdf.worker.min.js');

  const pdf   = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map(item => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) pages.push(pageText);
  }

  return pages.join('\n\n');
}

// ── DOCX Text Extraction (mammoth.js) ────────────────────────────

async function extractTextFromDOCX(arrayBuffer) {
  const mammoth = window.mammoth;
  if (!mammoth) throw new Error('mammoth.js not loaded');

  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// ── TXT Extraction ────────────────────────────────────────────────

function extractTextFromTXT(arrayBuffer) {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
}

// ── Public API ────────────────────────────────────────────────────

export const DocumentManager = {

  /**
   * Save a file to the Knowledge Base for a given profile.
   * Extracts text, chunks it, and stores everything in IndexedDB.
   * @param {string} profileId
   * @param {File} file
   * @returns {{ docId, name, chunkCount, charCount }}
   */
  async saveDocument(profileId, file) {
    const arrayBuffer = await file.arrayBuffer();
    const ext = file.name.split('.').pop().toLowerCase();

    let rawText = '';
    if      (ext === 'pdf')  rawText = await extractTextFromPDF(arrayBuffer);
    else if (ext === 'docx') rawText = await extractTextFromDOCX(arrayBuffer);
    else if (ext === 'txt')  rawText = extractTextFromTXT(arrayBuffer);
    else throw new Error(`Unsupported file type: .${ext}`);

    if (!rawText.trim()) throw new Error('No readable text found in this file.');

    const textChunks = chunkText(rawText);
    if (textChunks.length === 0) throw new Error('Could not extract any chunks.');

    const docId = crypto.randomUUID();
    const now   = Date.now();

    // Store document metadata
    const docMeta = {
      id:         docId,
      profileId,
      name:       file.name,
      fileType:   ext,
      uploadedAt: now,
      chunkCount: textChunks.length,
      charCount:  rawText.length,
    };

    // Store chunks
    const chunkObjects = textChunks.map((text, i) => ({
      id:         `${docId}-${i}`,
      docId,
      profileId,
      chunkIndex: i,
      text,
    }));

    await dbPut(DOCS_STORE,   [docMeta]);
    await dbPut(CHUNKS_STORE, chunkObjects);

    return { docId, name: file.name, chunkCount: textChunks.length, charCount: rawText.length };
  },

  /**
   * Get all document metadata for a profile.
   * @param {string} profileId
   * @returns {Array}
   */
  async getDocuments(profileId) {
    return dbGet(DOCS_STORE, 'profileId', profileId);
  },

  /**
   * Get all text chunks for a profile (used by RAG engine in Phase 2).
   * @param {string} profileId
   * @returns {Array<{ id, docId, chunkIndex, text }>}
   */
  async getAllChunks(profileId) {
    return dbGet(CHUNKS_STORE, 'profileId', profileId);
  },

  /**
   * Delete a document and all its chunks.
   * @param {string} docId
   */
  async deleteDocument(docId) {
    const chunks = await dbGet(CHUNKS_STORE, 'docId', docId);
    const chunkIds = chunks.map(c => c.id);
    await dbDelete(CHUNKS_STORE, chunkIds);
    await dbDelete(DOCS_STORE,   [docId]);
  },

  /**
   * Compute total character count for all docs in a profile (rough size estimate).
   * @param {string} profileId
   * @returns {number} approximate bytes
   */
  async getTotalSize(profileId) {
    const docs = await this.getDocuments(profileId);
    return docs.reduce((sum, d) => sum + (d.charCount || 0), 0);
  },

  /**
   * Format bytes into a human-readable string.
   * @param {number} bytes
   */
  formatSize(bytes) {
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  },
};
