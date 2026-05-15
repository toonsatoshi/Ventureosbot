import { Message } from '../../types';
import { AIProvider } from './openai'; // Reusing the interface for consistency

export class NebiusProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'meta-llama/Meta-Llama-3.1-70B-Instruct') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateResponse(messages: Message[], modelOverride?: string): Promise<string> {
    const response = await fetch('https://api.tokenfactory.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: modelOverride || this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nebius API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    return data.choices[0].message.content;
  }
}
