import { EventInterface } from '../../types.js';
import { CoffeeClient } from '../../index.js';
import { Events, Guild } from 'discord.js';
import logger from '../../logger.js';

const event: EventInterface = {
    name: Events.GuildDelete,
    options: { once: false, rest: false },
    execute: async function (this: CoffeeClient, guild: Guild) {
        await this.prisma.verificationConfig
            .delete({
                where: { guildId: guild.id },
            })
            .catch(() => {});
        await this.prisma.guild
            .delete({
                where: { guildId: guild.id },
            })
            .catch(() => {});

        logger.info({
            labels: { event: 'guildDelete' },
            message: `Left guild - ${guild.name} (${guild.id})`,
        });
    },
};

export default event;
