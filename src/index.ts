import { Bot, webhookCallback } from 'grammy';
import { Env } from './types';
import { ProjectSession } from './durable-objects/ProjectSession';
import { handleNewProject } from './bot/commands/new-project';
import { handleGenerateSpec } from './bot/commands/generate-spec';
import { handleBuild } from './bot/commands/build';
import { handleExport } from './bot/commands/export';
import { WorkflowManager } from './core/workflow-manager';

export { ProjectSession };

let bot: Bot | undefined;

function getBot(env: Env) {
  if (!bot) {
    bot = new Bot(env.TELEGRAM_BOT_TOKEN);

    bot.command('start', async (ctx) => {
      await ctx.reply('Welcome to Venture OS Bot! Use /newproject to start a new venture.');
    });

    bot.command('newproject', async (ctx) => {
      await handleNewProject(ctx, env);
    });

    bot.command('generate_spec', async (ctx) => {
      await handleGenerateSpec(ctx, env);
    });

    bot.command('build', async (ctx) => {
      await handleBuild(ctx, env);
    });

    bot.command('export', async (ctx) => {
      await handleExport(ctx, env);
    });

    bot.on('message:text', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const workflowManager = new WorkflowManager(env);
      const response = await workflowManager.processMessage(chatId, ctx.message.text);
      await ctx.reply(response);
    });
  }
  return bot;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/webhook') {
      const botInstance = getBot(env);
      return webhookCallback(botInstance, 'cloudflare')(request);
    }
    return new Response('Not Found', { status: 404 });
  }
};
