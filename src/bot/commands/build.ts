import { Context } from 'grammy';
import { Env, ProjectStage } from '../../types';
import { ProjectService } from '../../projects/project-service';
import { AIRouter } from '../../ai/router';
import { ArtifactService } from '../../projects/artifact-service';

export async function handleBuild(ctx: Context, env: Env) {
  const chatId = ctx.chat?.id.toString();
  if (!chatId) return;

  const projectService = new ProjectService(env);
  const state = await projectService.getProjectState(chatId);

  if (state.stage !== ProjectStage.SPECIFICATION) {
    await ctx.reply('You can only build the architecture after generating a spec.');
    return;
  }

  await ctx.reply('Designing technical architecture based on the specification...');

  const aiRouter = new AIRouter(env);
  const archPrompt = `Based on the following Product Specification, design a detailed Technical Architecture:
  
  Specification:
  ${state.spec}
  
  Conversation Context:
  ${state.history.map(m => `${m.role}: ${m.content}`).slice(-10).join('\n')}
  `;

  const architecture = await aiRouter.getResponse([{ role: 'user', content: archPrompt, timestamp: Date.now() }], 'meta-llama/Llama-3.3-70B-Instruct');

  const artifactService = new ArtifactService(env);
  await artifactService.saveArtifact(chatId, 'architecture.md', architecture);
  
  await projectService.updateProjectState(chatId, { 
    stage: ProjectStage.ARCHITECTURE,
    architecture: architecture 
  });

  await ctx.reply('Technical Architecture designed and project moved to ARCHITECTURE stage!');
  await ctx.reply(architecture.substring(0, 1000) + (architecture.length > 1000 ? '...' : ''));
}
