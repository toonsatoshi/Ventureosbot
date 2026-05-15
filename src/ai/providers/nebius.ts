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
    const model = modelOverride || this.model;
    const isVisionModel = model.includes('VL') || model.includes('Vision');

    const formattedMessages = messages.map(m => {
      if (isVisionModel) {
        const content: any[] = [{ type: 'text', text: m.content }];
        if (m.image) {
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:${m.image.mimeType};base64,${m.image.data}`
            }
          });
        }
        return { role: m.role, content };
      }
      return { role: m.role, content: m.content };
    });

    const response = await fetch('https://api.tokenfactory.nebius.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: formattedMessages
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
