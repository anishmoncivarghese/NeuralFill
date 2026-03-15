/* ═══════════════════════════════════════════════════════════════
   NeuralFill — RAG Engine (TF-IDF Retrieval)
   Scores knowledge base chunks against a query and returns the
   top N most relevant chunks. Zero dependencies, instant.
   ═══════════════════════════════════════════════════════════════ */

// ── Stopwords ────────────────────────────────────────────────────
// Common English words that carry no topical signal
const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'shall','can','need','this','that','these','those','i','you','he','she',
  'it','we','they','me','him','her','us','them','my','your','his','its',
  'our','their','what','which','who','how','when','where','why','not','no',
  'so','if','as','up','out','about','into','than','then','just','also',
  'more','some','any','all','both','each','few','very','get','use','used',
  'using','make','made','take','give','go','come','see','know','think',
  'look','want','tell','work','way','time','year','new','good','other',
  'own','right','after','before','over','through','under','back','still',
  'such','even','well','most','only','same','here','there','during','while',
]);

// ── Text Tokenization ─────────────────────────────────────────────

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

// ── Term Frequency ────────────────────────────────────────────────
// Returns a Map of { token → count } for the given token array

function termFrequency(tokens) {
  const tf = new Map();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  return tf;
}

// ── TF-IDF Scoring ────────────────────────────────────────────────
// Score each chunk against the query using TF-IDF.
// tf(term, chunk)  = count of term in chunk / total terms in chunk
// idf(term)        = log(N / df(term) + 1)   (smoothed)
// score(chunk)     = Σ tf * idf for each query term present in chunk

function scoreChunks(query, chunks, topN = 3) {
  if (!chunks || chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return chunks.slice(0, topN);

  const N = chunks.length;

  // Pre-tokenize all chunks
  const tokenizedChunks = chunks.map(chunk => ({
    chunk,
    tokens: tokenize(chunk.text),
  }));

  // Build document frequency map: how many chunks contain each query term
  const df = new Map();
  for (const qt of queryTokens) {
    let count = 0;
    for (const { tokens } of tokenizedChunks) {
      if (tokens.includes(qt)) count++;
    }
    df.set(qt, count);
  }

  // Score each chunk
  const scored = tokenizedChunks.map(({ chunk, tokens }) => {
    if (tokens.length === 0) return { chunk, score: 0 };

    const tf = termFrequency(tokens);
    let score = 0;

    for (const qt of queryTokens) {
      const termCount = tf.get(qt) || 0;
      if (termCount === 0) continue;

      const tfScore  = termCount / tokens.length;
      const idfScore = Math.log((N + 1) / ((df.get(qt) || 0) + 1)) + 1;
      score += tfScore * idfScore;
    }

    return { chunk, score };
  });

  // Sort descending by score, return top N
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map(s => s.chunk);
}

// ── Public API ────────────────────────────────────────────────────

export const RAGEngine = {

  /**
   * Retrieve the top N most relevant chunks for a given query.
   * @param {string} query        — field label / question text
   * @param {Array}  chunks       — array of { id, text, docId, profileId, … }
   * @param {number} topN         — how many chunks to return (default 3)
   * @returns {Array}             — ranked subset of chunks
   */
  retrieve(query, chunks, topN = 3) {
    return scoreChunks(query, chunks, topN);
  },

  /**
   * Build a RAG prompt for Gemini Nano.
   * @param {string} fieldLabel   — the form field's label or placeholder
   * @param {Array}  chunks       — top relevant chunks (from retrieve())
   * @param {object} opts         — { length: 'short'|'medium'|'long' }
   * @returns {string}            — ready-to-send prompt string
   */
  buildPrompt(fieldLabel, chunks, opts = {}) {
    const length = opts.length || 'medium';
    const lengthInstructions = {
      short:  'Write 1–2 concise sentences.',
      medium: 'Write 3–4 focused sentences.',
      long:   'Write a short paragraph (5–6 sentences).',
    };

    const contextBlock = chunks.length > 0
      ? chunks.map((c, i) => `[Context ${i + 1}]\n${c.text}`).join('\n\n')
      : '(No specific context available — use general knowledge.)';

    return `You are helping a user fill out a professional form field.

Field: "${fieldLabel}"

Relevant background from the user's documents:
${contextBlock}

Instructions:
- ${lengthInstructions[length] || lengthInstructions.medium}
- Be specific and use only facts from the provided context.
- Do not invent details not present in the context.
- Write in first person, professional tone.
- Output only the answer text — no labels, no markdown, no explanation.`;
  },
};
