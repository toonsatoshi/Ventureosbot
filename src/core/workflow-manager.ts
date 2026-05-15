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
    
    // 1. If there's an image, we process it STATELESSLY first
    let imageAnalysis = "";
    if (image) {
      const visionPrompt: Message[] = [
        { role: 'system', content: 'You are a visual analyzer. Describe this image in detail so it can be used in a business brainstorming context. If there is text or handwriting, transcribe it exactly.', timestamp: Date.now() },
        { role: 'user', content: text, image, timestamp: Date.now() }
      ];
      imageAnalysis = await this.aiRouter.getResponse(visionPrompt, 'Qwen/Qwen2.5-VL-72B-Instruct');
    }

    // 2. Add user message (or image description) to history
    // We NEVER store the 'image' object in the Durable Object to avoid SQLITE_TOOBIG
    const contentToStore = image 
      ? `[User uploaded image] User caption: ${text}\n\nAI Visual Analysis: ${imageAnalysis}`
      : text;

    await this.projectService.addMessage(chatId, {
      role: 'user',
      content: contentToStore,
      timestamp: Date.now()
    });

    // 3. Retrieve updated history and PRUNE it to stay under memory limits
    let updatedState = await this.projectService.getProjectState(chatId);
    
    // Prune history to last 10 messages to keep the Durable Object extremely light
    if (updatedState.history.length > 10) {
      const prunedHistory = updatedState.history.slice(-10);
      await this.projectService.updateProjectState(chatId, { history: prunedHistory });
      updatedState.history = prunedHistory;
    }

    // 4. Generate final AI response using the current stage's model
    const systemPrompt = getSystemPrompt(updatedState.stage);
    const messagesForAI: Message[] = [
      { role: 'system', content: systemPrompt, timestamp: Date.now() },
      ...updatedState.history
    ];

    // If it was an image, we already have the analysis, so we just let the stage model respond to that context
    let modelId: string | undefined;
    switch (updatedState.stage) {
      case ProjectStage.CHAT_PARTNER:
      case ProjectStage.IDEATION:
        modelId = 'deepseek-ai/DeepSeek-V3.2-fast';
        break;
      case ProjectStage.SPECIFICATION:
        modelId = 'deepseek-ai/DeepSeek-V4-Pro';
        break;
      default:
        modelId = 'meta-llama/Llama-3.3-70B-Instruct';
    }

    const aiResponse = await this.aiRouter.getResponse(messagesForAI, modelId);

    // Add final response to history
    await this.projectService.addMessage(chatId, {
      role: 'assistant',
      content: aiResponse,
      timestamp: Date.now()
    });

    return aiResponse;
  }
}
