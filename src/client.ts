import { GoogleGenAI, type GoogleGenAIOptions } from '@google/genai';
import { AIGuardService, PangeaConfig } from 'pangea-node-sdk';

import { PangeaModels } from './models';

export class PangeaGoogleGenAI extends GoogleGenAI {
  constructor(
    options: GoogleGenAIOptions & {
      pangeaApiKey: string;
      pangeaInputRecipe?: string;
      pangeaOutputRecipe?: string;
    }
  ) {
    super(options);

    // @ts-expect-error - models is a read-only property
    this.models = new PangeaModels(
      this.models,
      new AIGuardService(options.pangeaApiKey, new PangeaConfig()),
      options.pangeaInputRecipe,
      options.pangeaOutputRecipe
    );
  }
}
