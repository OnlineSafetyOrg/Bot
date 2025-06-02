import { CoffeeClient } from '../../index.js';
import { EventInterface } from '../../types.js';
import { Events, ActivityType } from 'discord.js';
import logger from '../../logger.js';

const event: EventInterface = {
    name: Events.ClientReady,
    options: { once: true, rest: false },
    execute: async function (this: CoffeeClient) {
        logger.info({ labels: { event: 'ClientReady' }, message: `Client Ready.` });

        // Set the bot's status
        this.user?.setPresence({
            activities: [
                {
                    name: '/help | Donate: ko-fi.com/duckodas',
                    type: ActivityType.Listening,
                },
            ],
            status: 'online',
        });
    },
};

export default event;
