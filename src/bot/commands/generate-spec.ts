import { Context } from 'grammy';
import { Env, ProjectStage } from '../../types';
import { ProjectService } from '../../projects/project-service';
import { AIRouter } from '../../ai/router';
import { ArtifactService } from '../../projects/artifact-service';

export async function handleGenerateSpec(ctx: Context, env: Env) {
  const chatId = ctx.chat?.id.toString();
  if (!chatId) return;

  const projectService = new ProjectService(env);
  const state = await projectService.getProjectState(chatId);

  if (state.stage !== ProjectStage.IDEATION) {
    await ctx.reply('You can only generate a spec during the IDEATION phase.');
    return;
  }

  await ctx.reply('Generating product specification based on our discussion...');

  const aiRouter = new AIRouter(env);
  const specPrompt = `Based on the following conversation, generate a detailed Product Specification using this template:
  
  # Product Specification: ${state.name}
  ... (rest of template)
  
  Conversation:
  ${state.history.map(m => `${m.role}: ${m.content}`).join('\n')}
  `;

  const spec = await aiRouter.getResponse([{ role: 'user', content: specPrompt, timestamp: Date.now() }], 'deepseek-ai/DeepSeek-V4-Pro');

  const artifactService = new ArtifactService(env);
  await artifactService.saveArtifact(chatId, 'specification.md', spec);
  
  await projectService.updateProjectState(chatId, { 
    stage: ProjectStage.SPECIFICATION,
    spec: spec 
  });

  await ctx.reply('Specification generated and project moved to SPECIFICATION stage!');
  await ctx.reply(spec.substring(0, 1000) + (spec.length > 1000 ? '...' : ''));
}
