import { Context } from 'grammy';
import { Env } from '../../types';
import { ProjectService } from '../../projects/project-service';
import { R2Artifacts } from '../../storage/r2-artifacts';

export async function handleExport(ctx: Context, env: Env) {
  const chatId = ctx.chat?.id.toString();
  if (!chatId) return;

  const projectService = new ProjectService(env);
  const state = await projectService.getProjectState(chatId);

  await ctx.reply(`Exporting project: ${state.name}...`);

  const storage = new R2Artifacts(env);
  const artifacts = await storage.listArtifacts(chatId);

  if (artifacts.length === 0) {
    await ctx.reply('No artifacts found for this project yet. Try generating a spec first!');
    return;
  }

  let summary = `Project: ${state.name}\nStage: ${state.stage}\n\nGenerated Artifacts:\n`;
  for (const artifact of artifacts) {
    summary += `- ${artifact}\n`;
  }

  await ctx.reply(summary);
  await ctx.reply('In a production environment, this would provide a ZIP download link or direct file delivery.');
}
