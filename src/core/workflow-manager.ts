import { Env, ProjectStage, Message } from '../types';
import { ProjectService } from '../projects/project-service';
import { AIRouter } from '../ai/router';
import { getSystemPrompt } from './prompt-library';

export class WorkflowManager {
  private env: Env;
  private projectService: ProjectService;
  private aiRouter: AIRouter;

  constructor(env: Env) {
    this.env = env;
    this.projectService = new ProjectService(env);
    this.aiRouter = new AIRouter(env);
  }

  async processMessage(chatId: string, text: string, image?: { data: string, mimeType: string }): Promise<string> {
    const state = await this.projectService.getProjectState(chatId);
    
    // Add user message to history WITHOUT the heavy base64 data
    // We only keep the text/caption for permanent storage
    await this.projectService.addMessage(chatId, {
      role: 'user',
      content: image ? `[Image Uploaded] ${text}` : text,
      timestamp: Date.now()
    });

    const updatedState = await this.projectService.getProjectState(chatId);

    // Prepare messages with system prompt
    const systemPrompt = getSystemPrompt(updatedState.stage);
    
    // Create a temporary history for the AI call that includes the current image
    const temporaryHistory: Message[] = [...updatedState.history];
    if (image) {
      // Add the binary data back just for this one AI request
      temporaryHistory[temporaryHistory.length - 1].image = image;
    }

    const messagesWithSystem: Message[] = [
      { role: 'system', content: systemPrompt, timestamp: Date.now() },
      ...temporaryHistory
    ];

    // Determine the best model
    let modelId: string | undefined;
    if (image) {
      modelId = 'Qwen/Qwen2.5-VL-72B-Instruct';
    } else {
      switch (updatedState.stage) {
        case ProjectStage.IDEATION:
          modelId = 'deepseek-ai/DeepSeek-V3.2-fast';
          break;
        case ProjectStage.SPECIFICATION:
          modelId = 'deepseek-ai/DeepSeek-V4-Pro';
          break;
        case ProjectStage.ARCHITECTURE:
          modelId = 'meta-llama/Llama-3.3-70B-Instruct';
          break;
        default:
          modelId = 'meta-llama/Llama-3.3-70B-Instruct';
      }
    }

    // Generate AI response
    const aiResponse = await this.aiRouter.getResponse(messagesWithSystem, modelId);

    // Add AI response to history
    await this.projectService.addMessage(chatId, {
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now()
    });

    return aiResponse;
  }
}
