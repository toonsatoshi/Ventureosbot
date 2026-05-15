import { Context } from 'grammy';
import { Env } from '../../types';
import { ProjectService } from '../../projects/project-service';

export async function handleNewProject(ctx: Context, env: Env) {
  const chatId = ctx.chat?.id.toString();
  if (!chatId) return;

  const projectService = new ProjectService(env);
  await projectService.createNewProject(chatId, 'Untitled Venture');
  
  await ctx.reply('Started a new project! What is the name of your venture?');
}
