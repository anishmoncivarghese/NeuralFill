# Gemini Integrations & Notes

This document contains notes and information specifically relating to the integration of Chrome's built-in Gemini Nano (`window.ai`) for fuzzy matching ambiguous form fields in NeuralFill.

## Implementation Details
- Used for Engine B when Engine A (Regex) fails or yields low confidence.
- Requires `aiLanguageModel` permission or enabling standard features in Chrome.
- The model must run entirely locally to adhere to the strict CSP (`connect-src 'none'`).

## Prompt Engineering
The following prompt is used to instantiate the `window.ai.languageModel` session to ensure strict JSON adherence:

```
You are a strict JSON API for an intelligent form filler. 
Your job is to match an ambiguously labeled HTML input field to exactly one of the known data keys: ["fullName", "email", "phone", "dob"].
If you are highly confident in the match, output JSON in this exact format: {"key": "matched_key", "confidence": 0.95}.
If the field is ambiguous, asking for something else entirely, or you are unsure, output: {"key": null, "confidence": 0}.
Never output extra text, markdown, or explanation.
```

If the engine's response confidence is > 0.8, the fallback match is accepted and filled.
