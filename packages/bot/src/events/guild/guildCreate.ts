import { EventInterface } from '../../types.js';
import { CoffeeClient } from '../../index.js';
import { Events, Guild, TextChannel } from 'discord.js';
import logger from '../../logger.js';

const event: EventInterface = {
    name: Events.GuildCreate,
    options: { once: false, rest: false },
    execute: async function (this: CoffeeClient, guild: Guild) {
        await this.prisma.guild.upsert({
            where: { guildId: guild.id },
            update: { language: 'SOON' },
            create: { guildId: guild.id, language: 'SOON' },
        });

        logger.info({
            labels: { event: 'guildCreate' },
            message: `Joined guild: ${guild.name} (${guild.id})`,
        });

        const welcomeMessage = `
👋 Hello **${guild.name}**!

Thanks for adding Online Safety Bot!

🔗 Useful links:
* Invite: <https://discord.com/oauth2/authorize?client_id=1374870746006032414>
* Support: https://discord.com/invite/P3bfEux5cv
* Support Us: <https://ko-fi.com/duckodas>

Need help? Join our support server!
`;

        // Find first channel where bot can send messages
        const channel = guild.channels.cache
            .filter(
                (c) =>
                    (c.type === 0 || c.type === 5 || c.type === 10) && // TextChannel, NewsChannel, ThreadChannel
                    c.permissionsFor(guild.members.me!).has(['SendMessages', 'ViewChannel']),
            )
            .first() as TextChannel | undefined;

        if (!channel) {
            logger.warn({
                labels: { event: 'guildCreate' },
                message: `No channel to send welcome in ${guild.name}`,
            });
            return;
        }

        try {
            await channel.send(welcomeMessage);
            logger.info({
                labels: { event: 'guildCreate' },
                message: `Sent welcome message in ${guild.name} (#${channel.id})`,
            });
        } catch (err) {
            logger.error({
                labels: { event: 'guildCreate' },
                message: `Failed to send welcome message in ${guild.name}: ${err}`,
            });
        }
    },
};

export default event;
