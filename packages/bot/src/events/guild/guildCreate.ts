import { EventInterface } from '../../types.js';
import { CoffeeClient } from '../../index.js';
import { Events, Guild } from 'discord.js';
import logger from '../../logger.js';

const event: EventInterface = {
    name: Events.GuildCreate,
    options: { once: false, rest: false },
    execute: async function (this: CoffeeClient, guild: Guild) {
        await this.prisma.guild.upsert({
            where: { guildId: guild.id },
            update: {
                language: 'SOON',
            },
            create: {
                guildId: guild.id,
                language: 'SOON',
            },
        });

        logger.info({
            labels: { event: 'guildCreate' },
            message: `Joined new guild - ${guild.name} (${guild.id})`,
        });
    },
};

export default event;
