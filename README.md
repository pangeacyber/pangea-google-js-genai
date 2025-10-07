# Pangea + Google Gen AI SDK

A wrapper around the Google Gen AI SDK that wraps the Gemini API with
Pangea AI Guard. Supports Node.js v22 and greater.

## Installation

```bash
npm install @pangeacyber/google-genai
```

## Usage

```typescript
import { PangeaGoogleGenAI } from "@pangeacyber/google-genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const PANGEA_API_KEY = process.env.PANGEA_API_KEY!;

const ai = new PangeaGoogleGenAI({
  apiKey: GEMINI_API_KEY,
  pangeaApiKey: PANGEA_API_KEY,
});

const response = await ai.models.generateContent({
  model: "gemini-2.0-flash-001",
  contents: "Why is the sky blue?",
});
console.log(response.text);
```

Note that AI Guard transformations on the LLM response are **not** applied
because the conversion from Gemini API output to Pangea AI Guard input is lossy.
