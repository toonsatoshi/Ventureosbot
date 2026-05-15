import { Bot, webhookCallback } from 'grammy';
import { Env } from './types';
import { ProjectSession } from './durable-objects/ProjectSession';
import { handleNewProject } from './bot/commands/new-project';
import { handleGenerateSpec } from './bot/commands/generate-spec';
import { handleBuild } from './bot/commands/build';
import { handleExport } from './bot/commands/export';
import { WorkflowManager } from './core/workflow-manager';

// Explicitly export the Durable Object class
export { ProjectSession };

let bot: Bot | undefined;

function getBot(env: Env) {
  if (!bot) {
    bot = new Bot(env.TELEGRAM_BOT_TOKEN);

    bot.command('start', async (ctx) => {
      await ctx.reply('Welcome to Venture OS Bot! Use /newproject to start a new venture.');
    });

    bot.command('ping', async (ctx) => {
      await ctx.reply('pong! I am alive and using: ' + env.NEBIUS_API_KEY?.substring(0, 10) + '...');
    });

    bot.command('newproject', async (ctx) => {
      await handleNewProject(ctx, env);
    });

    bot.command('reset', async (ctx) => {
      const chatId = ctx.chat.id.toString();
      const projectService = new ProjectService(env);
      await projectService.resetProject(chatId);
      await ctx.reply('Project state cleared. You are back at square one!');
    });

    bot.command('generate_spec', async (ctx) => {
      try {
        await handleGenerateSpec(ctx, env);
      } catch (e: any) {
        await ctx.reply(`Error generating spec: ${e.message}`);
      }
    });

    bot.command('build', async (ctx) => {
      try {
        await handleBuild(ctx, env);
      } catch (e: any) {
        await ctx.reply(`Error designing architecture: ${e.message}`);
      }
    });

    bot.command('export', async (ctx) => {
      try {
        await handleExport(ctx, env);
      } catch (e: any) {
        await ctx.reply(`Error exporting: ${e.message}`);
      }
    });

    bot.on('message:text', async (ctx) => {
      try {
        const chatId = ctx.chat.id.toString();
        const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
        const botUsername = 'Ventureos1bot';
        
        // Robust detection: 1. Private chat OR 2. Entity mention OR 3. Reply to bot
        const hasMention = ctx.message.entities?.some(e => 
          e.type === 'mention' && ctx.message.text?.substring(e.offset, e.offset + e.length).toLowerCase() === `@${botUsername.toLowerCase()}`
        ) || ctx.message.text?.toLowerCase().includes(`@${botUsername.toLowerCase()}`);
        
        const isReplyToMe = ctx.message.reply_to_message?.from?.username === botUsername;
        
        const shouldRespond = !isGroup || hasMention || isReplyToMe;
        
        if (shouldRespond) {
          const mentionRegex = new RegExp(`@?${botUsername}`, 'gi');
          const cleanText = ctx.message.text.replace(mentionRegex, '').trim();
          
          const workflowManager = new WorkflowManager(env);
          const response = await workflowManager.processMessage(chatId, cleanText);
          const replyText = response.length > 4000 ? response.substring(0, 4000) + '...' : response;
          await ctx.reply(replyText);
        }
      } catch (error: any) {
        console.error('Text message error:', error);
        if (ctx.chat.type === 'private') {
          await ctx.reply(`I encountered an error: ${error.message}`);
        }
      }
    });

    bot.on('message:photo', async (ctx) => {
      try {
        const chatId = ctx.chat.id.toString();
        const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';
        const botUsername = 'Ventureos1bot';
        
        const hasMention = ctx.message.caption_entities?.some(e => 
          e.type === 'mention' && ctx.message.caption?.substring(e.offset, e.offset + e.length).toLowerCase() === `@${botUsername.toLowerCase()}`
        ) || ctx.message.caption?.toLowerCase().includes(`@${botUsername.toLowerCase()}`);

        const isReplyToMe = ctx.message.reply_to_message?.from?.username === botUsername;

        const shouldRespond = !isGroup || hasMention || isReplyToMe;
        
        if (shouldRespond) {
          const photo = ctx.message.photo[ctx.message.photo.length - 1];
          const file = await ctx.api.getFile(photo.file_id);
          
          if (file.file_path) {
            const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            const imageResponse = await fetch(fileUrl);
            if (!imageResponse.ok) throw new Error('Failed to download image');
            const imageBuffer = await imageResponse.arrayBuffer();
            
            const uint8Array = new Uint8Array(imageBuffer);
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            const base64Image = btoa(binary);
            
            const mentionRegex = new RegExp(`@?${botUsername}`, 'gi');
            const cleanCaption = (ctx.message.caption || 'Analyze this image.').replace(mentionRegex, '').trim();
            
            const workflowManager = new WorkflowManager(env);
            const response = await workflowManager.processMessage(chatId, cleanCaption, {
              data: base64Image,
              mimeType: 'image/jpeg'
            });
            const replyText = response.length > 4000 ? response.substring(0, 4000) + '...' : response;
            await ctx.reply(replyText);
          }
        }
      } catch (error: any) {
        console.error('Photo processing error:', error);
        if (ctx.chat.type === 'private') {
          await ctx.reply(`Error processing image: ${error.message}`);
        }
      }
    });

    bot.catch((err) => {
      console.error('Global Bot Error:', err);
    });
  }
  return bot;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url);
      
      if (url.pathname === '/webhook') {
        if (!env.TELEGRAM_BOT_TOKEN) {
          return new Response('TELEGRAM_BOT_TOKEN is missing', { status: 500 });
        }
        const botInstance = getBot(env);
        // Explicitly catch errors from grammY and return them for visibility
        try {
          return await webhookCallback(botInstance, 'cloudflare-mod')(request);
        } catch (botErr: any) {
          return new Response(`Bot Logic Error: ${botErr.message}\n${botErr.stack}`, { status: 200 }); // Return 200 to Telegram to stop retries, but show error
        }
      }

      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ 
          status: 'ok', 
          time: Date.now(),
          hasToken: !!env.TELEGRAM_BOT_TOKEN,
          hasNebiusKey: !!env.NEBIUS_API_KEY
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not Found', { status: 404 });
    } catch (e: any) {
      console.error('Fetch Error:', e);
      return new Response(`Internal Error: ${e.message}\n${e.stack}`, { status: 500 });
    }
  }
};
