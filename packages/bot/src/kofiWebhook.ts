import express from 'express';
import bodyParser from 'body-parser';
import { CoffeeClient } from './index.js';
import { TextChannel } from 'discord.js';
import logger from './logger.js';

export function startKoFiWebhookServer(client: CoffeeClient) {
    const app = express();
    app.use(bodyParser.urlencoded({ extended: true }));

    app.post('/kofi-webhook', async (req, res) => {
        try {
            const rawData = req.body.data;
            if (!rawData) return res.sendStatus(400);

            const data = JSON.parse(rawData);

            if (data.verification_token !== process.env.KOFI_VERIFICATION_TOKEN) {
                return res.sendStatus(403);
            }

            if (!data.is_public) {
                return res.sendStatus(200);
            }

            function extractDiscordId(message: string): string | null {
                const match = message.match(/\b\d{15,19}\b/);
                return match ? match[0] : null;
            }

            const discordId = extractDiscordId(data.message || '');
            if (!discordId) {
                logger.info('Discord ID was not found in payment message');
                return res.sendStatus(200);
            }

            const user = await client.users.fetch(discordId);
            if (!user) {
                logger.error(`Discord id ${discordId} could not be found.`);
                return res.sendStatus(200);
            }

            const guild = await client.guilds.fetch(client.config.guilds[0].id);
            if (!guild) {
                logger.error('Guild not found');
                return res.sendStatus(500);
            }

            const member = await guild.members.fetch(user.id).catch(() => null);
            if (!member) {
                logger.error(`Member with Discord ID ${user.id} not found in guild.`);
                return res.sendStatus(200);
            }

            let rewardRoleId: string | null = null;

            if (data.type === 'Subscription' && data.tier_name) {
                const tierRoles: Record<string, string> = {
                    Bronze: process.env.ROLE_BRONZE_ID!,
                    Silver: process.env.ROLE_SILVER_ID!,
                    Gold: process.env.ROLE_GOLD_ID!,
                };
                rewardRoleId = tierRoles[data.tier_name] || null;
            } else if (data.type === 'Donation' && data.amount) {
                const amount = parseFloat(data.amount);
                if (amount >= 20) rewardRoleId = process.env.ROLE_GOLD_ID!;
                else if (amount >= 10) rewardRoleId = process.env.ROLE_SILVER_ID!;
                else if (amount >= 5) rewardRoleId = process.env.ROLE_BRONZE_ID!;
            }

            // Tildel rolle hvis vi har én
            if (!rewardRoleId) {
                logger.info(
                    `Donation of ${data.amount} from ${data.from_name} did not meet reward thresholds.`,
                );
            } else {
                if (!member.roles.cache.has(rewardRoleId)) {
                    await member.roles.add(rewardRoleId);
                    logger.info(`Assigned role ${rewardRoleId} to ${member.user.tag}`);
                }
            }

            // Send a thank you message to a channel
            const channel = guild.channels.cache.get(process.env.THANKS_CHANNEL_ID!) as TextChannel;
            if (channel) {
                channel.send(
                    `🎉 Thank you **${data.from_name}** <@${user.id}> for your ${data.type.toLowerCase()} of **${data.amount} ${data.currency}**! Your support means a lot to the **Online Safety** community!`,
                );
            }

            res.sendStatus(200);
        } catch (err) {
            logger.error('Error processing Ko-fi webhook:', err);
            res.sendStatus(500);
        }
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        logger.info(`Ko-fi webhook server listening on port ${port}`);
    });
}
