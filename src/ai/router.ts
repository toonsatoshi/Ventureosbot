import { Env, Message } from '../types';
import { OpenAIProvider } from './providers/openai';
import { NebiusProvider } from './providers/nebius';

export class AIRouter {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async getResponse(messages: Message[], modelId?: string): Promise<string> {
    // Primary: Nebius
    if (this.env.NEBIUS_API_KEY) {
      const provider = new NebiusProvider(this.env.NEBIUS_API_KEY);
      return await provider.generateResponse(messages, modelId);
    }

    // Fallback: OpenAI
    if (this.env.OPENAI_API_KEY) {
      const provider = new OpenAIProvider(this.env.OPENAI_API_KEY);
      return await provider.generateResponse(messages); // OpenAI provider currently doesn't support override
    }
    
    throw new Error('No AI provider configured');
  }
}
