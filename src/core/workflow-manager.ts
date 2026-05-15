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
    
    // Add user message (and image) to history
    await this.projectService.addMessage(chatId, {
      role: 'user',
      content: text,
      timestamp: Date.now(),
      image
    });

    const updatedState = await this.projectService.getProjectState(chatId);

    // Prepare messages with system prompt
    const systemPrompt = getSystemPrompt(updatedState.stage);
    const messagesWithSystem: Message[] = [
      { role: 'system', content: systemPrompt, timestamp: Date.now() },
      ...updatedState.history
    ];

    // Determine the best model for the current stage
    let modelId: string | undefined;
    
    // Use Vision Model if an image was just uploaded
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
        case ProjectStage.BUILDING:
          modelId = 'Qwen/Qwen3-Next-80B-A3B-Thinking';
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
