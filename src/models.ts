import type {
  Content,
  GenerateContentParameters,
  GenerateContentResponse,
  Models,
  Part,
} from '@google/genai';
import type { AIGuardService } from 'pangea-node-sdk';

import { tContents, tPart } from './_transformers';
import { PangeaAIGuardBlockedError } from './errors';

function hasRoleAndParts(
  x: Content
): x is Content & { role: string; parts: Part[] } {
  return x.role !== undefined && x.parts !== undefined && x.parts.length > 0;
}

function hasText(x: Part): x is Part & { text: string } {
  return x.text !== undefined;
}

export class PangeaModels {
  private readonly googleModels: Models;

  private readonly aiGuardClient: AIGuardService;
  private readonly pangeaInputRecipe: string;
  private readonly pangeaOutputRecipe: string;

  constructor(
    googleModels: Models,
    aiGuardClient: AIGuardService,
    pangeaInputRecipe = 'pangea_prompt_guard',
    pangeaOutputRecipe = 'pangea_llm_response_guard'
  ) {
    this.googleModels = googleModels;
    this.aiGuardClient = aiGuardClient;
    this.pangeaInputRecipe = pangeaInputRecipe;
    this.pangeaOutputRecipe = pangeaOutputRecipe;
  }

  /**
   * Makes an API request to generate content with a given model.
   *
   * For the `model` parameter, supported formats for Vertex AI API include:
   * - The Gemini model ID, for example: 'gemini-2.0-flash'
   * - The full resource name starts with 'projects/', for example:
   *  'projects/my-project-id/locations/us-central1/publishers/google/models/gemini-2.0-flash'
   * - The partial resource name with 'publishers/', for example:
   *  'publishers/google/models/gemini-2.0-flash' or
   *  'publishers/meta/models/llama-3.1-405b-instruct-maas'
   * - `/` separated publisher and model name, for example:
   * 'google/gemini-2.0-flash' or 'meta/llama-3.1-405b-instruct-maas'
   *
   * For the `model` parameter, supported formats for Gemini API include:
   * - The Gemini model ID, for example: 'gemini-2.0-flash'
   * - The model name starts with 'models/', for example:
   *  'models/gemini-2.0-flash'
   * - For tuned models, the model name starts with 'tunedModels/',
   * for example:
   * 'tunedModels/1234567890123456789'
   *
   * Some models support multimodal input and output.
   *
   * @param params - The parameters for generating content.
   * @return The response from generating content.
   *
   * @example
   * ```ts
   * const response = await ai.models.generateContent({
   *   model: 'gemini-2.0-flash',
   *   contents: 'why is the sky blue?',
   *   config: {
   *     candidateCount: 2,
   *   }
   * });
   * console.log(response);
   * ```
   */
  generateContent = async (
    params: GenerateContentParameters
  ): Promise<GenerateContentResponse> => {
    const normalizedContents = tContents(params.contents);
    const pangeaMessages: [
      { role: string; content: string },
      number,
      number,
    ][] = normalizedContents
      .filter(hasRoleAndParts)
      .flatMap((content, contentIdx) =>
        content.parts
          .filter(hasText)
          .map(
            (part, partIdx) =>
              [
                { role: content.role, content: part.text },
                contentIdx,
                partIdx,
              ] satisfies [{ role: string; content: string }, number, number]
          )
      );

    const guardInputResponse = await this.aiGuardClient.guard({
      input: { messages: pangeaMessages.map(([message]) => message) },
      recipe: this.pangeaInputRecipe,
    });

    if (guardInputResponse.result.blocked) {
      throw new PangeaAIGuardBlockedError();
    }

    if (
      guardInputResponse.result.transformed &&
      guardInputResponse.result.output?.messages &&
      Array.isArray(guardInputResponse.result.output.messages)
    ) {
      for (const [
        idx,
        [_message, contentIdx, partIdx],
      ] of pangeaMessages.entries()) {
        const transformed = guardInputResponse.result.output.messages[idx];
        const parts = normalizedContents[contentIdx].parts;
        if (parts) {
          parts[partIdx] = tPart(transformed.content);
        }
      }
    }

    const genaiResponse = await this.googleModels.generateContent(params);

    if (genaiResponse.text) {
      const guardOutputResponse = await this.aiGuardClient.guard({
        // The LLM response must be contained within a single "assistant"
        // message to AI Guard. Splitting up the content parts into multiple
        // "assistant" messages will result in only the last message being
        // processed.
        input: {
          messages: pangeaMessages
            .map(([message]) => message)
            .concat([{ role: 'assistant', content: genaiResponse.text }]),
        },
        recipe: this.pangeaOutputRecipe,
      });

      if (guardOutputResponse.result.blocked) {
        throw new PangeaAIGuardBlockedError();
      }
    }

    return genaiResponse;
  };
}
