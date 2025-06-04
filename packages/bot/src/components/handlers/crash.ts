import { WebhookClient } from 'discord.js';
import logger from '../../logger.js';

// Replace with your actual webhook URL for the error logging channel
const webhookURL = process.env.ERROR_WEBHOOK as string;
const webhookClient = new WebhookClient({ url: webhookURL });

function sendErrorToWebhook(errorTitle: string) {
  webhookClient.send({
    content: `⚠️ **Error Occurred:** ${errorTitle}`,
  }).catch((e) => {
    // If webhook sending fails, just log to console to avoid crashing
    console.error('Failed to send error webhook:', e);
  });
}

export function loadCrashHandler() {
  process.on('unhandledRejection', (reason) => {
    const title = reason instanceof Error ? reason.message : String(reason);
    logger.error({ message: 'Unhandled Promise Rejection', reason });
    sendErrorToWebhook(title);
  });

  process.on('uncaughtException', (error) => {
    logger.error({ message: 'Uncaught Exception', error });
    sendErrorToWebhook(error.message || 'Unknown uncaught exception');
  });

  process.on('uncaughtExceptionMonitor', (error) => {
    logger.error({ message: 'Uncaught Exception Monitor', error });
    sendErrorToWebhook(error.message || 'Unknown uncaught exception monitor');
  });

  process.on('warning', (warning) => {
    logger.warn({ message: 'Process Warning', warning });
    sendErrorToWebhook(warning.name || 'Process warning');
  });
}
