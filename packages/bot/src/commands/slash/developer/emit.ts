import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { CoffeeClient } from '../../../index.js';
import { CommandInterface } from '../../../types.js';

const command: CommandInterface = {
    cooldown: 3,
    isDeveloperOnly: true,
    category: 'Developer',
    data: new SlashCommandBuilder()
        .setName('emit-event')
        .setDescription('Manually emit a Discord.js event for testing')
        .addStringOption((option) =>
            option
                .setName('event')
                .setDescription('Name of the event to emit (e.g. guildCreate, messageCreate)')
                .setRequired(true)
                .addChoices(
                    { name: 'guildCreate', value: 'guildCreate' },
                    { name: 'guildDelete', value: 'guildDelete' },
                ),
        )
        .addStringOption((option) =>
            option
                .setName('guild')
                .setDescription('Guild id for the guild you want to emit to.')
                .setRequired(false),
        ),

    execute: async (interaction: ChatInputCommandInteraction, client: CoffeeClient) => {
        const targetGuild = interaction.options.getString('guild', false);
        const eventName = interaction.options.getString('event', true);

        try {
            switch (eventName) {
                case 'guildCreate': {
                    const guild = client.guilds.cache.get(targetGuild! ?? interaction.guild!.id);
                    if (!guild) {
                        return interaction.reply({
                            content: 'No guild found in cache to emit guildCreate for.',
                            flags: ['Ephemeral'],
                        });
                    }
                    client.emit('guildCreate', guild);
                    break;
                }
                case 'guildDelete': {
                    const guild = client.guilds.cache.get(targetGuild! ?? interaction.guild!.id);
                    if (!guild) {
                        return interaction.reply({
                            content: 'No guild found in cache to emit guildDelete for.',
                            flags: ['Ephemeral'],
                        });
                    }
                    client.emit('guildDelete', guild);
                    break;
                }
                default:
                    return interaction.reply({
                        content: `Event "${eventName}" is not supported for manual emit.`,
                        flags: ['Ephemeral'],
                    });
            }

            await interaction.reply({
                content: `✅ Event \`${eventName}\` emitted successfully!`,
                flags: ['Ephemeral'],
            });
        } catch (error) {
            console.error('Error emitting event:', error);
            await interaction.reply({
                content: `❌ Failed to emit event \`${eventName}\`.`,
                flags: ['Ephemeral'],
            });
        }
    },
};

export default command;
