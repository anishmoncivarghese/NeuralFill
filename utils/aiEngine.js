export class AiEngine {
  constructor() {
    // Support new LanguageModel API (Chrome 137+) and legacy window.ai.languageModel
    this._getApi = () => {
      if (typeof LanguageModel !== 'undefined') return LanguageModel;
      if (window.LanguageModel) return window.LanguageModel;
      if (window.ai?.languageModel) return window.ai.languageModel;
      return null;
    };
    this.session = null;
  }

  get isSupported() {
    return !!this._getApi();
  }

  async initialize() {
    const api = this._getApi();
    if (!api) {
      console.warn("No Gemini Nano API found (LanguageModel or window.ai.languageModel).");
      return false;
    }

    try {
      // New API uses LanguageModel.availability(), old uses .capabilities()
      if (api.availability) {
        const avail = await api.availability();
        if (avail === 'unavailable') {
          console.warn("Gemini Nano is not available on this device.");
          return false;
        }
      } else if (api.capabilities) {
        const capabilities = await api.capabilities();
        if (capabilities.available === 'no') {
          console.warn("Gemini Nano is not available or disabled.");
          return false;
        }
      }

      // Initialize a system prompted session
      this.session = await api.create({
        systemPrompt: `You are a strict JSON API for an intelligent form filler. 
Your job is to match an ambiguously labeled HTML input field to exactly one of the known data keys: ["fullName", "email", "phone", "dob"].
If you are highly confident in the match, output JSON in this exact format: {"key": "matched_key", "confidence": 0.95}.
If the field is ambiguous, asking for something else entirely, or you are unsure, output: {"key": null, "confidence": 0}.
Never output extra text, markdown, or explanation.`
      });
      return true;
    } catch (error) {
      console.error("Failed to initialize AI session:", error);
      return false;
    }
  }

  /**
   * Evaluates an html input using Gemini Nano
   * @param {string} inputContext - stringified context of the input (id, name, label texts, etc)
   * @returns {Promise<string|null>} the matched key or null
   */
  async evaluateInput(inputContext) {
    if (!this.session) {
       const initialized = await this.initialize();
       if (!initialized) return null;
    }

    const promptText = `Classify this input field:
"${inputContext}"`;

    try {
      const responseText = await this.session.prompt(promptText);
      console.log(`[AI Raw Response] for "${inputContext}":`, responseText);
      
      // Try to extract JSON from potentially markdown-formatted response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      let parsed = null;
      if (jsonMatch) {
         try {
             parsed = JSON.parse(jsonMatch[0].trim());
         } catch (e) {
             console.error("[AI] JSON Parse inner error:", e);
         }
      }

      // Only return the key if confidence is high and it's a known key
      if (parsed && parsed.key && parsed.confidence > 0.8) {
        if (['fullName', 'email', 'phone', 'dob'].includes(parsed.key)) {
          console.log(`[AI] Successfully mapped "${inputContext}" -> ${parsed.key} (Confidence: ${parsed.confidence})`);
          return parsed.key;
        }
      }
      return null;
    } catch (error) {
      console.error("[AI] Inference error or failed to parse JSON:", error);
      return null;
    }
  }
  
  destroy() {
    if (this.session) {
      this.session.destroy();
      this.session = null;
    }
  }
}
